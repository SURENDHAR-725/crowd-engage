// Resume Analyzer Service - Uses NVIDIA API for AI-powered resume analysis

const NVIDIA_API_KEY = import.meta.env.VITE_NVIDIA_API_KEY || '';
const NVIDIA_API_URL = '/api/nvidia/v1/chat/completions';
const NVIDIA_MODEL = 'meta/llama-3.1-8b-instruct';

export interface ResumeAnalysisResult {
  overall_score: number;
  category_scores: {
    formatting: number;
    content_quality: number;
    relevance: number;
    skills_presentation: number;
    ats_compatibility: number;
    grammar_professionalism: number;
  };
  strengths: string[];
  weaknesses: string[];
  suggestions: {
    issue: string;
    suggestion: string;
    example_rewrite?: string;
  }[];
  keyword_gaps: string[];
  summary: string;
}

function isConfigured(): boolean {
  return !!NVIDIA_API_KEY && NVIDIA_API_KEY !== '';
}

const SYSTEM_PROMPT = `You are an expert resume reviewer and career coach with experience in HR, recruiting, and ATS (Applicant Tracking System) optimization.

You will be given the text of a resume (and optionally a target job title/description). Analyze it thoroughly.

## Your Task
1. Evaluate the resume across these categories:
   - Formatting & Structure (clarity, consistency, length, readability)
   - Content Quality (impact statements, use of action verbs, quantified achievements)
   - Relevance (alignment with target role/industry, if provided)
   - Skills Presentation (technical/soft skills clearly listed and relevant)
   - ATS Compatibility (keyword usage, standard section headers, no complex tables/graphics that break parsing)
   - Grammar & Professionalism (typos, tone, consistency)

2. Give an overall score out of 100, plus a sub-score (out of 100) for each category above.

3. Identify:
   - Top 3-5 strengths
   - Top 3-5 weaknesses
   - Specific, actionable suggestions to improve the resume

4. If a target job title or job description is provided, comment on how well the resume aligns with it and suggest missing keywords/skills to add.

## Guidelines
- Be specific and constructive, not generic.
- Prioritize the highest-impact fixes first.
- Keep tone encouraging but honest.
- If resume text is incomplete or clearly not a resume, note that instead of forcing a score.

IMPORTANT: Return ONLY valid JSON, no markdown, no code fences. Use this exact structure:
{
  "overall_score": 0-100,
  "category_scores": {
    "formatting": 0-100,
    "content_quality": 0-100,
    "relevance": 0-100,
    "skills_presentation": 0-100,
    "ats_compatibility": 0-100,
    "grammar_professionalism": 0-100
  },
  "strengths": ["...", "..."],
  "weaknesses": ["...", "..."],
  "suggestions": [
    {
      "issue": "...",
      "suggestion": "...",
      "example_rewrite": "..."
    }
  ],
  "keyword_gaps": ["..."],
  "summary": "2-3 sentence overall assessment"
}`;

export async function analyzeResume(
  resumeText: string,
  jobDescription?: string
): Promise<ResumeAnalysisResult> {
  if (!isConfigured()) {
    throw new Error('NVIDIA API is not configured. Please add VITE_NVIDIA_API_KEY to your environment variables.');
  }

  if (!resumeText || resumeText.trim().length < 50) {
    throw new Error('Resume text is too short. Please provide a complete resume for analysis.');
  }

  let userPrompt = `Resume text:\n"""\n${resumeText}\n"""`;

  if (jobDescription && jobDescription.trim()) {
    userPrompt += `\n\nTarget job title/description:\n"""\n${jobDescription}\n"""`;
  } else {
    userPrompt += `\n\nNo specific job description provided. Evaluate the resume generally and set keyword_gaps to an empty array.`;
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
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 4096,
        temperature: 0.4,
        top_p: 0.9,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      const message = errorData.error?.message || `API error: ${response.status}`;
      
      if (response.status === 429) {
        throw new Error('API rate limit exceeded. Please try again in a minute.');
      }
      
      throw new Error(message);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse the JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON found in response:', content.substring(0, 500));
      throw new Error('Failed to parse AI response. Please try again.');
    }

    const parsed = JSON.parse(jsonMatch[0]) as ResumeAnalysisResult;

    // Validate and sanitize scores
    parsed.overall_score = Math.min(100, Math.max(0, parsed.overall_score || 0));
    const categories = parsed.category_scores;
    if (categories) {
      categories.formatting = Math.min(100, Math.max(0, categories.formatting || 0));
      categories.content_quality = Math.min(100, Math.max(0, categories.content_quality || 0));
      categories.relevance = Math.min(100, Math.max(0, categories.relevance || 0));
      categories.skills_presentation = Math.min(100, Math.max(0, categories.skills_presentation || 0));
      categories.ats_compatibility = Math.min(100, Math.max(0, categories.ats_compatibility || 0));
      categories.grammar_professionalism = Math.min(100, Math.max(0, categories.grammar_professionalism || 0));
    }

    return parsed;
  } catch (error: any) {
    if (error.message?.includes('429') || error.message?.includes('rate limit')) {
      throw new Error('API rate limit exceeded. Please try again in a minute.');
    }
    throw error;
  }
}

/**
 * Extract text from a PDF file for resume analysis
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  
  pdfjsLib.GlobalWorkerOptions.workerSrc = import.meta.env.DEV
    ? `https://unpkg.com/pdfjs-dist@5.4.530/build/pdf.worker.min.mjs`
    : `/pdf-worker/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  
  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');
    fullText += pageText + '\n';
  }

  return fullText.trim();
}
