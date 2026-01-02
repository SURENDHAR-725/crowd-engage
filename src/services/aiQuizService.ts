import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs`;

export interface GeneratedQuestion {
  question_text: string;
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
 * Generate quiz questions from text content using rule-based approach
 */
export async function generateQuizFromText(
  text: string,
  questionCount: number = 5,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<QuizGenerationResult> {
  try {
    // Extract sentences that could be facts
    const sentences = text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 30 && s.length < 300)
      .filter(s => !s.startsWith('http') && !s.includes('@'));

    if (sentences.length < questionCount) {
      return {
        questions: [],
        title: 'Quiz',
        error: 'Not enough content to generate questions. Please provide more text.',
      };
    }

    // Generate questions using rule-based approach
    const questions = generateRuleBasedQuestions(sentences, questionCount, difficulty);
    
    // Generate a title from the first few words of the content
    const words = text.split(/\s+/).slice(0, 10).join(' ');
    const title = words.length > 50 ? words.substring(0, 50) + '...' : words;

    return {
      questions,
      title: `Quiz: ${title}`,
    };
  } catch (error) {
    console.error('Error generating quiz:', error);
    return {
      questions: [],
      title: 'Quiz',
      error: 'Failed to generate quiz. Please try again.',
    };
  }
}

/**
 * Generate questions using rule-based patterns
 */
function generateRuleBasedQuestions(
  sentences: string[],
  count: number,
  difficulty: 'easy' | 'medium' | 'hard'
): GeneratedQuestion[] {
  const questions: GeneratedQuestion[] = [];
  const usedSentences = new Set<number>();
  const timeLimit = difficulty === 'easy' ? 30 : difficulty === 'medium' ? 20 : 15;

  // Shuffle sentences for variety
  const shuffled = [...sentences].sort(() => Math.random() - 0.5);

  for (let i = 0; i < Math.min(count, shuffled.length); i++) {
    const sentence = shuffled[i];
    if (usedSentences.has(i)) continue;
    usedSentences.add(i);

    // Extract key terms from the sentence
    const words = sentence.split(/\s+/);
    const keyTerms = words.filter(w => 
      w.length > 4 && 
      !['which', 'where', 'their', 'there', 'these', 'those', 'about', 'would', 'could', 'should'].includes(w.toLowerCase())
    );

    if (keyTerms.length < 2) continue;

    // Pick a term to make a question about
    const targetTerm = keyTerms[Math.floor(Math.random() * keyTerms.length)];
    
    // Create question by replacing the term with a blank or asking about it
    const questionPatterns = [
      `What is associated with "${targetTerm}" in this context?`,
      `According to the text, which statement is true about "${targetTerm}"?`,
      `The following mentions "${targetTerm}". Which is correct?`,
      `Which statement best describes the role of "${targetTerm}"?`,
    ];

    const questionText = questionPatterns[Math.floor(Math.random() * questionPatterns.length)];

    // Generate options - correct answer is from the sentence
    const correctOption = sentence.length > 100 ? sentence.substring(0, 100) + '...' : sentence;
    
    // Generate wrong options from other sentences
    const wrongOptions = shuffled
      .filter((s, idx) => idx !== i && !usedSentences.has(idx))
      .slice(0, 3)
      .map(s => s.length > 100 ? s.substring(0, 100) + '...' : s);

    if (wrongOptions.length < 3) {
      // Generate generic wrong options if not enough sentences
      wrongOptions.push(
        'This statement is not supported by the text',
        'None of the above applies',
        'The text does not mention this'
      );
    }

    const options = [
      { option_text: correctOption, is_correct: true },
      ...wrongOptions.slice(0, 3).map(text => ({ option_text: text, is_correct: false }))
    ].sort(() => Math.random() - 0.5); // Shuffle options

    questions.push({
      question_text: questionText,
      options,
      time_limit: timeLimit,
    });
  }

  return questions.slice(0, count);
}

/**
 * Main function to generate quiz from PDF
 */
export async function generateQuizFromPDF(
  file: File,
  questionCount: number = 5,
  difficulty: 'easy' | 'medium' | 'hard' = 'medium'
): Promise<QuizGenerationResult> {
  // Extract text from PDF
  const text = await extractTextFromPDF(file);
  
  if (!text || text.length < 100) {
    return {
      questions: [],
      title: 'Quiz',
      error: 'Could not extract enough text from PDF. Please try a different file.',
    };
  }

  // Generate quiz from extracted text
  return generateQuizFromText(text, questionCount, difficulty);
}
