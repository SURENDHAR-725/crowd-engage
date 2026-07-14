import { Progress } from "@/components/ui/progress";
import { Clock, AlertCircle } from "lucide-react";

interface InterviewProgressProps {
  currentIndex: number;
  totalLimit: number;
  timeLeft: number; // in seconds
}

export function InterviewProgress({
  currentIndex,
  totalLimit,
  timeLeft
}: InterviewProgressProps) {
  // Format seconds to mm:ss
  const formatTime = (secs: number) => {
    const minutes = Math.floor(secs / 60);
    const seconds = secs % 60;
    return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  };

  const progressPercent = ((currentIndex + 1) / totalLimit) * 100;
  const isTimeLow = timeLeft < 120; // 2 minutes

  return (
    <div className="space-y-3 w-full bg-card border border-border p-4 rounded-2xl shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <span className="text-xs text-muted-foreground font-medium">Question Progress</span>
          <span className="text-sm font-bold mt-0.5">
            {currentIndex + 1} of {totalLimit} Questions
          </span>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-background select-none">
          {isTimeLow ? (
            <AlertCircle className="w-4 h-4 text-spark-coral animate-pulse" />
          ) : (
            <Clock className="w-4 h-4 text-primary" />
          )}
          <span className={`font-mono text-sm font-bold ${isTimeLow ? "text-spark-coral" : "text-foreground"}`}>
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      <Progress value={progressPercent} className="h-2 bg-muted" />
    </div>
  );
}
