import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Swords, 
  Users, 
  Trophy, 
  Crown,
  Shield,
  Zap,
  Target,
  Medal,
  Flag
} from "lucide-react";
import type { BattleTeam, LeaderboardEntry } from "@/lib/database.types";

interface BattleRoomProps {
  teams: BattleTeam[];
  currentQuestion: {
    text: string;
    options: { id: string; text: string; isCorrect?: boolean }[];
  };
  userTeam: BattleTeam | null;
  timeLimit: number;
  onAnswer: (optionId: string, responseTime: number) => void;
  hasAnswered: boolean;
  selectedAnswer: string | null;
  isRevealing?: boolean;
  correctAnswer?: string;
  roundNumber: number;
  totalRounds: number;
}

export const BattleRoom = ({
  teams,
  currentQuestion,
  userTeam,
  timeLimit,
  onAnswer,
  hasAnswered,
  selectedAnswer,
  isRevealing = false,
  correctAnswer,
  roundNumber,
  totalRounds,
}: BattleRoomProps) => {
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const [startTime] = useState(Date.now());

  // Sort teams by score
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
  const leadingTeam = sortedTeams[0];

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

  const handleAnswer = (optionId: string) => {
    if (hasAnswered || timeRemaining <= 0) return;
    const responseTime = (Date.now() - startTime) / 1000;
    onAnswer(optionId, responseTime);
  };

  // Team colors
  const teamColors: Record<string, { bg: string; border: string; text: string }> = {
    red: { bg: "bg-red-500/10", border: "border-red-500", text: "text-red-500" },
    blue: { bg: "bg-blue-500/10", border: "border-blue-500", text: "text-blue-500" },
    green: { bg: "bg-green-500/10", border: "border-green-500", text: "text-green-500" },
    yellow: { bg: "bg-amber-500/10", border: "border-amber-500", text: "text-amber-500" },
    purple: { bg: "bg-purple-500/10", border: "border-purple-500", text: "text-purple-500" },
    orange: { bg: "bg-orange-500/10", border: "border-orange-500", text: "text-orange-500" },
  };

  const getTeamColor = (color: string) => teamColors[color] || teamColors.blue;

  return (
    <div className="space-y-6">
      {/* Battle Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Swords className="w-6 h-6 text-primary" />
          <span className="font-display font-bold text-lg">Battle Mode</span>
        </div>
        <div className="flex items-center gap-2">
          <Flag className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm">Round {roundNumber}/{totalRounds}</span>
        </div>
      </div>

      {/* Team Scores */}
      <div className="grid grid-cols-2 gap-3">
        {sortedTeams.map((team, index) => {
          const colors = getTeamColor(team.color);
          const isUserTeam = userTeam?.id === team.id;
          const isLeading = team.id === leadingTeam?.id;

          return (
            <motion.div
              key={team.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative p-4 rounded-xl border-2 ${colors.bg} ${colors.border} ${
                isUserTeam ? "ring-2 ring-primary ring-offset-2" : ""
              }`}
            >
              {isLeading && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2"
                >
                  <Crown className="w-6 h-6 text-amber-500 fill-amber-500" />
                </motion.div>
              )}
              <div className="flex items-center gap-3">
                <Shield className={`w-8 h-8 ${colors.text}`} />
                <div>
                  <p className="font-bold">{team.name}</p>
                  <p className="text-xs text-muted-foreground">{team.memberIds.length} members</p>
                </div>
              </div>
              <div className={`text-3xl font-display font-bold mt-2 ${colors.text}`}>
                {team.score}
              </div>
              {isUserTeam && (
                <span className="absolute bottom-2 right-2 text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                  Your Team
                </span>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Timer */}
      <div className="relative">
        <motion.div className="h-3 rounded-full bg-muted overflow-hidden">
          <motion.div
            initial={{ width: "100%" }}
            animate={{ width: `${(timeRemaining / timeLimit) * 100}%` }}
            className={`h-full ${
              timeRemaining > timeLimit * 0.5 
                ? "bg-spark-green" 
                : timeRemaining > timeLimit * 0.25 
                  ? "bg-amber-500" 
                  : "bg-spark-coral"
            }`}
          />
        </motion.div>
        <div className="flex items-center justify-center gap-2 mt-2 text-xl font-bold">
          <Zap className="w-5 h-5 text-amber-500" />
          {timeRemaining}s
        </div>
      </div>

      {/* Question */}
      <Card variant="elevated">
        <CardContent className="p-6 text-center">
          <Target className="w-8 h-8 mx-auto mb-3 text-primary" />
          <h1 className="text-xl md:text-2xl font-display font-bold">{currentQuestion.text}</h1>
        </CardContent>
      </Card>

      {/* Options */}
      <div className="grid grid-cols-2 gap-3">
        {currentQuestion.options.map((option, index) => {
          const isSelected = selectedAnswer === option.id;
          const isCorrectOption = correctAnswer === option.id || option.isCorrect;
          const showResult = isRevealing || (hasAnswered && correctAnswer);

          const optionColors = ["bg-red-500", "bg-blue-500", "bg-amber-500", "bg-green-500"];
          const baseColor = optionColors[index % 4];

          let borderColor = "border-transparent";
          let opacity = "";

          if (showResult) {
            if (isCorrectOption) {
              borderColor = "border-spark-green ring-2 ring-spark-green";
            } else if (isSelected && !isCorrectOption) {
              borderColor = "border-spark-coral ring-2 ring-spark-coral";
              opacity = "opacity-50";
            } else {
              opacity = "opacity-50";
            }
          } else if (isSelected) {
            borderColor = "border-white ring-2 ring-white";
          }

          return (
            <motion.button
              key={option.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => handleAnswer(option.id)}
              disabled={hasAnswered || timeRemaining <= 0}
              className={`relative p-6 rounded-xl border-4 ${baseColor} ${borderColor} ${opacity} text-white font-bold transition-all ${
                hasAnswered || timeRemaining <= 0 ? 'cursor-not-allowed' : 'cursor-pointer hover:scale-105'
              }`}
            >
              <span className="text-lg">{option.text}</span>
              {isSelected && !showResult && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-2 right-2"
                >
                  <div className="w-4 h-4 rounded-full bg-white" />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Team Status */}
      {userTeam && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={`text-center p-4 rounded-xl ${getTeamColor(userTeam.color).bg} border ${getTeamColor(userTeam.color).border}`}
        >
          <p className="text-sm text-muted-foreground">Fighting for</p>
          <p className={`font-bold text-lg ${getTeamColor(userTeam.color).text}`}>{userTeam.name}</p>
        </motion.div>
      )}
    </div>
  );
};

// Team Selection Component
export const TeamSelector = ({
  teams,
  onSelectTeam,
  selectedTeam,
}: {
  teams: BattleTeam[];
  onSelectTeam: (teamId: string) => void;
  selectedTeam: string | null;
}) => {
  const teamColors: Record<string, { bg: string; border: string; text: string; fill: string }> = {
    red: { bg: "bg-red-500/10", border: "border-red-500", text: "text-red-500", fill: "fill-red-500" },
    blue: { bg: "bg-blue-500/10", border: "border-blue-500", text: "text-blue-500", fill: "fill-blue-500" },
    green: { bg: "bg-green-500/10", border: "border-green-500", text: "text-green-500", fill: "fill-green-500" },
    yellow: { bg: "bg-amber-500/10", border: "border-amber-500", text: "text-amber-500", fill: "fill-amber-500" },
    purple: { bg: "bg-purple-500/10", border: "border-purple-500", text: "text-purple-500", fill: "fill-purple-500" },
  };

  const getColors = (color: string) => teamColors[color] || teamColors.blue;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Swords className="w-12 h-12 mx-auto mb-4 text-primary" />
        <h2 className="text-2xl font-display font-bold">Choose Your Team</h2>
        <p className="text-muted-foreground mt-2">Join a team to compete in this battle!</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {teams.map((team) => {
          const colors = getColors(team.color);
          const isSelected = selectedTeam === team.id;

          return (
            <motion.button
              key={team.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectTeam(team.id)}
              className={`p-6 rounded-2xl border-2 transition-all ${colors.bg} ${
                isSelected ? `${colors.border} ring-2 ring-offset-2` : "border-border hover:border-primary/50"
              }`}
            >
              <Shield className={`w-12 h-12 mx-auto mb-3 ${colors.text} ${isSelected ? colors.fill : ''}`} />
              <p className={`font-bold text-lg ${colors.text}`}>{team.name}</p>
              <p className="text-sm text-muted-foreground mt-1">{team.memberIds.length} members</p>
            </motion.button>
          );
        })}
      </div>

      <Button
        variant="gradient"
        size="xl"
        className="w-full"
        disabled={!selectedTeam}
      >
        <Swords className="w-5 h-5 mr-2" />
        Join Battle
      </Button>
    </div>
  );
};

// Battle Results
export const BattleResults = ({
  teams,
  userTeam,
}: {
  teams: BattleTeam[];
  userTeam: BattleTeam | null;
}) => {
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
  const winningTeam = sortedTeams[0];
  const isUserWinner = userTeam?.id === winningTeam?.id;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6"
    >
      <div className="text-center">
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 200 }}
        >
          <Trophy className={`w-20 h-20 mx-auto mb-4 ${isUserWinner ? 'text-amber-500' : 'text-muted-foreground'}`} />
        </motion.div>
        <h2 className="text-3xl font-display font-bold">
          {isUserWinner ? "🎉 Victory!" : "Battle Complete"}
        </h2>
        <p className="text-muted-foreground mt-2">
          {winningTeam?.name} wins with {winningTeam?.score} points!
        </p>
      </div>

      <div className="space-y-3">
        {sortedTeams.map((team, index) => (
          <motion.div
            key={team.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`flex items-center gap-4 p-4 rounded-xl ${
              index === 0 ? "bg-amber-500/10 border border-amber-500" : "bg-muted/50 border border-border"
            }`}
          >
            <div className="w-8 flex justify-center">
              {index === 0 ? (
                <Crown className="w-6 h-6 text-amber-500" />
              ) : index === 1 ? (
                <Medal className="w-6 h-6 text-gray-400" />
              ) : index === 2 ? (
                <Medal className="w-6 h-6 text-amber-700" />
              ) : (
                <span className="font-bold text-muted-foreground">{index + 1}</span>
              )}
            </div>
            <Shield className={`w-8 h-8 text-${team.color}-500`} />
            <div className="flex-1">
              <p className="font-bold">{team.name}</p>
              <p className="text-xs text-muted-foreground">{team.memberIds.length} members</p>
            </div>
            <div className="text-2xl font-display font-bold">{team.score}</div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default BattleRoom;
