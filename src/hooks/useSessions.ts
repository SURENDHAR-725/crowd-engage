import { useState, useEffect } from 'react';
import { sessionService, type SessionWithDetails, type CreateSessionData } from '@/services/sessionService';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

export function useSessions() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadSessions();
    } else {
      setSessions([]);
      setLoading(false);
    }
  }, [user]);

  const loadSessions = async () => {
    if (!user) return;
    setLoading(true);
    const data = await sessionService.getHostSessions(user.id);
    setSessions(data);
    setLoading(false);
  };

  const createSession = async (data: CreateSessionData) => {
    if (!user) {
      toast.error('Please sign in to create a session');
      return null;
    }
    const session = await sessionService.createSession(user.id, data);
    if (session) {
      setSessions((prev) => [session, ...prev]);
      toast.success('Session created successfully!');
    } else {
      toast.error('Failed to create session');
    }
    return session;
  };

  const updateSessionStatus = async (sessionId: string, status: 'draft' | 'active' | 'paused' | 'ended') => {
    const success = await sessionService.updateSessionStatus(sessionId, status);
    if (success) {
      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, status } : s))
      );
      toast.success(`Session ${status}`);
    } else {
      toast.error('Failed to update session');
    }
    return success;
  };

  const deleteSession = async (sessionId: string) => {
    const success = await sessionService.deleteSession(sessionId);
    if (success) {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      toast.success('Session deleted');
    } else {
      toast.error('Failed to delete session');
    }
    return success;
  };

  return {
    sessions,
    loading,
    createSession,
    updateSessionStatus,
    deleteSession,
    refreshSessions: loadSessions,
  };
}

export function useSession(sessionId?: string) {
  const [session, setSession] = useState<SessionWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (sessionId) {
      loadSession();
    } else {
      setLoading(false);
    }
  }, [sessionId]);

  const loadSession = async () => {
    if (!sessionId) return;
    
    setLoading(true);
    const data = await sessionService.getSessionById(sessionId);
    setSession(data);
    setLoading(false);
  };

  return {
    session,
    loading,
    refreshSession: loadSession,
  };
}

export function useSessionByCode(code?: string) {
  const [session, setSession] = useState<SessionWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (code) {
      loadSession();
    } else {
      setLoading(false);
    }
  }, [code]);

  const loadSession = async () => {
    if (!code) return;
    
    setLoading(true);
    setError(null);
    const data = await sessionService.getSessionByCode(code);
    if (data) {
      setSession(data);
    } else {
      setError('Session not found or not active');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!code || !session) return;

    // Subscribe to session changes
    const unsubscribe = sessionService.subscribeToSession(session.id, (updatedSession) => {
      setSession((prev) => (prev ? { ...prev, ...updatedSession } : null));
    });

    return unsubscribe;
  }, [code, session?.id]);

  return {
    session,
    loading,
    error,
    refreshSession: loadSession,
  };
}
