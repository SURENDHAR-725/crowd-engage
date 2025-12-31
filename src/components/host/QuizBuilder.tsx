import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  Upload,
  GripVertical,
  Timer,
  CheckCircle,
  AlertCircle,
  Copy,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type { QuestionData } from "@/services/sessionService";

interface QuizBuilderProps {
  questions: QuestionData[];
  onChange: (questions: QuestionData[]) => void;
  sessionType: "mcq" | "quiz" | "poll" | "true-false";
}

const defaultQuestion: QuestionData = {
  text: "",
  type: "mcq",
  timeLimit: 30,
  points: 100,
  options: [
    { text: "", isCorrect: false },
    { text: "", isCorrect: false },
  ],
};

export const QuizBuilder = ({ questions, onChange, sessionType }: QuizBuilderProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addQuestion = () => {
    const newQuestion: QuestionData = {
      ...defaultQuestion,
      type: sessionType === "quiz" ? "mcq" : sessionType,
    };
    onChange([...questions, newQuestion]);
    setActiveIndex(questions.length);
  };

  const duplicateQuestion = (index: number) => {
    const questionToCopy = questions[index];
    onChange([...questions, { ...questionToCopy }]);
    setActiveIndex(questions.length);
    toast.success("Question duplicated");
  };

  const removeQuestion = (index: number) => {
    if (questions.length <= 1) {
      toast.error("You need at least one question");
      return;
    }
    const updated = questions.filter((_, i) => i !== index);
    onChange(updated);
    if (activeIndex >= updated.length) {
      setActiveIndex(Math.max(0, updated.length - 1));
    }
  };

  const updateQuestion = (index: number, updates: Partial<QuestionData>) => {
    const updated = questions.map((q, i) =>
      i === index ? { ...q, ...updates } : q
    );
    onChange(updated);
  };

  const updateOption = (qIndex: number, oIndex: number, text: string) => {
    const question = questions[qIndex];
    const options = [...(question.options || [])];
    options[oIndex] = { ...options[oIndex], text };
    updateQuestion(qIndex, { options });
  };

  const setCorrectOption = (qIndex: number, oIndex: number) => {
    const question = questions[qIndex];
    const options = (question.options || []).map((opt, i) => ({
      ...opt,
      isCorrect: i === oIndex,
    }));
    updateQuestion(qIndex, { options });
  };

  const addOption = (qIndex: number) => {
    const question = questions[qIndex];
    const options = [...(question.options || [])];
    if (options.length >= 6) {
      toast.error("Maximum 6 options allowed");
      return;
    }
    options.push({ text: "", isCorrect: false });
    updateQuestion(qIndex, { options });
  };

  const removeOption = (qIndex: number, oIndex: number) => {
    const question = questions[qIndex];
    const options = [...(question.options || [])];
    if (options.length <= 2) {
      toast.error("Minimum 2 options required");
      return;
    }
    options.splice(oIndex, 1);
    updateQuestion(qIndex, { options });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const lines = text.split("\n").filter((line) => line.trim());
      const parsedQuestions: QuestionData[] = [];

      let currentQuestion: QuestionData | null = null;

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith("Q:") || trimmed.startsWith("Question:")) {
          if (currentQuestion) {
            parsedQuestions.push(currentQuestion);
          }
          currentQuestion = {
            text: trimmed.replace(/^(Q:|Question:)\s*/, ""),
            type: sessionType === "quiz" ? "mcq" : sessionType,
            timeLimit: 30,
            points: 100,
            options: [],
          };
        } else if (currentQuestion && (trimmed.match(/^[A-D][\.\):]/) || trimmed.match(/^[1-4][\.\):]/))) {
          const optionText = trimmed.replace(/^[A-D1-4][\.\):]\s*/, "");
          const isCorrect = trimmed.includes("*") || trimmed.toLowerCase().includes("(correct)");
          currentQuestion.options?.push({
            text: optionText.replace(/\*|\(correct\)/gi, "").trim(),
            isCorrect,
          });
        }
      }

      if (currentQuestion && currentQuestion.options && currentQuestion.options.length >= 2) {
        parsedQuestions.push(currentQuestion);
      }

      if (parsedQuestions.length > 0) {
        onChange([...questions, ...parsedQuestions]);
        toast.success(`Imported ${parsedQuestions.length} questions`);
      } else {
        toast.error("No valid questions found in file");
      }
    } catch (error) {
      toast.error("Failed to parse file");
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const activeQuestion = questions[activeIndex];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Question List Sidebar */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Questions ({questions.length})</CardTitle>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                title="Upload questions"
              >
                <Upload className="w-4 h-4" />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.csv"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[400px] overflow-y-auto">
          <AnimatePresence>
            {questions.map((q, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  activeIndex === index
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => setActiveIndex(index)}
              >
                <div className="flex items-start gap-2">
                  <GripVertical className="w-4 h-4 text-muted-foreground mt-1 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {q.text || `Question ${index + 1}`}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Timer className="w-3 h-3" />
                      {q.timeLimit}s
                      <span className="text-primary font-medium">+{q.points}</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        duplicateQuestion(index);
                      }}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-6 h-6 text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeQuestion(index);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
          <Button variant="outline" className="w-full" onClick={addQuestion}>
            <Plus className="w-4 h-4 mr-2" />
            Add Question
          </Button>
        </CardContent>
      </Card>

      {/* Active Question Editor */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Question {activeIndex + 1}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Question Text */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Question</label>
            <Input
              variant="large"
              placeholder="Enter your question..."
              value={activeQuestion?.text || ""}
              onChange={(e) => updateQuestion(activeIndex, { text: e.target.value })}
            />
          </div>

          {/* Timer & Points */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Time Limit</label>
              <div className="flex gap-2 flex-wrap">
                {[10, 20, 30, 45, 60].map((time) => (
                  <Button
                    key={time}
                    variant={activeQuestion?.timeLimit === time ? "gradient" : "outline"}
                    size="sm"
                    onClick={() => updateQuestion(activeIndex, { timeLimit: time })}
                  >
                    {time}s
                  </Button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Points</label>
              <div className="flex gap-2 flex-wrap">
                {[50, 100, 200, 500].map((pts) => (
                  <Button
                    key={pts}
                    variant={activeQuestion?.points === pts ? "gradient" : "outline"}
                    size="sm"
                    onClick={() => updateQuestion(activeIndex, { points: pts })}
                  >
                    +{pts}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Answer Options</label>
              {(activeQuestion?.options?.length || 0) < 6 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addOption(activeIndex)}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Option
                </Button>
              )}
            </div>
            <div className="space-y-2">
              {(activeQuestion?.options || []).map((option, oIndex) => {
                const isCorrect = option.isCorrect;
                return (
                  <motion.div
                    key={oIndex}
                    layout
                    className="flex items-center gap-2"
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium shrink-0 ${
                        isCorrect
                          ? "bg-spark-green text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {String.fromCharCode(65 + oIndex)}
                    </div>
                    <Input
                      placeholder={`Option ${oIndex + 1}`}
                      value={option.text}
                      onChange={(e) => updateOption(activeIndex, oIndex, e.target.value)}
                      className="flex-1"
                    />
                    {sessionType === "quiz" && (
                      <Button
                        variant={isCorrect ? "gradient" : "outline"}
                        size="sm"
                        onClick={() => setCorrectOption(activeIndex, oIndex)}
                        className="shrink-0"
                      >
                        {isCorrect ? (
                          <>
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Correct
                          </>
                        ) : (
                          "Set Correct"
                        )}
                      </Button>
                    )}
                    {(activeQuestion?.options?.length || 0) > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive shrink-0"
                        onClick={() => removeOption(activeIndex, oIndex)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </div>
            {sessionType === "quiz" && !activeQuestion?.options?.some((o) => o.isCorrect) && (
              <div className="flex items-center gap-2 text-amber-500 text-sm">
                <AlertCircle className="w-4 h-4" />
                Please mark the correct answer
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuizBuilder;
