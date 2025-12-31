import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play,
  Pause,
  SkipForward,
  StopCircle,
  Users,
  Timer,
  BarChart3,
  Trophy,
  Ban,
  Edit3,
  UserX,
  Volume2,
  VolumeX,
  Sparkles,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useLeaderboard, useParticipantCount } from "@/hooks/useResponses";
import type { SessionWithDetails, Question } from "@/services/sessionService";
import type { Participant } from "@/services/responseService";
import { responseService } from "@/services/responseService";
import { sessionService } from "@/services/sessionService";
import { ChaosControls, useChaosMode } from "@/components/session/ChaosMode";

interface HostControlPanelProps {
  session: SessionWithDetails;
  onSessionUpdate?: (session: SessionWithDetails) => void;
}

export const HostControlPanel = ({ session, onSessionUpdate }: HostControlPanelProps) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [chaosEnabled, setChaosEnabled] = useState(false);

  const { count: participantCount, participants } = useParticipantCount(session.id);
  const { leaderboard } = useLeaderboard(session.id);
  const { triggerEffect } = useChaosMode(chaosEnabled);

  const questions = session.questions || [];
  const currentQuestion = questions[currentQuestionIndex] as (Question & { options?: any[] }) | undefined;

  // Timer logic
  useEffect(() => {
    if (timeRemaining === null || isPaused || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 0) return 0;
        if (prev === 5 && soundEnabled) {
          // Play countdown sound would go here
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeRemaining, isPaused, soundEnabled]);

  // When timer hits 0
  useEffect(() => {
    if (timeRemaining === 0 && !showResults) {
      setShowResults(true);
      if (chaosEnabled) {
        triggerEffect("confetti", "milestone", 0.5);
      }
    }
  }, [timeRemaining, showResults, chaosEnabled, triggerEffect]);

  const startQuestion = () => {
    setShowResults(false);
    setTimeRemaining(currentQuestion?.time_limit || 30);
    setIsPaused(false);
  };

  const pauseQuestion = () => {
    setIsPaused(!isPaused);
  };

  const endQuestion = () => {
    setTimeRemaining(0);
    setShowResults(true);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
      setShowResults(false);
      setTimeRemaining(null);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
      setShowResults(false);
      setTimeRemaining(null);
    }
  };

  const endSession = async () => {
    const success = await sessionService.updateSessionStatus(session.id, "ended");
    if (success) {
      toast.success("Session ended");
      if (onSessionUpdate) {
        onSessionUpdate({ ...session, status: "ended" });
      }
    }
  };

  const moderatePlayer = async (participantId: string, action: "block" | "rename" | "kick") => {
    const success = await responseService.moderateParticipant(participantId, action);
    if (success) {
      toast.success(`Player ${action}ed`);
    } else {
      toast.error(`Failed to ${action} player`);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, "0")}` : `${secs}s`;
  };

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="w-5 h-5" />
            <span className="font-medium">{participantCount} participants</span>
          </div>
          <div className="h-6 w-px bg-border" />
          <div className="flex items-center gap-2 text-muted-foreground">
            <BarChart3 className="w-5 h-5" />
            <span className="font-medium">
              Q{currentQuestionIndex + 1}/{questions.length}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </Button>
          <Button
            variant={chaosEnabled ? "gradient" : "outline"}
            size="sm"
            onClick={() => setChaosEnabled(!chaosEnabled)}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Chaos Mode
          </Button>
          <Button variant="destructive" size="sm" onClick={endSession}>
            <StopCircle className="w-4 h-4 mr-2" />
            End Session
          </Button>
        </div>
      </div>

      {/* Chaos Controls */}
      {chaosEnabled && (
        <Card className="bg-gradient-to-r from-primary/10 to-spark-coral/10 border-primary/30">
          <CardContent className="py-4">
            <p className="text-sm font-medium mb-3">Trigger Effects</p>
            <ChaosControls
              onTrigger={(type) => triggerEffect(type, "manual", 1)}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Question */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-primary" />
                Current Question
              </CardTitle>
              {timeRemaining !== null && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={`text-2xl font-bold ${
                    timeRemaining <= 5 ? "text-destructive" : "text-primary"
                  }`}
                >
                  {formatTime(timeRemaining)}
                </motion.div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentQuestion ? (
              <>
                <p className="text-xl font-medium">{currentQuestion.question_text}</p>

                {/* Options Grid */}
                {currentQuestion.options && (
                  <div className="grid grid-cols-2 gap-3">
                    {currentQuestion.options.map((option: any, index: number) => (
                      <div
                        key={option.id || index}
                        className={`p-4 rounded-xl border-2 transition-all ${
                          showResults && option.is_correct
                            ? "border-spark-green bg-spark-green/10"
                            : "border-border"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center font-medium ${
                              showResults && option.is_correct
                                ? "bg-spark-green text-white"
                                : "bg-muted"
                            }`}
                          >
                            {String.fromCharCode(65 + index)}
                          </div>
                          <span className="font-medium">{option.option_text}</span>
                        </div>
                        {showResults && (
                          <div className="mt-3">
                            <div className="flex justify-between text-sm mb-1">
                              <span>Votes</span>
                              <span className="font-medium">0</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: "0%" }}
                                transition={{ duration: 0.5 }}
                                className="h-full bg-primary rounded-full"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={prevQuestion}
                      disabled={currentQuestionIndex === 0}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={nextQuestion}
                      disabled={currentQuestionIndex >= questions.length - 1}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    {timeRemaining === null ? (
                      <Button variant="gradient" onClick={startQuestion}>
                        <Play className="w-4 h-4 mr-2" />
                        Start Question
                      </Button>
                    ) : timeRemaining > 0 ? (
                      <>
                        <Button variant="outline" onClick={pauseQuestion}>
                          {isPaused ? (
                            <Play className="w-4 h-4 mr-2" />
                          ) : (
                            <Pause className="w-4 h-4 mr-2" />
                          )}
                          {isPaused ? "Resume" : "Pause"}
                        </Button>
                        <Button variant="gradient" onClick={endQuestion}>
                          <SkipForward className="w-4 h-4 mr-2" />
                          End & Show Results
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="gradient"
                        onClick={nextQuestion}
                        disabled={currentQuestionIndex >= questions.length - 1}
                      >
                        <SkipForward className="w-4 h-4 mr-2" />
                        Next Question
                      </Button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">No questions in this session</p>
            )}
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Live Leaderboard */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                Live Leaderboard
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[300px] overflow-y-auto">
              <AnimatePresence>
                {leaderboard.slice(0, 10).map((entry, index) => (
                  <motion.div
                    key={entry.participantId}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50"
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0
                          ? "bg-amber-500 text-white"
                          : index === 1
                          ? "bg-gray-400 text-white"
                          : index === 2
                          ? "bg-amber-700 text-white"
                          : "bg-muted"
                      }`}
                    >
                      {entry.rank}
                    </div>
                    <span className="flex-1 truncate font-medium">
                      {entry.nickname}
                    </span>
                    <span className="text-primary font-bold">{entry.score}</span>
                    {entry.streak >= 3 && (
                      <span className="text-orange-500 text-sm">🔥{entry.streak}</span>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              {leaderboard.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No scores yet
                </p>
              )}
            </CardContent>
          </Card>

          {/* Participants */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Participants ({participants.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[200px] overflow-y-auto">
              {participants.slice(0, 20).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 group"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-spark-coral flex items-center justify-center text-white text-sm font-medium">
                    {(p.nickname || "A")[0].toUpperCase()}
                  </div>
                  <span className="flex-1 truncate text-sm">{p.nickname || "Anonymous"}</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6"
                      onClick={() => moderatePlayer(p.id, "rename")}
                    >
                      <Edit3 className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 text-destructive"
                      onClick={() => moderatePlayer(p.id, "block")}
                    >
                      <Ban className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 text-destructive"
                      onClick={() => moderatePlayer(p.id, "kick")}
                    >
                      <UserX className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {participants.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Waiting for participants...
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HostControlPanel;
