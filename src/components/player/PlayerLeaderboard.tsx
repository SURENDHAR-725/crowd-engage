import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Medal, Award, Flame } from "lucide-react";
import type { LeaderboardEntry } from "@/services/responseService";

interface PlayerLeaderboardProps {
  leaderboard: LeaderboardEntry[];
  currentPlayerId?: string;
  isFinal?: boolean;
}

export const PlayerLeaderboard = ({ leaderboard, currentPlayerId, isFinal }: PlayerLeaderboardProps) => {
  const currentPlayer = leaderboard.find((p) => p.participantId === currentPlayerId);
  const topThree = leaderboard.slice(0, 3);
  const rest = leaderboard.slice(3, 10);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-8 h-8 text-amber-400" />;
    if (rank === 2) return <Medal className="w-7 h-7 text-gray-400" />;
    if (rank === 3) return <Award className="w-6 h-6 text-amber-700" />;
    return null;
  };

  return (
    <div className="min-h-screen p-4 flex flex-col items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-3xl font-bold mb-2">
          {isFinal ? "🏆 Final Results" : "Leaderboard"}
        </h1>
        {currentPlayer && (
          <p className="text-muted-foreground">
            Your rank: <span className="text-primary font-bold">#{currentPlayer.rank}</span>
          </p>
        )}
      </motion.div>

      {/* Top 3 Podium */}
      <div className="flex items-end justify-center gap-4 mb-8">
        {topThree[1] && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-3xl mb-2 mx-auto">
              {topThree[1].avatar || "😊"}
            </div>
            <p className="font-medium truncate max-w-[100px]">{topThree[1].nickname}</p>
            <p className="text-primary font-bold">{topThree[1].score}</p>
            <div className="h-24 w-20 bg-gradient-to-t from-gray-400 to-gray-300 rounded-t-lg mt-2 flex items-center justify-center">
              <span className="text-2xl font-bold text-white">2</span>
            </div>
          </motion.div>
        )}
        
        {topThree[0] && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-center"
          >
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              {getRankIcon(1)}
            </motion.div>
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 flex items-center justify-center text-4xl mb-2 mx-auto border-4 border-amber-400">
              {topThree[0].avatar || "🎉"}
            </div>
            <p className="font-bold text-lg truncate max-w-[120px]">{topThree[0].nickname}</p>
            <p className="text-primary font-bold text-xl">{topThree[0].score}</p>
            <div className="h-32 w-24 bg-gradient-to-t from-amber-500 to-amber-400 rounded-t-lg mt-2 flex items-center justify-center">
              <span className="text-3xl font-bold text-white">1</span>
            </div>
          </motion.div>
        )}

        {topThree[2] && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="text-center"
          >
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-2xl mb-2 mx-auto">
              {topThree[2].avatar || "😄"}
            </div>
            <p className="font-medium truncate max-w-[80px]">{topThree[2].nickname}</p>
            <p className="text-primary font-bold">{topThree[2].score}</p>
            <div className="h-16 w-16 bg-gradient-to-t from-amber-700 to-amber-600 rounded-t-lg mt-2 flex items-center justify-center">
              <span className="text-xl font-bold text-white">3</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Rest of leaderboard */}
      {rest.length > 0 && (
        <Card className="w-full max-w-md">
          <CardContent className="p-4 space-y-2">
            {rest.map((entry, i) => (
              <motion.div
                key={entry.participantId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className={`flex items-center gap-3 p-2 rounded-lg ${
                  entry.participantId === currentPlayerId ? "bg-primary/10" : ""
                }`}
              >
                <span className="w-6 text-center font-bold text-muted-foreground">
                  {entry.rank}
                </span>
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  {entry.avatar || "😊"}
                </div>
                <span className="flex-1 truncate">{entry.nickname}</span>
                <span className="font-bold text-primary">{entry.score}</span>
                {entry.streak >= 3 && <Flame className="w-4 h-4 text-orange-500" />}
              </motion.div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PlayerLeaderboard;
