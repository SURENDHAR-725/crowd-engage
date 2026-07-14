import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useInterview } from "@/hooks/useInterview";
import { InterviewChat } from "@/components/Interview/InterviewChat";
import { InterviewProgress } from "@/components/Interview/InterviewProgress";
import { AnswerInput } from "@/components/Interview/AnswerInput";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, AlertTriangle, Sparkles, LogOut, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";

const InterviewFlow = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const {
    status,
    session,
    messages,
    currentQuestionIndex,
    timeLeft,
    errorMsg,
    submitAnswer,
    resumeSession,
    finishInterview,
    totalLimit
  } = useInterview();

  // Load / resume session on mount
  useEffect(() => {
    if (id) {
      resumeSession(id);
    }
  }, [id]);

  // Redirect on completion
  useEffect(() => {
    if (status === 'completed' && id) {
      navigate(`/interview/report/${id}`);
    }
  }, [status, id, navigate]);

  const handleAnswerSubmit = async (answerText: string) => {
    // Determine experience from context (we default mid-level if unknown)
    await submitAnswer(answerText, "1-3 Years");
  };

  const handleEndEarly = () => {
    if (confirm("Are you sure you want to end this interview early? Your scores will be calculated based on completed answers so far.")) {
      finishInterview();
    }
  };

  // Loading skeleton screen
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center max-w-sm text-center gap-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
          <h2 className="font-display font-bold text-lg">Resuming Interview Session</h2>
          <p className="text-sm text-muted-foreground">
            Connecting to AI recruiter workspace and loading previous questions...
          </p>
        </motion.div>
      </div>
    );
  }

  // Error screen
  if (status === 'error') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Card className="max-w-md border-border/50 bg-card/60 p-6 text-center">
          <CardContent className="pt-6 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-spark-coral/10 text-spark-coral flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="font-display font-bold text-lg">Failed to Load Interview</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {errorMsg || "An unexpected error occurred while loading this session. Please check your internet connection."}
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <Button variant="outline" onClick={() => navigate('/interview')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
              <Button onClick={() => id && resumeSession(id)}>Retry Connect</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Finalizing report screens
  if (status === 'submitting') {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center max-w-md text-center gap-5"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <Sparkles className="w-8 h-8 animate-pulse text-emerald-500" />
          </div>
          <div className="space-y-2">
            <h2 className="font-display font-bold text-xl">Generating Performance Report</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Our AI is currently analyzing your technical accuracy, communication style, and confidence levels to create a customized career review report.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted px-4 py-2 rounded-xl border border-border mt-2 select-none animate-pulse">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Analyzing responses...
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border px-4 py-4 mb-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={handleEndEarly}
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-sm font-semibold truncate capitalize max-w-[200px] sm:max-w-xs md:max-w-md">
                {session?.role} Mock Interview
              </h1>
              <p className="text-[10px] text-muted-foreground capitalize mt-0.5">
                {session?.interview_type} • {session?.difficulty}
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleEndEarly}
            className="text-spark-coral border-spark-coral/20 hover:bg-spark-coral/10 hover:text-spark-coral"
          >
            <LogOut className="w-4 h-4 sm:mr-1.5" />
            <span className="hidden sm:inline">End Interview</span>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Chat Window */}
        <div className="lg:col-span-2 space-y-4">
          <InterviewChat
            messages={messages}
            isGenerating={status === 'loading'}
          />
          <AnswerInput
            onSubmit={handleAnswerSubmit}
            disabled={status === 'evaluating' || status === 'loading'}
          />
        </div>

        {/* Right Column: Information & Progress panels */}
        <div className="lg:col-span-1 space-y-6">
          <InterviewProgress
            currentIndex={currentQuestionIndex}
            totalLimit={totalLimit}
            timeLeft={timeLeft}
          />

          <Card className="border-border/50 bg-card/40 backdrop-blur-sm">
            <CardContent className="p-4 sm:p-5 space-y-4">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Practice Guide
              </h3>
              <ul className="text-xs text-muted-foreground space-y-2.5 leading-relaxed list-disc pl-4">
                <li>
                  <strong>Be Specific</strong>: Explain your answers with concrete examples, architectural terms, and structural steps where possible.
                </li>
                <li>
                  <strong>Stay Professional</strong>: Write responses clearly as you would formulate them in a real recruitment screening.
                </li>
                <li>
                  <strong>Pacing</strong>: Try to keep an eye on the ticking clock. If you exhaust the time limits, your answers will auto-submit.
                </li>
                <li>
                  <strong>Real-time Feedback</strong>: After submitting an answer, check the bottom evaluation alert to see how the AI scored your response!
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default InterviewFlow;
