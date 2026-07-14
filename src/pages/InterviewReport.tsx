import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useInterviewHistory } from "@/hooks/useInterviewHistory";
import { ScoreCard } from "@/components/ScoreCard"; // Wait! We created ScoreCard in components/Interview/ScoreCard.tsx
// Let's import it from "@/components/Interview/ScoreCard"
import { ScoreCard as InterviewScoreCard } from "@/components/Interview/ScoreCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  ArrowLeft,
  Trophy,
  Brain,
  ThumbsUp,
  TrendingUp,
  RefreshCw,
  Lightbulb,
  CheckCircle,
  HelpCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import { motion } from "framer-motion";
import { type InterviewSession, type InterviewQuestion } from "@/services/aiInterviewService";

const InterviewReport = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { loadReport, loading } = useInterviewHistory();

  const [session, setSession] = useState<InterviewSession | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);

  useEffect(() => {
    const fetchReport = async () => {
      if (id) {
        const data = await loadReport(id);
        if (data) {
          setSession(data.session);
          setQuestions(data.questions);
        }
      }
    };
    fetchReport();
  }, [id]);

  if (loading || !session) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground mt-2">Compiling performance dashboard...</p>
      </div>
    );
  }

  // overall score parsed or default to 0
  const overallScore = session.score ? Math.round(Number(session.score)) : 0;
  const technical = session.technical_score ? Number(session.technical_score) : 5;
  const communication = session.communication_score ? Number(session.communication_score) : 5;
  const confidence = session.confidence_score ? Number(session.confidence_score) : 5;
  const problemSolving = session.problem_solving_score ? Number(session.problem_solving_score) : 5;

  const strengths = session.strengths || [];
  const weaknesses = session.weaknesses || [];
  const suggestedTopics = session.suggested_topics || [];

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="max-w-5xl mx-auto px-4 pt-8 space-y-8">
        {/* Navigation */}
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/interview')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <Button onClick={() => navigate('/interview/setup')}>
            <RefreshCw className="w-4 h-4 mr-2" />
            New Practice
          </Button>
        </div>

        {/* Header Block */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary/10 to-spark-teal/5 border border-border/50 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6"
        >
          <div>
            <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary uppercase text-[10px] font-bold tracking-wider px-2.5 py-0.5 rounded-full">
              Mock Interview Result
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-display font-extrabold mt-3 capitalize">
              {session.role}
            </h1>
            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-2 capitalize font-medium">
              <span>{session.interview_type}</span>
              <span>•</span>
              <span>{session.difficulty} Difficulty</span>
              <span>•</span>
              <span>{session.duration} mins</span>
            </div>
          </div>
          
          <div className="flex flex-col items-center sm:items-end justify-center shrink-0">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Overall Grade</span>
            <span className="text-4xl sm:text-5xl font-extrabold font-display text-primary mt-1">{overallScore}%</span>
          </div>
        </motion.div>

        {/* Scores Visual Components */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <InterviewScoreCard
            score={overallScore}
            technical={technical}
            communication={communication}
            confidence={confidence}
            problemSolving={problemSolving}
          />
        </motion.div>

        {/* Summary Block */}
        {session.performance_summary && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-500" />
                  AI Summary Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {session.performance_summary}
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Strengths, Weaknesses, Recommended list */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold text-emerald-500 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-500" />
                Key Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              {strengths.length === 0 ? (
                <p className="text-xs text-muted-foreground">No specific strengths listed.</p>
              ) : (
                <ul className="space-y-2">
                  {strengths.map((str, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground flex gap-2 items-start leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5"></span>
                      {str}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold text-spark-coral flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-spark-coral" />
                Areas to Improve
              </CardTitle>
            </CardHeader>
            <CardContent>
              {weaknesses.length === 0 ? (
                <p className="text-xs text-muted-foreground">No specific areas to improve listed.</p>
              ) : (
                <ul className="space-y-2">
                  {weaknesses.map((weak, idx) => (
                    <li key={idx} className="text-xs text-muted-foreground flex gap-2 items-start leading-relaxed">
                      <span className="w-1.5 h-1.5 rounded-full bg-spark-coral shrink-0 mt-1.5"></span>
                      {weak}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Suggested learning topics */}
        {suggestedTopics.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Card className="border-border/50 bg-card/30 backdrop-blur-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-primary" />
                  Recommended Study Topics
                </CardTitle>
                <CardDescription className="text-xs">
                  Review these areas to level up before your next interview
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <div className="flex flex-wrap gap-2">
                  {suggestedTopics.map(topic => (
                    <Badge key={topic} variant="secondary" className="px-3 py-1 text-xs select-none">
                      {topic}
                    </Badge>
                  ))}
                </div>
                {session.next_difficulty && (
                  <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
                    AI recommendation for next practice: <strong>{session.next_difficulty} Difficulty</strong>.
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Detailed Question breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <h2 className="text-lg font-display font-bold">Detailed Round Breakdown</h2>
          <Card className="border-border/50 overflow-hidden">
            <Accordion type="single" collapsible className="w-full">
              {questions.map((q, idx) => {
                const answerScore = q.score || 0;
                return (
                  <AccordionItem key={q.id || idx} value={`round-${idx}`} className="border-b border-border last:border-0">
                    <AccordionTrigger className="hover:bg-muted/10 px-4 sm:px-6 py-4 flex justify-between items-center text-left hover:no-underline">
                      <div className="flex items-center gap-4 min-w-0 pr-4">
                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 select-none">
                          {idx + 1}
                        </div>
                        <p className="text-sm font-semibold truncate flex-1 leading-relaxed">
                          {q.question}
                        </p>
                      </div>
                      <Badge variant="secondary" className={`shrink-0 ${
                        answerScore >= 8 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                        answerScore >= 6 ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
                        answerScore >= 4 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' : 
                        'bg-spark-coral/10 text-spark-coral border-spark-coral/20'
                      }`}>
                        {answerScore}/10
                      </Badge>
                    </AccordionTrigger>
                    <AccordionContent className="p-4 sm:p-6 bg-muted/20 border-t border-border space-y-4">
                      {/* Answer block */}
                      <div className="space-y-1.5">
                        <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1.5 select-none">
                          <CheckCircle className="w-3.5 h-3.5 text-primary" />
                          Your Response
                        </span>
                        <p className="text-xs sm:text-sm bg-background p-3 rounded-xl border border-border/60 leading-relaxed italic">
                          {q.answer || "(Timed out or no response provided)"}
                        </p>
                      </div>

                      {/* Feedback block */}
                      {q.ai_feedback && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider flex items-center gap-1.5 select-none">
                            <Brain className="w-3.5 h-3.5 text-primary" />
                            Round Feedback
                          </span>
                          <div className="text-xs sm:text-sm bg-primary/5 p-3 rounded-xl border border-primary/10 leading-relaxed text-foreground">
                            <p className="leading-relaxed">{q.ai_feedback}</p>
                            {/* Score breakdown metrics if present */}
                            {q.technical_accuracy_score !== undefined && (
                              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 mt-3 border-t border-primary/10 text-[10px] sm:text-xs">
                                <div>
                                  <span className="text-muted-foreground block">Tech Accuracy</span>
                                  <span className="font-bold">{q.technical_accuracy_score}/10</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block">Communication</span>
                                  <span className="font-bold">{q.communication_score}/10</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block">Confidence</span>
                                  <span className="font-bold">{q.confidence_score}/10</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block">Completeness</span>
                                  <span className="font-bold">{q.completeness_score}/10</span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block">Problem Solving</span>
                                  <span className="font-bold">{q.problem_solving_score}/10</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default InterviewReport;
