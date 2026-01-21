import * as pdfjsLib from 'pdfjs-dist';
import { supabase, generateUniqueSessionCode } from '@/lib/supabase';

// Configure PDF.js worker - use legacy worker for better compatibility
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.js`;

// NVIDIA API configuration
const NVIDIA_API_KEY = import.meta.env.VITE_NVIDIA_API_KEY || '';
// Use serverless function proxy to avoid CORS issues in both dev and production
const NVIDIA_API_URL = '/api/nvidia/v1/chat/completions';
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
  const systemPrompt = `You are an elite educational content creator and assessment designer with expertise in cognitive learning theory and Bloom's Taxonomy. Your mission is to craft high-quality, pedagogically sound multiple-choice questions that genuinely test understanding, not just memorization.

CRITICAL RULES:
1. Create questions that assess comprehension, application, and analysis—not just recall
2. Wrong answers (distractors) must be plausible and address common misconceptions
3. Avoid "all of the above" or "none of the above" options
4. Use clear, unambiguous language without tricks or gotchas
5. Each explanation must teach why the correct answer is right AND why others are wrong
6. Vary question formats: definitions, applications, comparisons, cause-effect, problem-solving

QUESTION QUALITY CHECKLIST:
✓ Does it test actual understanding vs. memorization?
✓ Are all distractors believable and based on real misconceptions?
✓ Is the correct answer unambiguously correct?
✓ Is the language clear and professional?
✓ Does the explanation add educational value?

Output Format (JSON array only, no markdown):
[
  {
    "question": "Clear, specific question that tests understanding?",
    "options": [
      {"text": "Plausible distractor based on common misconception", "is_correct": false},
      {"text": "Correct answer with precise terminology", "is_correct": true},
      {"text": "Plausible distractor with subtle error", "is_correct": false},
      {"text": "Plausible distractor mixing truth with error", "is_correct": false}
    ],
    "explanation": "Why B is correct: [reasoning]. Why A, C, D are wrong: [specific reasons addressing misconceptions]."
  }
]`;

  const difficultyInstructions = {
    easy: 'EASY LEVEL: Focus on foundational knowledge and basic comprehension (Bloom\'s: Remember, Understand). Questions should be direct with clearly distinguishable options. Correct answer should be evident to someone who studied the material. Distractors should be obviously wrong to knowledgeable learners but plausible to beginners.',
    medium: 'MEDIUM LEVEL: Test application and analysis (Bloom\'s: Apply, Analyze). Require connecting multiple concepts or applying knowledge to new scenarios. Include one highly plausible distractor that might fool someone with surface-level understanding. Test practical application and deeper comprehension.',
    hard: 'HARD LEVEL: Demand synthesis and evaluation (Bloom\'s: Evaluate, Create). Present complex scenarios requiring critical thinking and deep expertise. Include 2-3 highly sophisticated distractors that differ subtly from the correct answer. Test edge cases, nuanced distinctions, and expert-level judgment.',
    mixed: 'MIXED DIFFICULTY: Create a balanced distribution: 40% easy (foundational), 40% medium (application), 20% hard (expert-level). Ensure progression from basic to advanced concepts within the quiz.',
  };

  const prompt = `Generate ${questionCount} expert-level assessment questions on: "${topic}"

${difficultyInstructions[difficulty]}

CONTENT REQUIREMENTS:
• Cover diverse sub-topics and dimensions of "${topic}"
• Each question must test a DIFFERENT aspect or concept
• Progress logically from foundational to advanced concepts
• Use real-world applications and scenarios where appropriate
• Incorporate current best practices and up-to-date information

DISTRACTOR DESIGN (Critical):
• Base distractors on actual misconceptions learners have
• Make distractors grammatically parallel to the correct answer
• Ensure distractors are similar in length and detail to the correct answer
• Create plausible wrong answers that reveal conceptual gaps

EXPLANATION REQUIREMENTS:
• Explain WHY the correct answer is right with supporting reasoning
• Explain WHY each distractor is wrong and what misconception it represents
• Add a key insight or learning point that extends understanding
• Keep explanations concise but educational (2-4 sentences)

OUTPUT: Return ONLY the JSON array. No markdown code blocks, no additional text, no preamble.`;

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
    
    // Load the PDF document with better error handling
    const loadingTask = pdfjsLib.getDocument({ 
      data: arrayBuffer,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });
    
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      try {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n\n';
      } catch (pageError) {
        console.warn(`Error extracting text from page ${i}:`, pageError);
        // Continue with other pages
      }
    }
    
    if (!fullText.trim()) {
      throw new Error('No text content found in PDF');
    }
    
    return fullText.trim();
  } catch (error) {
    console.error('Error extracting PDF text:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to extract text from PDF: ${errorMessage}. The PDF may be scanned/image-based or corrupted.`);
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

  const systemPrompt = `You are a master assessment designer specializing in content-based evaluation. Your expertise lies in extracting the most important concepts from source material and creating questions that verify true comprehension.

CORE PRINCIPLES:
1. Extract ONLY information explicitly stated or strongly implied in the provided content
2. Identify the most important concepts, definitions, relationships, and conclusions
3. Create questions that distinguish between surface reading and deep understanding
4. Design distractors using information from the text that could mislead someone who skimmed
5. Test synthesis—connecting multiple parts of the content

QUESTION CONSTRUCTION:
✓ Focus on key takeaways, not trivial details
✓ Test understanding of relationships between concepts
✓ Use specific examples or data from the content
✓ Create "near-miss" distractors using actual content words/phrases in wrong contexts
✓ Assess whether learner can distinguish main ideas from supporting details

DISTRACTOR STRATEGIES:
• Use information from different sections of content (mixing related concepts)
• Include true statements that don't answer the specific question
• Present partial truths or incomplete information
• Include common misinterpretations of the material

Output Format (pure JSON array, no code blocks):
[
  {
    "question": "Precise question directly tied to content?",
    "options": [
      {"text": "Distractor using content terminology incorrectly", "is_correct": false},
      {"text": "Accurate answer with specific content reference", "is_correct": true},
      {"text": "True statement from content but wrong context", "is_correct": false},
      {"text": "Plausible but contradicts information in content", "is_correct": false}
    ],
    "explanation": "Correct answer verified by content: [specific reference]. Why others are wrong: [precise reasons with content citations]."
  }
]`;

  const difficultyInstructions = {
    easy: 'EASY: Direct fact-recall from content. Question: "What is X?" or "According to the text, Y is defined as...". Correct answer uses exact or near-exact language from content. Distractors use related but incorrect terms from the text.',
    medium: 'MEDIUM: Synthesis and relationship questions. Question: "How does X relate to Y?" or "What is the primary purpose of...". Requires connecting 2+ concepts from different parts of content. Distractors present plausible but incorrect relationships.',
    hard: 'HARD: Inference and evaluation. Question: "What can be inferred about..." or "Which statement best explains...". Requires reading between lines and deep analysis. Distractors include sophisticated misinterpretations that seem logical but contradict subtle content points.',
    mixed: 'MIXED: 40% easy (direct facts), 40% medium (concept relationships), 20% hard (inference/evaluation). Ensure comprehensive coverage of all major content sections.',
  };

  const prompt = `Analyze the following content thoroughly and create ${questionCount} high-quality assessment questions that test genuine comprehension.

=== SOURCE CONTENT ===
${truncatedText}
=== END CONTENT ===

${difficultyInstructions[difficulty]}

STRICT REQUIREMENTS:
1. CONTENT FIDELITY: Every question and answer must be verifiable in the provided content
2. NO EXTERNAL KNOWLEDGE: Use ONLY information present in the content above
3. KEY CONCEPTS FOCUS: Identify and test the 3-5 most important concepts/conclusions
4. COMPREHENSIVE COVERAGE: Questions should span different sections of the content
5. PRECISE LANGUAGE: Use specific terminology and phrasing from the source material

DISTRACTOR CONSTRUCTION:
• Extract phrases from content and use them out of context
• Mix information from different sections incorrectly
• Present true statements that don't answer the specific question asked
• Include plausible inferences that the content actually contradicts

EXPLANATION MANDATE:
• Reference specific parts of the content ("As stated in paragraph X...", "The content indicates...")
• Explain why each distractor is wrong with content-based reasoning
• Include a brief elaboration that reinforces the key learning point

CRITICAL: Output pure JSON array only. No markdown, no code blocks, no commentary.`;

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
