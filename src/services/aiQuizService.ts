import * as pdfjsLib from 'pdfjs-dist';
import { supabase, generateUniqueSessionCode } from '@/lib/supabase';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

// Gemini API configuration (Primary)
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyDHPMjoO6LPne_FNZO4mv2XTDxEbiqdnXU';
const GEMINI_DISABLED = import.meta.env.VITE_DISABLE_GEMINI === 'true';
let geminiCooldownUntil = 0;

// OpenAI API configuration (Fallback)
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';
const OPENAI_DISABLED = import.meta.env.VITE_DISABLE_OPENAI === 'true';
let openAICooldownUntil = 0;

// Initialize Gemini
let genAI: GoogleGenerativeAI | null = null;
if (GEMINI_API_KEY && !GEMINI_DISABLED) {
  genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
}

export interface GeneratedQuestion {
  question_text: string;
  explanation?: string;
  options: {
    option_text: string;
    is_correct: boolean;
  }[];
  time_limit: number;
}

export interface QuizGenerationResult {
  questions: GeneratedQuestion[];
  title: string;
  error?: string;
}

export interface SavedQuizResult {
  sessionId: string;
  sessionCode: string;
  questionCount: number;
  error?: string;
}

export type Difficulty = 'easy' | 'medium' | 'hard' | 'mixed';

/**
 * Check if Gemini API is configured
 */
export function isGeminiConfigured(): boolean {
  return !!GEMINI_API_KEY && GEMINI_API_KEY !== '' && !GEMINI_DISABLED && !!genAI;
}

/**
 * Check if OpenAI API is configured
 */
export function isOpenAIConfigured(): boolean {
  return !!OPENAI_API_KEY && OPENAI_API_KEY !== '' && !OPENAI_DISABLED;
}

/**
 * Check if any AI service is configured
 */
export function isAIConfigured(): boolean {
  return isGeminiConfigured() || isOpenAIConfigured();
}

/**
 * Call Gemini API to generate quiz questions
 */
async function callGemini(prompt: string, systemPrompt: string): Promise<string> {
  if (!isGeminiConfigured() || !genAI) {
    throw new Error('Gemini API is not configured.');
  }

  // Simple cooldown to avoid spamming API after rate limits
  if (Date.now() < geminiCooldownUntil) {
    throw new Error('Gemini temporarily unavailable due to recent rate limit. Cooling down.');
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const fullPrompt = `${systemPrompt}\n\n${prompt}`;
    
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();
    
    return text;
  } catch (error: any) {
    // Handle rate limiting
    if (error.message?.includes('429') || error.message?.includes('quota') || error.message?.includes('rate limit')) {
      geminiCooldownUntil = Date.now() + 5 * 60 * 1000; // 5 minute backoff
      console.warn('Gemini rate limited, backing off for 5 minutes');
      throw new Error('Gemini API rate limit exceeded. Please try again later.');
    }
    
    throw error;
  }
}

/**
 * Call OpenAI API to generate quiz questions
 */
async function callOpenAI(prompt: string, systemPrompt: string): Promise<string> {
  if (!isOpenAIConfigured()) {
    throw new Error('OpenAI API key is not configured. Please add VITE_OPENAI_API_KEY to your environment variables.');
  }

  // Simple cooldown to avoid spamming API after 429s
  if (Date.now() < openAICooldownUntil) {
    throw new Error('OpenAI temporarily unavailable due to recent rate limit. Cooling down.');
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    const message = error.error?.message || `OpenAI API error: ${response.status}`;

    // If rate limited, set cooldown to avoid repeated calls
    if (response.status === 429) {
      // 5 minute backoff
      openAICooldownUntil = Date.now() + 5 * 60 * 1000;
      console.warn('OpenAI rate limited, backing off for 5 minutes');
    }

    throw new Error(message);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

/**
 * Call AI service (tries Gemini first, falls back to OpenAI)
 */
async function callAI(prompt: string, systemPrompt: string): Promise<string> {
  let lastError: Error | null = null;
  
  // Try Gemini first (primary)
  if (isGeminiConfigured()) {
    try {
      console.log('Using Gemini API for quiz generation');
      return await callGemini(prompt, systemPrompt);
    } catch (error) {
      console.warn('Gemini API failed, trying OpenAI fallback:', error);
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  
  // Try OpenAI as fallback
  if (isOpenAIConfigured()) {
    try {
      console.log('Using OpenAI API for quiz generation');
      return await callOpenAI(prompt, systemPrompt);
    } catch (error) {
      console.warn('OpenAI API also failed:', error);
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  
  // If both failed or neither configured
  if (lastError) {
    throw lastError;
  }
  
  throw new Error('No AI service is configured. Please add VITE_GEMINI_API_KEY or VITE_OPENAI_API_KEY to your environment variables.');
}

/**
 * Parse OpenAI response to extract questions
 */
function parseQuestionsFromResponse(response: string, difficulty: Difficulty): GeneratedQuestion[] {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON array found in response:', response);
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    
    const timeLimit = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 25 : difficulty === 'hard' ? 20 : 25;
    
    return parsed.map((q: any) => ({
      question_text: q.question || q.question_text || '',
      explanation: q.explanation || '',
      options: (q.options || []).map((opt: any, idx: number) => ({
        option_text: typeof opt === 'string' ? opt : opt.text || opt.option_text || '',
        is_correct: typeof opt === 'string' 
          ? (q.correct_answer === opt || q.correctAnswer === idx || q.correct === idx)
          : opt.is_correct || opt.isCorrect || false,
      })),
      time_limit: q.time_limit || timeLimit,
    })).filter((q: GeneratedQuestion) => 
      q.question_text && q.options.length >= 2 && q.options.some(o => o.is_correct)
    );
  } catch (error) {
    console.error('Error parsing questions:', error);
    return [];
  }
}

/**
 * Generate quiz questions from a topic using OpenAI
 */
export async function generateQuizFromTopic(
  topic: string,
  questionCount: number = 5,
  difficulty: Difficulty = 'medium'
): Promise<QuizGenerationResult> {
  const systemPrompt = `You are an expert quiz creator. Generate engaging, educational multiple-choice quiz questions.
Always respond with a valid JSON array of questions. Each question must have exactly 4 options with one correct answer.

Format your response as a JSON array:
[
  {
    "question": "Question text here?",
    "options": [
      {"text": "Option A", "is_correct": false},
      {"text": "Option B", "is_correct": true},
      {"text": "Option C", "is_correct": false},
      {"text": "Option D", "is_correct": false}
    ],
    "explanation": "Brief explanation of why the correct answer is correct."
  }
]`;

  const difficultyInstructions = {
    easy: 'Create beginner-friendly questions with clear, straightforward answers. Avoid trick questions.',
    medium: 'Create moderately challenging questions that test understanding and application of concepts.',
    hard: 'Create advanced questions that require deep knowledge and critical thinking. Include some nuanced options.',
    mixed: 'Create a mix of easy, medium, and hard questions to test various levels of understanding.',
  };

  const prompt = `Create ${questionCount} multiple-choice quiz questions about: "${topic}"

Difficulty level: ${difficulty.toUpperCase()}
${difficultyInstructions[difficulty]}

Requirements:
- Each question must have exactly 4 options
- Exactly one option must be correct
- Options should be plausible and not obviously wrong
- Include a brief explanation for each correct answer
- Questions should cover different aspects of the topic
- Make questions educational and engaging

Return ONLY a valid JSON array, no other text.`;

  try {
    // Check if any AI service is configured, if not fall back to rule-based
    if (!isAIConfigured()) {
      console.warn('No AI service configured, using fallback generation');
      return generateFallbackQuiz(topic, questionCount, difficulty);
    }

    const response = await callAI(prompt, systemPrompt);
    const questions = parseQuestionsFromResponse(response, difficulty);

    if (questions.length === 0) {
      return {
        questions: [],
        title: topic,
        error: 'Failed to generate questions. Please try again.',
      };
    }

    return {
      questions,
      title: `Quiz: ${topic}`,
    };
  } catch (error) {
    console.error('Error generating quiz from topic:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate quiz';
    
    // If AI API fails for any reason (quota, rate limit, etc.), use fallback
    if (message.includes('API key') || message.includes('quota') || message.includes('429') || message.includes('rate')) {
      console.warn('AI API issue, using fallback generation');
      const fallback = generateFallbackQuiz(topic, questionCount, difficulty);
      fallback.error = `AI API unavailable: ${message.substring(0, 100)}. Using placeholder questions.`;
      return fallback;
    }
    
    return {
      questions: [],
      title: topic,
      error: message,
    };
  }
}

/**
 * Fallback quiz generation when OpenAI is not available
 */
function generateFallbackQuiz(topic: string, count: number, difficulty: Difficulty): QuizGenerationResult {
  const timeLimit = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 25 : 20;
  
  // Generate sample questions based on topic
  const questions: GeneratedQuestion[] = [];
  const templates = [
    `What is the primary purpose of ${topic}?`,
    `Which of the following best describes ${topic}?`,
    `What is a key characteristic of ${topic}?`,
    `How does ${topic} typically work?`,
    `What is an important aspect of ${topic}?`,
    `Which statement about ${topic} is correct?`,
    `What role does ${topic} play in its field?`,
    `What is commonly associated with ${topic}?`,
    `How is ${topic} typically used?`,
    `What benefit does ${topic} provide?`,
  ];

  for (let i = 0; i < Math.min(count, templates.length); i++) {
    questions.push({
      question_text: templates[i],
      explanation: `This question tests your understanding of ${topic}.`,
      options: [
        { option_text: `Correct answer related to ${topic}`, is_correct: true },
        { option_text: `Incorrect option A`, is_correct: false },
        { option_text: `Incorrect option B`, is_correct: false },
        { option_text: `Incorrect option C`, is_correct: false },
      ].sort(() => Math.random() - 0.5),
      time_limit: timeLimit,
    });
  }

  return {
    questions,
    title: `Quiz: ${topic}`,
    error: !isAIConfigured() ? 'AI API not configured. Using placeholder questions. Add VITE_GEMINI_API_KEY or VITE_OPENAI_API_KEY for AI-generated questions.' : undefined,
  };
}
/**
 * Extract text content from a PDF file
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n\n';
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    throw new Error('Failed to extract text from PDF. Please try a different file.');
  }
}

/**
 * Upload PDF to Supabase Storage and return the URL
 */
export async function uploadPDFToStorage(file: File, userId?: string): Promise<{ url: string; path: string } | null> {
  try {
    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = userId ? `${userId}/${fileName}` : `anonymous/${fileName}`;

    const { data, error } = await supabase.storage
      .from('quiz-pdfs')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('Error uploading PDF:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('quiz-pdfs')
      .getPublicUrl(data.path);

    return {
      url: urlData.publicUrl,
      path: data.path,
    };
  } catch (error) {
    console.error('Error in uploadPDFToStorage:', error);
    return null;
  }
}

/**
 * Generate quiz questions from PDF content using OpenAI
 */
export async function generateQuizFromPDF(
  file: File,
  questionCount: number = 5,
  difficulty: Difficulty = 'medium',
  uploadToStorage: boolean = false,
  userId?: string
): Promise<QuizGenerationResult & { pdfUrl?: string }> {
  try {
    // Optionally upload PDF to storage
    let pdfUrl: string | undefined;
    if (uploadToStorage) {
      const uploadResult = await uploadPDFToStorage(file, userId);
      pdfUrl = uploadResult?.url;
    }

    // Extract text from PDF
    const text = await extractTextFromPDF(file);
    
    if (!text || text.length < 100) {
      return {
        questions: [],
        title: 'Quiz',
        error: 'Could not extract enough text from PDF. Please try a different file.',
        pdfUrl,
      };
    }

    // Check if any AI service is configured
    if (!isAIConfigured()) {
      console.warn('No AI service configured, using rule-based extraction');
      return {
        ...generateRuleBasedFromText(text, questionCount, difficulty),
        pdfUrl,
      };
    }

    // Generate quiz from extracted text using OpenAI
    const result = await generateQuizFromText(text, questionCount, difficulty);
    return { ...result, pdfUrl };
  } catch (error) {
    console.error('Error generating quiz from PDF:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate quiz from PDF';
    return {
      questions: [],
      title: 'Quiz',
      error: message,
    };
  }
}

/**
 * Generate quiz from text content using OpenAI
 */
export async function generateQuizFromText(
  text: string,
  questionCount: number = 5,
  difficulty: Difficulty = 'medium'
): Promise<QuizGenerationResult> {
  // Truncate text if too long (OpenAI has token limits)
  const maxLength = 15000;
  const truncatedText = text.length > maxLength ? text.substring(0, maxLength) + '...' : text;

  const systemPrompt = `You are an expert quiz creator. Generate educational multiple-choice quiz questions based on the provided content.
Always respond with a valid JSON array of questions. Each question must have exactly 4 options with one correct answer.

Format your response as a JSON array:
[
  {
    "question": "Question text here?",
    "options": [
      {"text": "Option A", "is_correct": false},
      {"text": "Option B", "is_correct": true},
      {"text": "Option C", "is_correct": false},
      {"text": "Option D", "is_correct": false}
    ],
    "explanation": "Brief explanation of why the correct answer is correct."
  }
]`;

  const difficultyInstructions = {
    easy: 'Create straightforward questions based directly on facts in the text.',
    medium: 'Create questions that require understanding and connecting concepts from the text.',
    hard: 'Create challenging questions that require deep comprehension and inference.',
    mixed: 'Create a mix of easy, medium, and hard questions.',
  };

  const prompt = `Based on the following content, create ${questionCount} multiple-choice quiz questions.

CONTENT:
${truncatedText}

Difficulty level: ${difficulty.toUpperCase()}
${difficultyInstructions[difficulty]}

Requirements:
- Questions must be based on the actual content provided
- Each question must have exactly 4 options
- Exactly one option must be correct
- Include a brief explanation for each answer
- Make questions educational and test real understanding

Return ONLY a valid JSON array, no other text.`;

  try {
    if (!isAIConfigured()) {
      return generateRuleBasedFromText(text, questionCount, difficulty);
    }

    const response = await callAI(prompt, systemPrompt);
    const questions = parseQuestionsFromResponse(response, difficulty);

    // Generate title from content
    const titleWords = text.split(/\s+/).slice(0, 8).join(' ');
    const title = titleWords.length > 40 ? titleWords.substring(0, 40) + '...' : titleWords;

    if (questions.length === 0) {
      return generateRuleBasedFromText(text, questionCount, difficulty);
    }

    return {
      questions,
      title: `Quiz: ${title}`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate quiz';
    
    // If AI API fails for any reason, use rule-based fallback
    if (message.includes('quota') || message.includes('429') || message.includes('rate') || message.includes('API')) {
      console.warn('AI API issue, using rule-based text extraction');
      const fallback = generateRuleBasedFromText(text, questionCount, difficulty);
      fallback.error = `AI API unavailable. Using basic text extraction instead.`;
      return fallback;
    }
    
    console.error('Error generating quiz from text:', error);
    
    return generateRuleBasedFromText(text, questionCount, difficulty);
  }
}

/**
 * Rule-based quiz generation fallback
 */
function generateRuleBasedFromText(text: string, count: number, difficulty: Difficulty): QuizGenerationResult {
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 30 && s.length < 300)
    .filter(s => !s.startsWith('http') && !s.includes('@'));

  if (sentences.length < 3) {
    return {
      questions: [],
      title: 'Quiz',
      error: 'Not enough content to generate questions.',
    };
  }

  const timeLimit = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 25 : 20;
  const questions: GeneratedQuestion[] = [];
  const shuffled = [...sentences].sort(() => Math.random() - 0.5);

  for (let i = 0; i < Math.min(count, shuffled.length - 3); i++) {
    const sentence = shuffled[i];
    const words = sentence.split(/\s+/);
    const keyTerms = words.filter(w => w.length > 4);
    
    if (keyTerms.length < 2) continue;
    
    const targetTerm = keyTerms[Math.floor(Math.random() * keyTerms.length)];
    const correctOption = sentence.length > 120 ? sentence.substring(0, 120) + '...' : sentence;
    
    const wrongOptions = shuffled
      .filter((_, idx) => idx !== i)
      .slice(0, 3)
      .map(s => s.length > 120 ? s.substring(0, 120) + '...' : s);

    questions.push({
      question_text: `Which statement about "${targetTerm}" is correct?`,
      explanation: `This is based on the content provided.`,
      options: [
        { option_text: correctOption, is_correct: true },
        ...wrongOptions.map(text => ({ option_text: text, is_correct: false })),
      ].sort(() => Math.random() - 0.5),
      time_limit: timeLimit,
    });
  }

  const titleWords = text.split(/\s+/).slice(0, 8).join(' ');
  
  return {
    questions,
    title: `Quiz: ${titleWords.substring(0, 40)}...`,
    error: !isAIConfigured() ? 'Using basic extraction. Add VITE_GEMINI_API_KEY or VITE_OPENAI_API_KEY for AI-powered questions.' : undefined,
  };
}

/**
 * Save generated quiz to Supabase database
 */
export async function saveQuizToDatabase(
  title: string,
  questions: GeneratedQuestion[],
  hostId: string,
  sessionType: string = 'quiz',
  pdfUrl?: string
): Promise<SavedQuizResult> {
  try {
    // Generate unique session code
    const code = await generateUniqueSessionCode();

    // Create session
    const { data: sessionData, error: sessionError } = await supabase
      .from('sessions')
      .insert({
        title,
        code,
        host_id: hostId,
        session_type: sessionType,
        status: 'waiting',
        settings: pdfUrl ? { pdf_url: pdfUrl } : {},
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Error creating session:', sessionError);
      return { sessionId: '', sessionCode: '', questionCount: 0, error: sessionError.message };
    }

    const sessionId = sessionData.id;

    // Insert questions and options
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      
      // Create question
      const { data: questionData, error: questionError } = await supabase
        .from('questions')
        .insert({
          session_id: sessionId,
          question_text: q.question_text,
          question_type: 'mcq',
          time_limit: q.time_limit || 30,
          order_index: i,
          explanation: q.explanation || null,
        })
        .select()
        .single();

      if (questionError) {
        console.error('Error creating question:', questionError);
        continue;
      }

      // Create options for this question
      const optionsToInsert = q.options.map((opt, idx) => ({
        question_id: questionData.id,
        option_text: opt.option_text,
        is_correct: opt.is_correct,
        order_index: idx,
      }));

      const { error: optionsError } = await supabase
        .from('options')
        .insert(optionsToInsert);

      if (optionsError) {
        console.error('Error creating options:', optionsError);
      }
    }

    return {
      sessionId,
      sessionCode: code,
      questionCount: questions.length,
    };
  } catch (error) {
    console.error('Error saving quiz to database:', error);
    const message = error instanceof Error ? error.message : 'Failed to save quiz';
    return { sessionId: '', sessionCode: '', questionCount: 0, error: message };
  }
}

/**
 * Generate and save quiz from topic in one step
 */
export async function createQuizFromTopic(
  topic: string,
  questionCount: number,
  difficulty: Difficulty,
  hostId: string
): Promise<SavedQuizResult & { questions?: GeneratedQuestion[] }> {
  const result = await generateQuizFromTopic(topic, questionCount, difficulty);
  
  if (result.error || result.questions.length === 0) {
    return {
      sessionId: '',
      sessionCode: '',
      questionCount: 0,
      error: result.error || 'Failed to generate questions',
      questions: [],
    };
  }

  const saveResult = await saveQuizToDatabase(result.title, result.questions, hostId);
  
  return {
    ...saveResult,
    questions: result.questions,
  };
}

/**
 * Generate and save quiz from PDF in one step
 */
export async function createQuizFromPDF(
  file: File,
  questionCount: number,
  difficulty: Difficulty,
  hostId: string,
  uploadToStorage: boolean = true
): Promise<SavedQuizResult & { questions?: GeneratedQuestion[] }> {
  const result = await generateQuizFromPDF(file, questionCount, difficulty, uploadToStorage, hostId);
  
  if (result.error || result.questions.length === 0) {
    return {
      sessionId: '',
      sessionCode: '',
      questionCount: 0,
      error: result.error || 'Failed to generate questions from PDF',
      questions: [],
    };
  }

  const saveResult = await saveQuizToDatabase(result.title, result.questions, hostId, 'quiz', result.pdfUrl);
  
  return {
    ...saveResult,
    questions: result.questions,
  };
}
