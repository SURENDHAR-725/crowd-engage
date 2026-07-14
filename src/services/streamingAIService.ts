/**
 * Streaming AI Service
 * 
 * Wraps the NVIDIA NIM API with `stream: true` for token-by-token responses.
 * Detects sentence boundaries and fires callbacks as complete sentences arrive,
 * allowing the speech synthesis to begin speaking immediately.
 */

import type { ChatMessage, ResumeAnalysis } from './aiInterviewService';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StreamingCallbacks {
  onToken?: (token: string) => void;
  onSentence?: (sentence: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (error: string) => void;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const NVIDIA_API_KEY = import.meta.env.VITE_NVIDIA_API_KEY || '';
const NVIDIA_API_URL = '/api/nvidia/v1/chat/completions';
const NVIDIA_MODEL = 'meta/llama-3.1-8b-instruct';

// ─── Streaming Call ─────────────────────────────────────────────────────────

/**
 * Call NVIDIA NIM API with streaming enabled.
 * Fires `onSentence` as each complete sentence is detected in the stream.
 * Returns the full accumulated text when complete.
 */
export async function streamAIResponse(
  messages: Array<{ role: string; content: string }>,
  callbacks: StreamingCallbacks,
  signal?: AbortSignal
): Promise<string> {
  if (!NVIDIA_API_KEY) {
    callbacks.onError?.('NVIDIA API key is not configured.');
    return '';
  }

  try {
    const response = await fetch(NVIDIA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_API_KEY}`,
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify({
        model: NVIDIA_MODEL,
        messages,
        max_tokens: 1024,
        temperature: 0.75,
        top_p: 0.95,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      callbacks.onError?.(`AI server returned status ${response.status}: ${errBody}`);
      return '';
    }

    const reader = response.body?.getReader();
    if (!reader) {
      callbacks.onError?.('Failed to read streaming response.');
      return '';
    }

    const decoder = new TextDecoder();
    let fullText = '';
    let sentenceBuffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6); // Remove 'data: ' prefix
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);
          const token = parsed.choices?.[0]?.delta?.content || '';

          if (token) {
            fullText += token;
            sentenceBuffer += token;
            callbacks.onToken?.(token);

            // Check for sentence boundary
            const sentences = extractCompleteSentences(sentenceBuffer);
            if (sentences.extracted.length > 0) {
              for (const sentence of sentences.extracted) {
                callbacks.onSentence?.(sentence.trim());
              }
              sentenceBuffer = sentences.remaining;
            }
          }
        } catch {
          // Ignore malformed JSON chunks
        }
      }
    }

    // Flush remaining buffer as final sentence
    if (sentenceBuffer.trim()) {
      callbacks.onSentence?.(sentenceBuffer.trim());
    }

    callbacks.onComplete?.(fullText);
    return fullText;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      return '';
    }
    console.error('Streaming AI error:', err);
    callbacks.onError?.(err.message || 'Unknown streaming error');
    return '';
  }
}

// ─── Interview-Specific Prompt Builders ─────────────────────────────────────

/**
 * Build the message array for generating the next interview question (streaming).
 */
export function buildInterviewMessages(
  role: string,
  experience: string,
  difficulty: string,
  interviewType: string,
  conversationHistory: ChatMessage[],
  resumeAnalysis?: ResumeAnalysis | null
): Array<{ role: string; content: string }> {
  const isIntro = conversationHistory.filter(h => h.role === 'assistant').length === 0;

  let resumeContext = '';
  if (resumeAnalysis) {
    resumeContext = `
The candidate's resume details:
- Skills: ${resumeAnalysis.extracted_skills?.join(', ') || 'N/A'}
- Projects: ${JSON.stringify(resumeAnalysis.projects || [])}
- Education: ${resumeAnalysis.education?.join(', ') || 'N/A'}
- Experience: ${JSON.stringify(resumeAnalysis.experience || [])}
- Certifications: ${resumeAnalysis.certifications?.join(', ') || 'N/A'}

Reference these details naturally in your questions. For example: "I see you worked on CrowdSpark. Can you walk me through the architecture?"`;
  }

  const systemPrompt = `You are Alex, a professional and friendly AI recruiter conducting a live voice interview for the position of "${role}".

Candidate context:
- Target Role: ${role}
- Experience Level: ${experience}
- Interview Type: ${interviewType} (Technical, HR, Behavioral, or Mixed)
- Difficulty Level: ${difficulty}
${resumeContext}

CRITICAL VOICE INTERVIEW RULES:
1. You are speaking out loud. Keep sentences SHORT and conversational. Never write paragraphs.
2. Ask exactly ONE question at a time.
3. Be warm, encouraging, and natural. Use conversational fillers occasionally like "Great.", "Interesting.", "I see."
4. Reference the candidate's previous answers naturally. Ask follow-up questions.
5. If the candidate gives a strong answer, increase difficulty. If they struggle, be encouraging and ask an easier follow-up.
6. Never output markdown, headers, bullet points, or formatting. Just speak naturally.
7. Keep each response under 3-4 sentences maximum.
8. ${isIntro ? 'This is the START of the interview. Introduce yourself briefly as Alex, welcome the candidate, and ask the first question.' : 'Continue the conversation naturally based on the history. Acknowledge the last answer briefly, then ask the next question.'}`;

  const messages: Array<{ role: string; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  // Add conversation history (filtered to user/assistant only)
  for (const msg of conversationHistory) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  // Add the prompt to generate next question
  if (isIntro) {
    messages.push({
      role: 'user',
      content: 'Begin the interview. Introduce yourself and ask the first question.',
    });
  } else {
    messages.push({
      role: 'user',
      content: 'Continue the interview. Briefly acknowledge my last answer, then ask the next question.',
    });
  }

  return messages;
}

/**
 * Build the message array for evaluating a candidate's answer (non-streaming, uses existing service).
 */
export function buildEvaluationMessages(
  question: string,
  answer: string,
  role: string,
  experience: string
): Array<{ role: string; content: string }> {
  return [
    {
      role: 'system',
      content: `You are an expert technical interviewer. Evaluate the candidate's answer.
Candidate context: Role = ${role}, Experience = ${experience}.

Return your evaluation strictly in this JSON format:
{
  "score": (overall score 1-10),
  "technical_accuracy_score": (1-10),
  "communication_score": (1-10),
  "confidence_score": (1-10),
  "completeness_score": (1-10),
  "problem_solving_score": (1-10),
  "ai_feedback": "2-3 sentence constructive feedback."
}

Return ONLY this JSON object.`,
    },
    {
      role: 'user',
      content: `Question: "${question}"\nCandidate Answer: "${answer || '(No answer provided)'}"`,
    },
  ];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Extract complete sentences from a buffer, returning extracted sentences
 * and the remaining incomplete buffer.
 */
function extractCompleteSentences(buffer: string): {
  extracted: string[];
  remaining: string;
} {
  const extracted: string[] = [];
  let remaining = buffer;

  // Match sentence boundaries: period, question mark, exclamation, or newline
  // But avoid splitting on common abbreviations (Mr., Dr., etc.)
  const sentenceEnders = /(?<!\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|vs|etc|i\.e|e\.g))[.!?]\s+/g;
  
  let lastIndex = 0;
  let match;

  while ((match = sentenceEnders.exec(remaining)) !== null) {
    const sentence = remaining.slice(lastIndex, match.index + match[0].trimEnd().length);
    if (sentence.trim()) {
      extracted.push(sentence.trim());
    }
    lastIndex = match.index + match[0].length;
  }

  remaining = remaining.slice(lastIndex);

  return { extracted, remaining };
}
