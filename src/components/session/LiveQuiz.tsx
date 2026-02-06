import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Timer, 
  Trophy, 
  CheckCircle2, 
  XCircle, 
  Zap,
  Medal,
  Crown,
  Loader2
} from "lucide-react";
import type { LeaderboardEntry } from "@/lib/database.types";

interface QuizOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

interface LiveQuizProps {
  question: string;
  questionNumber: number;
  totalQuestions: number;
  options: QuizOption[];
  timeLimit: number;
  hasAnswered: boolean;
  selectedAnswer: string | null;
  onAnswer: (optionId: string, responseTime: number) => void;
  isRevealing?: boolean;
  correctAnswer?: string;
  leaderboard: LeaderboardEntry[];
  currentScore: number;
  currentStreak: number;
}

export const LiveQuiz = ({
  question,
  questionNumber,
  totalQuestions,
  options,
  timeLimit,
  hasAnswered,
  selectedAnswer,
  onAnswer,
  isRevealing = false,
  correctAnswer,
  leaderboard,
  currentScore,
  currentStreak,
}: LiveQuizProps) => {
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const [startTime] = useState(Date.now());
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  // Timer countdown
  useEffect(() => {
    if (hasAnswered || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [hasAnswered, timeRemaining]);

  const handleAnswer = useCallback((optionId: string) => {
    if (hasAnswered || timeRemaining <= 0) return;
    const responseTime = (Date.now() - startTime) / 1000;
    onAnswer(optionId, responseTime);
  }, [hasAnswered, timeRemaining, startTime, onAnswer]);

  // Calculate time bonus percentage
  const timeBonus = timeRemaining > 0 ? Math.round((timeRemaining / timeLimit) * 100) : 0;

  // Timer color based on remaining time
  const getTimerColor = () => {
    const percentage = (timeRemaining / timeLimit) * 100;
    if (percentage > 50) return "text-spark-green";
    if (percentage > 25) return "text-amber-500";
    return "text-spark-coral";
  };

  return (
    <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
      {/* Header with timer and score */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1 sm:gap-2">
            <span className="text-xs sm:text-sm text-muted-foreground">Question</span>
            <span className="font-bold text-sm sm:text-base">{questionNumber}/{totalQuestions}</span>
          </div>
          {currentStreak >= 2 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-500"
            >
              <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm font-bold">{currentStreak} streak!</span>
            </motion.div>
          )}
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1 sm:gap-2">
            <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            <span className="font-bold text-sm sm:text-base">{currentScore}</span>
          </div>
        </div>
      </div>

      {/* Timer */}
      <div className="relative">
        <motion.div
          className="h-1.5 sm:h-2 rounded-full bg-muted overflow-hidden"
        >
          <motion.div
            initial={{ width: "100%" }}
            animate={{ width: `${(timeRemaining / timeLimit) * 100}%` }}
            transition={{ duration: 0.5 }}
            className={`h-full ${
              timeRemaining > timeLimit * 0.5 
                ? "bg-spark-green" 
                : timeRemaining > timeLimit * 0.25 
                  ? "bg-amber-500" 
                  : "bg-spark-coral"
            }`}
          />
        </motion.div>
        <div className={`absolute -top-1 right-0 flex items-center gap-1 ${getTimerColor()}`}>
          <Timer className="w-3 h-3 sm:w-4 sm:h-4" />
          <span className="font-bold text-base sm:text-lg">{timeRemaining}s</span>
        </div>
      </div>

      {/* Question */}
      <Card variant="elevated">
        <CardContent className="p-4 sm:p-6 md:p-8 text-center">
          <h1 className="text-lg sm:text-2xl md:text-3xl font-display font-bold">{question}</h1>
        </CardContent>
      </Card>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        <AnimatePresence mode="wait">
          {options.map((option, index) => {
            const isSelected = selectedAnswer === option.id;
            const isCorrectOption = correctAnswer === option.id || option.isCorrect;
            const showResult = isRevealing || (hasAnswered && correctAnswer);

            let bgColor = "bg-card";
            let borderColor = "border-border hover:border-primary/50";
            let icon = null;

            if (showResult) {
              if (isCorrectOption) {
                bgColor = "bg-spark-green/10";
                borderColor = "border-spark-green";
                icon = <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-spark-green" />;
              } else if (isSelected && !isCorrectOption) {
                bgColor = "bg-spark-coral/10";
                borderColor = "border-spark-coral";
                icon = <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-spark-coral" />;
              }
            } else if (isSelected) {
              bgColor = "bg-primary/10";
              borderColor = "border-primary";
            }

            const optionColors = [
              "from-red-500/20 to-red-600/20",
              "from-blue-500/20 to-blue-600/20",
              "from-amber-500/20 to-amber-600/20",
              "from-green-500/20 to-green-600/20",
            ];

            return (
              <motion.button
                key={option.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => handleAnswer(option.id)}
                disabled={hasAnswered || timeRemaining <= 0}
                className={`relative p-4 sm:p-6 rounded-xl border-2 text-left transition-all ${borderColor} ${bgColor} ${
                  hasAnswered || timeRemaining <= 0 ? 'cursor-not-allowed' : 'cursor-pointer'
                }`}
              >
                <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${optionColors[index % 4]} opacity-50`} />
                <div className="relative flex items-center gap-3 sm:gap-4">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center text-base sm:text-lg font-bold shrink-0 ${
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className="font-medium flex-1 text-sm sm:text-base">{option.text}</span>
                  {icon && <div className="shrink-0">{icon}</div>}
                </div>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Time's up or answered feedback */}
      {(timeRemaining <= 0 && !hasAnswered) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-3 sm:p-4 rounded-xl bg-spark-coral/10 border border-spark-coral"
        >
          <XCircle className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-spark-coral" />
          <p className="font-bold text-sm sm:text-base text-spark-coral">Time's up!</p>
        </motion.div>
      )}

      {hasAnswered && correctAnswer && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`text-center p-3 sm:p-4 rounded-xl ${
            selectedAnswer === correctAnswer 
              ? "bg-spark-green/10 border border-spark-green" 
              : "bg-spark-coral/10 border border-spark-coral"
          }`}
        >
          {selectedAnswer === correctAnswer ? (
            <>
              <CheckCircle2 className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-spark-green" />
              <p className="font-bold text-sm sm:text-base text-spark-green">Correct! +{100 + timeBonus} points</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Time bonus: +{timeBonus}</p>
            </>
          ) : (
            <>
              <XCircle className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-spark-coral" />
              <p className="font-bold text-sm sm:text-base text-spark-coral">Incorrect</p>
            </>
          )}
        </motion.div>
      )}

      {/* Leaderboard Toggle */}
      {leaderboard.length > 0 && (
        <div className="mt-6">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowLeaderboard(!showLeaderboard)}
          >
            <Trophy className="w-4 h-4 mr-2" />
            {showLeaderboard ? "Hide" : "Show"} Leaderboard
          </Button>

          <AnimatePresence>
            {showLeaderboard && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4"
              >
                <QuizLeaderboard entries={leaderboard} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

// Leaderboard Component
export const QuizLeaderboard = ({ entries, showFull = false }: { 
  entries: LeaderboardEntry[];
  showFull?: boolean;
}) => {
  const displayEntries = showFull ? entries : entries.slice(0, 5);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-amber-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-700" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-muted-foreground">{rank}</span>;
    }
  };

  return (
    <Card variant="glass">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
          Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {displayEntries.map((entry, index) => (
          <motion.div
            key={entry.participantId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg ${
              entry.rank <= 3 ? "bg-primary/5" : "bg-muted/50"
            }`}
          >
            <div className="w-6 sm:w-8 flex justify-center">
              {getRankIcon(entry.rank)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm sm:text-base truncate">{entry.nickname || `Player ${entry.rank}`}</p>
              <p className="text-xs text-muted-foreground">
                {entry.correctAnswers} correct • {entry.averageTime.toFixed(1)}s avg
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-base sm:text-lg">{entry.score}</p>
              {entry.streak && entry.streak >= 2 && (
                <div className="flex items-center gap-1 text-xs text-amber-500">
                  <Zap className="w-3 h-3" />
                  {entry.streak}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
};

export default LiveQuiz;
