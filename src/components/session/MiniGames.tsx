import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Gamepad2, 
  Timer, 
  Trophy, 
  Zap, 
  Brain,
  Shuffle,
  Smile,
  CheckCircle2,
  XCircle,
  Crown,
  Medal
} from "lucide-react";
import type { MiniGameType, LeaderboardEntry } from "@/lib/database.types";

interface MiniGameProps {
  type: MiniGameType;
  gameData: any;
  onComplete: (score: number, timeElapsed: number) => void;
  timeLimit?: number;
}

// Fastest Finger Game
const FastestFingerGame = ({ 
  question, 
  answer, 
  onComplete 
}: { 
  question: string; 
  answer: string; 
  onComplete: (correct: boolean, time: number) => void 
}) => {
  const [inputValue, setInputValue] = useState("");
  const [startTime] = useState(Date.now());
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (submitted) return;
    const time = (Date.now() - startTime) / 1000;
    const correct = inputValue.toLowerCase().trim() === answer.toLowerCase().trim();
    setSubmitted(true);
    onComplete(correct, time);
  };

  return (
    <div className="space-y-6">
      <Card variant="elevated">
        <CardContent className="p-8 text-center">
          <Zap className="w-12 h-12 mx-auto mb-4 text-amber-500" />
          <h1 className="text-2xl md:text-3xl font-display font-bold">{question}</h1>
          <p className="text-muted-foreground mt-2">Type the answer as fast as you can!</p>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Type your answer..."
          disabled={submitted}
          autoFocus
          className="flex-1 text-lg"
        />
        <Button
          variant="gradient"
          size="lg"
          onClick={handleSubmit}
          disabled={submitted || !inputValue.trim()}
        >
          Submit
        </Button>
      </div>
    </div>
  );
};

// Memory Match Game
const MemoryMatchGame = ({ 
  cards, 
  onComplete 
}: { 
  cards: { id: string; content: string; matchId: string }[]; 
  onComplete: (matches: number, time: number) => void 
}) => {
  const [flipped, setFlipped] = useState<string[]>([]);
  const [matched, setMatched] = useState<string[]>([]);
  const [startTime] = useState(Date.now());

  const shuffledCards = useMemo(() => {
    return [...cards].sort(() => Math.random() - 0.5);
  }, [cards]);

  useEffect(() => {
    if (flipped.length === 2) {
      const [first, second] = flipped;
      const firstCard = shuffledCards.find(c => c.id === first);
      const secondCard = shuffledCards.find(c => c.id === second);

      if (firstCard?.matchId === secondCard?.matchId) {
        setMatched(prev => [...prev, first, second]);
      }

      setTimeout(() => setFlipped([]), 1000);
    }
  }, [flipped, shuffledCards]);

  useEffect(() => {
    if (matched.length === shuffledCards.length && matched.length > 0) {
      const time = (Date.now() - startTime) / 1000;
      onComplete(matched.length / 2, time);
    }
  }, [matched, shuffledCards.length, startTime, onComplete]);

  const handleFlip = (cardId: string) => {
    if (flipped.length === 2 || flipped.includes(cardId) || matched.includes(cardId)) return;
    setFlipped(prev => [...prev, cardId]);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <Brain className="w-10 h-10 mx-auto mb-2 text-purple-500" />
        <h2 className="text-xl font-bold">Memory Match</h2>
        <p className="text-sm text-muted-foreground">Find all matching pairs!</p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {shuffledCards.map((card) => {
          const isFlipped = flipped.includes(card.id) || matched.includes(card.id);
          const isMatched = matched.includes(card.id);

          return (
            <motion.button
              key={card.id}
              whileHover={{ scale: isFlipped ? 1 : 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleFlip(card.id)}
              className={`aspect-square rounded-xl border-2 text-2xl font-bold transition-all ${
                isMatched
                  ? "bg-spark-green/20 border-spark-green"
                  : isFlipped
                    ? "bg-primary/10 border-primary"
                    : "bg-muted border-border hover:border-primary/50"
              }`}
            >
              <AnimatePresence mode="wait">
                {isFlipped ? (
                  <motion.span
                    key="content"
                    initial={{ rotateY: 90 }}
                    animate={{ rotateY: 0 }}
                    exit={{ rotateY: 90 }}
                  >
                    {card.content}
                  </motion.span>
                ) : (
                  <motion.span
                    key="hidden"
                    initial={{ rotateY: 90 }}
                    animate={{ rotateY: 0 }}
                    exit={{ rotateY: 90 }}
                    className="text-muted-foreground"
                  >
                    ?
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      <div className="text-center text-sm text-muted-foreground">
        Matches found: {matched.length / 2} / {shuffledCards.length / 2}
      </div>
    </div>
  );
};

// Word Scramble Game
const WordScrambleGame = ({ 
  word, 
  hint, 
  onComplete 
}: { 
  word: string; 
  hint: string; 
  onComplete: (correct: boolean, time: number) => void 
}) => {
  const scrambled = useMemo(() => {
    return word.split('').sort(() => Math.random() - 0.5).join('');
  }, [word]);

  const [inputValue, setInputValue] = useState("");
  const [startTime] = useState(Date.now());
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<boolean | null>(null);

  const handleSubmit = () => {
    if (submitted) return;
    const time = (Date.now() - startTime) / 1000;
    const correct = inputValue.toLowerCase().trim() === word.toLowerCase().trim();
    setSubmitted(true);
    setResult(correct);
    onComplete(correct, time);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <Shuffle className="w-10 h-10 mx-auto mb-2 text-spark-teal" />
        <h2 className="text-xl font-bold">Word Scramble</h2>
        <p className="text-sm text-muted-foreground">Unscramble the word!</p>
      </div>

      <Card variant="elevated">
        <CardContent className="p-8 text-center">
          <div className="flex justify-center gap-2 mb-4">
            {scrambled.split('').map((letter, i) => (
              <motion.span
                key={i}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="w-12 h-12 flex items-center justify-center bg-primary/10 rounded-lg text-2xl font-bold text-primary"
              >
                {letter.toUpperCase()}
              </motion.span>
            ))}
          </div>
          <p className="text-muted-foreground">Hint: {hint}</p>
        </CardContent>
      </Card>

      {submitted && result !== null ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`text-center p-6 rounded-xl ${
            result ? "bg-spark-green/10 border border-spark-green" : "bg-spark-coral/10 border border-spark-coral"
          }`}
        >
          {result ? (
            <>
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-spark-green" />
              <p className="font-bold text-xl text-spark-green">Correct!</p>
            </>
          ) : (
            <>
              <XCircle className="w-12 h-12 mx-auto mb-2 text-spark-coral" />
              <p className="font-bold text-xl text-spark-coral">The answer was: {word}</p>
            </>
          )}
        </motion.div>
      ) : (
        <div className="flex gap-3">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Type the unscrambled word..."
            disabled={submitted}
            autoFocus
            className="flex-1 text-lg"
          />
          <Button
            variant="gradient"
            size="lg"
            onClick={handleSubmit}
            disabled={submitted || !inputValue.trim()}
          >
            Submit
          </Button>
        </div>
      )}
    </div>
  );
};

// Emoji Decode Game
const EmojiDecodeGame = ({ 
  emojis, 
  answer, 
  category,
  onComplete 
}: { 
  emojis: string; 
  answer: string; 
  category: string;
  onComplete: (correct: boolean, time: number) => void 
}) => {
  const [inputValue, setInputValue] = useState("");
  const [startTime] = useState(Date.now());
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<boolean | null>(null);

  const handleSubmit = () => {
    if (submitted) return;
    const time = (Date.now() - startTime) / 1000;
    const correct = inputValue.toLowerCase().trim() === answer.toLowerCase().trim();
    setSubmitted(true);
    setResult(correct);
    onComplete(correct, time);
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <Smile className="w-10 h-10 mx-auto mb-2 text-amber-500" />
        <h2 className="text-xl font-bold">Emoji Decode</h2>
        <p className="text-sm text-muted-foreground">Guess the {category}!</p>
      </div>

      <Card variant="elevated">
        <CardContent className="p-8 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-6xl mb-4"
          >
            {emojis}
          </motion.div>
          <p className="text-muted-foreground">Category: {category}</p>
        </CardContent>
      </Card>

      {submitted && result !== null ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`text-center p-6 rounded-xl ${
            result ? "bg-spark-green/10 border border-spark-green" : "bg-spark-coral/10 border border-spark-coral"
          }`}
        >
          {result ? (
            <>
              <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-spark-green" />
              <p className="font-bold text-xl text-spark-green">🎉 Correct!</p>
            </>
          ) : (
            <>
              <XCircle className="w-12 h-12 mx-auto mb-2 text-spark-coral" />
              <p className="font-bold text-xl text-spark-coral">The answer was: {answer}</p>
            </>
          )}
        </motion.div>
      ) : (
        <div className="flex gap-3">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Type your guess..."
            disabled={submitted}
            autoFocus
            className="flex-1 text-lg"
          />
          <Button
            variant="gradient"
            size="lg"
            onClick={handleSubmit}
            disabled={submitted || !inputValue.trim()}
          >
            Submit
          </Button>
        </div>
      )}
    </div>
  );
};

// Main MiniGame Component
export const MiniGame = ({ type, gameData, onComplete, timeLimit = 60 }: MiniGameProps) => {
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const [gameComplete, setGameComplete] = useState(false);

  useEffect(() => {
    if (gameComplete || timeRemaining <= 0) return;

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
  }, [gameComplete, timeRemaining]);

  const handleComplete = (score: number, time: number) => {
    setGameComplete(true);
    onComplete(score, time);
  };

  const renderGame = () => {
    switch (type) {
      case 'fastest-finger':
        return (
          <FastestFingerGame
            question={gameData.question}
            answer={gameData.answer}
            onComplete={(correct, time) => handleComplete(correct ? 100 : 0, time)}
          />
        );
      case 'memory-match':
        return (
          <MemoryMatchGame
            cards={gameData.cards}
            onComplete={(matches, time) => handleComplete(matches * 50, time)}
          />
        );
      case 'word-scramble':
        return (
          <WordScrambleGame
            word={gameData.word}
            hint={gameData.hint}
            onComplete={(correct, time) => handleComplete(correct ? 100 : 0, time)}
          />
        );
      case 'emoji-decode':
        return (
          <EmojiDecodeGame
            emojis={gameData.emojis}
            answer={gameData.answer}
            category={gameData.category}
            onComplete={(correct, time) => handleComplete(correct ? 100 : 0, time)}
          />
        );
      default:
        return <div>Unknown game type</div>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Timer Bar */}
      <div className="relative">
        <motion.div className="h-2 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: "100%" }}
            animate={{ width: `${(timeRemaining / timeLimit) * 100}%` }}
            className={`h-full ${
              timeRemaining > timeLimit * 0.5 ? "bg-spark-green" : timeRemaining > timeLimit * 0.25 ? "bg-amber-500" : "bg-spark-coral"
            }`}
          />
        </motion.div>
        <div className="absolute -top-1 right-0 flex items-center gap-1 text-muted-foreground">
          <Timer className="w-4 h-4" />
          <span className="font-bold">{timeRemaining}s</span>
        </div>
      </div>

      {/* Game Header */}
      <div className="flex items-center justify-center gap-3">
        <Gamepad2 className="w-6 h-6 text-primary" />
        <span className="font-display font-bold text-lg">Mini Game</span>
      </div>

      {/* Game Content */}
      {renderGame()}
    </div>
  );
};

// Game Leaderboard
export const GameLeaderboard = ({ entries }: { entries: LeaderboardEntry[] }) => {
  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-amber-500" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 3:
        return <Medal className="w-5 h-5 text-amber-700" />;
      default:
        return <span className="text-sm font-bold text-muted-foreground">{rank}</span>;
    }
  };

  return (
    <Card variant="glass">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          Game Leaderboard
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {entries.slice(0, 10).map((entry, index) => (
          <motion.div
            key={entry.participantId}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex items-center gap-3 p-3 rounded-lg ${
              entry.rank <= 3 ? "bg-primary/5" : "bg-muted/50"
            }`}
          >
            <div className="w-8 flex justify-center">{getRankIcon(entry.rank)}</div>
            <div className="flex-1">
              <p className="font-medium">{entry.nickname || `Player ${entry.rank}`}</p>
            </div>
            <div className="text-right">
              <p className="font-bold text-lg">{entry.score}</p>
              <p className="text-xs text-muted-foreground">{entry.averageTime.toFixed(1)}s</p>
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
};

export default MiniGame;
