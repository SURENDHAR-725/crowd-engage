import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { 
  Loader2, 
  Sparkles, 
  AlertCircle,
  X,
  Info,
  Lightbulb,
  BookOpen
} from 'lucide-react';
import { motion } from 'framer-motion';
import { generateQuizFromTopic, isAIConfigured, type GeneratedQuestion, type Difficulty } from '@/services/aiQuizService';
import { toast } from 'sonner';

interface TopicQuizGeneratorProps {
  onQuestionsGenerated: (questions: GeneratedQuestion[], title: string) => void;
  onClose?: () => void;
}

const suggestedTopics = [
  'Cloud Computing Basics',
  'Indian History',
  'Networking Fundamentals',
  'Machine Learning',
  'World Geography',
  'Programming Concepts',
  'Science & Physics',
  'Mathematics',
];

export function TopicQuizGenerator({ onQuestionsGenerated, onClose }: TopicQuizGeneratorProps) {
  const [topic, setTopic] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
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
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-display font-bold text-lg">AI Quiz from Topic</h3>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          Enter any topic and let AI generate quiz questions automatically.
        </p>

        {/* AI Status Warning */}
        {!aiConfigured && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2"
          >
            <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-600 dark:text-amber-400">
              NVIDIA API not configured. Add VITE_NVIDIA_API_KEY to your .env file for AI-powered questions.
            </p>
          </motion.div>
        )}

        {/* Topic Input */}
        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">Topic or Subject</Label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Cloud Computing, Indian History, Networking"
                className="pl-10"
                disabled={loading}
              />
            </div>
          </div>

          {/* Suggested Topics */}
          <div>
            <Label className="mb-2 block text-sm text-muted-foreground">Quick suggestions:</Label>
            <div className="flex flex-wrap gap-2">
              {suggestedTopics.slice(0, 4).map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => setTopic(suggestion)}
                  className="text-xs"
                  disabled={loading}
                >
                  <Lightbulb className="w-3 h-3 mr-1" />
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>

          {/* Additional Context (Optional) */}
          <div>
            <Label className="mb-2 block">
              Additional Context <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder="Add any specific areas to focus on, or context to help generate better questions..."
              className="min-h-[80px] resize-none"
              disabled={loading}
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2 text-red-500"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="text-sm">{error}</p>
          </motion.div>
        )}

        {/* Settings */}
        <div className="mt-6 space-y-4">
          {/* Question Count */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Number of Questions</Label>
              <span className="text-sm font-medium text-primary">{questionCount}</span>
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
          </div>

          {/* Difficulty */}
          <div>
            <Label className="mb-2 block">Difficulty</Label>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard', 'mixed'] as const).map((level) => (
                <Button
                  key={level}
                  variant={difficulty === level ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setDifficulty(level)}
                  className="flex-1 capitalize"
                  disabled={loading}
                >
                  {level}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          variant="gradient"
          className="w-full mt-6"
          onClick={handleGenerate}
          disabled={!topic.trim() || loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Quiz...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Quiz
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
