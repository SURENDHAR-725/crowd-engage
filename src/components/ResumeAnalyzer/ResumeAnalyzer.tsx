import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Upload,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Target,
  Shield,
  Zap,
  TrendingUp,
  BookOpen,
  Type,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import {
  analyzeResume,
  extractTextFromPDF,
  type ResumeAnalysisResult,
} from "@/services/resumeAnalyzerService";

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-500";
  if (score >= 60) return "text-amber-500";
  return "text-red-500";
}

function getScoreBg(score: number): string {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
}

function getScoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Very Good";
  if (score >= 70) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 50) return "Needs Work";
  return "Needs Improvement";
}

const categoryMeta: Record<string, { label: string; icon: typeof FileText }> = {
  formatting: { label: "Formatting & Structure", icon: Type },
  content_quality: { label: "Content Quality", icon: BookOpen },
  relevance: { label: "Relevance", icon: Target },
  skills_presentation: { label: "Skills Presentation", icon: Zap },
  ats_compatibility: { label: "ATS Compatibility", icon: Search },
  grammar_professionalism: { label: "Grammar & Professionalism", icon: Shield },
};

export function ResumeAnalyzer() {
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ResumeAnalysisResult | null>(null);
  const [showJobDesc, setShowJobDesc] = useState(false);
  const [expandedSuggestion, setExpandedSuggestion] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "application/pdf") {
      try {
        toast.info("Extracting text from PDF...");
        const text = await extractTextFromPDF(file);
        if (text.length < 50) {
          toast.error("Could not extract enough text from this PDF. Try pasting your resume text instead.");
          return;
        }
        setResumeText(text);
        toast.success("Resume text extracted successfully!");
      } catch {
        toast.error("Failed to read PDF. Please try pasting your resume text instead.");
      }
    } else if (file.type === "text/plain") {
      const text = await file.text();
      setResumeText(text);
      toast.success("Resume text loaded!");
    } else {
      toast.error("Please upload a PDF or TXT file.");
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAnalyze = async () => {
    if (resumeText.trim().length < 50) {
      toast.error("Please provide more resume content for analysis.");
      return;
    }

    setIsAnalyzing(true);
    setResult(null);

    try {
      const analysis = await analyzeResume(resumeText, jobDescription || undefined);
      setResult(analysis);
      toast.success("Resume analysis complete!");
    } catch (error: any) {
      toast.error(error.message || "Failed to analyze resume. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setResumeText("");
    setJobDescription("");
    setShowJobDesc(false);
    setExpandedSuggestion(null);
  };

  // Input Form View
  if (!result) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold">AI Resume Analyzer</h2>
            <p className="text-sm text-muted-foreground">Get instant, AI-powered feedback on your resume</p>
          </div>
        </div>

        {/* Upload / Paste Area */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="w-4 h-4 text-primary" />
              Your Resume
            </CardTitle>
            <CardDescription>Paste your resume text or upload a PDF/TXT file</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload Button */}
            <div className="flex items-center gap-3">
              <input
                type="file"
                ref={fileInputRef}
                accept=".pdf,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload PDF / TXT
              </Button>
              <span className="text-xs text-muted-foreground">or paste below</span>
            </div>

            {/* Text Area */}
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Paste your full resume text here...

Example:
John Doe
Software Engineer
john@email.com | (555) 123-4567

EXPERIENCE
Senior Software Engineer at TechCorp (2021-Present)
- Led development of microservices architecture...

EDUCATION
B.S. Computer Science, MIT (2017)

SKILLS
JavaScript, React, Node.js, Python..."
              className="w-full min-h-[250px] p-4 rounded-xl bg-muted/50 border border-border/50 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground/40"
            />
            <p className="text-xs text-muted-foreground">
              {resumeText.length} characters {resumeText.length > 0 && resumeText.length < 50 && "• Minimum 50 characters needed"}
            </p>
          </CardContent>
        </Card>

        {/* Job Description (Optional) */}
        <Card>
          <CardHeader className="pb-3">
            <button
              onClick={() => setShowJobDesc(!showJobDesc)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <CardTitle className="text-base">Target Job Description</CardTitle>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Optional</span>
              </div>
              {showJobDesc ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </CardHeader>
          <AnimatePresence>
            {showJobDesc && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <CardContent className="pt-0">
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    placeholder="Paste the job description or job title you're targeting... This helps the AI evaluate relevance and identify missing keywords."
                    className="w-full min-h-[120px] p-4 rounded-xl bg-muted/50 border border-border/50 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all placeholder:text-muted-foreground/40"
                  />
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>

        {/* Analyze Button */}
        <Button
          variant="gradient"
          size="lg"
          className="w-full group"
          onClick={handleAnalyze}
          disabled={isAnalyzing || resumeText.trim().length < 50}
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Analyzing Resume...
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 mr-2" />
              Analyze My Resume
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </Button>
      </motion.div>
    );
  }

  // Results View
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      {/* Header with Reset */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-display font-bold">Analysis Results</h2>
            <p className="text-sm text-muted-foreground">AI-powered resume evaluation</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-2" />
          New Analysis
        </Button>
      </div>

      {/* Overall Score Card */}
      <Card className="overflow-hidden">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-violet-500/5" />
          <CardContent className="relative p-6">
            <div className="flex items-center gap-6">
              {/* Score Circle */}
              <div className="relative w-28 h-28 shrink-0">
                <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50" cy="50" r="42"
                    stroke="currentColor"
                    className="text-muted/30"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="50" cy="50" r="42"
                    stroke="currentColor"
                    className={getScoreColor(result.overall_score)}
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={`${(result.overall_score / 100) * 264} 264`}
                    style={{ transition: "stroke-dasharray 1s ease-in-out" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-3xl font-bold ${getScoreColor(result.overall_score)}`}>
                    {result.overall_score}
                  </span>
                  <span className="text-xs text-muted-foreground">/100</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-lg font-bold ${getScoreColor(result.overall_score)}`}>
                    {getScoreLabel(result.overall_score)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {result.summary}
                </p>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Category Scores */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Category Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {Object.entries(result.category_scores).map(([key, score]) => {
            const meta = categoryMeta[key];
            if (!meta) return null;
            const Icon = meta.icon;
            return (
              <div key={key} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium truncate">{meta.label}</span>
                    <span className={`text-sm font-bold ${getScoreColor(score)}`}>{score}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <motion.div
                      className={`${getScoreBg(score)} rounded-full h-2`}
                      initial={{ width: 0 }}
                      animate={{ width: `${score}%` }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Strengths & Weaknesses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strengths */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {result.strengths.map((strength, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-2 p-2 rounded-lg bg-emerald-500/5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                <span className="text-sm">{strength}</span>
              </motion.div>
            ))}
          </CardContent>
        </Card>

        {/* Weaknesses */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Areas to Improve
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {result.weaknesses.map((weakness, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/5"
              >
                <XCircle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <span className="text-sm">{weakness}</span>
              </motion.div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Actionable Suggestions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            Actionable Suggestions
          </CardTitle>
          <CardDescription>Click to expand each suggestion for details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {result.suggestions.map((suggestion, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <button
                onClick={() => setExpandedSuggestion(expandedSuggestion === i ? null : i)}
                className="w-full text-left p-3 rounded-xl bg-muted/50 border border-border/50 hover:bg-muted transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{suggestion.issue}</p>
                      {expandedSuggestion !== i && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{suggestion.suggestion}</p>
                      )}
                    </div>
                  </div>
                  {expandedSuggestion === i ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </div>
              </button>
              <AnimatePresence>
                {expandedSuggestion === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pt-2 pb-3 ml-8 space-y-2">
                      <p className="text-sm text-muted-foreground">{suggestion.suggestion}</p>
                      {suggestion.example_rewrite && (
                        <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                          <p className="text-xs font-medium text-primary mb-1">💡 Rewrite Example:</p>
                          <p className="text-sm italic">"{suggestion.example_rewrite}"</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </CardContent>
      </Card>

      {/* Keyword Gaps */}
      {result.keyword_gaps && result.keyword_gaps.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" />
              Missing Keywords
            </CardTitle>
            <CardDescription>Keywords from the job description not found in your resume</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {result.keyword_gaps.map((keyword, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="px-3 py-1.5 rounded-full text-xs font-medium bg-red-500/10 text-red-500 border border-red-500/20"
                >
                  {keyword}
                </motion.span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Analyze Another */}
      <Button variant="outline" className="w-full" onClick={handleReset}>
        <RotateCcw className="w-4 h-4 mr-2" />
        Analyze Another Resume
      </Button>
    </motion.div>
  );
}
