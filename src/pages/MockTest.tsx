import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen,
  Clock,
  Play,
  Pause,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  Sparkles,
  Trophy,
  Target,
  Timer,
  RefreshCw,
  Home,
  Lightbulb,
  AlertCircle,
  RotateCcw
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { generateQuizFromTopic, isAIConfigured, type GeneratedQuestion, type Difficulty } from "@/services/aiQuizService";
import { useSessions } from "@/hooks/useSessions";
import { useAuth } from "@/context/AuthContext";

type MockTestState = 'setup' | 'loading' | 'testing' | 'paused' | 'review' | 'results';

interface UserAnswer {
  questionIndex: number;
  selectedOptionIndex: number | null;
  isCorrect: boolean;
  timeTaken: number;
}

const suggestedTopics = [
  'Cloud Computing',
  'Data Structures',
  'Machine Learning',
  'Web Development',
  'Database Systems',
  'Computer Networks',
  'Operating Systems',
  'Cybersecurity',
  'Python Programming',
  'JavaScript Basics',
  'React Framework',
  'AWS Services',
];

const MockTest = () => {
  const { createSession } = useSessions();
  const { user } = useAuth();
  
  // Setup state
  const [topic, setTopic] = useState("");
  const [questionCount, setQuestionCount] = useState(10);
  const [timePerQuestion, setTimePerQuestion] = useState(30);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  
  // Test state
  const [state, setState] = useState<MockTestState>('setup');
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  
  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  
  // Loading state
  const [loadingMessage, setLoadingMessage] = useState("Generating questions...");
  const [error, setError] = useState<string | null>(null);
  const [sessionSaved, setSessionSaved] = useState(false);

  const aiConfigured = isAIConfigured();
  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;
  const progress = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;

  // Timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (state === 'testing' && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Time's up - auto submit and move to next
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => clearInterval(timer);
  }, [state, timeRemaining, currentQuestionIndex]);

  const handleTimeUp = useCallback(async () => {
    const timeTaken = timePerQuestion - timeRemaining;
    const isCorrect = selectedOption !== null && 
      currentQuestion?.options[selectedOption]?.is_correct === true;
    
    const answer: UserAnswer = {
      questionIndex: currentQuestionIndex,
      selectedOptionIndex: selectedOption,
      isCorrect,
      timeTaken,
    };
    
    const updatedAnswers = [...answers, answer];
    setAnswers(updatedAnswers);
    
    if (currentQuestionIndex < totalQuestions - 1) {
      moveToNextQuestion();
    } else {
      setState('results');
      // Save session when test is completed
      if (user && !sessionSaved) {
        await saveTestSession(updatedAnswers);
      }
    }
  }, [selectedOption, currentQuestionIndex, totalQuestions, timePerQuestion, timeRemaining, currentQuestion, answers, user, sessionSaved]);

  const moveToNextQuestion = () => {
    setCurrentQuestionIndex(prev => prev + 1);
    setSelectedOption(null);
    setTimeRemaining(timePerQuestion);
    setQuestionStartTime(Date.now());
  };

  const handleStartTest = async () => {
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    setState('loading');
    setError(null);
    setLoadingMessage("Generating questions with AI...");

    try {
      const result = await generateQuizFromTopic(topic, questionCount, difficulty);
      
      if (result.error && result.questions.length === 0) {
        setError(result.error);
        setState('setup');
        toast.error(result.error);
        return;
      }

      if (result.questions.length < 3) {
        setError("Could not generate enough questions. Please try a different topic.");
        setState('setup');
        toast.error("Not enough questions generated");
        return;
      }

      setQuestions(result.questions);
      setAnswers([]);
      setCurrentQuestionIndex(0);
      setSelectedOption(null);
      setTimeRemaining(timePerQuestion);
      setQuestionStartTime(Date.now());
      setState('testing');
      toast.success(`Starting test with ${result.questions.length} questions!`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate quiz";
      setError(message);
      setState('setup');
      toast.error(message);
    }
  };

  const handleSubmitAnswer = async () => {
    const timeTaken = timePerQuestion - timeRemaining;
    const isCorrect = selectedOption !== null && 
      currentQuestion?.options[selectedOption]?.is_correct === true;
    
    const answer: UserAnswer = {
      questionIndex: currentQuestionIndex,
      selectedOptionIndex: selectedOption,
      isCorrect,
      timeTaken,
    };
    
    const updatedAnswers = [...answers, answer];
    setAnswers(updatedAnswers);
    
    if (currentQuestionIndex < totalQuestions - 1) {
      moveToNextQuestion();
    } else {
      setState('results');
      // Save session when test is completed
      if (user && !sessionSaved) {
        await saveTestSession(updatedAnswers);
      }
    }
  };

  const handlePause = () => {
    setState('paused');
  };

  const handleResume = () => {
    setState('testing');
  };

  const handleRestart = () => {
    setQuestions([]);
    setAnswers([]);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setTimeRemaining(0);
    setSessionSaved(false);
    setState('setup');
  };

  const handleRetakeTest = () => {
    setAnswers([]);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setTimeRemaining(timePerQuestion);
    setQuestionStartTime(Date.now());
    setSessionSaved(false);
    setState('testing');
  };

  const saveTestSession = async (finalAnswers: UserAnswer[]) => {
    try {
      const correctCount = finalAnswers.filter(a => a.isCorrect).length;
      const totalAnswered = finalAnswers.length;
      const score = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
      
      // Convert questions to session format
      const sessionQuestions = questions.map((q, index) => ({
        text: q.question_text,
        type: 'mcq' as const,
        timeLimit: timePerQuestion,
        points: 100,
        options: q.options.map(opt => ({
          text: opt.option_text,
          isCorrect: opt.is_correct
        }))
      }));

      await createSession({
        title: `Mock Test: ${topic}`,
        type: 'mocktest',
        status: 'ended',
        questions: sessionQuestions,
        modes: {
          paceMode: 'self-paced',
          identityMode: 'anonymous',
          allowMultipleResponses: false,
          showLiveResults: false,
          shuffleOptions: false
        }
      });
      
      setSessionSaved(true);
    } catch (error) {
      console.error('Failed to save mock test session:', error);
      // Don't show error to user as it doesn't affect their test results
    }
  };

  const calculateResults = () => {
    const correctCount = answers.filter(a => a.isCorrect).length;
    const totalAnswered = answers.length;
    const score = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
    const averageTime = totalAnswered > 0 
      ? Math.round(answers.reduce((sum, a) => sum + a.timeTaken, 0) / totalAnswered) 
      : 0;
    
    return { correctCount, totalAnswered, score, averageTime };
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;
  };

  // Render setup screen
  if (state === 'setup') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        <div className="container max-w-2xl mx-auto py-8 px-4">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link to="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-display font-bold">Mock Test</h1>
              <p className="text-muted-foreground">Practice with AI-generated questions</p>
            </div>
          </div>

          <Card className="border-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Configure Your Test
              </CardTitle>
              <CardDescription>
                Enter a topic and customize your test settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* AI Status Warning */}
              {!aiConfigured && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    AI service not configured. Please add VITE_NVIDIA_API_KEY to your environment.
                  </p>
                </motion.div>
              )}

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-500"
                >
                  <XCircle className="w-4 h-4 shrink-0" />
                  <p className="text-sm">{error}</p>
                </motion.div>
              )}

              {/* Topic Input */}
              <div className="space-y-2">
                <Label htmlFor="topic">Topic / Subject</Label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., Machine Learning, JavaScript, Computer Networks"
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Suggested Topics */}
              <div className="space-y-2">
                <Label className="text-muted-foreground text-sm">Quick suggestions:</Label>
                <div className="flex flex-wrap gap-2">
                  {suggestedTopics.slice(0, 6).map((suggestion) => (
                    <Button
                      key={suggestion}
                      variant="outline"
                      size="sm"
                      onClick={() => setTopic(suggestion)}
                      className="text-xs"
                    >
                      <Lightbulb className="w-3 h-3 mr-1" />
                      {suggestion}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Question Count */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Number of Questions</Label>
                  <Badge variant="secondary">{questionCount}</Badge>
                </div>
                <Slider
                  value={[questionCount]}
                  onValueChange={(v) => setQuestionCount(v[0])}
                  min={5}
                  max={20}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Time Per Question */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Time Per Question</Label>
                  <Badge variant="secondary">{timePerQuestion} seconds</Badge>
                </div>
                <Slider
                  value={[timePerQuestion]}
                  onValueChange={(v) => setTimePerQuestion(v[0])}
                  min={10}
                  max={120}
                  step={5}
                  className="w-full"
                />
              </div>

              {/* Difficulty */}
              <div className="space-y-2">
                <Label>Difficulty Level</Label>
                <div className="flex gap-2">
                  {(['easy', 'medium', 'hard', 'mixed'] as const).map((level) => (
                    <Button
                      key={level}
                      variant={difficulty === level ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDifficulty(level)}
                      className="flex-1 capitalize"
                    >
                      {level}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Start Button */}
              <Button
                onClick={handleStartTest}
                className="w-full h-12 text-lg"
                disabled={!aiConfigured || !topic.trim()}
              >
                <Play className="w-5 h-5 mr-2" />
                Start Mock Test
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Render loading screen
  if (state === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 mx-auto mb-6"
            >
              <Sparkles className="w-full h-full text-primary" />
            </motion.div>
            <h2 className="text-xl font-bold mb-2">Preparing Your Test</h2>
            <p className="text-muted-foreground mb-4">{loadingMessage}</p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating {questionCount} questions on "{topic}"
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render paused screen
  if (state === 'paused') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-8 text-center">
            <Pause className="w-16 h-16 mx-auto mb-6 text-amber-500" />
            <h2 className="text-2xl font-bold mb-2">Test Paused</h2>
            <p className="text-muted-foreground mb-6">
              Question {currentQuestionIndex + 1} of {totalQuestions}
            </p>
            <div className="space-y-3">
              <Button onClick={handleResume} className="w-full">
                <Play className="w-4 h-4 mr-2" />
                Resume Test
              </Button>
              <Button variant="outline" onClick={handleRestart} className="w-full">
                <RotateCcw className="w-4 h-4 mr-2" />
                Start New Test
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render results screen
  if (state === 'results') {
    const { correctCount, totalAnswered, score, averageTime } = calculateResults();
    const grade = score >= 90 ? 'A+' : score >= 80 ? 'A' : score >= 70 ? 'B' : score >= 60 ? 'C' : score >= 50 ? 'D' : 'F';
    const gradeColor = score >= 70 ? 'text-green-500' : score >= 50 ? 'text-amber-500' : 'text-red-500';

    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8">
        <div className="container max-w-2xl mx-auto px-4">
          <Card className="border-2 overflow-hidden">
            <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-6 text-center">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h1 className="text-3xl font-bold mb-2">Test Complete!</h1>
              <p className="text-muted-foreground">Topic: {topic}</p>
            </div>
            
            <CardContent className="p-6">
              {/* Score Overview */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className={`text-3xl font-bold ${gradeColor}`}>{grade}</div>
                  <div className="text-sm text-muted-foreground">Grade</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-3xl font-bold text-primary">{score}%</div>
                  <div className="text-sm text-muted-foreground">Score</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-3xl font-bold text-green-500">{correctCount}</div>
                  <div className="text-sm text-muted-foreground">Correct</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/50">
                  <div className="text-3xl font-bold">{averageTime}s</div>
                  <div className="text-sm text-muted-foreground">Avg Time</div>
                </div>
              </div>

              {/* Question Review */}
              <div className="mb-6">
                <h3 className="font-semibold mb-4">Question Review</h3>
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {questions.map((q, idx) => {
                    const answer = answers[idx];
                    const isCorrect = answer?.isCorrect;
                    const correctOptionIdx = q.options.findIndex(o => o.is_correct);
                    
                    return (
                      <div 
                        key={idx}
                        className={`p-4 rounded-lg border ${
                          isCorrect ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {isCorrect ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                          ) : (
                            <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-sm mb-2">
                              Q{idx + 1}: {q.question_text}
                            </p>
                            <div className="text-sm text-muted-foreground">
                              {answer?.selectedOptionIndex !== null ? (
                                <span>
                                  Your answer: {q.options[answer.selectedOptionIndex]?.option_text}
                                </span>
                              ) : (
                                <span className="text-amber-500">Not answered</span>
                              )}
                              {!isCorrect && (
                                <span className="block text-green-600 dark:text-green-400 mt-1">
                                  Correct: {q.options[correctOptionIdx]?.option_text}
                                </span>
                              )}
                            </div>
                            {q.explanation && (
                              <p className="text-xs text-muted-foreground mt-2 italic">
                                {q.explanation}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={handleRetakeTest} className="flex-1">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retake Test
                </Button>
                <Button variant="outline" onClick={handleRestart} className="flex-1">
                  <Target className="w-4 h-4 mr-2" />
                  New Topic
                </Button>
                <Link to="/" className="flex-1">
                  <Button variant="ghost" className="w-full">
                    <Home className="w-4 h-4 mr-2" />
                    Home
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Render testing screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container max-w-3xl mx-auto py-6 px-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-sm">
              {topic}
            </Badge>
            <Badge variant="secondary">
              {currentQuestionIndex + 1} / {totalQuestions}
            </Badge>
          </div>
          <Button variant="outline" size="sm" onClick={handlePause}>
            <Pause className="w-4 h-4 mr-2" />
            Pause
          </Button>
        </div>

        {/* Progress Bar */}
        <Progress value={progress} className="mb-6 h-2" />

        {/* Timer */}
        <div className="flex justify-center mb-6">
          <motion.div
            key={timeRemaining}
            initial={{ scale: 1.1 }}
            animate={{ scale: 1 }}
            className={`flex items-center gap-2 px-6 py-3 rounded-full ${
              timeRemaining <= 5 
                ? 'bg-red-500/20 text-red-500' 
                : timeRemaining <= 10 
                  ? 'bg-amber-500/20 text-amber-500' 
                  : 'bg-primary/20 text-primary'
            }`}
          >
            <Timer className="w-5 h-5" />
            <span className="text-2xl font-mono font-bold">{formatTime(timeRemaining)}</span>
          </motion.div>
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="text-xl leading-relaxed">
                  {currentQuestion?.question_text}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {currentQuestion?.options.map((option, idx) => (
                    <motion.button
                      key={idx}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedOption(idx)}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                        selectedOption === idx
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          selectedOption === idx
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <span className="flex-1">{option.option_text}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>

                {/* Submit Button */}
                <div className="mt-6 flex justify-end">
                  <Button 
                    onClick={handleSubmitAnswer}
                    disabled={selectedOption === null}
                    className="min-w-[150px]"
                  >
                    {currentQuestionIndex === totalQuestions - 1 ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Finish Test
                      </>
                    ) : (
                      <>
                        Next
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MockTest;
