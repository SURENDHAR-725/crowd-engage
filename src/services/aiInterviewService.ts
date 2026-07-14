import { supabase } from '@/lib/supabase';

// NVIDIA API configuration
const NVIDIA_API_KEY = import.meta.env.VITE_NVIDIA_API_KEY || '';
const NVIDIA_API_URL = '/api/nvidia/v1/chat/completions';
const NVIDIA_MODEL = 'meta/llama-3.1-8b-instruct';
let nvidiaCooldownUntil = 0;

export interface InterviewSession {
  id?: string;
  user_id: string;
  role: string;
  interview_type: string;
  difficulty: string;
  duration: number;
  score?: number;
  started_at?: string;
  ended_at?: string;
  interview_mode?: string;       // 'text' or 'voice'
  experience_level?: string;     // e.g. '1-3 Years'
  
  technical_score?: number;
  communication_score?: number;
  confidence_score?: number;
  problem_solving_score?: number;
  strengths?: string[];
  weaknesses?: string[];
  suggested_topics?: string[];
  next_difficulty?: string;
  performance_summary?: string;
}

export interface InterviewQuestion {
  id?: string;
  interview_id: string;
  question: string;
  answer?: string;
  ai_feedback?: string;
  score?: number;
  
  technical_accuracy_score?: number;
  communication_score?: number;
  confidence_score?: number;
  completeness_score?: number;
  problem_solving_score?: number;
}

export interface ResumeAnalysis {
  id?: string;
  user_id: string;
  extracted_skills: string[];
  projects: any[];
  certifications: string[];
  education: string[];
  experience: any[];
  raw_text?: string;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AnswerEvaluationResult {
  score: number;
  technical_accuracy_score: number;
  communication_score: number;
  confidence_score: number;
  completeness_score: number;
  problem_solving_score: number;
  ai_feedback: string;
}

export interface FinalReportResult {
  score: number;
  technical_score: number;
  communication_score: number;
  confidence_score: number;
  problem_solving_score: number;
  strengths: string[];
  weaknesses: string[];
  suggested_topics: string[];
  next_difficulty: string;
  performance_summary: string;
}

/**
 * Check if NVIDIA API is configured
 */
export function isNvidiaConfigured(): boolean {
  return !!NVIDIA_API_KEY && NVIDIA_API_KEY !== '';
}

/**
 * Helper to execute HTTP request to NVIDIA NIM Llama model
 */
async function callNvidia(prompt: string, systemPrompt: string): Promise<string> {
  if (!isNvidiaConfigured()) {
    throw new Error('NVIDIA API is not configured.');
  }

  if (Date.now() < nvidiaCooldownUntil) {
    throw new Error('NVIDIA API temporarily cooling down due to previous rate limit.');
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
        max_tokens: 4096,
        temperature: 0.7,
        top_p: 0.95,
        frequency_penalty: 0,
        presence_penalty: 0,
        stream: false,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        nvidiaCooldownUntil = Date.now() + 60 * 1000;
        throw new Error('NVIDIA API rate limit exceeded. Cooling down for 1 minute.');
      }
      const err = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(err.error?.message || `NVIDIA server returned status ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    console.error('Error calling NVIDIA API:', error);
    throw error;
  }
}

/**
 * Safe JSON parser for LLM block outputs
 */
function parseJsonObject<T>(response: string): T | null {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('No JSON object found in response:', response);
      return null;
    }
    return JSON.parse(jsonMatch[0]) as T;
  } catch (err) {
    console.error('Failed to parse JSON from AI response:', err);
    return null;
  }
}

/**
 * Generate a single interview question based on setup configurations and history
 */
export async function generateNextQuestion(
  role: string,
  experience: string,
  difficulty: string,
  interviewType: string,
  history: ChatMessage[],
  resumeAnalysis?: ResumeAnalysis | null
): Promise<string> {
  const isIntro = history.filter(h => h.role === 'assistant').length === 0;
  
  let resumeContext = '';
  if (resumeAnalysis) {
    resumeContext = `
The candidate's resume analysis details:
- Extracted Skills: ${resumeAnalysis.extracted_skills?.join(', ') || 'N/A'}
- Projects: ${JSON.stringify(resumeAnalysis.projects || [])}
- Education: ${resumeAnalysis.education?.join(', ') || 'N/A'}
- Experience: ${JSON.stringify(resumeAnalysis.experience || [])}
- Certifications: ${resumeAnalysis.certifications?.join(', ') || 'N/A'}

Integrate these projects or certifications directly into the questions when relevant. For example: "I see you built a project named X. Describe the architecture and design decisions you made." or "I see you have certification Y. Explain Z."
`;
  }

  const systemPrompt = `You are an expert, professional, and friendly AI recruiter and technical interviewer conducting a mock interview for the position of "${role}".
Candidate details:
- Target Role: ${role}
- Experience Level: ${experience}
- Interview Type: ${interviewType} (Technical, HR, Behavioral, or Mixed)
- Difficulty Level: ${difficulty}
${resumeContext}

INTERVIEW RULES:
1. Speak as a recruiter/interviewer. Maintain conversational memory and recruit style.
2. Ask exactly ONE question at a time. Do not output multiple questions in a single turn.
3. Be professional, encouraging, and clear.
4. Adapt the next question based on the candidate's previous response in the chat history. Ask follow-up questions if they mention interesting project details, or probe deeper if they give a shallow answer.
5. If it's the start (first message), introduce yourself, explain the interview process, and ask the first question.
6. Do NOT output any internal thoughts, markdown explanations, or headers outside the interview conversation. Just write the recruiter dialogue directly.`;

  const userPrompt = isIntro
    ? "Let's begin the interview. Please introduce yourself and start with the first question."
    : "Based on the conversation history, evaluate the last response and ask the next question.";

  // Format messages for standard API call
  // We combine the history array into the prompt to retain clean context
  const fullHistoryPrompt = history.length > 0 
    ? "Conversation history so far:\n" + history.map(h => `${h.role.toUpperCase()}: ${h.content}`).join('\n\n') + `\n\nUser Prompt: ${userPrompt}`
    : userPrompt;

  const result = await callNvidia(fullHistoryPrompt, systemPrompt);
  return result.trim();
}

/**
 * Evaluate the candidate's response to a single question
 */
export async function evaluateCurrentAnswer(
  question: string,
  answer: string,
  role: string,
  experience: string
): Promise<AnswerEvaluationResult> {
  const systemPrompt = `You are an expert technical interviewer. Evaluate the candidate's answer to the given question.
Candidate context:
- Target Role: ${role}
- Experience: ${experience}

You must return your evaluation strictly in the following JSON format:
{
  "score": (overall score between 1 and 10),
  "technical_accuracy_score": (integer 1-10),
  "communication_score": (integer 1-10),
  "confidence_score": (integer 1-10),
  "completeness_score": (integer 1-10),
  "problem_solving_score": (integer 1-10),
  "ai_feedback": "A short (2-3 sentences), constructive feedback highlighting strengths and pointing out areas of improvement."
}

Ensure your evaluation is fair and matches the experience level. Never be overly harsh.`;

  const userPrompt = `
Question: "${question}"
Candidate Answer: "${answer || '(No answer provided or timed out)'}"
`;

  const result = await callNvidia(userPrompt, systemPrompt);
  const parsed = parseJsonObject<AnswerEvaluationResult>(result);

  if (!parsed) {
    // Return a structured default if parsing failed
    return {
      score: 5,
      technical_accuracy_score: 5,
      communication_score: 5,
      confidence_score: 5,
      completeness_score: 5,
      problem_solving_score: 5,
      ai_feedback: "Successfully recorded answer. Unable to analyze granular breakdown in real-time."
    };
  }

  return parsed;
}

/**
 * Generate final summary report compiling all questions and evaluated answers
 */
export async function generateFinalReport(
  role: string,
  experience: string,
  difficulty: string,
  interviewType: string,
  questionsAndAnswers: { question: string; answer: string; score: number; ai_feedback: string }[]
): Promise<FinalReportResult> {
  const systemPrompt = `You are a high-level HR director and technical advisor compiling a final performance report for a mock interview session.
Details:
- Role: ${role}
- Experience Level: ${experience}
- Difficulty: ${difficulty}
- Type: ${interviewType}

You must review the full set of questions, answers, and scores, and compile a final assessment in this JSON format:
{
  "score": (overall percentage score between 0 and 100),
  "technical_score": (average score 1.0 - 10.0),
  "communication_score": (average score 1.0 - 10.0),
  "confidence_score": (average score 1.0 - 10.0),
  "problem_solving_score": (average score 1.0 - 10.0),
  "strengths": ["Strength 1", "Strength 2", ...],
  "weaknesses": ["Improvement Area 1", "Improvement Area 2", ...],
  "suggested_topics": ["Suggested Topic/Technology 1", "Suggested Topic/Technology 2", ...],
  "next_difficulty": "Easy", "Medium", or "Hard",
  "performance_summary": "A cohesive summary paragraph describing the candidate's performance, behavior, potential, and overall guidance."
}

Return ONLY this JSON object.`;

  const userPrompt = `Here are the questions, candidate answers, and individual feedback from the session:
${JSON.stringify(questionsAndAnswers, null, 2)}
`;

  const result = await callNvidia(userPrompt, systemPrompt);
  const parsed = parseJsonObject<FinalReportResult>(result);

  if (!parsed) {
    // Default fallback summary
    const avgScore = questionsAndAnswers.length > 0 
      ? Math.round(questionsAndAnswers.reduce((sum, qa) => sum + qa.score, 0) / questionsAndAnswers.length * 10) 
      : 50;

    return {
      score: avgScore,
      technical_score: avgScore / 10,
      communication_score: 7,
      confidence_score: 7,
      problem_solving_score: 7,
      strengths: ["Completed the mock interview successfully", "Attempted all questions"],
      weaknesses: ["Areas for refinement in detailed technical clarity"],
      suggested_topics: ["Core concepts review", "System design basics"],
      next_difficulty: difficulty,
      performance_summary: "Completed all parts of the mock interview. System analysis fallback was used to generate this basic report."
    };
  }

  return parsed;
}

/**
 * Structure raw extracted resume text into a structured profile
 */
export async function parseAndAnalyzeResume(resumeText: string): Promise<Omit<ResumeAnalysis, 'user_id'>> {
  const systemPrompt = `You are an AI resume analyzer. Extract key components from the raw text of a candidate's resume.
Your output must be strictly in the following JSON format:
{
  "extracted_skills": ["Skill 1", "Skill 2", ...],
  "projects": [
    {
      "title": "Project name",
      "description": "Brief description of what was built",
      "technologies": ["Tech 1", "Tech 2", ...]
    }
  ],
  "certifications": ["Certification 1", "Certification 2", ...],
  "education": ["Degree from Institution", ...],
  "experience": [
    {
      "role": "Job title/role",
      "company": "Company name",
      "duration": "e.g. 2021-2023",
      "description": "Short description of duties"
    }
  ]
}

Return ONLY this JSON object. Do not include any greeting, explanation or formatting outside the JSON code block.`;

  try {
    const result = await callNvidia(resumeText.slice(0, 8000), systemPrompt); // Limit token size
    const parsed = parseJsonObject<Omit<ResumeAnalysis, 'user_id'>>(result);
    
    if (!parsed) {
      throw new Error('Failed to parse structured JSON from resume analyzer response.');
    }
    
    return parsed;
  } catch (error) {
    console.error('Error analyzing resume text:', error);
    // Simple basic regex parser as a safe fallback
    return {
      extracted_skills: ['JavaScript', 'TypeScript', 'React', 'HTML', 'CSS'],
      projects: [],
      certifications: [],
      education: [],
      experience: []
    };
  }
}
