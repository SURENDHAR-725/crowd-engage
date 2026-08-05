import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Plus,
  BarChart3,
  Timer,
  Briefcase,
  Zap,
  Users,
  ChevronRight,
  Settings,
  LogOut,
  Copy,
  Play,
  Loader2,
  Trophy,
  Search,
  Filter,
  Sparkles,
  Calendar,
  TrendingUp,
  Trash2,
  BookOpen,
  ThumbsUp,
  Star,
  Gamepad2,
  RefreshCw,
  UserPlus,
  Bell,
  Sun,
  Moon,
  Mic,
  Shield,
  Globe,
  Mail,
  Info,
  PieChart,
  Activity,
  Clock,
  Target,
  FileText
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useSessions } from "@/hooks/useSessions";
import { supabase } from "@/lib/supabase";
import { sessionService } from "@/services/sessionService";
import { ResumeAnalyzer } from "@/components/ResumeAnalyzer/ResumeAnalyzer";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

const pollTypes = [
  {
    id: "interview",
    icon: Mic,
    title: "AI Interview",
    description: "Practice with AI interviewer",
    color: "text-primary",
    bg: "bg-primary/10",
    route: "/interview/setup",
  },
  {
    id: "quiz",
    icon: Timer,
    title: "AI Quiz",
    description: "Competitive with scoring",
    color: "text-spark-coral",
    bg: "bg-spark-coral/10",
    route: "/create?type=quiz",
  },
  {
    id: "mocktest",
    icon: BookOpen,
    title: "Mock Test",
    description: "AI-powered practice",
    color: "text-emerald-500",
    bg: "bg-emerald-500/10",
    route: "/create?type=mocktest",
  },
  {
    id: "mcq",
    icon: BarChart3,
    title: "Multiple Choice",
    description: "Classic poll with options",
    color: "text-spark-teal",
    bg: "bg-spark-teal/10",
    route: "/create?type=mcq",
  },
];

type DashboardTab = 'sessions' | 'resume' | 'audience' | 'analytics' | 'settings';

type StatusFilter = 'all' | 'active' | 'draft' | 'ended';
type TypeFilter = 'all' | 'mcq' | 'quiz' | 'yesno' | 'rating' | 'minigame' | 'mocktest';

const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [userName, setUserName] = useState<string>("");
  const [userEmail, setUserEmail] = useState<string>("");
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as DashboardTab) || 'sessions';
  const [activeTab, setActiveTab] = useState<DashboardTab>(
    ['sessions', 'resume', 'audience', 'analytics', 'settings'].includes(initialTab) ? initialTab : 'sessions'
  );
  const navigate = useNavigate();
  const { sessions, loading: sessionsLoading, updateSessionStatus, deleteSession } = useSessions();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserEmail(user.email || "");

        // Fetch user profile data from users table
        const { data: profile } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', user.id)
          .single();

        if (profile?.full_name) {
          setUserName(profile.full_name);
        } else if (user.user_metadata?.full_name) {
          setUserName(user.user_metadata.full_name);
        } else {
          setUserName(user.email?.split('@')[0] || "User");
        }
      }
    };

    fetchUserData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-spark-green/10 text-spark-green border-spark-green/30";
      case "draft":
        return "bg-muted text-muted-foreground border-muted";
      case "ended":
        return "bg-spark-coral/10 text-spark-coral border-spark-coral/30";
      default:
        return "bg-muted text-muted-foreground border-muted";
    }
  };

  const getTypeConfig = (type: string) => {
    switch (type) {
      case "quiz":
        return { icon: Timer, color: "text-spark-coral", bg: "bg-spark-coral/10" };
      case "yesno":
        return { icon: ThumbsUp, color: "text-spark-green", bg: "bg-spark-green/10" };
      case "rating":
        return { icon: Star, color: "text-amber-500", bg: "bg-amber-500/10" };
      case "minigame":
        return { icon: Gamepad2, color: "text-purple-500", bg: "bg-purple-500/10" };
      case "mocktest":
        return { icon: BookOpen, color: "text-emerald-500", bg: "bg-emerald-500/10" };
      default:
        return { icon: BarChart3, color: "text-primary", bg: "bg-primary/10" };
    }
  };

  const copySessionCode = (code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    toast.success(`Code ${code} copied to clipboard!`);
  };

  const handleJoinSession = async () => {
    if (joinCode.length < 4) {
      toast.error("Please enter a valid session code");
      return;
    }

    setIsJoining(true);

    try {
      const session = await sessionService.getSessionByCode(joinCode);

      if (session) {
        toast.success("Joining session...");
        setJoinDialogOpen(false);

        // Check if it's a buzzer game
        const isBuzzerGame = session.type === 'minigame' ||
          (session.settings && typeof session.settings === 'object' &&
            (session.settings as { is_buzzer_game?: boolean }).is_buzzer_game === true);

        if (isBuzzerGame) {
          navigate(`/buzzer/${joinCode.toUpperCase()}`);
        } else {
          navigate(`/session/${joinCode.toUpperCase()}`);
        }
      } else {
        toast.error("Session not found or not active");
      }
    } catch (error) {
      console.error('Error joining session:', error);
      toast.error("Failed to join session");
    } finally {
      setIsJoining(false);
      setJoinCode("");
    }
  };

  const handleLaunchSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await updateSessionStatus(sessionId, 'active');
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this session?')) {
      await deleteSession(sessionId);
    }
  };

  // Filter and search sessions
  const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
      const matchesSearch =
        session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
      const matchesType = typeFilter === 'all' || session.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [sessions, searchQuery, statusFilter, typeFilter]);

  // Stats
  const stats = useMemo(() => ({
    total: sessions.length,
    active: sessions.filter(s => s.status === 'active').length,
    totalParticipants: sessions.reduce((acc, s) => acc + s.participant_count, 0),
    thisWeek: sessions.filter(s => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(s.created_at) >= weekAgo;
    }).length,
  }), [sessions]);

  const displayedSessions = (showAll || searchQuery || statusFilter !== 'all' || typeFilter !== 'all')
    ? filteredSessions
    : filteredSessions.slice(0, 5);
  const hasMoreSessions = filteredSessions.length > 5;

  if (sessionsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </motion.div>
      </div>
    );
  }

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
          <button onClick={() => setActiveTab('sessions')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'sessions' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'}`}>
            <BarChart3 className="w-5 h-5" />
            Sessions
          </button>
          <button onClick={() => setActiveTab('resume')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'resume' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'}`}>
            <FileText className="w-5 h-5" />
            Resume Analyzer
          </button>
          <Link to="/interview" className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted transition-colors">
            <Briefcase className="w-5 h-5" />
            AI Interview
          </Link>
          <button onClick={() => setActiveTab('audience')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'audience' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'}`}>
            <Users className="w-5 h-5" />
            Audience
          </button>
          <button onClick={() => setActiveTab('analytics')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'analytics' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'}`}>
            <TrendingUp className="w-5 h-5" />
            Analytics
          </button>
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'settings' ? 'bg-primary/10 text-primary font-medium' : 'text-muted-foreground hover:bg-muted'}`}>
            <Settings className="w-5 h-5" />
            Settings
          </button>
        </nav>

        {/* User */}
        <div className="pt-6 border-t border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-spark-teal flex items-center justify-center text-primary-foreground font-bold">
              {userName ? userName.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <p className="font-medium text-sm">{userName || "User"}</p>
              <p className="text-xs text-muted-foreground truncate max-w-[150px]">{userEmail}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={() => navigate('/')}>
            <LogOut className="w-4 h-4 mr-2" />
            Exit Dashboard
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="lg:hidden">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg btn-gradient flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-display text-base sm:text-lg font-bold text-gradient">
                  CrowdSpark
                </span>
              </Link>
            </div>
            <div className="hidden lg:block">
              <h1 className="text-xl sm:text-2xl font-display font-bold">{activeTab === 'resume' ? 'Resume Analyzer' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {activeTab === 'sessions' && 'Manage your interactive sessions'}
                {activeTab === 'resume' && 'Get AI-powered feedback on your resume'}
                {activeTab === 'audience' && 'View and manage your audience'}
                {activeTab === 'analytics' && 'Track your performance metrics'}
                {activeTab === 'settings' && 'Customize your preferences'}
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-end">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search sessions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-48 lg:w-64 pl-9"
                />
              </div>

              {/* Theme Toggle Button */}
              <Button
                variant="outline"
                size="icon"
                onClick={toggleTheme}
                className="rounded-full"
              >
                {theme === "light" ? (
                  <Moon className="w-4 h-4" />
                ) : (
                  <Sun className="w-4 h-4" />
                )}
              </Button>

              {/* Join Session Dialog */}
              <Dialog open={joinDialogOpen} onOpenChange={setJoinDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="sm:size-default">
                    <UserPlus className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Join Session</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Bell className="w-5 h-5 text-primary" />
                      Join a Session
                    </DialogTitle>
                    <DialogDescription>
                      Enter the session code provided by your host to participate
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <Input
                      variant="code"
                      placeholder="ENTER CODE"
                      value={joinCode}
                      onChange={(e) => setJoinCode(e.target.value.toUpperCase().slice(0, 8))}
                      onKeyPress={(e) => e.key === 'Enter' && handleJoinSession()}
                      maxLength={8}
                    />
                    <Button
                      variant="gradient"
                      className="w-full"
                      size="lg"
                      onClick={handleJoinSession}
                      disabled={isJoining || joinCode.length < 4}
                    >
                      {isJoining ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Joining...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Join Session
                        </>
                      )}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>

              <Button variant="gradient" size="sm" className="sm:size-default" onClick={() => navigate('/create')}>
                <Plus className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">New Session</span>
              </Button>
            </div>
          </div>
        </header>

        <div className="p-3 sm:p-6 space-y-6 sm:space-y-8">
          {/* Sessions Tab */}
          {activeTab === 'sessions' && (
            <>
              {/* Stats Cards */}
              {sessions.length > 0 && (
                <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {[
                    { label: 'Total Sessions', value: stats.total, icon: BarChart3, color: 'text-primary' },
                    { label: 'Active Now', value: stats.active, icon: Play, color: 'text-spark-green' },
                    { label: 'Total Participants', value: stats.totalParticipants, icon: Users, color: 'text-spark-coral' },
                    { label: 'This Week', value: stats.thisWeek, icon: Calendar, color: 'text-spark-teal' },
                  ].map((stat, i) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <Card className="border-border/50">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs sm:text-sm text-muted-foreground truncate">{stat.label}</p>
                              <p className="text-xl sm:text-2xl font-bold">{stat.value}</p>
                            </div>
                            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-muted flex items-center justify-center shrink-0`}>
                              <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`} />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </section>
              )}

              {/* Quick Create */}
              <section>
                <h2 className="text-base sm:text-lg font-display font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                  Quick Create
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  {pollTypes.map((type, i) => (
                    <motion.div
                      key={type.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ scale: 1.02, y: -2 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Card
                        variant="glass"
                        className="cursor-pointer card-hover h-full"
                        onClick={() => navigate(type.route)}
                      >
                        <CardContent className="p-3 sm:p-5 flex flex-col items-center text-center gap-2 sm:gap-3">
                          <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl ${type.bg} flex items-center justify-center`}>
                            <type.icon className={`w-5 h-5 sm:w-7 sm:h-7 ${type.color}`} />
                          </div>
                          <div>
                            <h3 className="font-semibold text-sm sm:text-base">{type.title}</h3>
                            <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1 hidden sm:block">{type.description}</p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </section>

              {/* Recent Sessions */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-display font-semibold">Recent Sessions</h2>
                  <div className="flex items-center gap-2">
                    {/* Status Filter */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-9">
                          <Filter className="w-4 h-4 mr-2" />
                          {statusFilter === 'all' ? 'All Status' : statusFilter}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {['all', 'active', 'draft', 'ended'].map((status) => (
                          <DropdownMenuItem
                            key={status}
                            onClick={() => setStatusFilter(status as StatusFilter)}
                            className={statusFilter === status ? 'bg-primary/10' : ''}
                          >
                            {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {hasMoreSessions && !searchQuery && statusFilter === 'all' && typeFilter === 'all' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowAll(!showAll)}
                      >
                        {showAll ? 'Show Less' : `View All (${filteredSessions.length})`}
                        <ChevronRight className={`w-4 h-4 ml-1 transition-transform ${showAll ? 'rotate-90' : ''}`} />
                      </Button>
                    )}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {filteredSessions.length === 0 ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <Card variant="default">
                        <CardContent className="p-12 text-center">
                          <motion.div
                            className="w-20 h-20 rounded-3xl bg-muted mx-auto mb-4 flex items-center justify-center"
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring" }}
                          >
                            <BarChart3 className="w-10 h-10 text-muted-foreground" />
                          </motion.div>
                          <h3 className="font-semibold text-lg mb-2">
                            {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                              ? 'No matching sessions'
                              : 'No sessions yet'}
                          </h3>
                          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                            {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                              ? 'Try adjusting your filters or search query'
                              : 'Create your first interactive session to engage your audience'}
                          </p>
                          {!searchQuery && statusFilter === 'all' && typeFilter === 'all' && (
                            <Button variant="gradient" onClick={() => navigate('/create')}>
                              <Plus className="w-4 h-4 mr-2" />
                              Create Session
                            </Button>
                          )}
                          {(searchQuery || statusFilter !== 'all' || typeFilter !== 'all') && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                setSearchQuery('');
                                setStatusFilter('all');
                                setTypeFilter('all');
                              }}
                            >
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Clear Filters
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="list"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-3"
                    >
                      {displayedSessions.map((session, i) => {
                        const typeConfig = getTypeConfig(session.type);
                        const TypeIcon = typeConfig.icon;

                        // Check if it's a buzzer game
                        const isBuzzerGame = session.type === 'minigame' ||
                          (session.settings && typeof session.settings === 'object' &&
                            (session.settings as { is_buzzer_game?: boolean }).is_buzzer_game === true);

                        return (
                          <motion.div
                            key={session.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                            whileHover={{ scale: 1.01, x: 4 }}
                            onClick={() => {
                              if (isBuzzerGame) {
                                navigate(`/buzzer/${session.code}?host=true`);
                              } else {
                                navigate(`/session/${session.code}?host=true`);
                              }
                            }}
                            className="cursor-pointer"
                          >
                            <Card variant="default" className="card-hover border-border/50">
                              <CardContent className="p-4 flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-xl ${typeConfig.bg} flex items-center justify-center shrink-0`}>
                                  <TypeIcon className={`w-6 h-6 ${typeConfig.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold truncate">{session.title}</h3>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize border ${getStatusColor(session.status)}`}>
                                      {session.status}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Users className="w-4 h-4" />
                                      {session.participant_count}
                                    </span>
                                    <span className="font-mono">#{session.code}</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => copySessionCode(session.code, e)}
                                  >
                                    <Copy className="w-4 h-4" />
                                  </Button>
                                  {session.status === "active" && (
                                    <Button
                                      variant="gradient"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/session/${session.code}`);
                                      }}
                                    >
                                      <Play className="w-4 h-4 mr-1" />
                                      Present
                                    </Button>
                                  )}
                                  {session.status === "draft" && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => handleLaunchSession(session.id, e)}
                                    >
                                      <Play className="w-4 h-4 mr-1" />
                                      Launch
                                    </Button>
                                  )}
                                  {session.status === "ended" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        // Check if it's a buzzer game
                                        const isBuzzerGame = session.type === 'minigame' ||
                                          (session.settings && typeof session.settings === 'object' &&
                                            (session.settings as { is_buzzer_game?: boolean }).is_buzzer_game === true);

                                        if (isBuzzerGame) {
                                          navigate(`/buzzer/${session.code}?host=true`);
                                        } else {
                                          navigate(`/session/${session.code}?host=true`);
                                        }
                                      }}
                                    >
                                      <Trophy className="w-4 h-4 mr-1" />
                                      Results
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-muted-foreground hover:text-destructive"
                                    onClick={(e) => handleDeleteSession(session.id, e)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>
            </>
          )}

          {/* Audience Tab */}
          {activeTab === 'audience' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Audience Overview Cards */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { label: 'Total Participants', value: stats.totalParticipants, icon: Users, color: 'text-primary', bg: 'bg-primary/10', description: 'Across all sessions' },
                  { label: 'Active Sessions', value: stats.active, icon: Play, color: 'text-spark-green', bg: 'bg-spark-green/10', description: 'Currently live' },
                  { label: 'Avg. per Session', value: stats.total > 0 ? Math.round(stats.totalParticipants / stats.total) : 0, icon: Target, color: 'text-spark-coral', bg: 'bg-spark-coral/10', description: 'Average audience size' },
                ].map((stat, i) => (
                  <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                    <Card className="border-border/50">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                            <stat.icon className={`w-6 h-6 ${stat.color}`} />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">{stat.label}</p>
                            <p className="text-2xl font-bold">{stat.value}</p>
                            <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </section>

              {/* Audience Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Audience Overview
                  </CardTitle>
                  <CardDescription>A summary of your audience engagement across all sessions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                      <div className="flex items-center gap-3 mb-2">
                        <Globe className="w-5 h-5 text-primary" />
                        <h4 className="font-semibold">Reach</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">Your sessions have reached <span className="text-foreground font-medium">{stats.totalParticipants}</span> total participants across <span className="text-foreground font-medium">{stats.total}</span> sessions.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                      <div className="flex items-center gap-3 mb-2">
                        <Activity className="w-5 h-5 text-spark-green" />
                        <h4 className="font-semibold">Engagement</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">You have <span className="text-foreground font-medium">{stats.active}</span> active session{stats.active !== 1 ? 's' : ''} running right now with live participants.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                      <div className="flex items-center gap-3 mb-2">
                        <Clock className="w-5 h-5 text-spark-coral" />
                        <h4 className="font-semibold">Recent Activity</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">You've created <span className="text-foreground font-medium">{stats.thisWeek}</span> session{stats.thisWeek !== 1 ? 's' : ''} this week.</p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                      <div className="flex items-center gap-3 mb-2">
                        <Mail className="w-5 h-5 text-spark-purple" />
                        <h4 className="font-semibold">Invitations</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">Share your session codes with participants to grow your audience and increase engagement.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Analytics Tab */}
          {activeTab === 'analytics' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Analytics Overview Cards */}
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {[
                  { label: 'Total Sessions', value: stats.total, icon: BarChart3, color: 'text-primary' },
                  { label: 'Active Now', value: stats.active, icon: Play, color: 'text-spark-green' },
                  { label: 'Total Participants', value: stats.totalParticipants, icon: Users, color: 'text-spark-coral' },
                  { label: 'This Week', value: stats.thisWeek, icon: Calendar, color: 'text-spark-teal' },
                ].map((stat, i) => (
                  <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                    <Card className="border-border/50">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-muted-foreground truncate">{stat.label}</p>
                            <p className="text-xl sm:text-2xl font-bold">{stat.value}</p>
                          </div>
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                            <stat.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </section>

              {/* Analytics Details */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-primary" />
                      Session Breakdown
                    </CardTitle>
                    <CardDescription>Distribution of your sessions by type</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { type: 'Quiz', count: sessions.filter(s => s.type === 'quiz').length, color: 'bg-spark-coral', textColor: 'text-spark-coral' },
                      { type: 'Multiple Choice', count: sessions.filter(s => s.type === 'mcq').length, color: 'bg-primary', textColor: 'text-primary' },
                      { type: 'Yes/No', count: sessions.filter(s => s.type === 'yesno').length, color: 'bg-spark-green', textColor: 'text-spark-green' },
                      { type: 'Mock Test', count: sessions.filter(s => s.type === 'mocktest').length, color: 'bg-emerald-500', textColor: 'text-emerald-500' },
                    ].map((item) => (
                      <div key={item.type} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${item.color}`} />
                          <span className="text-sm font-medium">{item.type}</span>
                        </div>
                        <span className={`text-sm font-bold ${item.textColor}`}>{item.count}</span>
                      </div>
                    ))}
                    {sessions.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No sessions created yet. Create your first session to see analytics.</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-spark-green" />
                      Performance Summary
                    </CardTitle>
                    <CardDescription>Key metrics and insights</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Avg. Participants per Session</span>
                        <span className="text-lg font-bold text-primary">{stats.total > 0 ? Math.round(stats.totalParticipants / stats.total) : 0}</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-primary rounded-full h-2 transition-all" style={{ width: `${Math.min((stats.total > 0 ? (stats.totalParticipants / stats.total) : 0) * 10, 100)}%` }} />
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Completion Rate</span>
                        <span className="text-lg font-bold text-spark-green">
                          {stats.total > 0 ? Math.round((sessions.filter(s => s.status === 'ended').length / stats.total) * 100) : 0}%
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2">
                        <div className="bg-spark-green rounded-full h-2 transition-all" style={{ width: `${stats.total > 0 ? Math.round((sessions.filter(s => s.status === 'ended').length / stats.total) * 100) : 0}%` }} />
                      </div>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">Weekly Activity</span>
                        <span className="text-lg font-bold text-spark-teal">{stats.thisWeek} session{stats.thisWeek !== 1 ? 's' : ''}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Sessions created in the last 7 days</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-6 max-w-3xl"
            >
              {/* Appearance */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {theme === 'dark' ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
                    Appearance
                  </CardTitle>
                  <CardDescription>Customize the look and feel of the application</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50 border border-border/50">
                    <div className="flex items-center gap-3">
                      {theme === 'dark' ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
                      <div>
                        <p className="font-medium">Dark Mode</p>
                        <p className="text-sm text-muted-foreground">{theme === 'dark' ? 'Dark theme is enabled' : 'Light theme is enabled'}</p>
                      </div>
                    </div>
                    <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
                  </div>
                </CardContent>
              </Card>

              {/* Account */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-primary" />
                    Account
                  </CardTitle>
                  <CardDescription>Your account information and preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/50 border border-border/50">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-spark-teal flex items-center justify-center text-primary-foreground font-bold text-lg">
                      {userName ? userName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <p className="font-medium">{userName || 'User'}</p>
                      <p className="text-sm text-muted-foreground">{userEmail}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                      <div className="flex items-center gap-2 mb-1">
                        <BarChart3 className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">Sessions Created</span>
                      </div>
                      <p className="text-2xl font-bold">{stats.total}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4 text-spark-coral" />
                        <span className="text-sm font-medium">Total Participants</span>
                      </div>
                      <p className="text-2xl font-bold">{stats.totalParticipants}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* About */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Info className="w-5 h-5 text-primary" />
                    About
                  </CardTitle>
                  <CardDescription>About CrowdSpark platform</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                    <p className="text-sm text-muted-foreground">CrowdSpark is an AI-powered interview and assessment platform that helps you practice technical and HR interviews, generate personalized quizzes, and track your performance over time.</p>
                    <div className="flex items-center gap-2 mt-3">
                      <Zap className="w-4 h-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Version 1.0.0</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Resume Analyzer Tab */}
          {activeTab === 'resume' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <ResumeAnalyzer />
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
