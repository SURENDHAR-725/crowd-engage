import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { User, Sparkles } from "lucide-react";

interface PlayerJoinProps {
  sessionCode: string;
  onJoin: (nickname: string, avatar: string) => void;
  isLoading?: boolean;
}

const AVATARS = ["😀", "😎", "🤓", "🦊", "🐱", "🐶", "🦁", "🐼", "🐨", "🐸", "🐵", "🦄"];

export const PlayerJoin = ({ sessionCode, onJoin, isLoading }: PlayerJoinProps) => {
  const [nickname, setNickname] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);

  const handleJoin = () => {
    if (!nickname.trim()) return;
    onJoin(nickname.trim(), selectedAvatar);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Card variant="elevated" className="overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary via-spark-teal to-spark-coral" />
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Join Session</CardTitle>
            <p className="text-muted-foreground">Code: <span className="font-mono font-bold text-primary">{sessionCode}</span></p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Nickname</label>
              <Input
                variant="large"
                placeholder="Enter your name..."
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
                maxLength={20}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Choose Avatar</label>
              <div className="grid grid-cols-6 gap-2">
                {AVATARS.map((avatar) => (
                  <motion.button
                    key={avatar}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setSelectedAvatar(avatar)}
                    className={`w-12 h-12 text-2xl rounded-xl border-2 transition-all ${
                      selectedAvatar === avatar
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {avatar}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-spark-coral flex items-center justify-center text-3xl">
                {selectedAvatar}
              </div>
              <div>
                <p className="font-medium">{nickname || "Your Name"}</p>
                <p className="text-sm text-muted-foreground">Ready to play!</p>
              </div>
            </div>

            <Button
              variant="gradient"
              className="w-full"
              size="lg"
              onClick={handleJoin}
              disabled={!nickname.trim() || isLoading}
            >
              <User className="w-5 h-5 mr-2" />
              {isLoading ? "Joining..." : "Join Game"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default PlayerJoin;
