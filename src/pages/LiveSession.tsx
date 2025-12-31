import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useParams, useNavigate } from "react-router-dom";
import { Zap, Users, CheckCircle2, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSessionByCode } from "@/hooks/useSessions";
import { useParticipant, useResponse, useResponseAggregation, useParticipantCount } from "@/hooks/useResponses";
import { toast } from "sonner";

const LiveSession = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  
  // Fetch session data
  const { session, loading: sessionLoading, error: sessionError } = useSessionByCode(code);
  
  // Join as participant
  const { participant, joinSession } = useParticipant(session?.id);
  
  // Track participant count
  const { count: participantCount } = useParticipantCount(session?.id);
  
  // Get first question (for now, we're handling single question per session)
  const question = session?.questions?.[0];
  const questionId = question?.id;
  
  // Response handling
  const { hasResponded, submitResponse, loading: submitting } = useResponse(questionId);
  
  // Get real-time aggregation
  const { aggregation, totalVotes } = useResponseAggregation(questionId);

  // Auto-join session when loaded
  useEffect(() => {
    if (session && !participant) {
      joinSession();
    }
  }, [session, participant]);

  // Handle session errors
  useEffect(() => {
    if (sessionError) {
      toast.error(sessionError);
      navigate('/join');
    }
  }, [sessionError, navigate]);

  const handleVote = async () => {
    if (selectedOption && participant && questionId && session) {
      const success = await submitResponse(
        session.id,
        participant.id,
        selectedOption
      );
      
      if (!success) {
        setSelectedOption(null);
      }
    }
  };

  // Create options array with vote data
  const optionsWithVotes = question?.options?.map(option => {
    const agg = aggregation.find(a => a.option_id === option.id);
    return {
      id: option.id,
      text: option.option_text,
      votes: agg?.vote_count || 0,
      percentage: agg?.percentage || 0,
    };
  }) || [];

  const maxVotes = Math.max(...optionsWithVotes.map(o => o.votes), 1);

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!session || !question) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Session Not Found</h2>
          <p className="text-muted-foreground mb-4">The session code may be invalid or the session has ended.</p>
          <Button onClick={() => navigate('/join')}>Try Another Code</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg btn-gradient flex items-center justify-center">
              <Zap className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-display font-bold text-gradient">CrowdSpark</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{participantCount}</span>
            </div>
            <div className="px-3 py-1 rounded-full bg-spark-green/10 text-spark-green text-sm font-medium">
              Live
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {/* Session Code */}
            <div className="text-center mb-4">
              <span className="text-sm text-muted-foreground">Session Code:</span>
              <span className="ml-2 font-display font-bold text-primary">{code}</span>
            </div>

            {/* Question */}
            <Card variant="elevated" className="mb-6">
              <CardContent className="p-8 text-center">
                <h1 className="text-2xl md:text-3xl font-display font-bold">
                  {question.question_text}
                </h1>
              </CardContent>
            </Card>

            {/* Options */}
            <div className="space-y-3">
              <AnimatePresence mode="wait">
                {!hasResponded ? (
                  <motion.div
                    key="voting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="space-y-3"
                  >
                    {optionsWithVotes.map((option, index) => (
                      <motion.button
                        key={option.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        onClick={() => setSelectedOption(option.id)}
                        disabled={submitting}
                        className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center gap-4 ${
                          selectedOption === option.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        } ${submitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold shrink-0 ${
                          selectedOption === option.id
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {String.fromCharCode(65 + index)}
                        </div>
                        <span className="font-medium">{option.text}</span>
                      </motion.button>
                    ))}
                    
                    <Button
                      variant="gradient"
                      size="xl"
                      className="w-full mt-6"
                      disabled={!selectedOption || submitting}
                      onClick={handleVote}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        'Submit Vote'
                      )}
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="results"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                  >
                    {/* Thank you message */}
                    <div className="text-center mb-6">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-spark-green/10 text-spark-green mb-2">
                        <CheckCircle2 className="w-5 h-5" />
                        <span className="font-medium">Vote Submitted!</span>
                      </div>
                      <p className="text-muted-foreground">
                        Watch the results update in real-time
                      </p>
                    </div>

                    {/* Results */}
                    {optionsWithVotes.map((option, index) => {
                      const isWinning = option.votes === maxVotes && maxVotes > 0;
                      const isSelected = selectedOption === option.id;
                      
                      return (
                        <motion.div
                          key={option.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className={`relative p-4 rounded-xl border-2 overflow-hidden ${
                            isSelected ? "border-primary" : "border-border"
                          }`}
                        >
                          {/* Background Bar */}
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${option.percentage}%` }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            className={`absolute inset-y-0 left-0 ${
                              isWinning ? "bg-primary/20" : "bg-muted"
                            }`}
                          />
                          
                          {/* Content */}
                          <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg font-bold ${
                                isWinning
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-muted-foreground"
                              }`}>
                                {String.fromCharCode(65 + index)}
                              </div>
                              <span className="font-medium">{option.text}</span>
                              {isSelected && (
                                <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                                  Your vote
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-muted-foreground">
                                {option.votes} votes
                              </span>
                              <span className={`font-display font-bold text-xl ${
                                isWinning ? "text-primary" : "text-foreground"
                              }`}>
                                {option.percentage}%
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}

                    {/* Total */}
                    <div className="text-center text-sm text-muted-foreground mt-4">
                      Total votes: {totalVotes}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-sm text-muted-foreground">
        Powered by CrowdSpark
      </footer>
    </div>
  );
};

export default LiveSession;
