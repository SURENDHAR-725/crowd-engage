import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  BarChart3, 
  Timer, 
  Zap,
  Users,
  ChevronRight,
  Settings,
  LogOut,
  Copy,
  Play,
  Loader2,
  Trophy
} from "lucide-react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useSessions } from "@/hooks/useSessions";

const pollTypes = [
  { 
    id: "mcq", 
    icon: BarChart3, 
    title: "Multiple Choice", 
    description: "Classic poll with multiple options",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  { 
    id: "quiz", 
    icon: Timer, 
    title: "Timed Quiz", 
    description: "Competitive quiz with scoring",
    color: "text-spark-coral",
    bg: "bg-spark-coral/10",
  },
];

const Dashboard = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const navigate = useNavigate();
  const { sessions, loading: sessionsLoading, updateSessionStatus, deleteSession } = useSessions();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-spark-green/10 text-spark-green";
      case "draft":
        return "bg-muted text-muted-foreground";
      case "ended":
        return "bg-spark-coral/10 text-spark-coral";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "poll":
        return BarChart3;
      case "quiz":
        return Timer;
      default:
        return BarChart3;
    }
  };

  const copySessionCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Code ${code} copied to clipboard!`);
  };

  const handleLaunchSession = async (sessionId: string) => {
    await updateSessionStatus(sessionId, 'active');
    // Navigate to present view (to be implemented)
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (confirm('Are you sure you want to delete this session?')) {
      await deleteSession(sessionId);
    }
  };

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Show only 5 sessions by default, or all if showAll is true or searching
  const displayedSessions = (showAll || searchQuery) ? filteredSessions : filteredSessions.slice(0, 5);
  const hasMoreSessions = filteredSessions.length > 5;

  if (sessionsLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border p-6 hidden lg:flex flex-col">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl btn-gradient flex items-center justify-center">
            <Zap className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-xl font-bold text-gradient">
            CrowdSpark
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/10 text-primary font-medium">
            <BarChart3 className="w-5 h-5" />
            Sessions
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted transition-colors">
            <Users className="w-5 h-5" />
            Audience
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl text-muted-foreground hover:bg-muted transition-colors">
            <Settings className="w-5 h-5" />
            Settings
          </a>
        </nav>

        {/* User */}
        <div className="pt-6 border-t border-border">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-spark-teal flex items-center justify-center text-primary-foreground font-bold">
              T
            </div>
            <div>
              <p className="font-medium text-sm">Test User</p>
              <p className="text-xs text-muted-foreground">Dev Mode</p>
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
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-lg border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="lg:hidden">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg btn-gradient flex items-center justify-center">
                  <Zap className="w-4 h-4 text-primary-foreground" />
                </div>
                <span className="font-display text-lg font-bold text-gradient">
                  CrowdSpark
                </span>
              </Link>
            </div>
            <div className="hidden lg:block">
              <h1 className="text-2xl font-display font-bold">Sessions</h1>
            </div>
            <div className="flex items-center gap-3">
              <Input
                placeholder="Search sessions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 hidden md:block"
              />
              <Button variant="gradient" onClick={() => navigate('/create')}>
                <Plus className="w-4 h-4" />
                New Session
              </Button>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-8">
          {/* Quick Create */}
          <section>
            <h2 className="text-lg font-display font-semibold mb-4">Quick Create</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pollTypes.map((type) => (
                <motion.div
                  key={type.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card 
                    variant="glass" 
                    className="cursor-pointer card-hover"
                    onClick={() => navigate(`/create?type=${type.id}`)}
                  >
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl ${type.bg} flex items-center justify-center`}>
                        <type.icon className={`w-6 h-6 ${type.color}`} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold">{type.title}</h3>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
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
              {hasMoreSessions && !searchQuery && (
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
            {filteredSessions.length === 0 ? (
              <Card variant="default">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-muted mx-auto mb-4 flex items-center justify-center">
                    <BarChart3 className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold mb-2">No sessions yet</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery ? 'No sessions match your search' : 'Create your first interactive session to get started'}
                  </p>
                  {!searchQuery && (
                    <Button variant="gradient" onClick={() => navigate('/create')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Session
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {displayedSessions.map((session) => {
                  const TypeIcon = getTypeIcon(session.type);
                  return (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.01 }}
                    >
                      <Card variant="default" className="card-hover">
                        <CardContent className="p-4 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                            <TypeIcon className="w-6 h-6 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold truncate">{session.title}</h3>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(session.status)}`}>
                                {session.status}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users className="w-4 h-4" />
                                {session.participant_count}
                              </span>
                              <span>Code: {session.code}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => copySessionCode(session.code)}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            {session.status === "active" && (
                              <Button variant="gradient" size="sm" onClick={() => navigate(`/session/${session.code}`)}>
                                <Play className="w-4 h-4 mr-1" />
                                Present
                              </Button>
                            )}
                            {session.status === "draft" && (
                              <>
                                <Button variant="outline" size="sm" onClick={() => handleLaunchSession(session.id)}>
                                  <Play className="w-4 h-4 mr-1" />
                                  Launch
                                </Button>
                              </>
                            )}
                            {session.status === "ended" && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => navigate(`/session/${session.code}?host=true`)}
                              >
                                <Trophy className="w-4 h-4 mr-1" />
                                Results
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Empty State */}
          {filteredSessions.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-display font-semibold text-lg mb-2">No sessions found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? "Try a different search term" : "Create your first session to get started"}
              </p>
              <Button variant="gradient" onClick={() => navigate('/create')}>
                <Plus className="w-4 h-4 mr-2" />
                Create Session
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
