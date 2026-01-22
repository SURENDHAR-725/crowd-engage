import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Bell, Play, ArrowLeft, Copy, Check, Users } from "lucide-react";
import { motion } from "framer-motion";
import { BuzzerHostPanel, BuzzerParticipantView, BuzzerJoinScreen } from "@/components/session/BuzzerGame";

interface Session {
  id: string;
  title: string;
  code: string;
  status: string;
  host_id: string;
}

const BuzzerSession = () => {
  const params = useParams<{ code?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const sessionCode = params.code?.toUpperCase() || "";
  const isHost = searchParams.get("host") === "true";

  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>("");
  const [avatar, setAvatar] = useState<string>("😀");
  const [showJoinScreen, setShowJoinScreen] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [participantCount, setParticipantCount] = useState(0);

  // Load session data
  useEffect(() => {
    const loadSession = async () => {
      if (!sessionCode) return;

      try {
        setLoading(true);

        const { data, error } = await supabase
          .from("sessions")
          .select("*")
          .eq("code", sessionCode)
          .maybeSingle();

        if (error) throw error;

        if (!data) {
          toast.error("Session not found");
          navigate("/");
          return;
        }

        setSession(data);

        // Get participant count
        const { count } = await supabase
          .from('participants')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', data.id);

        setParticipantCount(count || 0);

        // Check if participant exists in local storage
        if (!isHost) {
          const storedParticipantId = localStorage.getItem(`buzzer_participant_${data.id}`);
          const storedNickname = localStorage.getItem(`buzzer_nickname_${data.id}`);
          const storedAvatar = localStorage.getItem(`buzzer_avatar_${data.id}`);

          if (storedParticipantId && storedNickname) {
            // Verify participant still exists
            const { data: participant } = await supabase
              .from('participants')
              .select('*')
              .eq('id', storedParticipantId)
              .single();

            if (participant) {
              setParticipantId(storedParticipantId);
              setNickname(storedNickname);
              setAvatar(storedAvatar || "😀");
            } else {
              // Participant was deleted - only allow join if game hasn't started
              if (data.status === 'draft') {
                setShowJoinScreen(true);
              }
              // If game is active/ended and participant doesn't exist, they can't join
            }
          } else {
            // New participant - only allow join if game hasn't started
            if (data.status === 'draft') {
              setShowJoinScreen(true);
            }
            // If game is active/ended, new participants can't join
          }
        }
      } catch (error) {
        console.error('Error loading session:', error);
        toast.error("Failed to load session");
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [sessionCode, isHost, navigate]);

  // Subscribe to participant count
  useEffect(() => {
    if (!session?.id) return;

    const channel = supabase
      .channel(`participants-count-${session.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'participants',
        filter: `session_id=eq.${session.id}`
      }, async () => {
        const { count } = await supabase
          .from('participants')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', session.id);

        setParticipantCount(count || 0);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id]);

  // Subscribe to session status changes (critical for participants to know when game starts)
  useEffect(() => {
    if (!session?.id) return;

    const channel = supabase
      .channel(`session-status-${session.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'sessions',
        filter: `id=eq.${session.id}`
      }, async (payload) => {
        const newStatus = payload.new.status;
        if (newStatus && newStatus !== session.status) {
          setSession(prev => prev ? { ...prev, status: newStatus } : null);

          if (newStatus === 'active') {
            toast.success("Game is starting!");
          } else if (newStatus === 'ended') {
            toast.info("Game has ended");
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session?.id, session?.status]);

  const handleJoin = async (joinNickname: string, joinAvatar: string) => {
    if (!session) return;

    setIsJoining(true);
    try {
      // Generate or retrieve anonymous_id for this session
      let anonymousId = localStorage.getItem(`buzzer_anonymous_${session.id}`);
      if (!anonymousId) {
        // Generate a unique anonymous ID
        anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem(`buzzer_anonymous_${session.id}`, anonymousId);
      }

      // Create participant
      const { data: participant, error } = await supabase
        .from('participants')
        .insert({
          session_id: session.id,
          anonymous_id: anonymousId,
          nickname: joinNickname,
          avatar: joinAvatar,
          score: 0
        })
        .select()
        .single();

      if (error) throw error;

      // Store in local storage
      localStorage.setItem(`buzzer_participant_${session.id}`, participant.id);
      localStorage.setItem(`buzzer_nickname_${session.id}`, joinNickname);
      localStorage.setItem(`buzzer_avatar_${session.id}`, joinAvatar);

      setParticipantId(participant.id);
      setNickname(joinNickname);
      setAvatar(joinAvatar);
      setShowJoinScreen(false);

      toast.success("Joined the game!");
    } catch (error) {
      console.error('Error joining:', error);
      toast.error("Failed to join game");
    } finally {
      setIsJoining(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(sessionCode);
    setCodeCopied(true);
    toast.success("Code copied!");
    setTimeout(() => setCodeCopied(false), 2000);
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <Skeleton className="w-16 h-16 rounded-full mx-auto mb-4" />
            <Skeleton className="h-8 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-64 mx-auto" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Session not found
  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <Bell className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-2">Session Not Found</h1>
            <p className="text-muted-foreground mb-6">
              The session code "{sessionCode}" doesn't exist or has ended.
            </p>
            <Button variant="gradient" onClick={() => navigate("/")}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Host waiting room (before launching)
  if (isHost && session.status === 'draft') {
    return (
      <div className="min-h-screen bg-background p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>

          <Card className="border-primary">
            <CardHeader className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Bell className="w-10 h-10 text-primary" />
              </div>
              <CardTitle className="text-2xl">{session.title}</CardTitle>
              <CardDescription>Buzzer Game - Ready to Launch</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Join Code */}
              <div className="p-6 bg-primary/5 rounded-xl text-center">
                <p className="text-sm text-muted-foreground mb-2">Share this code with participants</p>
                <div className="flex items-center justify-center gap-3">
                  <p className="text-4xl font-mono font-bold tracking-wider text-primary">
                    {sessionCode}
                  </p>
                  <Button variant="outline" size="icon" onClick={copyCode}>
                    {codeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-3">
                  Participants can join at: <span className="font-mono text-primary">{window.location.origin}/buzzer/{sessionCode}</span>
                </p>
              </div>

              {/* Participant Count */}
              <div className="flex items-center justify-center gap-3 p-4 bg-muted/50 rounded-xl">
                <Users className="w-6 h-6 text-primary" />
                <span className="text-2xl font-bold">{participantCount}</span>
                <span className="text-muted-foreground">participants waiting</span>
              </div>

              {/* Launch Button */}
              <Button
                variant="gradient"
                size="lg"
                className="w-full"
                onClick={async () => {
                  // Update session status to active
                  await supabase
                    .from('sessions')
                    .update({
                      status: 'active',
                      started_at: new Date().toISOString()
                    })
                    .eq('id', session.id);

                  setSession(prev => prev ? { ...prev, status: 'active' } : null);
                  toast.success("Game launched!");
                }}
              >
                <Play className="w-5 h-5 mr-2" />
                Launch Game ({participantCount} participants)
              </Button>

              <p className="text-sm text-muted-foreground text-center">
                Wait for all participants to join before launching
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Host view - active game or ended (to show final results)
  if (isHost && (session.status === 'active' || session.status === 'ended')) {
    return (
      <BuzzerHostPanel
        sessionCode={sessionCode}
        sessionId={session.id}
        topic={session.title}
        initialStatus={session.status}
      />
    );
  }

  // Participant join screen
  if (!isHost && showJoinScreen) {
    return (
      <BuzzerJoinScreen
        sessionCode={sessionCode}
        onJoin={handleJoin}
        isJoining={isJoining}
      />
    );
  }

  // Participant waiting room (before game starts)
  if (!isHost && participantId && session.status === 'draft') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-20 h-20 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center"
            >
              <span className="text-4xl">{avatar}</span>
            </motion.div>
            <h1 className="text-2xl font-bold mb-2">Hi, {nickname}!</h1>
            <p className="text-muted-foreground mb-6">
              You've joined <span className="font-semibold">{session.title}</span>
            </p>
            <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/30">
              <Bell className="w-8 h-8 mx-auto mb-2 text-amber-500" />
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                Waiting for host to start the game...
              </p>
            </div>
            <div className="mt-6 flex items-center justify-center gap-2 text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{participantCount} participants waiting</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Participant game view
  if (!isHost && participantId && session.status === 'active') {
    return (
      <BuzzerParticipantView
        sessionId={session.id}
        sessionCode={sessionCode}
        participantId={participantId}
        nickname={nickname}
        avatar={avatar}
      />
    );
  }

  // Game in progress - block new participants from joining
  if (!isHost && !participantId && session.status === 'active') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-20 h-20 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center"
            >
              <Bell className="w-10 h-10 text-amber-500" />
            </motion.div>
            <h1 className="text-2xl font-bold mb-2">Game In Progress</h1>
            <p className="text-muted-foreground mb-6">
              This buzzer game has already started. New participants cannot join
              an active game session.
            </p>
            <Button variant="gradient" onClick={() => navigate("/")}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Session ended
  if (session.status === 'ended') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <Bell className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h1 className="text-2xl font-bold mb-2">Game Ended</h1>
            <p className="text-muted-foreground mb-6">
              This buzzer game session has ended.
            </p>
            <Button variant="gradient" onClick={() => navigate("/")}>
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fallback
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardContent className="p-8">
          <Bell className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Loading...</h1>
        </CardContent>
      </Card>
    </div>
  );
};

export default BuzzerSession;
