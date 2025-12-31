import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { 
  BarChart3, 
  Cloud, 
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
  Swords,
  Mic,
  Sparkles
} from "lucide-react";
import { motion } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useSessions } from "@/hooks/useSessions";
import type { SessionType } from "@/lib/database.types";

type PollType = SessionType;

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
  wordcloud: {
    icon: Cloud,
    title: "Word Cloud",
    description: "Collect single words or short phrases and visualize them beautifully",
    color: "text-spark-teal",
    bg: "bg-spark-teal/10",
    features: ["Real-time aggregation", "Visual word map", "Multiple responses"],
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
    icon: Gamepad2,
    title: "Mini Games",
    description: "Fun interactive games like memory match, word scramble, and emoji decode",
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    features: ["Multiple game types", "Live scoring", "Competitive fun"],
  },
  battle: {
    icon: Swords,
    title: "Battle Room",
    description: "Team-based competitions where groups compete against each other",
    color: "text-red-500",
    bg: "bg-red-500/10",
    features: ["Team competition", "Live scores", "Victory celebrations"],
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
}

const defaultModes: SessionModes = {
  paceMode: 'instructor',
  identityMode: 'anonymous',
  allowMultipleResponses: false,
  showLiveResults: true,
  shuffleOptions: false,
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

  // Types that need custom options
  const needsOptions = !["wordcloud", "yesno", "rating"].includes(pollType);

  const handleSave = async (launch: boolean = false) => {
    if (!title.trim()) {
      toast.error("Please enter a session title");
      return;
    }
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

    setIsLoading(true);
    
    try {
      // Build options based on type
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

      const sessionData = {
        title,
        type: pollType,
        status: launch ? ('active' as const) : ('draft' as const),
        question,
        options: sessionOptions,
        timeLimit: (pollType === 'quiz' || pollType === 'minigame' || pollType === 'battle') ? timeLimit : undefined,
        modes,
      };

      const session = await createSession(sessionData);
      
      if (session) {
        if (launch) {
          toast.success("Session launched!");
          navigate(`/session/${session.code}`);
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
                {pollType === "wordcloud" ? "Prompt" : pollType === "rating" ? "What to rate" : "Question"}
              </label>
              <Input
                variant="large"
                placeholder={
                  pollType === "wordcloud"
                    ? "e.g., What word describes our team culture?"
                    : pollType === "yesno"
                    ? "e.g., Should we extend the meeting by 15 minutes?"
                    : pollType === "rating"
                    ? "e.g., How would you rate today's presentation?"
                    : pollType === "battle"
                    ? "e.g., Which team will answer the most questions correctly?"
                    : pollType === "minigame"
                    ? "e.g., Test your knowledge with this fun challenge!"
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

            {/* Options (for MCQ, Quiz, Battle, MiniGame) */}
            {!["wordcloud", "yesno", "rating"].includes(pollType) && (
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

            {/* Time Limit (for Quiz, MiniGame, Battle) */}
            {["quiz", "minigame", "battle"].includes(pollType) && (
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
              {pollType !== "wordcloud" && (
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
              )}
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
