import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  BarChart3, 
  Cloud, 
  Timer, 
  ArrowLeft,
  Plus,
  Trash2,
  Zap,
  Save,
  Play
} from "lucide-react";
import { motion } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

type PollType = "mcq" | "wordcloud" | "quiz";

interface PollOption {
  id: string;
  text: string;
}

const pollTypeConfig = {
  mcq: {
    icon: BarChart3,
    title: "Multiple Choice Poll",
    description: "Create a poll with multiple options for your audience to choose from",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  wordcloud: {
    icon: Cloud,
    title: "Word Cloud",
    description: "Collect single words or short phrases and visualize them beautifully",
    color: "text-spark-teal",
    bg: "bg-spark-teal/10",
  },
  quiz: {
    icon: Timer,
    title: "Timed Quiz",
    description: "Create a competitive quiz with correct answers and time limits",
    color: "text-spark-coral",
    bg: "bg-spark-coral/10",
  },
};

const CreateSession = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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

  const handleSave = (launch: boolean = false) => {
    if (!title.trim()) {
      toast.error("Please enter a session title");
      return;
    }
    if (!question.trim()) {
      toast.error("Please enter a question");
      return;
    }
    if (pollType !== "wordcloud" && options.filter(o => o.text.trim()).length < 2) {
      toast.error("Please add at least 2 options");
      return;
    }

    setIsLoading(true);
    
    // Simulate save
    setTimeout(() => {
      setIsLoading(false);
      if (launch) {
        toast.success("Session launched!");
        navigate("/dashboard");
      } else {
        toast.success("Session saved as draft");
        navigate("/dashboard");
      }
    }, 1000);
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
          <div className="grid grid-cols-3 gap-3">
            {(Object.keys(pollTypeConfig) as PollType[]).map((type) => {
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
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Session Details */}
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
                {pollType === "wordcloud" ? "Prompt" : "Question"}
              </label>
              <Input
                variant="large"
                placeholder={
                  pollType === "wordcloud"
                    ? "e.g., What word describes our team culture?"
                    : "e.g., What's your preferred meeting time?"
                }
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>

            {/* Options (for MCQ and Quiz) */}
            {pollType !== "wordcloud" && (
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

            {/* Time Limit (for Quiz) */}
            {pollType === "quiz" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Time Limit (seconds)</label>
                <div className="flex items-center gap-4">
                  {[15, 30, 45, 60].map((time) => (
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
              {pollType !== "wordcloud" && (
                <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
                  {options.filter(o => o.text).map((option, index) => (
                    <Button
                      key={option.id}
                      variant="outline"
                      className="h-auto py-4 px-6"
                    >
                      <span className="font-semibold mr-2">{String.fromCharCode(65 + index)}</span>
                      {option.text}
                    </Button>
                  ))}
                </div>
              )}
              {pollType === "wordcloud" && (
                <div className="h-32 flex items-center justify-center text-muted-foreground">
                  <Cloud className="w-12 h-12" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default CreateSession;
