import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  Users,
  TrendingUp,
  Settings,
  LogOut,
  Zap,
  Briefcase,
  UserCheck,
  Brain,
  Sliders,
  Code,
  Calendar,
  Clock,
  Award,
  ChevronRight,
  Sun,
  Moon,
  Loader2
} from "lucide-react";
import { Mic } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useInterviewHistory } from "@/hooks/useInterviewHistory";
import { useResumeParser } from "@/hooks/useResumeParser";
import { InterviewCard } from "@/components/Interview/InterviewCard";
import { useAuth } from "@/context/AuthContext";
import { formatDistanceToNow } from "date-fns";

const InterviewDashboard = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { history, stats, loading, loadHistory } = useInterviewHistory();
  const { resumeAnalysis, loadExistingAnalysis } = useResumeParser();

  useEffect(() => {
    loadHistory();
    loadExistingAnalysis();
  }, [loadHistory, loadExistingAnalysis]);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User";
  const userEmail = user?.email || "";

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border p-6 hidden lg:flex flex-col">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mb-8">
          <motion.div
            className="w-10 h-10 rounded-xl btn-gradient flex items-center justify-center"
            whileHover={{ scale: 1.05, rotate: 5 }}
          >
            <Zap className="w-5 h-5 text-primary-foreground" />
          </motion.div>
          <span className="font-display text-xl font-bold text-gradient">
            CrowdSpark
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          <Link to="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted transition-colors">
            <BarChart3 className="w-5 h-5" />
            Sessions
          </Link>
          <Link to="/interview" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 text-primary font-medium">
            <Briefcase className="w-5 h-5" />
            AI Interview
          </Link>
          <Link to="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted transition-colors">
            <Users className="w-5 h-5" />
            Audience
          </Link>
          <Link to="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted transition-colors">
            <TrendingUp className="w-5 h-5" />
            Analytics
          </Link>
          <Link to="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted transition-colors">
            <Settings className="w-5 h-5" />
            Settings
          </Link>
        </nav>

        {/* User profile */}
        <div className="pt-6 border-t border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-spark-teal flex items-center justify-center text-primary-foreground font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-sm">{userName}</p>
              <p className="text-xs text-muted-foreground truncate max-w-[150px]">{userEmail}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => signOut()}>
            <LogOut className="w-4 h-4 mr-2" />
            Log Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-display font-bold">AI Interview</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">Practice realistic mock interviews with AI recruiters</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="icon"
                onClick={toggleTheme}
                className="rounded-full"
              >
                {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </Button>
              <Button variant="outline" onClick={() => navigate('/interview/history')}>
                <Calendar className="w-4 h-4 mr-2" />
                History
              </Button>
            </div>
          </div>
        </header>

        {loading ? (
          <div className="p-6 flex flex-col items-center justify-center min-h-[50vh]">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-muted-foreground mt-2 text-sm">Loading stats & logs...</p>
          </div>
        ) : (
          <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
            {/* Stats Section */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Completed", value: stats.completed, icon: UserCheck, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                { label: "Avg Score", value: `${stats.averageScore}%`, icon: Award, color: "text-primary", bg: "bg-primary/10" },
                { label: "Best Score", value: `${stats.bestScore}%`, icon: Zap, color: "text-spark-coral", bg: "bg-spark-coral/10" },
                { label: "Practice Time", value: `${stats.totalTime}m`, icon: Clock, color: "text-spark-teal", bg: "bg-spark-teal/10" }
              ].map((stat, idx) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  <Card className="border-border/50">
                    <CardContent className="p-4 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">{stat.value}</p>
                      </div>
                      <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                        <stat.icon className={`w-5 h-5 ${stat.color}`} />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </section>

            {/* Resume profile widget */}
            {resumeAnalysis && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="border-border/50 bg-gradient-to-r from-spark-teal/10 to-primary/5">
                  <CardContent className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                        <UserCheck className="w-5 h-5 text-spark-teal" />
                        AI Profile Sync Active
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 max-w-xl leading-relaxed">
                        Your uploaded resume has been analyzed. Future interview questions will be personalized based on your skills ({resumeAnalysis.extracted_skills?.slice(0, 5).join(', ')}...) and experience.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate('/interview/setup')}>
                      Update Resume
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Action Cards */}
            <section className="space-y-4">
              <h2 className="text-lg font-display font-bold">Select Interview Type</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <InterviewCard
                  title="Technical Interview"
                  description="Evaluate core coding skills, system designs, framework practices, and technical problem solving."
                  icon={Brain}
                  type="technical"
                  color="text-indigo-500"
                  bg="bg-indigo-500/10"
                  onClick={() => navigate('/interview/setup?type=Technical')}
                />
                <InterviewCard
                  title="HR Fit Interview"
                  description="Practice behavior queries, corporate ethics, work culture alignment, and professional growth goals."
                  icon={UserCheck}
                  type="hr"
                  color="text-spark-teal"
                  bg="bg-spark-teal/10"
                  onClick={() => navigate('/interview/setup?type=HR')}
                />
                <InterviewCard
                  title="Behavioral Interview"
                  description="Structured STAR technique questions testing situational leadership, crisis, and teammate interactions."
                  icon={Briefcase}
                  type="behavioral"
                  color="text-emerald-500"
                  bg="bg-emerald-500/10"
                  onClick={() => navigate('/interview/setup?type=Behavioral')}
                />
                <InterviewCard
                  title="Coding Interview"
                  description="Interactive whiteboard logical tasks, algorithm complexities, data structure implementations."
                  icon={Code}
                  type="coding"
                  color="text-purple-500"
                  bg="bg-purple-500/10"
                  comingSoon={true}
                />
              </div>
            </section>

            {/* Quick custom card + Voice Interview card */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Voice Interview Card */}
              <Card className="border-primary/30 md:col-span-1 bg-gradient-to-br from-primary/10 via-accent/5 to-card/60 flex flex-col justify-between p-5 relative overflow-hidden">
                <div className="absolute top-2 right-2">
                  <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">🎤 NEW</Badge>
                </div>
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                      <Mic className="w-4 h-4 text-primary" />
                    </div>
                    Voice Interview
                  </h3>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    Have a real-time voice conversation with an AI recruiter. Speak naturally — no typing required. Feels like a live Zoom interview.
                  </p>
                </div>
                <Button className="w-full mt-4 btn-gradient text-primary-foreground" onClick={() => navigate('/interview/setup')}>
                  <Mic className="w-4 h-4 mr-2" />
                  Start Voice Interview
                </Button>
              </Card>

              <Card className="border-border/50 md:col-span-1 bg-card/60 flex flex-col justify-between p-5">
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-primary" />
                    Custom Practice Session
                  </h3>
                  <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                    Set up your customized mock interview by choosing specific durations, difficulty levels, target job roles, languages, and uploading a custom resume profile.
                  </p>
                </div>
                <Button className="w-full mt-4" onClick={() => navigate('/interview/setup')}>
                  Start Custom Setup
                </Button>
              </Card>

              {/* History Preview */}
              <Card className="border-border/50 md:col-span-2 bg-card/60">
                <CardHeader className="p-4 sm:p-5 flex flex-row items-center justify-between pb-2">
                  <div className="space-y-0.5">
                    <CardTitle className="text-base font-bold">Recent Practices</CardTitle>
                    <CardDescription className="text-xs">Your last few interview attempts</CardDescription>
                  </div>
                  {history.length > 0 && (
                    <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/interview/history')}>
                      View All
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="p-0">
                  {history.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground text-xs">
                      No interviews taken yet. Select a card above to start practicing!
                    </div>
                  ) : (
                    <div className="divide-y divide-border border-t border-border">
                      {history.slice(0, 3).map((sessionItem) => (
                        <div
                          key={sessionItem.id}
                          className="p-4 flex items-center justify-between hover:bg-muted/20 cursor-pointer"
                          onClick={() => navigate(`/interview/report/${sessionItem.id}`)}
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate capitalize">{sessionItem.role}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              <span className="capitalize">{sessionItem.interview_type}</span>
                              <span>•</span>
                              <span>{sessionItem.started_at ? formatDistanceToNow(new Date(sessionItem.started_at), { addSuffix: true }) : ""}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {sessionItem.score !== undefined && (
                              <Badge variant="secondary" className="font-semibold text-xs bg-primary/10 text-primary border-primary/20">
                                {sessionItem.score}%
                              </Badge>
                            )}
                            <ChevronRight className="w-4 h-4 text-muted-foreground" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>
          </div>
        )}
      </main>
    </div>
  );
};

export default InterviewDashboard;
