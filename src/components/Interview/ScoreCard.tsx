import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Trophy, MessageSquare, Compass, Brain, ThumbsUp } from "lucide-react";
import { motion } from "framer-motion";

interface ScoreCardProps {
  score: number; // overall percentage (0-100)
  technical: number; // 0-10
  communication: number; // 0-10
  confidence: number; // 0-10
  problemSolving: number; // 0-10
}

export function ScoreCard({
  score,
  technical,
  communication,
  confidence,
  problemSolving
}: ScoreCardProps) {
  const getRating = (val: number) => {
    if (val >= 85 || val >= 8.5) return { text: "Expert", color: "text-emerald-500", bg: "bg-emerald-500/10 border-emerald-500/20" };
    if (val >= 70 || val >= 7.0) return { text: "Strong", color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" };
    if (val >= 50 || val >= 5.0) return { text: "Average", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" };
    return { text: "Needs Practice", color: "text-spark-coral", bg: "bg-spark-coral/10 border-spark-coral/20" };
  };

  const overallRating = getRating(score);

  const metrics = [
    { label: "Technical Accuracy", value: technical, icon: Brain, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { label: "Communication Skills", value: communication, icon: MessageSquare, color: "text-spark-teal", bg: "bg-spark-teal/10" },
    { label: "Confidence & Tone", value: confidence, icon: ThumbsUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Problem Solving", value: problemSolving, icon: Compass, color: "text-purple-500", bg: "bg-purple-500/10" }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Overall Score Circle */}
      <Card className="border-border/50 md:col-span-1 flex flex-col justify-center items-center p-6 text-center bg-card/40 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-3 left-3">
          <Trophy className="w-5 h-5 text-amber-500" />
        </div>
        <CardHeader className="p-0">
          <CardTitle className="text-sm font-display font-medium text-muted-foreground uppercase tracking-wider">
            Overall Score
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex flex-col items-center mt-4">
          <div className="relative flex items-center justify-center">
            {/* SVG Circle Ring */}
            <svg className="w-36 h-36">
              <circle
                className="text-muted/20"
                strokeWidth="10"
                stroke="currentColor"
                fill="transparent"
                r="58"
                cx="72"
                cy="72"
              />
              <motion.circle
                className="text-primary"
                strokeWidth="10"
                strokeDasharray={364.4}
                strokeDashoffset={364.4 - (364.4 * score) / 100}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="58"
                cx="72"
                cy="72"
                initial={{ strokeDashoffset: 364.4 }}
                animate={{ strokeDashoffset: 364.4 - (364.4 * score) / 100 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-extrabold font-display">{score}%</span>
            </div>
          </div>
          <Badge className={`mt-4 px-3 py-1 text-xs border ${overallRating.color} ${overallRating.bg} font-semibold rounded-full`}>
            {overallRating.text}
          </Badge>
        </CardContent>
      </Card>

      {/* Metric breakdown */}
      <Card className="border-border/50 md:col-span-2 bg-card/40 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-display font-bold">Performance Summary</CardTitle>
          <CardDescription className="text-xs">Granular analysis scored out of 10</CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-2 space-y-4">
          {metrics.map((metric, i) => {
            const rating = getRating(metric.value * 10);
            return (
              <div key={metric.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <div className={`p-1.5 rounded-lg ${metric.bg} ${metric.color}`}>
                      <metric.icon className="w-4 h-4" />
                    </div>
                    {metric.label}
                  </div>
                  <div className="flex items-center gap-2 font-bold font-mono">
                    <span>{metric.value.toFixed(1)}/10.0</span>
                    <span className={`text-xs font-sans font-medium px-2 py-0.5 rounded-full border ${rating.color} ${rating.bg}`}>
                      {rating.text}
                    </span>
                  </div>
                </div>
                {/* Visual Bar */}
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full btn-gradient`}
                    initial={{ width: 0 }}
                    animate={{ width: `${metric.value * 10}%` }}
                    transition={{ duration: 1 + i * 0.1, ease: "easeOut" }}
                  />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
