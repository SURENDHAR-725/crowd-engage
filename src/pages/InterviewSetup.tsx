import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { ResumeUploader } from "@/components/Interview/ResumeUploader";
import { useResumeParser } from "@/hooks/useResumeParser";
import { useInterview } from "@/hooks/useInterview";
import { ArrowLeft, Sparkles, Loader2, Mic, MessageSquare } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const jobRolesList = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Java Developer",
  "Python Developer",
  "Cloud Engineer",
  "AWS Engineer",
  "DevOps Engineer",
  "Data Analyst",
  "Data Engineer",
  "AI/ML Engineer",
  "Cyber Security Specialist",
  "UI/UX Designer",
  "Software Engineer"
];

const InterviewSetup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  
  // Params prefill
  const defaultType = searchParams.get("type") || "Mixed";

  // Form State
  const [role, setRole] = useState("Frontend Developer");
  const [experience, setExperience] = useState("1-3 Years");
  const [difficulty, setDifficulty] = useState("Medium");
  const [interviewType, setInterviewType] = useState(defaultType);
  const [duration, setDuration] = useState("10");
  const [interviewMode, setInterviewMode] = useState<'text' | 'voice'>('voice');

  // Hooks
  const { parsing, resumeAnalysis, parseResume, clearAnalysis, loadExistingAnalysis } = useResumeParser();
  const { startInterview, status, session } = useInterview();

  useEffect(() => {
    loadExistingAnalysis();
  }, []);

  // Handle start session redirection (text mode only)
  useEffect(() => {
    if (interviewMode === 'text' && status === 'active' && session?.id) {
      navigate(`/interview/session/${session.id}`);
    }
  }, [status, session, navigate, interviewMode]);

  const handleResumeUpload = async (file: File) => {
    await parseResume(file);
  };

  const handleStart = async () => {
    if (!role) {
      toast.error("Please select a target job role.");
      return;
    }

    if (interviewMode === 'voice') {
      // Voice mode: create session in Supabase, then navigate to voice page
      if (!user) {
        toast.error('You must be logged in.');
        return;
      }
      try {
        const { data, error } = await supabase
          .from('interviews')
          .insert({
            user_id: user.id,
            role,
            interview_type: interviewType,
            difficulty: difficulty.toLowerCase(),
            duration: parseInt(duration),
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) throw error;
        navigate(`/interview/voice/${data.id}?experience=${encodeURIComponent(experience)}`);
      } catch (err) {
        console.error('Failed to start voice session:', err);
        toast.error('Failed to start voice interview.');
      }
    } else {
      // Text mode: use existing hook
      try {
        await startInterview(
          role,
          experience,
          difficulty.toLowerCase(),
          interviewType,
          parseInt(duration),
          resumeAnalysis
        );
      } catch (err) {
        console.error("Failed to start session:", err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="max-w-3xl mx-auto px-4 pt-8">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground mb-6"
          onClick={() => navigate('/interview')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <Card className="border-border/50 bg-card/60 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-xl sm:text-2xl font-display font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary animate-pulse" />
              Setup AI Interview Session
            </CardTitle>
            <CardDescription className="text-sm">
              Configure parameters to generate customized interview questions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Job Role & Experience */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="job-role">Target Job Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger id="job-role">
                    <SelectValue placeholder="Select Job Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobRolesList.map(j => (
                      <SelectItem key={j} value={j}>{j}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="experience">Target Experience Level</Label>
                <Select value={experience} onValueChange={setExperience}>
                  <SelectTrigger id="experience">
                    <SelectValue placeholder="Select Experience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fresher">Fresher / Graduate</SelectItem>
                    <SelectItem value="0-1 Years">Entry-level (0-1 Years)</SelectItem>
                    <SelectItem value="1-3 Years">Junior/Mid-level (1-3 Years)</SelectItem>
                    <SelectItem value="3-5 Years">Senior-level (3-5 Years)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Difficulty, Type, & Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="difficulty">Interview Difficulty</Label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger id="difficulty">
                    <SelectValue placeholder="Select Difficulty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Easy">Easy</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Interview Type</Label>
                <Select value={interviewType} onValueChange={setInterviewType}>
                  <SelectTrigger id="type">
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Technical">Technical Interview</SelectItem>
                    <SelectItem value="HR">HR Fit Interview</SelectItem>
                    <SelectItem value="Behavioral">Behavioral Interview</SelectItem>
                    <SelectItem value="Mixed">Mixed Assessment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Interview Duration</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger id="duration">
                    <SelectValue placeholder="Select Duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 Minutes (5 Qs)</SelectItem>
                    <SelectItem value="20">20 Minutes (8 Qs)</SelectItem>
                    <SelectItem value="30">30 Minutes (12 Qs)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Language Selection */}
            <div className="space-y-2">
              <Label>Interview Language</Label>
              <Input value="English" disabled className="bg-muted text-muted-foreground" />
            </div>

            {/* Resume Upload Component */}
            <div className="space-y-2 pt-2">
              <Label className="flex justify-between items-center">
                <span>Upload Resume (Optional)</span>
                <span className="text-xs text-muted-foreground font-normal">Personalizes questions</span>
              </Label>
              <ResumeUploader
                onUploadSuccess={handleResumeUpload}
                onClear={clearAnalysis}
                isParsing={parsing}
                hasAnalysis={!!resumeAnalysis}
              />
            </div>

            {/* Interview Mode Toggle */}
            <div className="space-y-2">
              <Label>Interview Mode</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setInterviewMode('voice')}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                    interviewMode === 'voice'
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-border bg-card/40 text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                  🎤 Voice Interview
                </button>
                <button
                  type="button"
                  onClick={() => setInterviewMode('text')}
                  className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium ${
                    interviewMode === 'text'
                      ? 'border-primary bg-primary/10 text-primary shadow-sm'
                      : 'border-border bg-card/40 text-muted-foreground hover:border-primary/40'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  💬 Text Interview
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {interviewMode === 'voice'
                  ? 'Real-time voice conversation with AI — speak naturally like a live interview. Requires Chrome/Edge.'
                  : 'Type your answers in a chat-style format.'}
              </p>
            </div>

            {/* Submit Button */}
            <Button
              className="w-full h-12 text-base font-semibold mt-4 btn-gradient text-primary-foreground"
              onClick={handleStart}
              disabled={status === 'loading' || parsing}
            >
              {status === 'loading' ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Initializing AI Recruiter Room...
                </>
              ) : interviewMode === 'voice' ? (
                <>
                  <Mic className="w-5 h-5 mr-2" />
                  Start Voice Interview
                </>
              ) : (
                "Start Text Interview"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default InterviewSetup;
