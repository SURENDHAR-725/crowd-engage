import { useEffect } from "react";
import { useInterviewHistory } from "@/hooks/useInterviewHistory";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  BarChart3,
  Users,
  TrendingUp,
  Settings,
  LogOut,
  Zap,
  Briefcase,
  ArrowLeft,
  Calendar,
  Clock,
  Award,
  Trash2,
  ExternalLink,
  Loader2,
  Sun,
  Moon
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { motion } from "framer-motion";

const InterviewHistory = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { user, signOut } = useAuth();
  const { history, loading, loadHistory, deleteInterview } = useInterviewHistory();

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User";
  const userEmail = user?.email || "";

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this interview record permanently?")) {
      await deleteInterview(id);
    }
  };

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
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full lg:hidden"
                onClick={() => navigate('/interview')}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl font-display font-bold">Practice History</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">Detailed logs of all your mock interviews</p>
              </div>
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
              <Button variant="gradient" onClick={() => navigate('/interview/setup')}>
                New Practice
              </Button>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[40vh]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground mt-2">Loading practice log...</p>
            </div>
          ) : (
            <Card className="border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold">All Sessions</CardTitle>
                <CardDescription className="text-xs">
                  Review reports, details, and score history
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {history.length === 0 ? (
                  <div className="p-12 text-center text-muted-foreground text-sm space-y-4">
                    <p>You haven't completed any mock interviews yet.</p>
                    <Button onClick={() => navigate('/interview/setup')}>
                      Take Your First Interview
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-border select-none">
                          <TableHead className="w-[200px]">Role</TableHead>
                          <TableHead className="hidden sm:table-cell">Type</TableHead>
                          <TableHead className="hidden md:table-cell">Difficulty</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-center">Score</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {history.map((sessionItem) => (
                          <TableRow
                            key={sessionItem.id}
                            className="border-b border-border/60 hover:bg-muted/10 cursor-pointer"
                            onClick={() => navigate(`/interview/report/${sessionItem.id}`)}
                          >
                            <TableCell className="font-semibold capitalize text-sm">
                              <div className="flex items-center gap-2">
                                <Briefcase className="w-4 h-4 text-primary shrink-0" />
                                <span className="truncate max-w-[150px] sm:max-w-none">{sessionItem.role}</span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell capitalize text-xs">
                              {sessionItem.interview_type}
                            </TableCell>
                            <TableCell className="hidden md:table-cell capitalize text-xs">
                              <Badge variant="outline" className="border-border bg-background font-normal select-none">
                                {sessionItem.difficulty}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {sessionItem.started_at
                                ? format(new Date(sessionItem.started_at), "MMM d, yyyy")
                                : "N/A"}
                            </TableCell>
                            <TableCell className="text-center font-bold">
                              {sessionItem.score !== undefined ? (
                                <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/10 font-bold select-none text-xs">
                                  {Math.round(sessionItem.score)}%
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">Incomplete</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/interview/report/${sessionItem.id}`);
                                  }}
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-spark-coral hover:bg-spark-coral/10 shrink-0"
                                  onClick={(e) => handleDelete(sessionItem.id!, e)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default InterviewHistory;
