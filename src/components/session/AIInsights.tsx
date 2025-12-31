import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { motion } from "framer-motion";
import { 
  Brain, 
  TrendingUp, 
  Users, 
  Clock, 
  MessageSquare,
  Smile,
  Meh,
  Frown,
  Zap,
  Target,
  BarChart3,
  Award,
  ThumbsUp
} from "lucide-react";
import type { AIInsights as AIInsightsType, LeaderboardEntry } from "@/lib/database.types";

interface AIInsightsProps {
  insights: AIInsightsType;
  loading?: boolean;
}

export const AIInsights = ({ insights, loading = false }: AIInsightsProps) => {
  const getSentimentIcon = () => {
    switch (insights.sentiment) {
      case 'positive':
        return <Smile className="w-8 h-8 text-spark-green" />;
      case 'negative':
        return <Frown className="w-8 h-8 text-spark-coral" />;
      case 'mixed':
        return <Meh className="w-8 h-8 text-amber-500" />;
      default:
        return <Meh className="w-8 h-8 text-muted-foreground" />;
    }
  };

  const getSentimentColor = () => {
    switch (insights.sentiment) {
      case 'positive':
        return 'text-spark-green';
      case 'negative':
        return 'text-spark-coral';
      case 'mixed':
        return 'text-amber-500';
      default:
        return 'text-muted-foreground';
    }
  };

  const getEngagementLevel = () => {
    if (insights.engagementScore >= 80) return { label: 'Excellent', color: 'text-spark-green' };
    if (insights.engagementScore >= 60) return { label: 'Good', color: 'text-spark-teal' };
    if (insights.engagementScore >= 40) return { label: 'Moderate', color: 'text-amber-500' };
    return { label: 'Low', color: 'text-spark-coral' };
  };

  const engagement = getEngagementLevel();

  if (loading) {
    return (
      <Card variant="elevated">
        <CardContent className="p-8 text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Brain className="w-12 h-12 mx-auto mb-4 text-primary" />
          </motion.div>
          <p className="font-medium">Analyzing session data...</p>
          <p className="text-sm text-muted-foreground mt-2">AI is generating insights</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Brain className="w-6 h-6 text-primary" />
        <h2 className="text-xl font-display font-bold">AI Insights</h2>
      </div>

      {/* Summary Card */}
      <Card variant="elevated">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MessageSquare className="w-5 h-5 text-primary" />
            Session Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground leading-relaxed">{insights.summary}</p>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Engagement Score */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card variant="glass">
            <CardContent className="p-4 text-center">
              <Target className="w-6 h-6 mx-auto mb-2 text-primary" />
              <div className={`text-3xl font-display font-bold ${engagement.color}`}>
                {insights.engagementScore}%
              </div>
              <p className="text-xs text-muted-foreground">Engagement</p>
              <p className={`text-xs font-medium ${engagement.color}`}>{engagement.label}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Participation Rate */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card variant="glass">
            <CardContent className="p-4 text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-spark-teal" />
              <div className="text-3xl font-display font-bold text-spark-teal">
                {insights.participationRate}%
              </div>
              <p className="text-xs text-muted-foreground">Participation</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Sentiment */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card variant="glass">
            <CardContent className="p-4 text-center">
              {getSentimentIcon()}
              <div className={`text-lg font-display font-bold capitalize mt-1 ${getSentimentColor()}`}>
                {insights.sentiment}
              </div>
              <p className="text-xs text-muted-foreground">Sentiment</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Avg Response Time */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card variant="glass">
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 mx-auto mb-2 text-amber-500" />
              <div className="text-3xl font-display font-bold text-amber-500">
                {insights.averageResponseTime.toFixed(1)}s
              </div>
              <p className="text-xs text-muted-foreground">Avg Response</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Key Themes */}
      {insights.keyThemes.length > 0 && (
        <Card variant="glass">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="w-5 h-5 text-primary" />
              Key Themes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {insights.keyThemes.map((theme, index) => (
                <motion.span
                  key={theme}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium"
                >
                  {theme}
                </motion.span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Performers */}
      {insights.topPerformers && insights.topPerformers.length > 0 && (
        <Card variant="glass">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Award className="w-5 h-5 text-amber-500" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {insights.topPerformers.slice(0, 5).map((performer, index) => (
                <motion.div
                  key={performer.participantId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    index === 0 ? 'bg-amber-500 text-white' :
                    index === 1 ? 'bg-gray-400 text-white' :
                    index === 2 ? 'bg-amber-700 text-white' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{performer.nickname || `Participant ${index + 1}`}</p>
                    <p className="text-xs text-muted-foreground">
                      {performer.correctAnswers} correct • {performer.averageTime.toFixed(1)}s avg
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{performer.score}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      <Card variant="elevated" className="bg-gradient-to-br from-primary/5 to-spark-teal/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-amber-500" />
            AI Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {getRecommendations(insights).map((rec, index) => (
              <motion.li
                key={index}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="flex items-start gap-3"
              >
                <ThumbsUp className="w-4 h-4 mt-1 text-primary shrink-0" />
                <span className="text-sm text-muted-foreground">{rec}</span>
              </motion.li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

// Generate recommendations based on insights
function getRecommendations(insights: AIInsightsType): string[] {
  const recommendations: string[] = [];

  if (insights.engagementScore < 60) {
    recommendations.push("Consider adding more interactive elements like polls or mini-games to boost engagement.");
  }

  if (insights.participationRate < 70) {
    recommendations.push("Try anonymous mode to encourage more participation from shy attendees.");
  }

  if (insights.averageResponseTime > 15) {
    recommendations.push("Questions might be too complex. Consider breaking them into simpler parts.");
  }

  if (insights.sentiment === 'negative') {
    recommendations.push("Review the session content and consider adding more positive/engaging elements.");
  }

  if (insights.sentiment === 'positive') {
    recommendations.push("Great session! Consider saving this format as a template for future use.");
  }

  if (recommendations.length === 0) {
    recommendations.push("Session performed well! Continue with similar engagement strategies.");
  }

  return recommendations;
}

// Engagement Chart Component
export const EngagementChart = ({ data }: { data: { time: string; value: number }[] }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <Card variant="glass">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-lg">
          <BarChart3 className="w-5 h-5 text-primary" />
          Engagement Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-40 flex items-end gap-1">
          {data.map((point, index) => (
            <motion.div
              key={index}
              initial={{ height: 0 }}
              animate={{ height: `${(point.value / maxValue) * 100}%` }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              className="flex-1 bg-primary/60 rounded-t-sm hover:bg-primary transition-colors"
              title={`${point.time}: ${point.value}%`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{data[0]?.time}</span>
          <span>{data[data.length - 1]?.time}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default AIInsights;
