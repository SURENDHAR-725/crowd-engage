import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ArrowRight, Zap, Users, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { sessionService } from "@/services/sessionService";

const JoinSession = () => {
  const [sessionCode, setSessionCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (sessionCode.length < 4) {
      toast.error("Please enter a valid session code");
      return;
    }

    setIsLoading(true);
    
    try {
      // Validate session code exists and is active
      const session = await sessionService.getSessionByCode(sessionCode);
      
      if (session) {
        toast.success("Joining session...");
        // Check if it's a buzzer game (either minigame type or quiz with is_buzzer_game flag)
        const isBuzzerGame = session.type === 'minigame' || 
          (session.settings && typeof session.settings === 'object' && 
           (session.settings as { is_buzzer_game?: boolean }).is_buzzer_game === true);
        
        if (isBuzzerGame) {
          navigate(`/buzzer/${sessionCode.toUpperCase()}`);
        } else {
          navigate(`/session/${sessionCode.toUpperCase()}`);
        }
      } else {
        toast.error("Session not found or not active");
      }
    } catch (error) {
      console.error('Error joining session:', error);
      toast.error("Failed to join session");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center pt-16 pb-12 px-4">
        <div className="w-full max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl btn-gradient mb-6 shadow-glow">
                <Zap className="w-8 h-8 text-primary-foreground" />
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-bold mb-3">
                Join a <span className="text-gradient">Session</span>
              </h1>
              <p className="text-muted-foreground">
                Enter the code provided by your host to participate
              </p>
            </div>

            {/* Join Form */}
            <Card variant="elevated" className="mb-6">
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-xl">Session Code</CardTitle>
                <CardDescription>
                  The code is shown on your host's screen
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleJoin} className="space-y-4">
                  <Input
                    variant="code"
                    placeholder="ENTER CODE"
                    value={sessionCode}
                    onChange={(e) => setSessionCode(e.target.value.toUpperCase().slice(0, 8))}
                    maxLength={8}
                  />
                  <Button 
                    type="submit" 
                    variant="gradient" 
                    size="xl" 
                    className="w-full"
                    disabled={isLoading || sessionCode.length < 4}
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Joining...
                      </div>
                    ) : (
                      <>
                        Join Session
                        <ArrowRight className="w-5 h-5" />
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Features */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-sm">No Sign-up</p>
                  <p className="text-xs text-muted-foreground">Join instantly</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 rounded-xl bg-muted/50">
                <div className="w-10 h-10 rounded-lg bg-spark-teal/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-spark-teal" />
                </div>
                <div>
                  <p className="font-medium text-sm">Anonymous</p>
                  <p className="text-xs text-muted-foreground">Stay private</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default JoinSession;
