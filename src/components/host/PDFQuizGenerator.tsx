import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { 
  Upload, 
  Loader2, 
  Sparkles, 
  AlertCircle,
  CheckCircle2,
  X,
  Cloud,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateQuizFromPDF, isAIConfigured, type GeneratedQuestion, type Difficulty } from '@/services/aiQuizService';
import { toast } from 'sonner';

interface PDFQuizGeneratorProps {
  onQuestionsGenerated: (questions: GeneratedQuestion[], title: string) => void;
  onClose?: () => void;
}

export function PDFQuizGenerator({ onQuestionsGenerated, onClose }: PDFQuizGeneratorProps) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [uploadToCloud, setUploadToCloud] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aiConfigured = isAIConfigured();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        setError('Please select a PDF file');
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) { // 10MB limit
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

    try {
      const result = await generateQuizFromPDF(file, questionCount, difficulty, uploadToCloud);
      
      if (result.error && result.questions.length === 0) {
        setError(result.error);
        toast.error(result.error);
      } else {
        if (result.error) {
          // Show warning but continue with generated questions
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

  const clearFile = () => {
    setFile(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h3 className="font-display font-bold text-lg">AI Quiz Generator</h3>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-6">
          Upload a PDF document and let AI generate quiz questions automatically.
        </p>

        {/* File Upload Area */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
            file 
              ? 'border-primary bg-primary/5' 
              : 'border-border hover:border-primary/50'
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
                className="flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                </div>
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile();
                  }}
                >
                  Remove
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="upload"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="font-medium">Drop your PDF here</p>
                <p className="text-sm text-muted-foreground">or click to browse</p>
              </motion.div>
            )}
          </AnimatePresence>
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
          {/* AI Status */}
          {!aiConfigured && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-2">
              <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-600 dark:text-amber-400">
                OpenAI API not configured. Using basic text extraction. Add VITE_OPENAI_API_KEY for AI-powered questions.
              </p>
            </div>
          )}

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
              max={20}
              step={1}
              className="w-full"
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
                >
                  {level}
                </Button>
              ))}
            </div>
          </div>

          {/* Upload to Cloud Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-muted-foreground" />
              <Label>Save PDF to cloud</Label>
            </div>
            <Switch
              checked={uploadToCloud}
              onCheckedChange={setUploadToCloud}
            />
          </div>
        </div>

        {/* Generate Button */}
        <Button
          variant="gradient"
          className="w-full mt-6"
          onClick={handleGenerate}
          disabled={!file || loading}
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
