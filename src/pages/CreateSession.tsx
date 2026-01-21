import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { 
  BarChart3, 
  Timer, 
  ArrowLeft,
  Plus,
  Trash2,
  Zap,
  Save,
  Play,
  Loader2,
  Users,
  UserX,
  Gauge,
  Hand,
  RefreshCw,
  Lock,
  Eye,
  EyeOff,
  Shuffle,
  ThumbsUp,
  Star,
  Gamepad2,
  Mic,
  Sparkles,
  FileText,
  BookOpen,
  Flame,
  Bell,
  Trophy,
  Copy,
  Check
} from "lucide-react";
import { motion } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useSessions } from "@/hooks/useSessions";
import type { SessionType } from "@/lib/database.types";
import { PDFQuizGenerator } from "@/components/host/PDFQuizGenerator";
import { TopicQuizGenerator } from "@/components/host/TopicQuizGenerator";
import type { GeneratedQuestion } from "@/services/aiQuizService";

type PollType = SessionType;

// AI generation mode
type AIGeneratorMode = 'none' | 'topic' | 'pdf';

interface PollOption {
  id: string;
  text: string;
}

const pollTypeConfig: Record<SessionType, { icon: any; title: string; description: string; color: string; bg: string; features?: string[] }> = {
  mcq: {
    icon: BarChart3,
    title: "Multiple Choice Poll",
    description: "Create a poll with multiple options for your audience to choose from",
    color: "text-primary",
    bg: "bg-primary/10",
    features: ["Live results", "Real-time updates", "Anonymous voting"],
  },
  yesno: {
    icon: ThumbsUp,
    title: "Yes/No Poll",
    description: "Quick binary choice poll for fast audience decisions",
    color: "text-spark-green",
    bg: "bg-spark-green/10",
    features: ["Instant feedback", "Visual results", "Quick decisions"],
  },
  rating: {
    icon: Star,
    title: "Rating Poll",
    description: "Collect ratings from 1-5 stars or custom scales",
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    features: ["Star ratings", "Average calculation", "Distribution view"],
  },
  quiz: {
    icon: Timer,
    title: "Timed Quiz",
    description: "Create a competitive quiz with correct answers, time limits, and leaderboards",
    color: "text-spark-coral",
    bg: "bg-spark-coral/10",
    features: ["Timer & scoring", "Leaderboard", "Streak bonuses"],
  },
  minigame: {
    icon: Bell,
    title: "Buzzer Game",
    description: "Interactive buzzer game - participants race to press the buzzer first, host controls scoring",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    features: ["Live buzzer", "Host-controlled scoring", "Real-time leaderboard", "Priority queue"],
  },
  mocktest: {
    icon: BookOpen,
    title: "Mock Test",
    description: "Individual practice test with AI-generated questions on any topic",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    features: ["AI questions", "Fixed timer", "Pause & resume", "Self-paced"],
  },
};

type PaceMode = 'instructor' | 'self-paced';
type IdentityMode = 'anonymous' | 'named';

interface SessionModes {
  paceMode: PaceMode;
  identityMode: IdentityMode;
  allowMultipleResponses: boolean;
  showLiveResults: boolean;
  shuffleOptions: boolean;
  chaosMode: boolean;
}

const defaultModes: SessionModes = {
  paceMode: 'instructor',
  identityMode: 'anonymous',
  allowMultipleResponses: false,
  showLiveResults: true,
  shuffleOptions: false,
  chaosMode: false,
};

const CreateSession = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { createSession } = useSessions();
  const initialType = (searchParams.get("type") as PollType) || "mcq";
  
  const [pollType, setPollType] = useState<PollType>(initialType);
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<PollOption[]>([
    { id: "1", text: "" },
    { id: "2", text: "" },
  ]);
  const [correctAnswer, setCorrectAnswer] = useState<string>("");
  const [timeLimit, setTimeLimit] = useState(30);
  const [isLoading, setIsLoading] = useState(false);
  const [modes, setModes] = useState<SessionModes>(defaultModes);
  const [aiGeneratorMode, setAiGeneratorMode] = useState<AIGeneratorMode>('none');
  const [multiQuestions, setMultiQuestions] = useState<GeneratedQuestion[]>([]);
  const [isMultiQuestionMode, setIsMultiQuestionMode] = useState(false);
  
  // Manual multi-question mode for polls
  const [pollQuestions, setPollQuestions] = useState<Array<{
    id: string;
    question: string;
    options: PollOption[];
    correctAnswer?: string;
    timeLimit?: number;
  }>>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isManualMultiMode, setIsManualMultiMode] = useState(false);

  const updateMode = <K extends keyof SessionModes>(key: K, value: SessionModes[K]) => {
    setModes(prev => ({ ...prev, [key]: value }));
  };

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, { id: Date.now().toString(), text: "" }]);
    }
  };

  const removeOption = (id: string) => {
    if (options.length > 2) {
      setOptions(options.filter(opt => opt.id !== id));
    }
  };

  const updateOption = (id: string, text: string) => {
    setOptions(options.map(opt => opt.id === id ? { ...opt, text } : opt));
  };

  // Add current question to poll questions list
  const addPollQuestion = () => {
    if (!question.trim()) {
      toast.error("Please enter a question");
      return;
    }
    if (needsOptions && options.filter(o => o.text.trim()).length < 2) {
      toast.error("Please add at least 2 options");
      return;
    }
    if (pollType === "quiz" && !correctAnswer) {
      toast.error("Please select the correct answer");
      return;
    }

    const newQuestion = {
      id: Date.now().toString(),
      question: question,
      options: [...options],
      correctAnswer: pollType === "quiz" ? correctAnswer : undefined,
      timeLimit: ["quiz", "minigame"].includes(pollType) ? timeLimit : undefined,
    };

    setPollQuestions([...pollQuestions, newQuestion]);
    setIsManualMultiMode(true);
    
    // Reset form for next question
    setQuestion("");
    setOptions([
      { id: Date.now().toString(), text: "" },
      { id: (Date.now() + 1).toString(), text: "" },
    ]);
    setCorrectAnswer("");
    
    toast.success(`Question ${pollQuestions.length + 1} added`);
  };

  // Remove a poll question
  const removePollQuestion = (id: string) => {
    setPollQuestions(pollQuestions.filter(q => q.id !== id));
    if (pollQuestions.length <= 1) {
      setIsManualMultiMode(false);
    }
  };

  // Edit a poll question
  const editPollQuestion = (id: string) => {
    const questionToEdit = pollQuestions.find(q => q.id === id);
    if (questionToEdit) {
      setQuestion(questionToEdit.question);
      setOptions(questionToEdit.options);
      setCorrectAnswer(questionToEdit.correctAnswer || "");
      if (questionToEdit.timeLimit) {
        setTimeLimit(questionToEdit.timeLimit);
      }
      removePollQuestion(id);
    }
  };

  // Handle AI-generated questions
  const handleAIQuestionsGenerated = (questions: GeneratedQuestion[], generatedTitle: string) => {
    setMultiQuestions(questions);
    setIsMultiQuestionMode(true);
    setAiGeneratorMode('none');
    setPollType('quiz');
    setTitle(generatedTitle);
    
    // Also set the first question for preview
    if (questions.length > 0) {
      setQuestion(questions[0].question_text);
      setOptions(questions[0].options.map((opt, idx) => ({
        id: String(idx + 1),
        text: opt.option_text,
      })));
      const correctIdx = questions[0].options.findIndex(opt => opt.is_correct);
      if (correctIdx >= 0) {
        setCorrectAnswer(String(correctIdx + 1));
      }
      setTimeLimit(questions[0].time_limit);
    }
    
    toast.success(`Loaded ${questions.length} questions from AI!`);
  };

  // Types that need custom options
  const needsOptions = !["yesno", "rating"].includes(pollType);

  const handleSave = async (launch: boolean = false) => {
    if (!title.trim()) {
      toast.error("Please enter a session title");
      return;
    }
    
    // For buzzer/minigame type, we don't need questions - just title
    if (pollType === 'minigame') {
      setIsLoading(true);
      try {
        const sessionData = {
          title,
          type: 'minigame' as const,
          status: 'draft' as const, // Always create as draft first, then launch from waiting room
          questions: [], // No questions for buzzer game
          modes: {
            ...modes,
            paceMode: 'instructor' as const, // Always instructor-paced for buzzer
          },
        };

        const session = await createSession(sessionData);
        
        if (session) {
          toast.success("Buzzer game created!");
          // Navigate to buzzer page where host can see join code and launch
          navigate(`/buzzer/${session.code}?host=true`);
        } else {
          toast.error("Failed to create buzzer game. Please try again.");
        }
      } catch (error) {
        console.error('Error saving session:', error);
        toast.error("Failed to save session");
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    // For manual multi-mode, we need at least one saved question
    if (isManualMultiMode && pollQuestions.length === 0) {
      toast.error("Please add at least one question using the 'Add Question' button");
      return;
    }
    
    // For single question mode, validate current question
    if (!isManualMultiMode && !isMultiQuestionMode) {
      if (!question.trim()) {
        toast.error("Please enter a question");
        return;
      }
      if (needsOptions && options.filter(o => o.text.trim()).length < 2) {
        toast.error("Please add at least 2 options");
        return;
      }
      if (pollType === "quiz" && !correctAnswer) {
        toast.error("Please select the correct answer");
        return;
      }
    }

    setIsLoading(true);
    
    try {
      // Check if we're in manual multi-question mode for polls
      if (isManualMultiMode && pollQuestions.length > 0) {
        const allQuestions = pollQuestions.map(q => {
          let sessionOptions: { text: string; isCorrect?: boolean }[] = [];
          
          if (pollType === "yesno") {
            sessionOptions = [
              { text: "Yes", isCorrect: false },
              { text: "No", isCorrect: false },
            ];
          } else if (pollType === "rating") {
            sessionOptions = [1, 2, 3, 4, 5].map(n => ({
              text: String(n),
              isCorrect: false,
            }));
          } else if (needsOptions) {
            sessionOptions = q.options
              .filter(o => o.text.trim())
              .map(o => ({
                text: o.text,
                isCorrect: pollType === 'quiz' ? o.id === q.correctAnswer : false
              }));
          }

          const questionType = pollType === 'yesno' ? 'true-false' as const : 
                               pollType === 'rating' ? 'poll' as const : 'mcq' as const;

          return {
            text: q.question,
            type: questionType,
            timeLimit: q.timeLimit,
            points: 100,
            options: sessionOptions,
          };
        });

        const sessionData = {
          title,
          type: pollType,
          status: launch ? ('active' as const) : ('draft' as const),
          questions: allQuestions,
          modes,
        };

        const session = await createSession(sessionData);
        
        if (session) {
          if (launch) {
            toast.success(`Session launched with ${pollQuestions.length} questions!`);
            navigate(`/session/${session.code}?host=true`);
          } else {
            toast.success("Session saved as draft");
            navigate("/dashboard");
          }
        }
        return;
      }
      
      // Check if we're in multi-question mode (AI generated)
      if (isMultiQuestionMode && multiQuestions.length > 0) {
        // Create session with multiple questions
        const sessionData = {
          title,
          type: 'quiz' as const,
          status: launch ? ('active' as const) : ('draft' as const),
          questions: multiQuestions.map(q => ({
            text: q.question_text,
            type: 'mcq' as const,
            timeLimit: q.time_limit,
            points: 100,
            options: q.options.map(opt => ({
              text: opt.option_text,
              isCorrect: opt.is_correct,
            })),
          })),
          modes,
        };

        const session = await createSession(sessionData);
        
        if (session) {
          if (launch) {
            toast.success("Quiz launched with " + multiQuestions.length + " questions!");
            navigate(`/session/${session.code}?host=true`);
          } else {
            toast.success("Quiz saved as draft");
            navigate("/dashboard");
          }
        }
        return;
      }

      // Single question mode - Build options based on type
      let sessionOptions: { text: string; isCorrect?: boolean }[] = [];
      
      if (pollType === "yesno") {
        sessionOptions = [
          { text: "Yes", isCorrect: false },
          { text: "No", isCorrect: false },
        ];
      } else if (pollType === "rating") {
        sessionOptions = [1, 2, 3, 4, 5].map(n => ({
          text: String(n),
          isCorrect: false,
        }));
      } else if (needsOptions) {
        sessionOptions = options
          .filter(o => o.text.trim())
          .map(o => ({
            text: o.text,
            isCorrect: pollType === 'quiz' ? o.id === correctAnswer : false
          }));
      }

      const questionType = pollType === 'yesno' ? 'true-false' as const : 
                           pollType === 'rating' ? 'poll' as const : 'mcq' as const;

      const sessionData = {
        title,
        type: pollType,
        status: launch ? ('active' as const) : ('draft' as const),
        questions: [{
          text: question,
          type: questionType,
          timeLimit: pollType === 'quiz' ? timeLimit : undefined,
          points: 100,
          options: sessionOptions,
        }],
        modes,
      };

      const session = await createSession(sessionData);
      
      if (session) {
        if (launch) {
          toast.success("Session launched!");
          navigate(`/session/${session.code}?host=true`);
        } else {
          toast.success("Session saved as draft");
          navigate("/dashboard");
        }
      }
    } catch (error) {
      console.error('Error saving session:', error);
      toast.error("Failed to save session");
    } finally {
      setIsLoading(false);
    }
  };

  const config = pollTypeConfig[pollType];
  const Icon = config.icon;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border px-6 py-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg btn-gradient flex items-center justify-center">
                <Zap className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold hidden sm:block">Create Session</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => handleSave(false)} disabled={isLoading}>
              <Save className="w-4 h-4 mr-2" />
              Save Draft
            </Button>
            <Button variant="gradient" onClick={() => handleSave(true)} disabled={isLoading}>
              <Play className="w-4 h-4 mr-2" />
              Launch
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Poll Type Selector */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Session Type</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {(Object.keys(pollTypeConfig) as SessionType[]).map((type) => {
              const cfg = pollTypeConfig[type];
              const TypeIcon = cfg.icon;
              return (
                <motion.button
                  key={type}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setPollType(type)}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    pollType === type
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg ${cfg.bg} flex items-center justify-center mb-3`}>
                    <TypeIcon className={`w-5 h-5 ${cfg.color}`} />
                  </div>
                  <h3 className="font-semibold text-sm">{cfg.title.split(" ")[0]}</h3>
                  {pollType === type && cfg.features && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-2 space-y-1"
                    >
                      {cfg.features.map((feature, i) => (
                        <p key={i} className="text-xs text-muted-foreground flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          {feature}
                        </p>
                      ))}
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* AI Quiz Generator Section - Show for quiz type */}
        {pollType === 'quiz' && (
          <section className="space-y-4">
            {aiGeneratorMode === 'topic' ? (
              <TopicQuizGenerator
                onQuestionsGenerated={handleAIQuestionsGenerated}
                onClose={() => setAiGeneratorMode('none')}
              />
            ) : aiGeneratorMode === 'pdf' ? (
              <PDFQuizGenerator
                onQuestionsGenerated={handleAIQuestionsGenerated}
                onClose={() => setAiGeneratorMode('none')}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Generate from Topic */}
                <Card 
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setAiGeneratorMode('topic')}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <BookOpen className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-display font-bold">Generate from Topic</h3>
                        <p className="text-sm text-muted-foreground">
                          Enter any topic and let AI create questions
                        </p>
                      </div>
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                  </CardContent>
                </Card>

                {/* Generate from PDF */}
                <Card 
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => setAiGeneratorMode('pdf')}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-spark-coral/10 flex items-center justify-center">
                        <FileText className="w-6 h-6 text-spark-coral" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-display font-bold">Generate from PDF</h3>
                        <p className="text-sm text-muted-foreground">
                          Upload a PDF and extract quiz questions
                        </p>
                      </div>
                      <Sparkles className="w-5 h-5 text-spark-coral" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Show multi-question indicator with review */}
            {isMultiQuestionMode && multiQuestions.length > 0 && (
              <Card className="border-primary bg-primary/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                        <Sparkles className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{multiQuestions.length} Questions Loaded</p>
                        <p className="text-sm text-muted-foreground">Review questions before launching</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setIsMultiQuestionMode(false);
                        setMultiQuestions([]);
                      }}
                    >
                      Clear All
                    </Button>
                  </div>
                  
                  {/* Questions Review List */}
                  <div className="space-y-3 max-h-[400px] overflow-y-auto">
                    {multiQuestions.map((q, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-background border border-border hover:border-primary/50 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="font-medium text-sm">
                              <span className="text-primary mr-2">Q{idx + 1}.</span>
                              {q.question_text}
                            </p>
                            <div className="mt-2 grid grid-cols-2 gap-1">
                              {q.options.map((opt, optIdx) => (
                                <div 
                                  key={optIdx}
                                  className={`text-xs px-2 py-1 rounded ${
                                    opt.is_correct 
                                      ? 'bg-green-500/20 text-green-700 dark:text-green-400 border border-green-500/30' 
                                      : 'bg-muted text-muted-foreground'
                                  }`}
                                >
                                  {opt.is_correct && '✓ '}{opt.option_text}
                                </div>
                              ))}
                            </div>
                            {q.explanation && (
                              <p className="text-xs text-muted-foreground mt-2 italic">
                                💡 {q.explanation}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                            onClick={() => {
                              setMultiQuestions(prev => prev.filter((_, i) => i !== idx));
                              if (multiQuestions.length <= 1) {
                                setIsMultiQuestionMode(false);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Timer className="h-3 w-3" />
                            {q.time_limit}s
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </section>
        )}

        {/* Mock Test Section - Redirect to dedicated page */}
        {pollType === 'mocktest' && (
          <section>
            <Card className="border-2 border-emerald-500/50 bg-emerald-500/5">
              <CardContent className="p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-emerald-500" />
                </div>
                <h3 className="text-2xl font-display font-bold mb-2">Individual Mock Test</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Take a self-paced practice test with AI-generated questions. 
                  No admin panel needed - just enter a topic and start practicing!
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 max-w-lg mx-auto">
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <Sparkles className="w-5 h-5 text-primary mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">AI Questions</p>
                  </div>
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <Timer className="w-5 h-5 text-amber-500 mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Fixed Timer</p>
                  </div>
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <Gauge className="w-5 h-5 text-spark-coral mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Self Paced</p>
                  </div>
                  <div className="p-3 rounded-lg bg-background border border-border">
                    <Hand className="w-5 h-5 text-spark-teal mx-auto mb-1" />
                    <p className="text-xs text-muted-foreground">Pause & Resume</p>
                  </div>
                </div>
                <Button 
                  variant="gradient" 
                  size="lg" 
                  className="px-8"
                  onClick={() => navigate('/mocktest')}
                >
                  <Play className="w-5 h-5 mr-2" />
                  Start Mock Test
                </Button>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Buzzer Game Section */}
        {pollType === 'minigame' && (
          <section>
            <Card className="border-2 border-purple-500/50 bg-purple-500/5">
              <CardContent className="p-8">
                <div className="text-center mb-8">
                  <div className="w-16 h-16 rounded-2xl bg-purple-500/20 flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-8 h-8 text-purple-500" />
                  </div>
                  <h3 className="text-2xl font-display font-bold mb-2">Buzzer Game</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Interactive buzzer-style game where participants race to press the buzzer first. 
                    Questions are displayed on a large screen/TV - no questions shown in the app!
                  </p>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 max-w-2xl mx-auto">
                  <div className="p-4 rounded-xl bg-background border border-border text-center">
                    <Bell className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                    <p className="text-sm font-medium">Live Buzzer</p>
                    <p className="text-xs text-muted-foreground">First to press wins</p>
                  </div>
                  <div className="p-4 rounded-xl bg-background border border-border text-center">
                    <Trophy className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                    <p className="text-sm font-medium">Host Scoring</p>
                    <p className="text-xs text-muted-foreground">Add/remove points</p>
                  </div>
                  <div className="p-4 rounded-xl bg-background border border-border text-center">
                    <Timer className="w-6 h-6 text-spark-coral mx-auto mb-2" />
                    <p className="text-sm font-medium">Answer Timer</p>
                    <p className="text-xs text-muted-foreground">Host controls time</p>
                  </div>
                  <div className="p-4 rounded-xl bg-background border border-border text-center">
                    <Users className="w-6 h-6 text-spark-teal mx-auto mb-2" />
                    <p className="text-sm font-medium">Priority Queue</p>
                    <p className="text-xs text-muted-foreground">First come first serve</p>
                  </div>
                </div>

                <div className="max-w-md mx-auto space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Game Topic / Title</label>
                    <Input
                      variant="large"
                      placeholder="e.g., Science Quiz, History Trivia, Team Challenge..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      This will be displayed to participants when they join
                    </p>
                  </div>
                </div>

                <div className="mt-8 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 max-w-2xl mx-auto">
                  <h4 className="font-semibold text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    How it works:
                  </h4>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Launch the game and share the join code with participants</li>
                    <li>Display questions on a large TV/screen (questions are NOT in the app)</li>
                    <li>Open the buzzer - participants race to press first</li>
                    <li>Select who answers from the buzzer queue (first come first serve)</li>
                    <li>Start the timer for the participant to answer verbally</li>
                    <li>Award or deduct points based on their answer</li>
                    <li>Move to the next question and repeat!</li>
                  </ol>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {/* Manual Multi-Question Mode for Polls */}
        {isManualMultiMode && pollQuestions.length > 0 && (
          <Card className="border-spark-teal bg-spark-teal/5">
            <CardContent className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-spark-teal/20 flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-spark-teal" />
                    </div>
                    <div>
                      <p className="font-medium">{pollQuestions.length} Question{pollQuestions.length > 1 ? 's' : ''} Added</p>
                      <p className="text-sm text-muted-foreground">Ready to save or add more</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsManualMultiMode(false);
                      setPollQuestions([]);
                    }}
                  >
                    Clear All
                  </Button>
                </div>
                <div className="space-y-2">
                  {pollQuestions.map((q, idx) => (
                    <div
                      key={q.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-background border border-border hover:border-spark-teal/50 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">Q{idx + 1}: {q.question}</p>
                        <p className="text-xs text-muted-foreground">
                          {q.options.filter(o => o.text).length} options
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => editPollQuestion(q.id)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removePollQuestion(q.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Session Details - Hide for mocktest and minigame as they have their own pages */}
        {pollType !== 'mocktest' && pollType !== 'minigame' && (
        <>
        <Card variant="elevated">
          <CardHeader>
            <div className={`w-12 h-12 rounded-xl ${config.bg} flex items-center justify-center mb-2`}>
              <Icon className={`w-6 h-6 ${config.color}`} />
            </div>
            <CardTitle>{config.title}</CardTitle>
            <CardDescription>{config.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Session Title</label>
              <Input
                variant="large"
                placeholder="e.g., Team Standup Poll"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Question */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {pollType === "rating" ? "What to rate" : "Question"}
              </label>
              <Input
                variant="large"
                placeholder={
                  pollType === "yesno"
                    ? "e.g., Should we extend the meeting by 15 minutes?"
                    : pollType === "rating"
                    ? "e.g., How would you rate today's presentation?"
                    : "e.g., What's your preferred meeting time?"
                }
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>

            {/* Yes/No Options Display */}
            {pollType === "yesno" && (
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground mb-3">Participants will see:</p>
                <div className="flex gap-4 justify-center">
                  <div className="flex items-center gap-2 px-6 py-3 rounded-lg bg-spark-green/10 border border-spark-green">
                    <ThumbsUp className="w-5 h-5 text-spark-green" />
                    <span className="font-medium text-spark-green">Yes</span>
                  </div>
                  <div className="flex items-center gap-2 px-6 py-3 rounded-lg bg-spark-coral/10 border border-spark-coral">
                    <ThumbsUp className="w-5 h-5 text-spark-coral rotate-180" />
                    <span className="font-medium text-spark-coral">No</span>
                  </div>
                </div>
              </div>
            )}

            {/* Rating Scale Display */}
            {pollType === "rating" && (
              <div className="p-4 rounded-xl bg-muted/50 border border-border">
                <p className="text-sm text-muted-foreground mb-3">Participants will rate using:</p>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star 
                      key={star} 
                      className="w-8 h-8 text-amber-400 fill-amber-400" 
                    />
                  ))}
                </div>
                <p className="text-center text-sm text-muted-foreground mt-2">5-star rating scale</p>
              </div>
            )}

            {/* Options (for MCQ, Quiz, MiniGame) */}
            {!["yesno", "rating"].includes(pollType) && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">Options</label>
                  {options.length < 6 && (
                    <Button variant="ghost" size="sm" onClick={addOption}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Option
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {options.map((option, index) => (
                    <motion.div
                      key={option.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2"
                    >
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-sm font-medium text-muted-foreground shrink-0">
                        {String.fromCharCode(65 + index)}
                      </div>
                      <Input
                        placeholder={`Option ${index + 1}`}
                        value={option.text}
                        onChange={(e) => updateOption(option.id, e.target.value)}
                        className="flex-1"
                      />
                      {pollType === "quiz" && (
                        <Button
                          variant={correctAnswer === option.id ? "gradient" : "outline"}
                          size="sm"
                          onClick={() => setCorrectAnswer(option.id)}
                        >
                          {correctAnswer === option.id ? "Correct" : "Set Correct"}
                        </Button>
                      )}
                      {options.length > 2 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeOption(option.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Time Limit (for Quiz, MiniGame) */}
            {["quiz", "minigame"].includes(pollType) && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Time Limit (seconds)</label>
                <div className="flex items-center gap-4 flex-wrap">
                  {[15, 30, 45, 60, 90, 120].map((time) => (
                    <Button
                      key={time}
                      variant={timeLimit === time ? "gradient" : "outline"}
                      size="sm"
                      onClick={() => setTimeLimit(time)}
                    >
                      {time}s
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Add Question Button for multi-question mode */}
            {!isMultiQuestionMode && ["mcq", "poll", "yesno", "rating"].includes(pollType) && (
              <div className="pt-4 border-t border-border">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={addPollQuestion}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add This Question & Create Another
                </Button>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Create multiple questions for this session
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Session Modes */}
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gauge className="w-5 h-5 text-primary" />
              Session Modes
            </CardTitle>
            <CardDescription>Configure how your session behaves</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Pace Mode */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Pacing</label>
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => updateMode('paceMode', 'instructor')}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    modes.paceMode === 'instructor'
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Hand className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">Instructor Pace</h4>
                      <p className="text-xs text-muted-foreground">You control when to advance</p>
                    </div>
                  </div>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => updateMode('paceMode', 'self-paced')}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    modes.paceMode === 'self-paced'
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-spark-teal/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-spark-teal" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">Self-Paced</h4>
                      <p className="text-xs text-muted-foreground">Participants go at own speed</p>
                    </div>
                  </div>
                </motion.button>
              </div>
            </div>

            {/* Identity Mode */}
            <div className="space-y-3">
              <label className="text-sm font-medium">Participant Identity</label>
              <div className="grid grid-cols-2 gap-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => updateMode('identityMode', 'anonymous')}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    modes.identityMode === 'anonymous'
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <UserX className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">Anonymous</h4>
                      <p className="text-xs text-muted-foreground">Names are hidden</p>
                    </div>
                  </div>
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => updateMode('identityMode', 'named')}
                  className={`p-4 rounded-xl border-2 transition-all text-left ${
                    modes.identityMode === 'named'
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-green-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">Show Names</h4>
                      <p className="text-xs text-muted-foreground">Display participant names</p>
                    </div>
                  </div>
                </motion.button>
              </div>
            </div>

            {/* Toggle Options */}
            <div className="space-y-4">
              <label className="text-sm font-medium">Additional Settings</label>
              
              {/* Allow Multiple Responses */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Allow Response Changes</h4>
                    <p className="text-xs text-muted-foreground">Participants can update their answer</p>
                  </div>
                </div>
                <Switch
                  checked={modes.allowMultipleResponses}
                  onCheckedChange={(checked) => updateMode('allowMultipleResponses', checked)}
                />
              </div>

              {/* Show Live Results */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    {modes.showLiveResults ? (
                      <Eye className="w-5 h-5 text-blue-500" />
                    ) : (
                      <EyeOff className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm">Show Live Results</h4>
                    <p className="text-xs text-muted-foreground">Display results as votes come in</p>
                  </div>
                </div>
                <Switch
                  checked={modes.showLiveResults}
                  onCheckedChange={(checked) => updateMode('showLiveResults', checked)}
                />
              </div>

              {/* Shuffle Options (for MCQ/Quiz only) */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-border hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                      <Shuffle className="w-5 h-5 text-orange-500" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">Shuffle Options</h4>
                      <p className="text-xs text-muted-foreground">Randomize option order for each participant</p>
                    </div>
                  </div>
                  <Switch
                    checked={modes.shuffleOptions}
                    onCheckedChange={(checked) => updateMode('shuffleOptions', checked)}
                  />
              </div>

              {/* Chaos Mode */}
              <div className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                modes.chaosMode 
                  ? 'border-spark-coral bg-gradient-to-r from-spark-coral/10 to-amber-500/10' 
                  : 'border-border hover:border-primary/30'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    modes.chaosMode 
                      ? 'bg-gradient-to-br from-spark-coral to-amber-500' 
                      : 'bg-spark-coral/10'
                  }`}>
                    <Flame className={`w-5 h-5 ${modes.chaosMode ? 'text-white' : 'text-spark-coral'}`} />
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm flex items-center gap-2">
                      Chaos Mode
                      {modes.chaosMode && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-spark-coral/20 text-spark-coral font-medium animate-pulse">
                          ACTIVE
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-muted-foreground">Unleash animated effects and reactions for excitement</p>
                  </div>
                </div>
                <Switch
                  checked={modes.chaosMode}
                  onCheckedChange={(checked) => updateMode('chaosMode', checked)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-lg">Preview</CardTitle>
            <CardDescription>How your audience will see this</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/50 rounded-xl p-8 text-center">
              <h3 className="text-xl font-display font-bold mb-4">
                {question || "Your question will appear here"}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-3xl mx-auto">
                  {options.filter(o => o.text).map((option, index) => (
                    <Button
                      key={option.id}
                      variant="outline"
                      className="h-auto w-full justify-start text-left whitespace-normal leading-snug py-4 px-4"
                    >
                      <span className="font-semibold mr-2">{String.fromCharCode(65 + index)}</span>
                      {option.text}
                    </Button>
                  ))}
                </div>
            </div>
          </CardContent>
        </Card>
        </>
        )}
      </main>
    </div>
  );
};

export default CreateSession;
