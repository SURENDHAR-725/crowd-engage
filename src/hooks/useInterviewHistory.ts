import { useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';
import { type InterviewSession, type InterviewQuestion } from '@/services/aiInterviewService';

export function useInterviewHistory() {
  const { user } = useAuth();
  const [history, setHistory] = useState<InterviewSession[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    completed: 0,
    averageScore: 0,
    bestScore: 0,
    totalTime: 0
  });
  const errorShownRef = useRef(false);

  const loadHistory = useCallback(async () => {
    if (!user) return [];
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('interviews')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false });

      if (error) throw error;

      const sessions = data as InterviewSession[];
      setHistory(sessions);
      errorShownRef.current = false; // Reset on success

      // Calculate stats
      const completedSessions = sessions.filter(s => s.ended_at && s.score !== undefined);
      const totalCount = completedSessions.length;
      const scores = completedSessions.map(s => s.score || 0);
      const best = scores.length > 0 ? Math.max(...scores) : 0;
      const totalScoreSum = scores.reduce((sum, val) => sum + val, 0);
      const average = totalCount > 0 ? Math.round(totalScoreSum / totalCount) : 0;
      const practiceTime = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);

      setStats({
        completed: totalCount,
        averageScore: average,
        bestScore: best,
        totalTime: practiceTime
      });

      return sessions;
    } catch (error) {
      console.error('Failed to load interview history:', error);
      if (!errorShownRef.current) {
        errorShownRef.current = true;
        toast.error('Failed to load interview history');
      }
      return [];
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadReport = async (interviewId: string): Promise<{ session: InterviewSession; questions: InterviewQuestion[] } | null> => {
    setLoading(true);
    try {
      // Load session details
      const { data: sessionData, error: sessionError } = await supabase
        .from('interviews')
        .select('*')
        .eq('id', interviewId)
        .single();

      if (sessionError) throw sessionError;

      // Load questions & answers details
      const { data: questionsData, error: questionsError } = await supabase
        .from('interview_questions')
        .select('*')
        .eq('interview_id', interviewId)
        .order('created_at', { ascending: true });

      if (questionsError) throw questionsError;

      return {
        session: sessionData as InterviewSession,
        questions: questionsData as InterviewQuestion[]
      };
    } catch (error) {
      console.error('Failed to load report:', error);
      toast.error('Failed to load interview report');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteInterview = async (interviewId: string) => {
    try {
      const { error } = await supabase
        .from('interviews')
        .delete()
        .eq('id', interviewId);

      if (error) throw error;

      setHistory(prev => prev.filter(s => s.id !== interviewId));
      toast.success('Interview record deleted.');
      
      // Reload stats
      loadHistory();
    } catch (error) {
      console.error('Failed to delete interview:', error);
      toast.error('Failed to delete record');
    }
  };

  return {
    loading,
    history,
    stats,
    loadHistory,
    loadReport,
    deleteInterview
  };
}
