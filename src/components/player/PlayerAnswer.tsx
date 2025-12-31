import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Timer, Zap } from "lucide-react";

interface PlayerAnswerProps {
  question: {
    text: string;
    options: { id: string; text: string }[];
    timeLimit: number;
  };
  onAnswer: (optionId: string, responseTime: number) => void;
  hasAnswered: boolean;
  pointsEarned?: number;
}

export const PlayerAnswer = ({ question, onAnswer, hasAnswered, pointsEarned }: PlayerAnswerProps) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(question.timeLimit);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    if (timeRemaining <= 0 || hasAnswered) return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeRemaining, hasAnswered]);

  const handleSelect = (optionId: string) => {
    if (hasAnswered || selectedOption) return;
    setSelectedOption(optionId);
    const responseTime = Date.now() - startTime;
    onAnswer(optionId, responseTime);
  };

  const colors = ["bg-primary", "bg-spark-coral", "bg-spark-teal", "bg-spark-green"];

  if (hasAnswered) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="min-h-[60vh] flex items-center justify-center p-4"
      >
        <Card variant="glass" className="text-center p-8 max-w-md">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
          >
            <CheckCircle className="w-20 h-20 mx-auto text-spark-green mb-4" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">Answer Submitted!</h2>
          {pointsEarned !== undefined && pointsEarned > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-center gap-2 text-primary text-xl font-bold"
            >
              <Zap className="w-6 h-6" />
              +{pointsEarned} points
            </motion.div>
          )}
          <p className="text-muted-foreground mt-4">Waiting for next question...</p>
        </Card>
      </motion.div>
    );
  }

  return (
    <div className="min-h-screen p-4 flex flex-col">
      {/* Timer */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <Timer className={`w-6 h-6 ${timeRemaining <= 5 ? "text-destructive" : "text-primary"}`} />
        <span className={`text-3xl font-bold ${timeRemaining <= 5 ? "text-destructive animate-pulse" : ""}`}>
          {timeRemaining}
        </span>
      </div>

      {/* Question */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <p className="text-xl font-medium text-center">{question.text}</p>
        </CardContent>
      </Card>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
        <AnimatePresence>
          {question.options.map((option, index) => (
            <motion.div
              key={option.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Button
                variant="outline"
                className={`w-full h-full min-h-[100px] text-lg font-medium transition-all ${
                  selectedOption === option.id ? "ring-4 ring-primary" : ""
                } ${colors[index % colors.length]} text-white border-none hover:opacity-90`}
                onClick={() => handleSelect(option.id)}
                disabled={!!selectedOption}
              >
                <span className="mr-2 font-bold">{String.fromCharCode(65 + index)}.</span>
                {option.text}
              </Button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PlayerAnswer;
