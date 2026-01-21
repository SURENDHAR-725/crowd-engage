import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Bell,
  Timer,
  Trophy,
  Crown,
  Medal,
  Users,
  Play,
  Pause,
  SkipForward,
  Plus,
  Minus,
  Copy,
  Check,
  AlertCircle,
  XCircle,
  Power,
  Hand,
  Clock,
  Zap,
  User,
  RotateCcw,
  Volume2,
  ArrowLeft
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// Types
export interface BuzzerParticipant {
  id: string;
  nickname: string;
  avatar: string;
  score: number;
  buzzerTime: number | null;
  buzzerOrder: number | null;
  isActive: boolean;
  hasAnswered: boolean;
}

export interface BuzzerGameState {
  status: 'waiting' | 'buzzer-open' | 'answering' | 'scoring' | 'ended';
  currentRound: number;
  activeParticipantId: string | null;
  timerRunning: boolean;
  timerSeconds: number;
  maxTimerSeconds: number;
  buzzerQueue: string[]; // Participant IDs in order of buzzer press
  questionNumber: number;
}

// ================= HOST CONTROL PANEL =================
interface BuzzerHostPanelProps {
  sessionCode: string;
  sessionId: string;
  topic: string;
}

export const BuzzerHostPanel = ({ sessionCode, sessionId, topic }: BuzzerHostPanelProps) => {
  const [participants, setParticipants] = useState<BuzzerParticipant[]>([]);
  const [gameState, setGameState] = useState<BuzzerGameState>({
    status: 'waiting',
    currentRound: 1,
    activeParticipantId: null,
    timerRunning: false,
    timerSeconds: 30,
    maxTimerSeconds: 30,
    buzzerQueue: [],
    questionNumber: 1
  });
  const [codeCopied, setCodeCopied] = useState(false);
  const [timerInput, setTimerInput] = useState(30);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const buzzerSoundRef = useRef<HTMLAudioElement | null>(null);
  const gameStateChannelRef = useRef<any>(null);
  const hostChannelRef = useRef<any>(null);
  const gameStateRef = useRef<BuzzerGameState>(gameState);
  
  // Keep gameStateRef in sync with gameState
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // Subscribe to participants
  useEffect(() => {
    const fetchParticipants = async () => {
      const { data } = await supabase
        .from('participants')
        .select('*')
        .eq('session_id', sessionId);
      
      if (data) {
        setParticipants(data.map(p => ({
          id: p.id,
          nickname: p.nickname || 'Anonymous',
          avatar: p.avatar || '😀',
          score: p.score || 0,
          buzzerTime: null,
          buzzerOrder: null,
          isActive: true,
          hasAnswered: false
        })));
      }
    };

    fetchParticipants();

    // Subscribe to participant changes and buzzer presses
    const channel = supabase
      .channel(`buzzer-host-${sessionId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'participants',
        filter: `session_id=eq.${sessionId}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          const newP = payload.new as any;
          setParticipants(prev => [...prev, {
            id: newP.id,
            nickname: newP.nickname || 'Anonymous',
            avatar: newP.avatar || '😀',
            score: newP.score || 0,
            buzzerTime: null,
            buzzerOrder: null,
            isActive: true,
            hasAnswered: false
          }]);
        }
      })
      .on('broadcast', { event: 'buzzer-press' }, ({ payload }) => {
        console.log('📡 Host channel received broadcast:', payload);
        handleBuzzerPress(payload.participantId, payload.timestamp);
      })
      .subscribe((status) => {
        console.log('🔗 Host channel status:', status);
        if (status === 'SUBSCRIBED') {
          hostChannelRef.current = channel;
        }
      });

    return () => {
      hostChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Timer effect
  useEffect(() => {
    if (gameState.timerRunning && gameState.timerSeconds > 0) {
      timerRef.current = setTimeout(() => {
        setGameState(prev => ({
          ...prev,
          timerSeconds: prev.timerSeconds - 1
        }));
      }, 1000);
    } else if (gameState.timerRunning && gameState.timerSeconds === 0) {
      // Timer ended
      setGameState(prev => ({
        ...prev,
        timerRunning: false,
        status: 'scoring'
      }));
      toast.info("Time's up!");
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [gameState.timerRunning, gameState.timerSeconds]);

  // Setup game state broadcast channel (persistent)
  useEffect(() => {
    const channel = supabase
      .channel(`buzzer-game-${sessionId}`)
      .subscribe((status) => {
        console.log('🎮 Game state channel:', status);
        if (status === 'SUBSCRIBED') {
          gameStateChannelRef.current = channel;
        }
      });
    
    return () => {
      gameStateChannelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  // Broadcast game state changes using persistent channel
  useEffect(() => {
    if (gameStateChannelRef.current) {
      gameStateChannelRef.current.send({
        type: 'broadcast',
        event: 'game-state',
        payload: gameState
      });
    }
  }, [gameState]);

  const handleBuzzerPress = useCallback((participantId: string, timestamp: number) => {
    // Use ref to get the latest state (avoids stale closure issue)
    const currentState = gameStateRef.current;
    console.log('🔔 Host received buzzer press:', { participantId, timestamp, currentStatus: currentState.status });
    
    if (currentState.status !== 'buzzer-open') {
      console.log('❌ Buzzer not open, ignoring press. Current status:', currentState.status);
      return;
    }
    
    // Check if already in queue
    if (currentState.buzzerQueue.includes(participantId)) {
      console.log('⚠️ Participant already in queue');
      return;
    }
    
    console.log('✅ Adding participant to queue:', participantId);
    
    setGameState(prev => {
      const newQueue = [...prev.buzzerQueue, participantId];
      return {
        ...prev,
        buzzerQueue: newQueue
      };
    });

    setParticipants(prev => prev.map(p => {
      if (p.id === participantId) {
        return {
          ...p,
          buzzerTime: timestamp,
          buzzerOrder: currentState.buzzerQueue.length + 1
        };
      }
      return p;
    }));

    // Play buzzer sound
    try {
      const audio = new Audio('/buzzer.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {});
    } catch (e) {}
  }, []);

  const copyCode = () => {
    navigator.clipboard.writeText(sessionCode);
    setCodeCopied(true);
    toast.success("Code copied!");
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const openBuzzer = () => {
    setGameState(prev => ({
      ...prev,
      status: 'buzzer-open',
      buzzerQueue: [],
      activeParticipantId: null,
      timerRunning: false,
      timerSeconds: timerInput,
      maxTimerSeconds: timerInput
    }));
    
    // Reset participant buzzer state
    setParticipants(prev => prev.map(p => ({
      ...p,
      buzzerTime: null,
      buzzerOrder: null,
      hasAnswered: false
    })));

    // Broadcast buzzer open
    if (gameStateChannelRef.current) {
      gameStateChannelRef.current.send({
        type: 'broadcast',
        event: 'buzzer-open',
        payload: { questionNumber: gameState.questionNumber }
      });
    }

    toast.success("Buzzer is now open!");
  };

  const closeBuzzer = () => {
    setGameState(prev => ({
      ...prev,
      status: 'answering'
    }));

    // Broadcast buzzer closed
    if (gameStateChannelRef.current) {
      gameStateChannelRef.current.send({
        type: 'broadcast',
        event: 'buzzer-closed',
        payload: {}
      });
    }
  };

  const giveChanceToNext = () => {
    const queue = gameState.buzzerQueue;
    const currentIdx = queue.indexOf(gameState.activeParticipantId || '');
    
    if (currentIdx < queue.length - 1) {
      const nextParticipantId = queue[currentIdx + 1];
      setGameState(prev => ({
        ...prev,
        activeParticipantId: nextParticipantId,
        timerRunning: false,
        timerSeconds: timerInput,
        status: 'answering'
      }));

      // Broadcast active participant change
      if (gameStateChannelRef.current) {
        gameStateChannelRef.current.send({
          type: 'broadcast',
          event: 'active-participant',
          payload: { participantId: nextParticipantId }
        });
      }

      toast.info("Passing to next participant");
    } else {
      toast.info("No more participants in queue");
      setGameState(prev => ({
        ...prev,
        status: 'scoring'
      }));
    }
  };

  const selectParticipantFromQueue = (participantId: string) => {
    setGameState(prev => ({
      ...prev,
      activeParticipantId: participantId,
      status: 'answering',
      timerRunning: false,
      timerSeconds: timerInput
    }));

    // Broadcast active participant
    if (gameStateChannelRef.current) {
      gameStateChannelRef.current.send({
        type: 'broadcast',
        event: 'active-participant',
        payload: { participantId }
      });
    }
  };

  const startTimer = () => {
    setGameState(prev => ({
      ...prev,
      timerRunning: true
    }));

    // Broadcast timer start
    if (gameStateChannelRef.current) {
      gameStateChannelRef.current.send({
        type: 'broadcast',
        event: 'timer-start',
        payload: { seconds: gameState.timerSeconds }
      });
    }
  };

  const pauseTimer = () => {
    setGameState(prev => ({
      ...prev,
      timerRunning: false
    }));

    // Broadcast timer pause
    if (gameStateChannelRef.current) {
      gameStateChannelRef.current.send({
        type: 'broadcast',
        event: 'timer-pause',
        payload: {}
      });
    }
  };

  const resetTimer = () => {
    setGameState(prev => ({
      ...prev,
      timerSeconds: timerInput,
      timerRunning: false
    }));
  };

  const addPoints = async (participantId: string, points: number) => {
    setParticipants(prev => prev.map(p => {
      if (p.id === participantId) {
        return { ...p, score: Math.max(0, p.score + points) };
      }
      return p;
    }));

    // Update in database
    const participant = participants.find(p => p.id === participantId);
    if (participant) {
      await supabase
        .from('participants')
        .update({ score: Math.max(0, participant.score + points) })
        .eq('id', participantId);
    }

    // Broadcast score update
    if (gameStateChannelRef.current) {
      gameStateChannelRef.current.send({
        type: 'broadcast',
        event: 'score-update',
        payload: { participantId, points }
      });
    }

    toast.success(`${points > 0 ? '+' : ''}${points} points`);
  };

  const nextQuestion = () => {
    setGameState(prev => ({
      ...prev,
      questionNumber: prev.questionNumber + 1,
      status: 'waiting',
      buzzerQueue: [],
      activeParticipantId: null,
      timerRunning: false,
      timerSeconds: timerInput
    }));

    setParticipants(prev => prev.map(p => ({
      ...p,
      buzzerTime: null,
      buzzerOrder: null,
      hasAnswered: false
    })));

    // Broadcast next question
    if (gameStateChannelRef.current) {
      gameStateChannelRef.current.send({
        type: 'broadcast',
        event: 'next-question',
        payload: { questionNumber: gameState.questionNumber + 1 }
      });
    }

    toast.success("Moving to next question");
  };

  const endSession = async () => {
    // Get final leaderboard before ending
    const finalLeaderboard = [...participants].sort((a, b) => b.score - a.score);
    
    setGameState(prev => ({
      ...prev,
      status: 'ended'
    }));

    // Update session status in database
    await supabase
      .from('sessions')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('id', sessionId);

    // Broadcast session end with final leaderboard
    if (gameStateChannelRef.current) {
      gameStateChannelRef.current.send({
        type: 'broadcast',
        event: 'session-ended',
        payload: { 
          finalLeaderboard: finalLeaderboard.map((p, idx) => ({
            ...p,
            rank: idx + 1
          }))
        }
      });
    }

    toast.success("Session ended!");
  };

  // Sort participants by score for leaderboard
  const sortedParticipants = [...participants].sort((a, b) => b.score - a.score);
  
  // Sort buzzer queue participants
  const buzzerQueueParticipants = gameState.buzzerQueue
    .map(id => participants.find(p => p.id === id))
    .filter(Boolean) as BuzzerParticipant[];

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-5 h-5 text-amber-500" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400" />;
      case 3: return <Medal className="w-5 h-5 text-amber-700" />;
      default: return <span className="text-sm font-bold text-muted-foreground">{rank}</span>;
    }
  };

  // Final Results Screen for Host
  if (gameState.status === 'ended') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-primary/5 p-4 md:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center pt-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <Trophy className="w-24 h-24 mx-auto mb-4 text-amber-500" />
            </motion.div>
            <h1 className="text-4xl font-display font-bold mb-2">Game Complete!</h1>
            <p className="text-muted-foreground text-lg">Topic: {topic}</p>
            <p className="text-muted-foreground">Session Code: {sessionCode}</p>
          </motion.div>

          {/* Top 3 Podium */}
          {sortedParticipants.length >= 3 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-end justify-center gap-6 h-64 mb-8"
            >
              {/* 2nd Place */}
              <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col items-center"
              >
                <span className="text-5xl mb-3">{sortedParticipants[1]?.avatar}</span>
                <p className="font-bold text-lg truncate max-w-[100px]">{sortedParticipants[1]?.nickname}</p>
                <p className="text-2xl font-bold text-primary mb-2">{sortedParticipants[1]?.score} pts</p>
                <div className="w-24 h-28 bg-gray-400/20 rounded-t-xl flex items-center justify-center">
                  <Medal className="w-10 h-10 text-gray-400" />
                </div>
                <Badge className="mt-2 bg-gray-400">2nd Place</Badge>
              </motion.div>
              
              {/* 1st Place */}
              <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col items-center -mt-8"
              >
                <span className="text-6xl mb-3">{sortedParticipants[0]?.avatar}</span>
                <p className="font-bold text-xl truncate max-w-[120px]">{sortedParticipants[0]?.nickname}</p>
                <p className="text-3xl font-bold text-primary mb-2">{sortedParticipants[0]?.score} pts</p>
                <div className="w-28 h-36 bg-amber-500/20 rounded-t-xl flex items-center justify-center">
                  <Crown className="w-12 h-12 text-amber-500" />
                </div>
                <Badge className="mt-2 bg-amber-500">🏆 Winner</Badge>
              </motion.div>
              
              {/* 3rd Place */}
              <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="flex flex-col items-center"
              >
                <span className="text-5xl mb-3">{sortedParticipants[2]?.avatar}</span>
                <p className="font-bold text-lg truncate max-w-[100px]">{sortedParticipants[2]?.nickname}</p>
                <p className="text-2xl font-bold text-primary mb-2">{sortedParticipants[2]?.score} pts</p>
                <div className="w-24 h-20 bg-amber-700/20 rounded-t-xl flex items-center justify-center">
                  <Medal className="w-10 h-10 text-amber-700" />
                </div>
                <Badge className="mt-2 bg-amber-700">3rd Place</Badge>
              </motion.div>
            </motion.div>
          )}

          {/* Full Results Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
          >
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Trophy className="w-6 h-6 text-amber-500" />
                  Final Results - {sortedParticipants.length} Participants
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
                {sortedParticipants.map((participant, index) => (
                  <motion.div
                    key={participant.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 + index * 0.05 }}
                    className={`flex items-center justify-between p-4 rounded-xl ${
                      index < 3 ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 flex justify-center">
                        {getRankIcon(index + 1)}
                      </div>
                      <span className="text-3xl">{participant.avatar}</span>
                      <div>
                        <p className="font-bold text-lg">{participant.nickname}</p>
                        <p className="text-sm text-muted-foreground">Rank #{index + 1}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{participant.score}</p>
                      <p className="text-sm text-muted-foreground">points</p>
                    </div>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Statistics */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            <Card>
              <CardContent className="p-4 text-center">
                <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{participants.length}</p>
                <p className="text-sm text-muted-foreground">Participants</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Bell className="w-8 h-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{gameState.questionNumber}</p>
                <p className="text-sm text-muted-foreground">Questions</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Trophy className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                <p className="text-2xl font-bold">{sortedParticipants[0]?.score || 0}</p>
                <p className="text-sm text-muted-foreground">Top Score</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <Trophy className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold">
                  {Math.round(sortedParticipants.reduce((sum, p) => sum + p.score, 0) / sortedParticipants.length) || 0}
                </p>
                <p className="text-sm text-muted-foreground">Avg Score</p>
              </CardContent>
            </Card>
          </motion.div>

          {/* Action Buttons */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4 }}
            className="flex gap-4 justify-center pb-8"
          >
            <Button variant="outline" size="lg" onClick={() => window.location.href = '/dashboard'}>
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Dashboard
            </Button>
            <Button variant="gradient" size="lg" onClick={() => window.location.href = '/create'}>
              <Plus className="w-5 h-5 mr-2" />
              Create New Session
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold flex items-center gap-3">
              <Bell className="w-8 h-8 text-primary" />
              Buzzer Game - Host Panel
            </h1>
            <p className="text-muted-foreground mt-1">Topic: {topic}</p>
          </div>
          
          {/* Join Code */}
          <Card className="border-primary bg-primary/5">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Join Code</p>
                <p className="text-3xl font-mono font-bold tracking-wider text-primary">
                  {sessionCode}
                </p>
              </div>
              <Button variant="outline" size="icon" onClick={copyCode}>
                {codeCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Game Status */}
        <Card className={`border-2 ${
          gameState.status === 'buzzer-open' ? 'border-green-500 bg-green-500/5' :
          gameState.status === 'answering' ? 'border-amber-500 bg-amber-500/5' :
          'border-primary bg-primary/5'
        }`}>
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">{participants.length} Participants</span>
                </div>
                <Badge variant="outline" className="text-lg px-4 py-1">
                  Question #{gameState.questionNumber}
                </Badge>
                <Badge 
                  className={`text-sm px-3 py-1 ${
                    gameState.status === 'buzzer-open' ? 'bg-green-500' :
                    gameState.status === 'answering' ? 'bg-amber-500' :
                    'bg-primary'
                  }`}
                >
                  {gameState.status === 'waiting' && 'Waiting'}
                  {gameState.status === 'buzzer-open' && '🔔 BUZZER OPEN'}
                  {gameState.status === 'answering' && 'Answering'}
                  {gameState.status === 'scoring' && 'Scoring'}
                </Badge>
              </div>

              <Button 
                variant="destructive" 
                onClick={endSession}
                className="gap-2"
              >
                <Power className="w-4 h-4" />
                End Session
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Control Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Buzzer Controls */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary" />
                  Buzzer Control
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Timer Setting */}
                <div className="flex items-center gap-4">
                  <label className="text-sm font-medium w-24">Timer (sec):</label>
                  <Input
                    type="number"
                    value={timerInput}
                    onChange={(e) => setTimerInput(Math.max(5, parseInt(e.target.value) || 30))}
                    className="w-24"
                    min={5}
                    max={300}
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  {gameState.status === 'waiting' && (
                    <Button 
                      variant="gradient" 
                      size="lg" 
                      onClick={openBuzzer}
                      className="flex-1 min-w-[150px] gap-2"
                    >
                      <Bell className="w-5 h-5" />
                      Open Buzzer
                    </Button>
                  )}

                  {gameState.status === 'buzzer-open' && (
                    <Button 
                      variant="default" 
                      size="lg" 
                      onClick={closeBuzzer}
                      className="flex-1 min-w-[150px] gap-2 bg-amber-500 hover:bg-amber-600"
                    >
                      <Hand className="w-5 h-5" />
                      Close Buzzer & Pick First
                    </Button>
                  )}

                  {(gameState.status === 'answering' || gameState.status === 'scoring') && (
                    <>
                      <Button 
                        variant="outline" 
                        size="lg" 
                        onClick={giveChanceToNext}
                        className="gap-2"
                      >
                        <SkipForward className="w-5 h-5" />
                        Next in Queue
                      </Button>
                      <Button 
                        variant="gradient" 
                        size="lg" 
                        onClick={nextQuestion}
                        className="flex-1 min-w-[150px] gap-2"
                      >
                        <SkipForward className="w-5 h-5" />
                        Next Question
                      </Button>
                    </>
                  )}
                </div>

                {/* Current Timer Display */}
                {(gameState.status === 'answering' || gameState.status === 'buzzer-open') && (
                  <div className="p-6 bg-muted/50 rounded-xl text-center">
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <Timer className={`w-8 h-8 ${gameState.timerRunning ? 'text-green-500 animate-pulse' : 'text-muted-foreground'}`} />
                      <span className={`text-5xl font-mono font-bold ${
                        gameState.timerSeconds <= 5 ? 'text-red-500' :
                        gameState.timerSeconds <= 10 ? 'text-amber-500' :
                        'text-primary'
                      }`}>
                        {gameState.timerSeconds}s
                      </span>
                    </div>
                    <div className="flex justify-center gap-3">
                      {!gameState.timerRunning ? (
                        <Button onClick={startTimer} variant="default" className="gap-2 bg-green-500 hover:bg-green-600">
                          <Play className="w-4 h-4" />
                          Start Timer
                        </Button>
                      ) : (
                        <Button onClick={pauseTimer} variant="default" className="gap-2 bg-amber-500 hover:bg-amber-600">
                          <Pause className="w-4 h-4" />
                          Pause
                        </Button>
                      )}
                      <Button onClick={resetTimer} variant="outline" className="gap-2">
                        <RotateCcw className="w-4 h-4" />
                        Reset
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Buzzer Queue */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  Buzzer Queue ({buzzerQueueParticipants.length})
                </CardTitle>
                <CardDescription>
                  Participants in order of buzzer press. Click to select for answering.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {buzzerQueueParticipants.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No one has pressed the buzzer yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <AnimatePresence>
                      {buzzerQueueParticipants.map((participant, index) => (
                        <motion.div
                          key={participant.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ delay: index * 0.1 }}
                          onClick={() => selectParticipantFromQueue(participant.id)}
                          className={`flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all ${
                            gameState.activeParticipantId === participant.id
                              ? 'bg-primary/20 border-2 border-primary ring-2 ring-primary/50'
                              : index === 0
                                ? 'bg-green-500/10 border border-green-500/50 hover:bg-green-500/20'
                                : 'bg-muted/50 hover:bg-muted'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${
                              index === 0 ? 'bg-green-500/20' : 'bg-muted'
                            }`}>
                              {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                            </div>
                            <div>
                              <p className="font-semibold flex items-center gap-2">
                                <span className="text-xl">{participant.avatar}</span>
                                {participant.nickname}
                                {gameState.activeParticipantId === participant.id && (
                                  <Badge className="bg-primary text-xs">ANSWERING</Badge>
                                )}
                              </p>
                              {participant.buzzerTime && (
                                <p className="text-xs text-muted-foreground">
                                  Buzzed at: {new Date(participant.buzzerTime).toLocaleTimeString()}
                                </p>
                              )}
                            </div>
                          </div>
                          {index === 0 && gameState.status === 'buzzer-open' && (
                            <Badge className="bg-green-500">FIRST!</Badge>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Score Controls */}
            {gameState.activeParticipantId && (
              <Card variant="elevated" className="border-primary">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-amber-500" />
                    Score Control
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const activeP = participants.find(p => p.id === gameState.activeParticipantId);
                    if (!activeP) return null;
                    
                    return (
                      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-muted/50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{activeP.avatar}</span>
                          <div>
                            <p className="font-bold text-lg">{activeP.nickname}</p>
                            <p className="text-sm text-muted-foreground">Current: {activeP.score} pts</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap justify-center">
                          <Button 
                            variant="outline" 
                            size="lg"
                            onClick={() => addPoints(activeP.id, -10)}
                            className="text-red-500 border-red-500/50"
                          >
                            <Minus className="w-4 h-4 mr-1" /> 10
                          </Button>
                          <Button 
                            variant="outline" 
                            size="lg"
                            onClick={() => addPoints(activeP.id, -5)}
                            className="text-red-400 border-red-400/50"
                          >
                            <Minus className="w-4 h-4 mr-1" /> 5
                          </Button>
                          <Button 
                            variant="default" 
                            size="lg"
                            onClick={() => addPoints(activeP.id, 5)}
                            className="bg-green-500 hover:bg-green-600"
                          >
                            <Plus className="w-4 h-4 mr-1" /> 5
                          </Button>
                          <Button 
                            variant="default" 
                            size="lg"
                            onClick={() => addPoints(activeP.id, 10)}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <Plus className="w-4 h-4 mr-1" /> 10
                          </Button>
                          <Button 
                            variant="gradient" 
                            size="lg"
                            onClick={() => addPoints(activeP.id, 20)}
                          >
                            <Plus className="w-4 h-4 mr-1" /> 20
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Live Leaderboard */}
          <div className="space-y-6">
            <Card variant="glass">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Live Scoreboard
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
                {sortedParticipants.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Waiting for participants...</p>
                  </div>
                ) : (
                  sortedParticipants.map((participant, index) => (
                    <motion.div
                      key={participant.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        index < 3 ? 'bg-primary/5' : 'bg-muted/50'
                      } ${
                        gameState.activeParticipantId === participant.id ? 'ring-2 ring-primary' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 flex justify-center">
                          {getRankIcon(index + 1)}
                        </div>
                        <span className="text-xl">{participant.avatar}</span>
                        <div>
                          <p className="font-medium text-sm">{participant.nickname}</p>
                          {participant.buzzerOrder && (
                            <Badge variant="outline" className="text-xs">
                              #{participant.buzzerOrder} buzzer
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg">{participant.score}</span>
                        <div className="flex flex-col gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => addPoints(participant.id, 5)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => addPoints(participant.id, -5)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

// ================= PARTICIPANT VIEW =================
interface BuzzerParticipantViewProps {
  sessionId: string;
  sessionCode: string;
  participantId: string;
  nickname: string;
  avatar: string;
}

export const BuzzerParticipantView = ({ 
  sessionId, 
  sessionCode, 
  participantId, 
  nickname, 
  avatar 
}: BuzzerParticipantViewProps) => {
  const [gameState, setGameState] = useState<BuzzerGameState>({
    status: 'waiting',
    currentRound: 1,
    activeParticipantId: null,
    timerRunning: false,
    timerSeconds: 30,
    maxTimerSeconds: 30,
    buzzerQueue: [],
    questionNumber: 1
  });
  const [score, setScore] = useState(0);
  const [hasBuzzed, setHasBuzzed] = useState(false);
  const [buzzerPosition, setBuzzerPosition] = useState<number | null>(null);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [leaderboard, setLeaderboard] = useState<BuzzerParticipant[]>([]);
  const [finalLeaderboard, setFinalLeaderboard] = useState<(BuzzerParticipant & { rank: number })[]>([]);
  const [localTimer, setLocalTimer] = useState(30);

  // Subscribe to game state and also create channel for sending buzzer presses
  const buzzerChannelRef = useRef<any>(null);
  
  useEffect(() => {
    // Subscribe to game events on the main game channel
    const gameChannel = supabase
      .channel(`buzzer-game-${sessionId}`)
      .on('broadcast', { event: 'game-state' }, ({ payload }) => {
        setGameState(payload);
      })
      .on('broadcast', { event: 'buzzer-open' }, ({ payload }) => {
        setHasBuzzed(false);
        setBuzzerPosition(null);
        setGameState(prev => ({
          ...prev,
          status: 'buzzer-open',
          questionNumber: payload.questionNumber,
          buzzerQueue: []
        }));
      })
      .on('broadcast', { event: 'buzzer-closed' }, () => {
        setGameState(prev => ({
          ...prev,
          status: 'answering'
        }));
      })
      .on('broadcast', { event: 'active-participant' }, ({ payload }) => {
        setIsMyTurn(payload.participantId === participantId);
        setGameState(prev => ({
          ...prev,
          activeParticipantId: payload.participantId
        }));
      })
      .on('broadcast', { event: 'timer-start' }, ({ payload }) => {
        setLocalTimer(payload.seconds);
        setGameState(prev => ({
          ...prev,
          timerRunning: true,
          timerSeconds: payload.seconds
        }));
      })
      .on('broadcast', { event: 'timer-pause' }, () => {
        setGameState(prev => ({
          ...prev,
          timerRunning: false
        }));
      })
      .on('broadcast', { event: 'score-update' }, ({ payload }) => {
        if (payload.participantId === participantId) {
          setScore(prev => Math.max(0, prev + payload.points));
        }
        // Update leaderboard
        setLeaderboard(prev => prev.map(p => {
          if (p.id === payload.participantId) {
            return { ...p, score: Math.max(0, p.score + payload.points) };
          }
          return p;
        }));
      })
      .on('broadcast', { event: 'next-question' }, ({ payload }) => {
        setHasBuzzed(false);
        setBuzzerPosition(null);
        setIsMyTurn(false);
        setGameState(prev => ({
          ...prev,
          status: 'waiting',
          questionNumber: payload.questionNumber,
          buzzerQueue: [],
          activeParticipantId: null
        }));
      })
      .on('broadcast', { event: 'session-ended' }, ({ payload }) => {
        // Store final leaderboard if provided
        if (payload?.finalLeaderboard) {
          setFinalLeaderboard(payload.finalLeaderboard);
        }
        setGameState(prev => ({
          ...prev,
          status: 'ended'
        }));
      })
      .subscribe();
    
    // Subscribe to the host channel for sending buzzer presses (same channel name as host listens on)
    const hostChannel = supabase
      .channel(`buzzer-host-${sessionId}`)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Participant connected to host channel');
        }
      });
    
    buzzerChannelRef.current = hostChannel;

    // Fetch initial score
    const fetchScore = async () => {
      const { data } = await supabase
        .from('participants')
        .select('score')
        .eq('id', participantId)
        .single();
      
      if (data) setScore(data.score || 0);
    };
    fetchScore();

    // Fetch leaderboard
    const fetchLeaderboard = async () => {
      const { data } = await supabase
        .from('participants')
        .select('*')
        .eq('session_id', sessionId)
        .order('score', { ascending: false });
      
      if (data) {
        setLeaderboard(data.map(p => ({
          id: p.id,
          nickname: p.nickname || 'Anonymous',
          avatar: p.avatar || '😀',
          score: p.score || 0,
          buzzerTime: null,
          buzzerOrder: null,
          isActive: true,
          hasAnswered: false
        })));
      }
    };
    fetchLeaderboard();

    // Subscribe to leaderboard changes
    const leaderboardChannel = supabase
      .channel(`leaderboard-${sessionId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'participants',
        filter: `session_id=eq.${sessionId}`
      }, () => {
        fetchLeaderboard();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(gameChannel);
      supabase.removeChannel(hostChannel);
      supabase.removeChannel(leaderboardChannel);
    };
  }, [sessionId, participantId]);

  // Local timer countdown
  useEffect(() => {
    if (gameState.timerRunning && localTimer > 0) {
      const timer = setTimeout(() => {
        setLocalTimer(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [gameState.timerRunning, localTimer]);

  const pressBuzzer = () => {
    if (hasBuzzed || gameState.status !== 'buzzer-open') return;
    
    setHasBuzzed(true);
    const timestamp = Date.now();
    
    console.log('🎯 Participant pressing buzzer:', { participantId, timestamp, channelReady: !!buzzerChannelRef.current });
    
    // Send buzzer press to host using the subscribed channel
    if (buzzerChannelRef.current) {
      buzzerChannelRef.current.send({
        type: 'broadcast',
        event: 'buzzer-press',
        payload: { participantId, timestamp }
      }).then(() => {
        console.log('✅ Buzzer press sent successfully');
      }).catch((error: any) => {
        console.error('❌ Failed to send buzzer press:', error);
      });
    } else {
      console.error('❌ Buzzer channel not ready!');
    }

    // Play sound
    try {
      const audio = new Audio('/click.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch (e) {}

    toast.success("Buzzer pressed!");
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="w-5 h-5 text-amber-500" />;
      case 2: return <Medal className="w-5 h-5 text-gray-400" />;
      case 3: return <Medal className="w-5 h-5 text-amber-700" />;
      default: return <span className="text-sm font-bold text-muted-foreground">{rank}</span>;
    }
  };

  const myRank = leaderboard.findIndex(p => p.id === participantId) + 1;
  const myFinalRank = finalLeaderboard.length > 0 
    ? finalLeaderboard.findIndex(p => p.id === participantId) + 1 
    : myRank;

  // Final leaderboard screen when game ends
  if (gameState.status === 'ended') {
    const displayLeaderboard = finalLeaderboard.length > 0 ? finalLeaderboard : leaderboard.map((p, idx) => ({ ...p, rank: idx + 1 }));
    const myEntry = displayLeaderboard.find(p => p.id === participantId);
    const topThree = displayLeaderboard.slice(0, 3);
    
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-primary/5 p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center pt-8"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
            >
              <Trophy className="w-20 h-20 mx-auto mb-4 text-amber-500" />
            </motion.div>
            <h1 className="text-3xl font-display font-bold mb-2">Game Over!</h1>
            <p className="text-muted-foreground">Final Results</p>
          </motion.div>

          {/* Podium - Top 3 */}
          {topThree.length >= 3 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-end justify-center gap-4 h-48"
            >
              {/* 2nd Place */}
              <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col items-center"
              >
                <span className="text-4xl mb-2">{topThree[1]?.avatar}</span>
                <p className="font-semibold text-sm truncate max-w-[80px]">{topThree[1]?.nickname}</p>
                <p className="text-lg font-bold text-primary">{topThree[1]?.score}</p>
                <div className="w-20 h-24 bg-gray-400/20 rounded-t-lg flex items-center justify-center mt-2">
                  <Medal className="w-8 h-8 text-gray-400" />
                </div>
              </motion.div>
              
              {/* 1st Place */}
              <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="flex flex-col items-center"
              >
                <span className="text-5xl mb-2">{topThree[0]?.avatar}</span>
                <p className="font-bold truncate max-w-[100px]">{topThree[0]?.nickname}</p>
                <p className="text-xl font-bold text-primary">{topThree[0]?.score}</p>
                <div className="w-24 h-32 bg-amber-500/20 rounded-t-lg flex items-center justify-center mt-2">
                  <Crown className="w-10 h-10 text-amber-500" />
                </div>
              </motion.div>
              
              {/* 3rd Place */}
              <motion.div 
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="flex flex-col items-center"
              >
                <span className="text-4xl mb-2">{topThree[2]?.avatar}</span>
                <p className="font-semibold text-sm truncate max-w-[80px]">{topThree[2]?.nickname}</p>
                <p className="text-lg font-bold text-primary">{topThree[2]?.score}</p>
                <div className="w-20 h-16 bg-amber-700/20 rounded-t-lg flex items-center justify-center mt-2">
                  <Medal className="w-8 h-8 text-amber-700" />
                </div>
              </motion.div>
            </motion.div>
          )}

          {/* Your Result Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
          >
            <Card className="border-primary bg-primary/5">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <span className="text-4xl">{avatar}</span>
                    <div>
                      <p className="font-bold text-lg">{nickname}</p>
                      <p className="text-sm text-muted-foreground">That's you!</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-primary">{myEntry?.score || score}</p>
                    <Badge variant="outline" className="mt-1">
                      Rank #{myFinalRank}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Full Leaderboard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <Card variant="glass">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  Final Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
                {displayLeaderboard.map((participant, index) => (
                  <motion.div
                    key={participant.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 1 + index * 0.05 }}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      participant.id === participantId 
                        ? 'bg-primary/10 border border-primary/50' 
                        : index < 3 ? 'bg-amber-500/5' : 'bg-muted/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 flex justify-center">
                        {getRankIcon(index + 1)}
                      </div>
                      <span className="text-xl">{participant.avatar}</span>
                      <span className="font-medium">
                        {participant.nickname}
                        {participant.id === participantId && <span className="text-primary ml-1">(You)</span>}
                      </span>
                    </div>
                    <span className="font-bold text-lg">{participant.score}</span>
                  </motion.div>
                ))}
              </CardContent>
            </Card>
          </motion.div>

          {/* Back to Home Button */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="text-center pb-8"
          >
            <Button variant="gradient" size="lg" onClick={() => window.location.href = '/'}>
              Back to Home
            </Button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{avatar}</span>
            <div>
              <p className="font-bold">{nickname}</p>
              <p className="text-sm text-muted-foreground">Code: {sessionCode}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Your Score</p>
            <p className="text-2xl font-bold text-primary">{score}</p>
          </div>
        </div>

        {/* Question Number */}
        <Card className="text-center py-3">
          <Badge variant="outline" className="text-lg px-6">
            Question #{gameState.questionNumber}
          </Badge>
        </Card>

        {/* Main Buzzer Area */}
        <Card variant="elevated" className="overflow-hidden">
          <CardContent className="p-6">
            {gameState.status === 'waiting' && (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 mx-auto mb-4 text-muted-foreground animate-pulse" />
                <h2 className="text-xl font-bold mb-2">Waiting for Host</h2>
                <p className="text-muted-foreground">The host will open the buzzer soon...</p>
              </div>
            )}

            {gameState.status === 'buzzer-open' && !hasBuzzed && (
              <motion.div 
                className="text-center py-8"
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
              >
                <motion.button
                  onClick={pressBuzzer}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="w-48 h-48 mx-auto rounded-full bg-gradient-to-br from-red-500 to-red-600 shadow-2xl shadow-red-500/30 flex items-center justify-center hover:from-red-600 hover:to-red-700 transition-all"
                >
                  <div className="text-center text-white">
                    <Bell className="w-16 h-16 mx-auto mb-2" />
                    <p className="text-xl font-bold">BUZZ!</p>
                  </div>
                </motion.button>
                <p className="mt-4 text-muted-foreground animate-pulse">Press the buzzer!</p>
              </motion.div>
            )}

            {gameState.status === 'buzzer-open' && hasBuzzed && (
              <div className="text-center py-12">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-24 h-24 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center"
                >
                  <Check className="w-12 h-12 text-green-500" />
                </motion.div>
                <h2 className="text-xl font-bold text-green-500 mb-2">Buzzer Pressed!</h2>
                <p className="text-muted-foreground">Waiting for host to close buzzer...</p>
              </div>
            )}

            {(gameState.status === 'answering' || gameState.status === 'scoring') && (
              <div className="text-center py-8">
                {isMyTurn ? (
                  <motion.div
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    className="space-y-4"
                  >
                    <div className="w-24 h-24 mx-auto rounded-full bg-green-500/20 flex items-center justify-center animate-pulse">
                      <User className="w-12 h-12 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-green-500">YOUR TURN!</h2>
                    <p className="text-muted-foreground">Answer the question now!</p>
                    
                    {/* Timer */}
                    <div className="p-4 bg-muted/50 rounded-xl">
                      <Timer className={`w-8 h-8 mx-auto mb-2 ${gameState.timerRunning ? 'text-green-500 animate-pulse' : 'text-muted-foreground'}`} />
                      <p className={`text-4xl font-mono font-bold ${
                        localTimer <= 5 ? 'text-red-500' :
                        localTimer <= 10 ? 'text-amber-500' :
                        'text-primary'
                      }`}>
                        {localTimer}s
                      </p>
                    </div>
                  </motion.div>
                ) : hasBuzzed ? (
                  <div className="space-y-4">
                    <div className="w-20 h-20 mx-auto rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Clock className="w-10 h-10 text-amber-500" />
                    </div>
                    <h2 className="text-xl font-bold">Waiting in Queue</h2>
                    <p className="text-muted-foreground">Someone else is answering...</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="w-20 h-20 mx-auto rounded-full bg-muted flex items-center justify-center">
                      <XCircle className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <h2 className="text-xl font-bold text-muted-foreground">Buzzer Closed</h2>
                    <p className="text-muted-foreground">Wait for the next question</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Mini Leaderboard */}
        <Card variant="glass">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Trophy className="w-5 h-5 text-amber-500" />
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {leaderboard.slice(0, 5).map((participant, index) => (
              <div
                key={participant.id}
                className={`flex items-center justify-between p-2 rounded-lg ${
                  participant.id === participantId 
                    ? 'bg-primary/10 border border-primary/50' 
                    : 'bg-muted/30'
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-6 flex justify-center">
                    {getRankIcon(index + 1)}
                  </div>
                  <span className="text-lg">{participant.avatar}</span>
                  <span className="font-medium text-sm">
                    {participant.nickname}
                    {participant.id === participantId && <span className="text-primary ml-1">(You)</span>}
                  </span>
                </div>
                <span className="font-bold">{participant.score}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ================= JOIN SCREEN =================
interface BuzzerJoinScreenProps {
  sessionCode: string;
  onJoin: (nickname: string, avatar: string) => void;
  isJoining: boolean;
}

export const BuzzerJoinScreen = ({ sessionCode, onJoin, isJoining }: BuzzerJoinScreenProps) => {
  const [nickname, setNickname] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("😀");
  
  const AVATARS = ["😀", "😎", "🤓", "🦊", "🐱", "🐶", "🦁", "🐼", "🐨", "🐸", "🐵", "🦄", "🐲", "🦋", "🐝", "🦉"];

  const handleJoin = () => {
    if (!nickname.trim()) {
      toast.error("Please enter your name");
      return;
    }
    onJoin(nickname.trim(), selectedAvatar);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Bell className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Join Buzzer Game</CardTitle>
          <CardDescription>
            Session Code: <span className="font-mono font-bold text-primary">{sessionCode}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Your Name</label>
            <Input
              placeholder="Enter your name"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleJoin()}
              maxLength={20}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Choose Avatar</label>
            <div className="grid grid-cols-8 gap-2">
              {AVATARS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setSelectedAvatar(emoji)}
                  className={`text-2xl p-2 rounded-lg transition-all ${
                    selectedAvatar === emoji
                      ? 'bg-primary/20 ring-2 ring-primary'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          <Button 
            variant="gradient" 
            className="w-full" 
            size="lg"
            onClick={handleJoin}
            disabled={isJoining || !nickname.trim()}
          >
            {isJoining ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2"
                />
                Joining...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Join Game
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BuzzerHostPanel;
