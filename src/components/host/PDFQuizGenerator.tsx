import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  Loader2, 
  Sparkles, 
  AlertCircle,
  CheckCircle2,
  X,
  Cloud,
  Info,
  FileText,
  Wand2,
  Eye,
  EyeOff
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateQuizFromPDF, isAIConfigured, type GeneratedQuestion, type Difficulty } from '@/services/aiQuizService';
import { toast } from 'sonner';

interface PDFQuizGeneratorProps {
  onQuestionsGenerated: (questions: GeneratedQuestion[], title: string) => void;
  onClose?: () => void;
}

const difficultyConfig = {
  easy: { label: 'Easy', color: 'bg-green-500/10 text-green-600 border-green-500/30', icon: '🌱' },
  medium: { label: 'Medium', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30', icon: '🌿' },
  hard: { label: 'Hard', color: 'bg-red-500/10 text-red-600 border-red-500/30', icon: '🌳' },
  mixed: { label: 'Mixed', color: 'bg-purple-500/10 text-purple-600 border-purple-500/30', icon: '🎲' },
};

// Loading skeleton component
function LoadingSkeleton({ progress }: { progress: number }) {
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
        <div className="flex-1">
          <p className="font-medium">Processing PDF...</p>
          <p className="text-sm text-muted-foreground">Extracting content and generating questions</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {progress < 30 ? 'Reading PDF...' : progress < 60 ? 'Extracting content...' : progress < 90 ? 'Generating questions...' : 'Finalizing...'}
          </span>
          <span className="font-medium text-primary">{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
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

export function PDFQuizGenerator({ onQuestionsGenerated, onClose }: PDFQuizGeneratorProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [uploadToCloud, setUploadToCloud] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aiConfigured = isAIConfigured();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Please select a PDF file');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (droppedFile.type !== 'application/pdf') {
        setError('Please drop a PDF file');
        return;
      }
      if (droppedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }
      setFile(droppedFile);
      setError(null);
    }
  };

  const handleGenerate = async () => {
    if (!file) {
      setError('Please select a PDF file');
      return;
    }

    setLoading(true);
    setError(null);
    setLoadingProgress(0);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + Math.random() * 15;
      });
    }, 500);

    try {
      const result = await generateQuizFromPDF(file, questionCount, difficulty, uploadToCloud);
      setLoadingProgress(100);
      
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
      clearInterval(progressInterval);
      setLoading(false);
      setLoadingProgress(0);
    }
  };

  const clearFile = () => {
    setFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <Card className="w-full overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-spark-coral via-primary to-spark-coral" />
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div 
              className="w-11 h-11 rounded-xl bg-gradient-to-br from-spark-coral/20 to-primary/20 flex items-center justify-center"
              whileHover={{ scale: 1.05, rotate: -5 }}
            >
              <FileText className="w-5 h-5 text-spark-coral" />
            </motion.div>
            <div>
              <h3 className="font-display font-bold text-lg">AI Quiz from PDF</h3>
              <p className="text-sm text-muted-foreground">Extract questions from documents</p>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <LoadingSkeleton key="loading" progress={Math.round(loadingProgress)} />
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-5"
            >
              {/* File Upload Area */}
              <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer group ${
                  file 
                    ? 'border-primary bg-primary/5' 
                    : 'border-border hover:border-primary/50 hover:bg-muted/30'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                
                <AnimatePresence mode="wait">
                  {file ? (
                    <motion.div
                      key="file"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex flex-col items-center gap-3"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-spark-coral/20 flex items-center justify-center">
                        <CheckCircle2 className="w-8 h-8 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-lg">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(file.size)} • PDF Document
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          clearFile();
                        }}
                        className="mt-2"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Remove File
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="upload"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="flex flex-col items-center gap-3"
                    >
                      <motion.div 
                        className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors"
                        whileHover={{ scale: 1.1 }}
                      >
                        <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                      </motion.div>
                      <div>
                        <p className="font-medium text-lg">Drop your PDF here</p>
                        <p className="text-sm text-muted-foreground">or click to browse • Max 10MB</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* AI Status Warning */}
              {!aiConfigured && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2"
                >
                  <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    AI not configured. Using basic text extraction. Add API key for AI-powered questions.
                  </p>
                </motion.div>
              )}

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

              {/* Settings */}
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
                    max={20}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                    <span>3</span>
                    <span>20</span>
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
                      >
                        <span>{config.icon}</span>
                        <span>{config.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Cloud Upload Toggle */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-spark-teal/10 flex items-center justify-center">
                    <Cloud className="w-4 h-4 text-spark-teal" />
                  </div>
                  <div>
                    <Label className="font-medium">Save to Cloud</Label>
                    <p className="text-xs text-muted-foreground">Store PDF for future reference</p>
                  </div>
                </div>
                <Switch
                  checked={uploadToCloud}
                  onCheckedChange={setUploadToCloud}
                />
              </div>

              {/* Generate Button */}
              <Button
                variant="gradient"
                className="w-full h-12 text-base"
                onClick={handleGenerate}
                disabled={!file || loading}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Generate {questionCount} Questions
              </Button>

              {/* Feature Tags */}
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {['PDF Processing', 'AI Extraction', 'Smart Questions'].map((tag) => (
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
