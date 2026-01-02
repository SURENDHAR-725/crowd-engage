import { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Clock, 
  Users, 
  CheckCircle2, 
  XCircle, 
  Trophy, 
  Pause, 
  Play, 
  SkipForward,
  SkipBack,
  Eye,
  Award,
  Timer,
  Crown,
  Medal,
  Star
} from "lucide-react";
import { useParticipantCount, useLeaderboard, useQuestionResponses } from "@/hooks/useResponses";
import { useLiveQuiz } from "@/hooks/useLiveQuiz";
import { submitResponse, calculateScore } from "@/services/responseService";

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  time_limit: number;
  order_index: number;
  options: Option[];
}

interface Option {
  id: string;
  option_text: string;
  is_correct: boolean;
}

interface Session {
  id: string;
  title: string;
  code: string;
  status: string;
  host_id: string;
}

const LiveSession = () => {
  const params = useParams<{ sessionId?: string; code?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Support both route patterns: /live/:sessionId and /session/:code
  const routeSessionId = params.sessionId;
  const routeCode = params.code;
  
  const isHost = searchParams.get("host") === "true";
  
  const [session, setSession] = useState<Session | null>(null);
  const [resolvedSessionId, setResolvedSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>("");

  const { count: participantCount, isLoading: countLoading } = useParticipantCount(resolvedSessionId || "");
  const { leaderboard, isLoading: leaderboardLoading, refetch: refetchLeaderboard } = useLeaderboard(resolvedSessionId || "");
  
  const {
    quizState,
    startQuestion,
    pauseTimer,
    resumeTimer,
    revealAnswers,
    showLeaderboard,
    nextQuestion,
    previousQuestion,
    endQuiz,
    canGoNext,
    canGoPrevious,
  } = useLiveQuiz({
    sessionId: resolvedSessionId || "",
    isHost,
    totalQuestions: questions.length,
    defaultTimeLimit: 30,
  });

  const currentQuestion = useMemo(() => 
    questions[quizState.currentQuestionIndex] || null,
    [questions, quizState.currentQuestionIndex]
  );

  const { responses: questionResponses, refetch: refetchResponses } = useQuestionResponses(currentQuestion?.id || "");

  // Load session data
  useEffect(() => {
    const loadSession = async () => {
      if (!routeSessionId && !routeCode) return;

      try {
        setLoading(true);
        
        let sessionData;
        
        // If we have a session ID, fetch directly
        if (routeSessionId) {
          const { data, error } = await supabase
            .from("sessions")
            .select("*")
            .eq("id", routeSessionId)
            .maybeSingle();
          
          if (error) throw error;
          sessionData = data;
        } 
        // If we have a code, look up by code
        else if (routeCode) {
          const { data, error } = await supabase
            .from("sessions")
            .select("*")
            .eq("code", routeCode.toUpperCase())
            .maybeSingle();
          
          if (error) throw error;
          sessionData = data;
        }

        if (!sessionData) {
          toast.error("Session not found");
          navigate("/");
          return;
        }

        setSession(sessionData);
        setResolvedSessionId(sessionData.id);

        // Load questions with options
        const { data: questionsData, error: questionsError } = await supabase
          .from("questions")
          .select(`
            id,
            question_text,
            question_type,
            time_limit,
            order_index,
            options (
              id,
              option_text,
              is_correct
            )
          `)
          .eq("session_id", sessionData.id)
          .order("order_index");

        if (questionsError) throw questionsError;
        setQuestions(questionsData || []);

        // Get participant info
        const storedParticipantId = sessionStorage.getItem(`participant_${sessionData.id}`);
        const storedNickname = localStorage.getItem("nickname");
        
        if (storedParticipantId) {
          setParticipantId(storedParticipantId);
        }
        if (storedNickname) {
          setNickname(storedNickname);
        }

      } catch (error) {
        console.error("Error loading session:", error);
        toast.error("Failed to load session");
      } finally {
        setLoading(false);
      }
    };

    loadSession();
  }, [routeSessionId, routeCode, navigate]);

  // Subscribe to session status changes
  useEffect(() => {
    if (!resolvedSessionId) return;

    const channel = supabase
      .channel(`session-status:${resolvedSessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "sessions",
          filter: `id=eq.${resolvedSessionId}`,
        },
        (payload) => {
          setSession(prev => prev ? { ...prev, ...payload.new } : null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [resolvedSessionId]);

  // Reset answer state when question changes
  useEffect(() => {
    setSelectedOption(null);
    setHasAnswered(false);
    
    // Check if participant already answered this question
    const checkExistingAnswer = async () => {
      if (!currentQuestion?.id || !participantId) return;
      
      const { data } = await supabase
        .from("responses")
        .select("id")
        .eq("question_id", currentQuestion.id)
        .eq("participant_id", participantId)
        .maybeSingle();
      
      if (data) {
        setHasAnswered(true);
      }
    };
    
    checkExistingAnswer();
  }, [quizState.currentQuestionIndex, currentQuestion?.id, participantId]);

  // Host: Start the quiz
  const handleStartQuiz = async () => {
    if (!isHost || !resolvedSessionId) return;

    try {
      // Update session status to active
      const { error } = await supabase
        .from("sessions")
        .update({ status: "active" })
        .eq("id", resolvedSessionId);

      if (error) throw error;

      // Start first question
      startQuestion(0, questions[0]?.time_limit || 30);
      
      toast.success("Quiz started!");
    } catch (error) {
      console.error("Error starting quiz:", error);
      toast.error("Failed to start quiz");
    }
  };

  // Participant: Submit answer
  const handleSubmitAnswer = async () => {
    if (!selectedOption || !currentQuestion || !participantId || hasAnswered) return;

    try {
      setSubmitting(true);

      const selectedOptionData = currentQuestion.options.find(o => o.id === selectedOption);
      const isCorrect = selectedOptionData?.is_correct || false;
      const score = calculateScore(isCorrect, quizState.timeRemaining, currentQuestion.time_limit);

      await submitResponse({
        participantId,
        questionId: currentQuestion.id,
        optionId: selectedOption,
        isCorrect,
        score,
        responseTime: (currentQuestion.time_limit - quizState.timeRemaining) * 1000,
      });

      setHasAnswered(true);
      toast.success(isCorrect ? "Correct! 🎉" : "Incorrect 😔");
      
      refetchResponses();
    } catch (error) {
      console.error("Error submitting answer:", error);
      toast.error("Failed to submit answer");
    } finally {
      setSubmitting(false);
    }
  };

  // Host: End quiz and update session
  const handleEndQuiz = async () => {
    if (!isHost || !resolvedSessionId) return;

    try {
      const { error } = await supabase
        .from("sessions")
        .update({ status: "ended" })
        .eq("id", resolvedSessionId);

      if (error) throw error;

      endQuiz();
      refetchLeaderboard();
    } catch (error) {
      console.error("Error ending quiz:", error);
      toast.error("Failed to end quiz");
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32 mt-2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <div className="grid grid-cols-2 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4 text-center">
        <h1 className="text-2xl font-bold text-red-600">Session Not Found</h1>
        <p className="mt-4">This session doesn't exist or has been deleted.</p>
        <Button onClick={() => navigate("/")} className="mt-4">
          Go Home
        </Button>
      </div>
    );
  }

  // Waiting Room View
  if (session.status === "waiting" || quizState.status === "waiting") {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="text-3xl">{session.title}</CardTitle>
            <CardDescription className="text-lg mt-2">
              {isHost ? "Waiting for participants to join..." : "Waiting for host to start..."}
            </CardDescription>
          </CardHeader>
          <CardContent className="py-8">
            <div className="flex flex-col items-center gap-6">
              <div className="text-6xl font-bold text-primary">{session.code}</div>
              
              <div className="flex items-center gap-2 text-xl">
                <Users className="h-6 w-6" />
                <span>
                  {countLoading ? (
                    <Skeleton className="h-6 w-12 inline-block" />
                  ) : (
                    `${participantCount} participant${participantCount !== 1 ? "s" : ""}`
                  )}
                </span>
              </div>

              <div className="text-muted-foreground">
                {questions.length} question{questions.length !== 1 ? "s" : ""} ready
              </div>

              {!isHost && nickname && (
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  Playing as: {nickname}
                </Badge>
              )}
            </div>
          </CardContent>
          
          {isHost && (
            <CardFooter className="flex justify-center pb-8">
              <Button 
                size="lg" 
                onClick={handleStartQuiz}
                disabled={questions.length === 0}
                className="px-8"
              >
                <Play className="mr-2 h-5 w-5" />
                Start Quiz
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    );
  }

  // Quiz Ended View
  if (session.status === "ended" || quizState.status === "ended") {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl flex items-center justify-center gap-2">
              <Trophy className="h-8 w-8 text-yellow-500" />
              Quiz Complete!
            </CardTitle>
            <CardDescription className="text-lg">
              {session.title}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-center mb-6">Final Leaderboard</h3>
              
              {leaderboardLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : leaderboard.length === 0 ? (
                <p className="text-center text-muted-foreground">No participants yet</p>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((entry, index) => (
                    <div 
                      key={entry.id}
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        index === 0 ? "bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-400" :
                        index === 1 ? "bg-gray-100 dark:bg-gray-800 border border-gray-300" :
                        index === 2 ? "bg-orange-100 dark:bg-orange-900/30 border border-orange-300" :
                        "bg-muted/50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 flex items-center justify-center">
                          {index === 0 ? <Crown className="h-8 w-8 text-yellow-500" /> :
                           index === 1 ? <Medal className="h-8 w-8 text-gray-400" /> :
                           index === 2 ? <Medal className="h-8 w-8 text-orange-400" /> :
                           <span className="text-xl font-bold text-muted-foreground">#{index + 1}</span>}
                        </div>
                        <div>
                          <div className="font-semibold">{entry.nickname}</div>
                          <div className="text-sm text-muted-foreground">
                            {entry.correct_answers || 0} correct answers
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-primary" />
                        <span className="text-xl font-bold">{entry.score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => navigate("/")}>
              Return Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Show Leaderboard View
  if (quizState.status === "leaderboard") {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <Award className="h-6 w-6" />
              Leaderboard
            </CardTitle>
            <CardDescription>
              After Question {quizState.currentQuestionIndex + 1}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {leaderboardLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {leaderboard.slice(0, 10).map((entry, index) => (
                  <div 
                    key={entry.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 text-lg font-bold">#{index + 1}</span>
                      <span className="font-medium">{entry.nickname}</span>
                    </div>
                    <span className="font-bold text-primary">{entry.score} pts</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          
          {isHost && (
            <CardFooter className="flex justify-center gap-4">
              {canGoNext ? (
                <Button onClick={nextQuestion} size="lg">
                  <SkipForward className="mr-2 h-5 w-5" />
                  Next Question
                </Button>
              ) : (
                <Button onClick={handleEndQuiz} size="lg" variant="destructive">
                  End Quiz
                </Button>
              )}
            </CardFooter>
          )}
        </Card>
      </div>
    );
  }

  // Active Quiz View
  if (!currentQuestion) {
    return (
      <div className="container max-w-4xl mx-auto py-8 px-4 text-center">
        <h1 className="text-2xl font-bold">No questions available</h1>
      </div>
    );
  }

  // Host Control Panel
  if (isHost) {
    const correctCount = questionResponses.filter(r => r.is_correct).length;
    const totalResponses = questionResponses.length;
    const responsePercentage = participantCount > 0 ? (totalResponses / participantCount) * 100 : 0;

    return (
      <div className="container max-w-6xl mx-auto py-8 px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Question Display */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <Badge variant="outline" className="mb-2">
                      Question {quizState.currentQuestionIndex + 1} of {questions.length}
                    </Badge>
                    <CardTitle className="text-xl">{currentQuestion.question_text}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <Timer className={`h-5 w-5 ${quizState.timeRemaining <= 5 ? "text-red-500 animate-pulse" : ""}`} />
                    <span className={`text-2xl font-bold ${quizState.timeRemaining <= 5 ? "text-red-500" : ""}`}>
                      {quizState.timeRemaining}s
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Progress 
                  value={(quizState.timeRemaining / currentQuestion.time_limit) * 100} 
                  className="mb-6"
                />
                
                <div className="grid grid-cols-2 gap-4">
                  {currentQuestion.options.map((option, index) => {
                    const optionResponses = questionResponses.filter(r => r.option_id === option.id).length;
                    const optionPercentage = totalResponses > 0 ? (optionResponses / totalResponses) * 100 : 0;
                    
                    return (
                      <div
                        key={option.id}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          quizState.isRevealing
                            ? option.is_correct
                              ? "border-green-500 bg-green-50 dark:bg-green-900/30"
                              : "border-red-300 bg-red-50 dark:bg-red-900/20"
                            : "border-muted"
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-medium">{option.option_text}</span>
                          {quizState.isRevealing && (
                            option.is_correct 
                              ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                              : <XCircle className="h-5 w-5 text-red-400" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Progress value={optionPercentage} className="h-2 flex-1" />
                          <span className="text-sm font-medium w-16 text-right">
                            {optionResponses} ({Math.round(optionPercentage)}%)
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Control Panel Sidebar */}
          <div className="space-y-4">
            {/* Stats Card */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Live Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Participants</span>
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="font-bold">{participantCount}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Responses</span>
                  <span className="font-bold">{totalResponses} / {participantCount}</span>
                </div>
                <Progress value={responsePercentage} className="h-2" />
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Correct</span>
                  <span className="font-bold text-green-600">{correctCount}</span>
                </div>
              </CardContent>
            </Card>

            {/* Timer Controls */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {!quizState.isRevealing ? (
                  <>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={quizState.isPaused ? resumeTimer : pauseTimer}
                    >
                      {quizState.isPaused ? (
                        <><Play className="mr-2 h-4 w-4" /> Resume Timer</>
                      ) : (
                        <><Pause className="mr-2 h-4 w-4" /> Pause Timer</>
                      )}
                    </Button>
                    <Button 
                      variant="secondary" 
                      className="w-full"
                      onClick={revealAnswers}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Reveal Answers
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        refetchLeaderboard();
                        showLeaderboard();
                      }}
                    >
                      <Award className="mr-2 h-4 w-4" />
                      Show Leaderboard
                    </Button>
                    {canGoNext ? (
                      <Button className="w-full" onClick={nextQuestion}>
                        <SkipForward className="mr-2 h-4 w-4" />
                        Next Question
                      </Button>
                    ) : (
                      <Button 
                        variant="destructive" 
                        className="w-full"
                        onClick={handleEndQuiz}
                      >
                        End Quiz
                      </Button>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* Navigation */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Navigation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={previousQuestion}
                    disabled={!canGoPrevious}
                    className="flex-1"
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <div className="flex-1 text-center py-2">
                    {quizState.currentQuestionIndex + 1} / {questions.length}
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={nextQuestion}
                    disabled={!canGoNext}
                    className="flex-1"
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Participant View
  return (
    <div className="container max-w-2xl mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <Badge variant="outline">
              Question {quizState.currentQuestionIndex + 1} of {questions.length}
            </Badge>
            <div className="flex items-center gap-2">
              <Clock className={`h-5 w-5 ${quizState.timeRemaining <= 5 ? "text-red-500 animate-pulse" : ""}`} />
              <span className={`text-xl font-bold ${quizState.timeRemaining <= 5 ? "text-red-500" : ""}`}>
                {quizState.timeRemaining}s
              </span>
            </div>
          </div>
          <Progress 
            value={(quizState.timeRemaining / currentQuestion.time_limit) * 100} 
            className="mt-4"
          />
        </CardHeader>
        <CardContent className="space-y-6">
          <h2 className="text-xl font-semibold text-center py-4">
            {currentQuestion.question_text}
          </h2>

          <div className="grid gap-3">
            {currentQuestion.options.map((option) => {
              const isSelected = selectedOption === option.id;
              const showResult = quizState.isRevealing;
              
              return (
                <button
                  key={option.id}
                  onClick={() => !hasAnswered && !showResult && setSelectedOption(option.id)}
                  disabled={hasAnswered || showResult || quizState.timeRemaining === 0}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    showResult
                      ? option.is_correct
                        ? "border-green-500 bg-green-50 dark:bg-green-900/30"
                        : isSelected
                          ? "border-red-500 bg-red-50 dark:bg-red-900/30"
                          : "border-muted opacity-50"
                      : isSelected
                        ? "border-primary bg-primary/10"
                        : "border-muted hover:border-primary/50"
                  } ${hasAnswered && !showResult && isSelected ? "border-blue-500" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{option.option_text}</span>
                    {showResult && (
                      option.is_correct 
                        ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                        : isSelected 
                          ? <XCircle className="h-5 w-5 text-red-500" />
                          : null
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {hasAnswered && !quizState.isRevealing && (
            <div className="text-center py-4">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                <CheckCircle2 className="mr-2 h-4 w-4 inline" />
                Answer submitted! Waiting for results...
              </Badge>
            </div>
          )}

          {!hasAnswered && !quizState.isRevealing && quizState.timeRemaining > 0 && (
            <Button
              className="w-full"
              size="lg"
              disabled={!selectedOption || submitting}
              onClick={handleSubmitAnswer}
            >
              {submitting ? "Submitting..." : "Submit Answer"}
            </Button>
          )}

          {!hasAnswered && quizState.timeRemaining === 0 && !quizState.isRevealing && (
            <div className="text-center py-4">
              <Badge variant="destructive" className="text-lg px-4 py-2">
                Time's up!
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveSession;
