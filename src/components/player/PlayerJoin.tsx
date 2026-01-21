import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { User, Sparkles, Zap, ChevronLeft, ChevronRight } from "lucide-react";

interface PlayerJoinProps {
  sessionCode: string;
  onJoin: (nickname: string, avatar: string) => void;
  isLoading?: boolean;
}

const AVATAR_CATEGORIES = [
  {
    name: 'Faces',
    avatars: ["😀", "😎", "🤓", "🥳", "😊", "🤩", "😇", "🤠", "🥸", "😏", "🤪", "😋"]
  },
  {
    name: 'Animals',
    avatars: ["🦊", "🐱", "🐶", "🦁", "🐼", "🐨", "🐸", "🐵", "🦄", "🐯", "🐰", "🦋"]
  },
  {
    name: 'Fun',
    avatars: ["👽", "🤖", "👻", "🎃", "💀", "🦸", "🧙", "🧛", "🦹", "🥷", "🧜", "🧚"]
  },
  {
    name: 'Nature',
    avatars: ["🌸", "🌺", "🌻", "🌹", "🌈", "⭐", "🌙", "☀️", "🔥", "💎", "🍀", "🌊"]
  }
];

export const PlayerJoin = ({ sessionCode, onJoin, isLoading }: PlayerJoinProps) => {
  const [nickname, setNickname] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState("😀");
  const [currentCategory, setCurrentCategory] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleJoin = () => {
    if (!nickname.trim()) return;
    onJoin(nickname.trim(), selectedAvatar);
  };

  const nextCategory = () => {
    setIsAnimating(true);
    setCurrentCategory((prev) => (prev + 1) % AVATAR_CATEGORIES.length);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const prevCategory = () => {
    setIsAnimating(true);
    setCurrentCategory((prev) => (prev - 1 + AVATAR_CATEGORIES.length) % AVATAR_CATEGORIES.length);
    setTimeout(() => setIsAnimating(false), 300);
  };

  const currentAvatars = AVATAR_CATEGORIES[currentCategory];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-32 h-32 rounded-full bg-gradient-to-br from-primary/10 to-spark-teal/10 blur-xl"
            initial={{ 
              x: Math.random() * window.innerWidth, 
              y: Math.random() * window.innerHeight,
              scale: 0.5 + Math.random() * 0.5
            }}
            animate={{ 
              x: Math.random() * window.innerWidth, 
              y: Math.random() * window.innerHeight,
              scale: 0.5 + Math.random() * 0.5
            }}
            transition={{ 
              duration: 10 + Math.random() * 10, 
              repeat: Infinity, 
              repeatType: "reverse" 
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        <Card variant="elevated" className="overflow-hidden border-2 border-border/50 shadow-2xl">
          {/* Gradient header bar */}
          <div className="h-2 bg-gradient-to-r from-primary via-spark-teal to-spark-coral" />
          
          <CardHeader className="text-center pb-2">
            <motion.div 
              className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-spark-teal/20 flex items-center justify-center mb-4 border border-primary/20"
              whileHover={{ scale: 1.05, rotate: 5 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Sparkles className="w-10 h-10 text-primary" />
            </motion.div>
            <CardTitle className="text-2xl font-display">Join the Fun!</CardTitle>
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className="text-muted-foreground">Session Code:</span>
              <span className="font-mono font-bold text-xl text-primary bg-primary/10 px-3 py-1 rounded-lg">
                {sessionCode}
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-6 pt-4">
            {/* Nickname Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                Your Nickname
              </label>
              <Input
                variant="large"
                placeholder="Enter a cool nickname..."
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                maxLength={20}
                className="text-center text-lg font-medium"
              />
            </div>

            {/* Avatar Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Choose Your Avatar</label>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={prevCategory}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground min-w-[60px] text-center">
                    {currentAvatars.name}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={nextCategory}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              
              <AnimatePresence mode="wait">
                <motion.div 
                  key={currentCategory}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-6 gap-2"
                >
                  {currentAvatars.avatars.map((avatar) => (
                    <motion.button
                      key={avatar}
                      whileHover={{ scale: 1.15, rotate: 5 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setSelectedAvatar(avatar)}
                      className={`relative w-12 h-12 text-2xl rounded-xl border-2 transition-all ${
                        selectedAvatar === avatar
                          ? "border-primary bg-primary/20 shadow-lg shadow-primary/20"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      {avatar}
                      {selectedAvatar === avatar && (
                        <motion.div
                          layoutId="selected-avatar"
                          className="absolute inset-0 border-2 border-primary rounded-xl"
                          initial={false}
                          transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                      )}
                    </motion.button>
                  ))}
                </motion.div>
              </AnimatePresence>

              {/* Category dots */}
              <div className="flex justify-center gap-2 pt-2">
                {AVATAR_CATEGORIES.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentCategory(idx)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentCategory 
                        ? 'bg-primary w-4' 
                        : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Preview Card */}
            <motion.div 
              className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 border border-border"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <motion.div 
                className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-spark-coral flex items-center justify-center text-4xl shadow-lg"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                {selectedAvatar}
              </motion.div>
              <div className="flex-1">
                <p className="font-bold text-lg">{nickname || "Your Name"}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Zap className="w-3 h-3 text-primary" />
                  Ready to play!
                </p>
              </div>
            </motion.div>

            {/* Join Button */}
            <Button
              variant="gradient"
              className="w-full h-14 text-lg font-bold"
              size="lg"
              onClick={handleJoin}
              disabled={!nickname.trim() || isLoading}
            >
              {isLoading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Sparkles className="w-6 h-6" />
                </motion.div>
              ) : (
                <>
                  <Zap className="w-6 h-6 mr-2" />
                  Join Game
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default PlayerJoin;
