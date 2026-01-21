import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Loader2, 
  Sparkles, 
  AlertCircle,
  X,
  Info,
  Lightbulb,
  BookOpen,
  CheckCircle2,
  Wand2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateQuizFromTopic, isAIConfigured, type GeneratedQuestion, type Difficulty } from '@/services/aiQuizService';
import { toast } from 'sonner';

interface TopicQuizGeneratorProps {
  onQuestionsGenerated: (questions: GeneratedQuestion[], title: string) => void;
  onClose?: () => void;
}

const suggestedTopics = [
  { label: 'Cloud Computing', icon: '☁️' },
  { label: 'Indian History', icon: '🏛️' },
  { label: 'Networking', icon: '🌐' },
  { label: 'Machine Learning', icon: '🤖' },
  { label: 'World Geography', icon: '🌍' },
  { label: 'Programming', icon: '💻' },
  { label: 'Science & Physics', icon: '🔬' },
  { label: 'Mathematics', icon: '📐' },
];

const difficultyConfig = {
  easy: { label: 'Easy', color: 'bg-green-500/10 text-green-600 border-green-500/30', icon: '🌱' },
  medium: { label: 'Medium', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30', icon: '🌿' },
  hard: { label: 'Hard', color: 'bg-red-500/10 text-red-600 border-red-500/30', icon: '🌳' },
  mixed: { label: 'Mixed', color: 'bg-purple-500/10 text-purple-600 border-purple-500/30', icon: '🎲' },
};

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </div>
        <div>
          <p className="font-medium">Generating Questions...</p>
          <p className="text-sm text-muted-foreground">AI is crafting your quiz</p>
        </div>
      </div>
      
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.15 }}
          className="p-4 rounded-xl border border-border bg-muted/30"
        >
          <div className="flex items-start gap-3">
            <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <div className="grid grid-cols-2 gap-2 mt-3">
                <Skeleton className="h-8 rounded-lg" />
                <Skeleton className="h-8 rounded-lg" />
                <Skeleton className="h-8 rounded-lg" />
                <Skeleton className="h-8 rounded-lg" />
              </div>
            </div>
          </div>
        </motion.div>
      ))}
      
      <div className="flex justify-center pt-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Wand2 className="w-4 h-4" />
          </motion.div>
          <span>Creating engaging questions with AI magic...</span>
        </div>
      </div>
    </motion.div>
  );
}

export function TopicQuizGenerator({ onQuestionsGenerated, onClose }: TopicQuizGeneratorProps) {
  const [topic, setTopic] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const aiConfigured = isAIConfigured();

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Please enter a topic');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const fullTopic = additionalContext 
        ? `${topic}. Additional context: ${additionalContext}`
        : topic;
        
      const result = await generateQuizFromTopic(fullTopic, questionCount, difficulty);
      
      if (result.error && result.questions.length === 0) {
        setError(result.error);
        toast.error(result.error);
      } else {
        if (result.error) {
          toast.warning(result.error);
        }
        toast.success(`Generated ${result.questions.length} questions!`);
        onQuestionsGenerated(result.questions, result.title);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate quiz';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-primary via-spark-teal to-primary" />
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div 
              className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/20 to-spark-teal/20 flex items-center justify-center"
              whileHover={{ scale: 1.05, rotate: 5 }}
            >
              <Sparkles className="w-5 h-5 text-primary" />
            </motion.div>
            <div>
              <h3 className="font-display font-bold text-lg">AI Quiz from Topic</h3>
              <p className="text-sm text-muted-foreground">Generate questions instantly</p>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* AI Status Warning */}
        {!aiConfigured && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2"
          >
            <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-600 dark:text-amber-400">
              NVIDIA API not configured. Add VITE_NVIDIA_API_KEY to your .env file for AI-powered questions.
            </p>
          </motion.div>
        )}

        <AnimatePresence mode="wait">
          {loading ? (
            <LoadingSkeleton key="loading" />
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              {/* Topic Input */}
              <div>
                <Label className="mb-2 block font-medium">Topic or Subject</Label>
                <div className="relative">
                  <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={topic}
                    onChange={(e) => {
                      setTopic(e.target.value);
                      setError(null);
                    }}
                    placeholder="e.g., Cloud Computing, Indian History, Networking"
                    className="pl-10 h-12 text-base"
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Suggested Topics */}
              <div>
                <Label className="mb-2 block text-sm text-muted-foreground">Quick suggestions</Label>
                <div className="flex flex-wrap gap-2">
                  {suggestedTopics.map((suggestion) => (
                    <motion.button
                      key={suggestion.label}
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => setTopic(suggestion.label)}
                      className={`px-3 py-2 rounded-xl border text-sm flex items-center gap-2 transition-all ${
                        topic === suggestion.label
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }`}
                      disabled={loading}
                    >
                      <span>{suggestion.icon}</span>
                      <span>{suggestion.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Settings Row */}
              <div className="grid grid-cols-2 gap-4">
                {/* Question Count */}
                <div className="p-4 rounded-xl border border-border bg-muted/30">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="font-medium">Questions</Label>
                    <span className="text-lg font-bold text-primary">{questionCount}</span>
                  </div>
                  <Slider
                    value={[questionCount]}
                    onValueChange={(v) => setQuestionCount(v[0])}
                    min={3}
                    max={15}
                    step={1}
                    className="w-full"
                    disabled={loading}
                  />
                  <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                    <span>3</span>
                    <span>15</span>
                  </div>
                </div>

                {/* Difficulty */}
                <div className="p-4 rounded-xl border border-border bg-muted/30">
                  <Label className="mb-3 block font-medium">Difficulty</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.entries(difficultyConfig) as [Difficulty, typeof difficultyConfig.easy][]).map(([level, config]) => (
                      <motion.button
                        key={level}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setDifficulty(level)}
                        className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                          difficulty === level
                            ? config.color + ' border'
                            : 'border-border hover:border-primary/50'
                        }`}
                        disabled={loading}
                      >
                        <span>{config.icon}</span>
                        <span>{config.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Advanced Options Toggle */}
              <div>
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  <Lightbulb className="w-4 h-4" />
                  {showAdvanced ? 'Hide' : 'Show'} advanced options
                </button>
                
                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3"
                    >
                      <Label className="mb-2 block text-sm">
                        Additional Context <span className="text-muted-foreground">(optional)</span>
                      </Label>
                      <Textarea
                        value={additionalContext}
                        onChange={(e) => setAdditionalContext(e.target.value)}
                        placeholder="Add any specific areas to focus on, or context to help generate better questions..."
                        className="min-h-[80px] resize-none"
                        disabled={loading}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-destructive"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p className="text-sm">{error}</p>
                </motion.div>
              )}

              {/* Generate Button */}
              <Button
                variant="gradient"
                className="w-full h-12 text-base"
                onClick={handleGenerate}
                disabled={!topic.trim() || loading}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Generate {questionCount} Questions
              </Button>

              {/* Feature Tags */}
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {['AI Powered', 'Instant Generation', 'Custom Difficulty'].map((tag) => (
                  <span key={tag} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
