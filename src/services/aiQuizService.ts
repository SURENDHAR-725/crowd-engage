import * as pdfjsLib from 'pdfjs-dist';
import { supabase, generateUniqueSessionCode } from '@/lib/supabase';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

// NVIDIA API configuration
const NVIDIA_API_KEY = import.meta.env.VITE_NVIDIA_API_KEY || '';
// Use proxy in development to avoid CORS issues
const NVIDIA_API_URL = import.meta.env.DEV 
  ? '/api/nvidia/v1/chat/completions' 
  : 'https://integrate.api.nvidia.com/v1/chat/completions';
const NVIDIA_MODEL = 'meta/llama-3.3-70b-instruct'; // Best for educational content generation
let nvidiaCooldownUntil = 0;

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
 * Check if NVIDIA API is configured
 */
export function isNvidiaConfigured(): boolean {
  return !!NVIDIA_API_KEY && NVIDIA_API_KEY !== '';
}

/**
 * Check if AI service is configured
 */
export function isAIConfigured(): boolean {
  return isNvidiaConfigured();
}

/**
 * Call NVIDIA API to generate quiz questions
 */
async function callNvidia(prompt: string, systemPrompt: string): Promise<string> {
  if (!isNvidiaConfigured()) {
    throw new Error('NVIDIA API is not configured.');
  }

  // Simple cooldown to avoid spamming API after rate limits
  if (Date.now() < nvidiaCooldownUntil) {
    throw new Error('NVIDIA API temporarily unavailable due to recent rate limit. Cooling down.');
  }

  try {
    const response = await fetch(NVIDIA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        max_tokens: 8192,
        temperature: 0.7,
        top_p: 0.95,
        frequency_penalty: 0,
        presence_penalty: 0,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      const message = errorData.error?.message || `NVIDIA API error: ${response.status}`;

      // Handle rate limiting
      if (response.status === 429) {
        nvidiaCooldownUntil = Date.now() + 60 * 1000; // 1 minute backoff
        console.warn('NVIDIA rate limited, backing off for 1 minute');
        throw new Error('NVIDIA API rate limit exceeded. Please try again in a minute.');
      }

      throw new Error(message);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    console.log('NVIDIA API response length:', content.length);
    console.log('NVIDIA API response preview:', content.substring(0, 500));
    return content;
  } catch (error: any) {
    // Handle rate limiting from error message
    if (error.message?.includes('429') || error.message?.includes('rate limit')) {
      nvidiaCooldownUntil = Date.now() + 60 * 1000; // 1 minute backoff
      console.warn('NVIDIA rate limited, backing off for 1 minute');
      throw new Error('NVIDIA API rate limit exceeded. Please try again in a minute.');
    }
    
    throw error;
  }
}

/**
 * Call NVIDIA AI service for quiz generation
 */
async function callAI(prompt: string, systemPrompt: string): Promise<string> {
  if (!isNvidiaConfigured()) {
    throw new Error('NVIDIA API is not configured. Please add VITE_NVIDIA_API_KEY to your environment variables.');
  }
  
  console.log('Using NVIDIA API for quiz generation');
  return await callNvidia(prompt, systemPrompt);
}

/**
 * Parse AI response to extract questions
 */
function parseQuestionsFromResponse(response: string, difficulty: Difficulty): GeneratedQuestion[] {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('No JSON array found in response:', response.substring(0, 500));
      return [];
    }

    console.log('Found JSON array, length:', jsonMatch[0].length);
    const parsed = JSON.parse(jsonMatch[0]);
    console.log('Parsed questions count:', parsed.length);
    
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
 * Generate quiz questions from a topic using NVIDIA AI
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
    // Check if NVIDIA API is configured
    if (!isAIConfigured()) {
      return {
        questions: [],
        title: topic,
        error: 'NVIDIA API is not configured. Please add VITE_NVIDIA_API_KEY to your .env file.',
      };
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
    
    return {
      questions: [],
      title: topic,
      error: message,
    };
  }
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
 * Generate quiz questions from PDF content using NVIDIA AI
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

    // Check if NVIDIA API is configured
    if (!isAIConfigured()) {
      return {
        questions: [],
        title: 'Quiz',
        error: 'NVIDIA API is not configured. Please add VITE_NVIDIA_API_KEY to your .env file.',
        pdfUrl,
      };
    }

    // Generate quiz from extracted text using NVIDIA
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
 * Generate quiz from text content using NVIDIA AI
 */
export async function generateQuizFromText(
  text: string,
  questionCount: number = 5,
  difficulty: Difficulty = 'medium'
): Promise<QuizGenerationResult> {
  // Truncate text if too long (NVIDIA has token limits)
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
      return {
        questions: [],
        title: 'Quiz',
        error: 'NVIDIA API is not configured. Please add VITE_NVIDIA_API_KEY to your .env file.',
      };
    }

    const response = await callAI(prompt, systemPrompt);
    const questions = parseQuestionsFromResponse(response, difficulty);

    // Generate title from content
    const titleWords = text.split(/\s+/).slice(0, 8).join(' ');
    const title = titleWords.length > 40 ? titleWords.substring(0, 40) + '...' : titleWords;

    if (questions.length === 0) {
      return {
        questions: [],
        title: `Quiz: ${title}`,
        error: 'Failed to parse questions from AI response. Please try again.',
      };
    }

    return {
      questions,
      title: `Quiz: ${title}`,
    };
  } catch (error) {
    console.error('Error generating quiz from text:', error);
    const message = error instanceof Error ? error.message : 'Failed to generate quiz';
    
    return {
      questions: [],
      title: 'Quiz',
      error: message,
    };
  }
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
