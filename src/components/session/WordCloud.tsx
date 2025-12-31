import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Cloud, Send, Loader2, CheckCircle2 } from "lucide-react";

interface WordEntry {
  text: string;
  count: number;
}

interface WordCloudProps {
  question: string;
  words: WordEntry[];
  hasResponded: boolean;
  onSubmit: (text: string) => void;
  submitting?: boolean;
  maxWords?: number;
}

// Color palette for words
const colors = [
  "text-primary",
  "text-spark-teal",
  "text-spark-coral",
  "text-spark-green",
  "text-purple-500",
  "text-amber-500",
  "text-blue-500",
  "text-pink-500",
];

export const WordCloud = ({
  question,
  words,
  hasResponded,
  onSubmit,
  submitting = false,
  maxWords = 3,
}: WordCloudProps) => {
  const [inputValue, setInputValue] = useState("");
  const [submittedWords, setSubmittedWords] = useState<string[]>([]);

  const handleSubmit = () => {
    const word = inputValue.trim();
    if (word && submittedWords.length < maxWords) {
      setSubmittedWords([...submittedWords, word]);
      onSubmit(word);
      setInputValue("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  // Calculate font sizes based on word frequency
  const maxCount = Math.max(...words.map(w => w.count), 1);
  const minSize = 14;
  const maxSize = 48;

  const wordElements = useMemo(() => {
    return words.map((word, index) => {
      const size = minSize + ((word.count / maxCount) * (maxSize - minSize));
      const color = colors[index % colors.length];
      const rotation = (Math.random() - 0.5) * 20;
      
      return {
        ...word,
        size,
        color,
        rotation,
        x: Math.random() * 80 + 10,
        y: Math.random() * 80 + 10,
      };
    });
  }, [words, maxCount]);

  return (
    <div className="space-y-6">
      {/* Question */}
      <Card variant="elevated">
        <CardContent className="p-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Cloud className="w-8 h-8 text-spark-teal" />
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-bold">{question}</h1>
        </CardContent>
      </Card>

      {/* Word Cloud Visualization */}
      <Card variant="glass">
        <CardContent className="p-6">
          <div className="relative h-64 overflow-hidden rounded-xl bg-gradient-to-br from-background to-muted/50">
            <AnimatePresence>
              {wordElements.length > 0 ? (
                wordElements.map((word, index) => (
                  <motion.div
                    key={`${word.text}-${index}`}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ 
                      opacity: 1, 
                      scale: 1,
                      x: `${word.x}%`,
                      y: `${word.y}%`,
                    }}
                    exit={{ opacity: 0, scale: 0 }}
                    transition={{ 
                      type: "spring",
                      stiffness: 200,
                      damping: 20,
                      delay: index * 0.05
                    }}
                    className={`absolute font-display font-bold ${word.color}`}
                    style={{ 
                      fontSize: `${word.size}px`,
                      transform: `translate(-50%, -50%) rotate(${word.rotation}deg)`,
                      left: `${word.x}%`,
                      top: `${word.y}%`,
                    }}
                  >
                    {word.text}
                  </motion.div>
                ))
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Cloud className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>Words will appear here as people submit them</p>
                  </div>
                </div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Word count stats */}
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {words.length} unique words submitted • {words.reduce((sum, w) => sum + w.count, 0)} total responses
          </div>
        </CardContent>
      </Card>

      {/* Input Section */}
      <Card variant="elevated">
        <CardContent className="p-6">
          {submittedWords.length >= maxWords ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-spark-green/10 text-spark-green mb-4">
                <CheckCircle2 className="w-5 h-5" />
                <span className="font-medium">Thanks for your input!</span>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {submittedWords.map((word, i) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">
                    {word}
                  </span>
                ))}
              </div>
            </motion.div>
          ) : (
            <div className="space-y-4">
              <div className="flex gap-3">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Enter a word or short phrase..."
                  disabled={submitting}
                  className="flex-1"
                  maxLength={50}
                />
                <Button
                  variant="gradient"
                  onClick={handleSubmit}
                  disabled={!inputValue.trim() || submitting}
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
              
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{submittedWords.length} of {maxWords} words submitted</span>
                {submittedWords.length > 0 && (
                  <div className="flex gap-2">
                    {submittedWords.map((word, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-muted text-foreground text-xs">
                        {word}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default WordCloud;
