import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Medal, Award, Flame, Sparkles, Star, Crown, Zap } from "lucide-react";
import type { LeaderboardEntry } from "@/services/responseService";
import confetti from 'canvas-confetti';

interface PlayerLeaderboardProps {
  leaderboard: LeaderboardEntry[];
  currentPlayerId?: string;
  isFinal?: boolean;
}

export const PlayerLeaderboard = ({ leaderboard, currentPlayerId, isFinal }: PlayerLeaderboardProps) => {
  const currentPlayer = leaderboard.find((p) => p.participantId === currentPlayerId);
  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3, 10);

  useEffect(() => {
    if (isFinal && currentPlayer && currentPlayer.rank <= 3) {
      // Celebration confetti for top 3 finish
      const duration = 3 * 1000;
      const animationEnd = Date.now() + duration;

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          particleCount,
          startVelocity: 30,
          spread: 360,
          origin: {
            x: randomInRange(0.1, 0.9),
            y: Math.random() - 0.2
          }
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [isFinal, currentPlayer]);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown className="w-8 h-8 text-amber-400" />;
    if (rank === 2) return <Medal className="w-7 h-7 text-gray-400" />;
    if (rank === 3) return <Award className="w-6 h-6 text-amber-700" />;
    return null;
  };

  const getRankGradient = (rank: number) => {
    if (rank === 1) return "from-amber-300 via-yellow-400 to-amber-500";
    if (rank === 2) return "from-gray-300 via-gray-200 to-gray-400";
    if (rank === 3) return "from-amber-600 via-amber-500 to-amber-700";
    return "from-primary to-spark-teal";
  };

  return (
    <div className="min-h-screen p-4 flex flex-col items-center justify-center">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="inline-block mb-4"
        >
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400/20 to-amber-600/20 flex items-center justify-center border border-amber-400/30">
            <Trophy className="w-10 h-10 text-amber-400" />
          </div>
        </motion.div>
        
        <h1 className="text-3xl md:text-4xl font-bold mb-2 font-display">
          {isFinal ? (
            <span className="bg-gradient-to-r from-amber-400 via-yellow-500 to-amber-600 bg-clip-text text-transparent">
              🏆 Final Results
            </span>
          ) : (
            'Leaderboard'
          )}
        </h1>
        
        {currentPlayer && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30"
          >
            <span className="text-muted-foreground">Your rank:</span>
            <span className="text-2xl font-bold text-primary">#{currentPlayer.rank}</span>
            <Zap className="w-5 h-5 text-primary" />
            <span className="font-bold">{currentPlayer.score}</span>
          </motion.div>
        )}
      </motion.div>

      {/* Top 3 Podium */}
      <div className="flex items-end justify-center gap-3 md:gap-6 mb-8 w-full max-w-lg">
        {/* 2nd Place */}
        {topThree[1] && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.4, type: "spring" }}
            className="text-center flex-1"
          >
            <motion.div 
              className={`w-16 h-16 md:w-20 md:h-20 mx-auto rounded-2xl bg-gradient-to-br ${getRankGradient(2)} flex items-center justify-center text-3xl md:text-4xl mb-2 shadow-lg border-2 border-gray-300`}
              whileHover={{ scale: 1.1 }}
            >
              {topThree[1].avatar || "😊"}
            </motion.div>
            <p className="font-bold truncate max-w-[100px] mx-auto">{topThree[1].nickname}</p>
            <p className="text-primary font-bold text-lg">{topThree[1].score}</p>
            <div className="h-20 md:h-24 w-full bg-gradient-to-t from-gray-400 to-gray-300 rounded-t-xl mt-2 flex items-center justify-center shadow-inner">
              <span className="text-2xl md:text-3xl font-bold text-white drop-shadow-lg">2</span>
            </div>
          </motion.div>
        )}
        
        {/* 1st Place */}
        {topThree[0] && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="text-center flex-1"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="mb-1"
            >
              {getRankIcon(1)}
            </motion.div>
            <motion.div 
              className={`w-20 h-20 md:w-24 md:h-24 mx-auto rounded-2xl bg-gradient-to-br ${getRankGradient(1)} flex items-center justify-center text-4xl md:text-5xl mb-2 border-4 border-amber-400 shadow-xl`}
              whileHover={{ scale: 1.1, rotate: 5 }}
            >
              {topThree[0].avatar || "🎉"}
            </motion.div>
            <p className="font-bold text-lg truncate max-w-[120px] mx-auto">{topThree[0].nickname}</p>
            <p className="text-primary font-bold text-xl">{topThree[0].score}</p>
            {topThree[0].streak >= 3 && (
              <div className="flex items-center justify-center gap-1 mt-1">
                <Flame className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-orange-500 font-bold">{topThree[0].streak}x</span>
              </div>
            )}
            <div className="h-28 md:h-32 w-full bg-gradient-to-t from-amber-500 to-amber-400 rounded-t-xl mt-2 flex items-center justify-center shadow-inner">
              <span className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg">1</span>
            </div>
          </motion.div>
        )}

        {/* 3rd Place */}
        {topThree[2] && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.6, type: "spring" }}
            className="text-center flex-1"
          >
            <motion.div 
              className={`w-14 h-14 md:w-16 md:h-16 mx-auto rounded-2xl bg-gradient-to-br ${getRankGradient(3)} flex items-center justify-center text-2xl md:text-3xl mb-2 shadow-lg border-2 border-amber-700`}
              whileHover={{ scale: 1.1 }}
            >
              {topThree[2].avatar || "😄"}
            </motion.div>
            <p className="font-medium truncate max-w-[80px] mx-auto">{topThree[2].nickname}</p>
            <p className="text-primary font-bold">{topThree[2].score}</p>
            <div className="h-14 md:h-16 w-full bg-gradient-to-t from-amber-700 to-amber-600 rounded-t-xl mt-2 flex items-center justify-center shadow-inner">
              <span className="text-xl md:text-2xl font-bold text-white drop-shadow-lg">3</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Rest of leaderboard */}
      {rest.length > 0 && (
        <Card className="w-full max-w-md border-2 border-border">
          <CardContent className="p-4 space-y-2">
            {rest.map((entry, i) => (
              <motion.div
                key={entry.participantId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className={`flex items-center gap-3 p-3 rounded-xl transition-colors ${
                  entry.participantId === currentPlayerId 
                    ? "bg-primary/10 border border-primary/30" 
                    : "hover:bg-muted/50"
                }`}
              >
                <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                  entry.participantId === currentPlayerId 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                }`}>
                  {entry.rank}
                </span>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center text-xl">
                  {entry.avatar || "😊"}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium truncate block">{entry.nickname}</span>
                  {entry.correctAnswers > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {entry.correctAnswers} correct
                    </span>
                  )}
                </div>
                <div className="text-right">
                  <span className="font-bold text-primary text-lg">{entry.score}</span>
                  {entry.streak >= 3 && (
                    <div className="flex items-center gap-1 justify-end">
                      <Flame className="w-3 h-3 text-orange-500" />
                      <span className="text-xs text-orange-500 font-bold">{entry.streak}x</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {leaderboard.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Waiting for players to answer...</p>
        </motion.div>
      )}
    </div>
  );
};

export default PlayerLeaderboard;
