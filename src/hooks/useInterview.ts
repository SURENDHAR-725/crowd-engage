import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import {
  generateNextQuestion,
  evaluateCurrentAnswer,
  generateFinalReport,
  type InterviewSession,
  type InterviewQuestion,
  type ChatMessage,
  type ResumeAnalysis
} from '@/services/aiInterviewService';

export type InterviewStatus = 'setup' | 'loading' | 'active' | 'evaluating' | 'submitting' | 'completed' | 'error';

export function useInterview() {
  const { user } = useAuth();
  
  // State
  const [status, setStatus] = useState<InterviewStatus>('setup');
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0); // seconds
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const totalQuestionsLimit = 5; // Limit questions per interview for standard practice

  // Clean timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Timer Tick Effect
  useEffect(() => {
    if (status === 'active' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            // Handle timeout - auto-finalize interview
            toast.warning("Time is up! Submitting your interview...");
            handleFinishInterview();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, timeLeft]);

  // Start interview session
  const startInterview = async (
    role: string,
    experience: string,
    difficulty: string,
    interviewType: string,
    durationMinutes: number,
    resumeAnalysis: ResumeAnalysis | null
  ) => {
    if (!user) {
      toast.error('You must be logged in to take an interview');
      return;
    }

    setStatus('loading');
    setErrorMsg(null);
    setMessages([]);
    setQuestions([]);
    setCurrentQuestionIndex(0);

    try {
      // 1. Create interview row in Supabase
      const newSession: InterviewSession = {
        user_id: user.id,
        role,
        interview_type: interviewType,
        difficulty,
        duration: durationMinutes,
        started_at: new Date().toISOString()
      };

      const { data: createdSession, error: dbError } = await supabase
        .from('interviews')
        .insert(newSession)
        .select()
        .single();

      if (dbError) throw dbError;
      setSession(createdSession);

      // 2. Set timer duration
      setTimeLeft(durationMinutes * 60);

      // 3. Generate initial question
      const initialMessages: ChatMessage[] = [];
      const questionText = await generateNextQuestion(
        role,
        experience,
        difficulty,
        interviewType,
        initialMessages,
        resumeAnalysis
      );

      // 4. Save question to Supabase
      const newQuestion: InterviewQuestion = {
        interview_id: createdSession.id!,
        question: questionText
      };

      const { data: savedQuestion, error: qError } = await supabase
        .from('interview_questions')
        .insert(newQuestion)
        .select()
        .single();

      if (qError) throw qError;

      setQuestions([savedQuestion]);
      setMessages([
        { role: 'assistant', content: questionText }
      ]);
      setStatus('active');
    } catch (err) {
      console.error('Error starting interview:', err);
      const msg = err instanceof Error ? err.message : 'Failed to start interview';
      setErrorMsg(msg);
      setStatus('error');
      toast.error(msg);
    }
  };

  // Submit current answer and move forward
  const submitAnswer = async (answerText: string, experience: string) => {
    if (!session || questions.length === 0) return;

    setStatus('evaluating');
    const currentQuestion = questions[currentQuestionIndex];
    
    try {
      // 1. Evaluate current answer via LLM
      const evalResult = await evaluateCurrentAnswer(
        currentQuestion.question,
        answerText,
        session.role,
        experience
      );

      // 2. Update current question in Supabase
      const { data: updatedQuestion, error: qError } = await supabase
        .from('interview_questions')
        .update({
          answer: answerText,
          ai_feedback: evalResult.ai_feedback,
          score: evalResult.score,
          technical_accuracy_score: evalResult.technical_accuracy_score,
          communication_score: evalResult.communication_score,
          confidence_score: evalResult.confidence_score,
          completeness_score: evalResult.completeness_score,
          problem_solving_score: evalResult.problem_solving_score
        })
        .eq('id', currentQuestion.id!)
        .select()
        .single();

      if (qError) throw qError;

      // Update question list local state
      const updatedQuestions = [...questions];
      updatedQuestions[currentQuestionIndex] = updatedQuestion;
      setQuestions(updatedQuestions);

      // Update chat messages local state
      const nextMessages: ChatMessage[] = [
        ...messages,
        { role: 'user', content: answerText },
        { role: 'system', content: `[Evaluation: Score ${evalResult.score}/10. Feedback: ${evalResult.ai_feedback}]` }
      ];
      setMessages(nextMessages);

      // Check if we hit the limit or if user timed out
      const isLastQuestion = currentQuestionIndex + 1 >= totalQuestionsLimit;

      if (isLastQuestion) {
        toast.info("Analyzing final results and generating report...");
        await handleFinishInterview(updatedQuestions, nextMessages);
      } else {
        // Generate next question
        setStatus('loading');
        
        // Filter out system message evaluation logs for Llama conversational model context
        const apiChatHistory = nextMessages.filter(m => m.role !== 'system');

        // Fetch resume analysis context from DB if it exists
        const { data: resumeAnalysis } = await supabase
          .from('resume_analysis')
          .select('*')
          .eq('user_id', user?.id)
          .maybeSingle();

        const nextQuestionText = await generateNextQuestion(
          session.role,
          experience,
          session.difficulty,
          session.interview_type,
          apiChatHistory,
          resumeAnalysis
        );

        // Save new question to Supabase
        const newQuestion: InterviewQuestion = {
          interview_id: session.id!,
          question: nextQuestionText
        };

        const { data: savedQuestion, error: nextQError } = await supabase
          .from('interview_questions')
          .insert(newQuestion)
          .select()
          .single();

        if (nextQError) throw nextQError;

        setQuestions(prev => [...prev, savedQuestion]);
        setMessages(prev => [...prev, { role: 'assistant', content: nextQuestionText }]);
        setCurrentQuestionIndex(prev => prev + 1);
        setStatus('active');
      }
    } catch (err) {
      console.error('Error submitting answer:', err);
      toast.error('Failed to submit answer. Please try again.');
      setStatus('active');
    }
  };

  // Finalize interview and generate report
  const handleFinishInterview = async (
    currentQuestions = questions,
    chatHistory = messages
  ) => {
    if (!session) return;
    setStatus('submitting');

    try {
      // Gather scored questions
      const scoredQAs = currentQuestions
        .filter(q => q.answer !== null && q.score !== undefined)
        .map(q => ({
          question: q.question,
          answer: q.answer || '',
          score: q.score || 0,
          ai_feedback: q.ai_feedback || ''
        }));

      // Call LLM for complete report compiles
      const report = await generateFinalReport(
        session.role,
        'Mixed', // standard
        session.difficulty,
        session.interview_type,
        scoredQAs
      );

      // Update session record
      const { data: finishedSession, error: sError } = await supabase
        .from('interviews')
        .update({
          score: report.score,
          technical_score: report.technical_score,
          communication_score: report.communication_score,
          confidence_score: report.confidence_score,
          problem_solving_score: report.problem_solving_score,
          strengths: report.strengths,
          weaknesses: report.weaknesses,
          suggested_topics: report.suggested_topics,
          next_difficulty: report.next_difficulty,
          performance_summary: report.performance_summary,
          ended_at: new Date().toISOString()
        })
        .eq('id', session.id!)
        .select()
        .single();

      if (sError) throw sError;

      setSession(finishedSession);
      setStatus('completed');
      toast.success('Interview completed! Loading your final report...');
    } catch (err) {
      console.error('Error finishing interview:', err);
      toast.error('Could not compile report. Saving basic results.');
      
      // Fallback update
      const { data: finishedSession } = await supabase
        .from('interviews')
        .update({
          ended_at: new Date().toISOString(),
          score: 60
        })
        .eq('id', session.id!)
        .select()
        .single();
      
      if (finishedSession) setSession(finishedSession);
      setStatus('completed');
    }
  };

  const resumeSession = async (interviewId: string) => {
    setStatus('loading');
    setErrorMsg(null);
    try {
      // 1. Load session
      const { data: dbSession, error: sError } = await supabase
        .from('interviews')
        .select('*')
        .eq('id', interviewId)
        .single();
      
      if (sError) throw sError;
      
      if (dbSession.ended_at) {
        setSession(dbSession);
        setStatus('completed');
        return;
      }
      
      setSession(dbSession);
      
      // 2. Calculate remaining time
      const startTime = new Date(dbSession.started_at).getTime();
      const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
      const remainingSeconds = (dbSession.duration * 60) - elapsedSeconds;
      
      if (remainingSeconds <= 0) {
        // Automatically finish interview if time has elapsed
        toast.warning("Time limit has expired since you started. Compiling your report...");
        // Fetch questions first
        const { data: dbQs } = await supabase
          .from('interview_questions')
          .select('*')
          .eq('interview_id', interviewId)
          .order('created_at', { ascending: true });
        
        await handleFinishInterview(dbQs || [], []);
        return;
      }
      
      setTimeLeft(remainingSeconds);
      
      // 3. Load questions
      const { data: dbQs, error: qError } = await supabase
        .from('interview_questions')
        .select('*')
        .eq('interview_id', interviewId)
        .order('created_at', { ascending: true });
      
      if (qError) throw qError;
      
      const loadedQs = (dbQs || []) as InterviewQuestion[];
      setQuestions(loadedQs);
      
      // 4. Reconstruct messages history
      const reconstructedMessages: ChatMessage[] = [];
      loadedQs.forEach((q) => {
        reconstructedMessages.push({ role: 'assistant', content: q.question });
        if (q.answer) {
          reconstructedMessages.push({ role: 'user', content: q.answer });
          if (q.score !== null && q.score !== undefined && q.ai_feedback) {
            reconstructedMessages.push({
              role: 'system',
              content: `[Evaluation: Score ${q.score}/10. Feedback: ${q.ai_feedback}]`
            });
          }
        }
      });
      
      setMessages(reconstructedMessages);
      
      // 5. Set current index (first unanswered question)
      const unansweredIndex = loadedQs.findIndex(q => !q.answer);
      if (unansweredIndex !== -1) {
        setCurrentQuestionIndex(unansweredIndex);
        setStatus('active');
      } else {
        // All answered but report not generated yet
        setCurrentQuestionIndex(loadedQs.length - 1);
        setStatus('active');
      }
    } catch (err) {
      console.error('Failed to resume interview session:', err);
      setErrorMsg('Failed to resume session');
      setStatus('error');
    }
  };

  return {
    status,
    session,
    messages,
    questions,
    currentQuestionIndex,
    timeLeft,
    errorMsg,
    startInterview,
    submitAnswer,
    resumeSession,
    finishInterview: () => handleFinishInterview(),
    totalLimit: totalQuestionsLimit
  };
}
