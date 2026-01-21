import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Timer, Zap, Flame, Sparkles, X } from "lucide-react";
import confetti from 'canvas-confetti';

interface PlayerAnswerProps {
  question: {
    text: string;
    options: { id: string; text: string }[];
    timeLimit: number;
  };
  onAnswer: (optionId: string, responseTime: number) => void;
  hasAnswered: boolean;
  pointsEarned?: number;
  streak?: number;
  isCorrect?: boolean;
}

const optionColors = [
  { bg: "bg-primary", hover: "hover:bg-primary/90" },
  { bg: "bg-spark-coral", hover: "hover:bg-spark-coral/90" },
  { bg: "bg-spark-teal", hover: "hover:bg-spark-teal/90" },
  { bg: "bg-spark-green", hover: "hover:bg-spark-green/90" },
  { bg: "bg-purple-500", hover: "hover:bg-purple-500/90" },
  { bg: "bg-amber-500", hover: "hover:bg-amber-500/90" },
];

export const PlayerAnswer = ({ 
  question, 
  onAnswer, 
  hasAnswered, 
  pointsEarned, 
  streak = 0,
  isCorrect 
}: PlayerAnswerProps) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(question.timeLimit);
  const [startTime] = useState(Date.now());
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    if (timeRemaining <= 0 || hasAnswered) return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeRemaining, hasAnswered]);

  useEffect(() => {
    if (hasAnswered) {
      setShowFeedback(true);
      if (isCorrect && pointsEarned && pointsEarned > 0) {
        // Trigger confetti for correct answers
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    }
  }, [hasAnswered, isCorrect, pointsEarned]);

  const handleSelect = (optionId: string) => {
    if (hasAnswered || selectedOption) return;
    setSelectedOption(optionId);
    const responseTime = Date.now() - startTime;
    onAnswer(optionId, responseTime);
  };

  const progressPercent = (timeRemaining / question.timeLimit) * 100;
  const isUrgent = timeRemaining <= 5;

  if (showFeedback) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-[60vh] flex items-center justify-center p-4"
      >
        <Card variant="glass" className="text-center p-8 max-w-md w-full overflow-hidden">
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
            className={`w-24 h-24 mx-auto rounded-3xl flex items-center justify-center mb-6 ${
              isCorrect ? 'bg-gradient-to-br from-spark-green/20 to-emerald-500/20' : 'bg-gradient-to-br from-spark-coral/20 to-red-500/20'
            }`}
          >
            {isCorrect ? (
              <CheckCircle className="w-14 h-14 text-spark-green" />
            ) : (
              <X className="w-14 h-14 text-spark-coral" />
            )}
          </motion.div>

          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-2xl font-bold mb-4"
          >
            {isCorrect ? '🎉 Correct!' : 'Not Quite!'}
          </motion.h2>

          {pointsEarned !== undefined && pointsEarned > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", delay: 0.4 }}
              className="flex items-center justify-center gap-2 text-primary text-3xl font-bold mb-4"
            >
              <Zap className="w-8 h-8" />
              +{pointsEarned}
              <span className="text-lg text-muted-foreground">points</span>
            </motion.div>
          )}

          {/* Streak indicator */}
          {streak >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-center justify-center gap-2 mb-4"
            >
              <div className="px-4 py-2 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30 flex items-center gap-2">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                >
                  <Flame className="w-5 h-5 text-orange-500" />
                </motion.div>
                <span className="font-bold text-orange-500">{streak} streak!</span>
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity, delay: 0.25 }}
                >
                  <Flame className="w-5 h-5 text-orange-500" />
                </motion.div>
              </div>
            </motion.div>
          )}

          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-muted-foreground flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Waiting for next question...
          </motion.p>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen p-4 flex flex-col">
      {/* Timer Bar */}
      <motion.div 
        className="mb-6"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <motion.div
              animate={isUrgent ? { scale: [1, 1.2, 1] } : {}}
              transition={{ duration: 0.5, repeat: isUrgent ? Infinity : 0 }}
            >
              <Timer className={`w-6 h-6 ${isUrgent ? "text-destructive" : "text-primary"}`} />
            </motion.div>
            <span className={`text-3xl font-bold ${isUrgent ? "text-destructive" : ""}`}>
              {timeRemaining}
            </span>
          </div>
          {streak >= 2 && (
            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-orange-500/20 border border-orange-500/30">
              <Flame className="w-4 h-4 text-orange-500" />
              <span className="text-sm font-bold text-orange-500">{streak}</span>
            </div>
          )}
        </div>
        
        {/* Progress bar */}
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${isUrgent ? 'bg-destructive' : 'bg-primary'}`}
            initial={{ width: '100%' }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </motion.div>

      {/* Question */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="mb-6 border-2 border-border">
          <CardContent className="p-6">
            <p className="text-xl md:text-2xl font-medium text-center leading-relaxed">
              {question.text}
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
        <AnimatePresence>
          {question.options.map((option, index) => {
            const color = optionColors[index % optionColors.length];
            return (
              <motion.div
                key={option.id}
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ 
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 200
                }}
                whileHover={!selectedOption ? { scale: 1.02 } : {}}
                whileTap={!selectedOption ? { scale: 0.98 } : {}}
              >
                <Button
                  variant="outline"
                  className={`w-full h-full min-h-[100px] text-lg font-medium transition-all relative overflow-hidden ${
                    selectedOption === option.id 
                      ? "ring-4 ring-white shadow-lg" 
                      : ""
                  } ${color.bg} text-white border-none ${color.hover}`}
                  onClick={() => handleSelect(option.id)}
                  disabled={!!selectedOption}
                >
                  {/* Option letter badge */}
                  <span className="absolute top-2 left-2 w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-sm font-bold">
                    {String.fromCharCode(65 + index)}
                  </span>
                  
                  <span className="px-8">{option.text}</span>

                  {selectedOption === option.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2"
                    >
                      <CheckCircle className="w-6 h-6 text-white" />
                    </motion.div>
                  )}
                </Button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PlayerAnswer;
