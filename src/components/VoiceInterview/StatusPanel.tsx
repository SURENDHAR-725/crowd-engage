/**
 * StatusPanel Component
 * 
 * Side panel showing interview metadata, timer, progress, and live communication metrics.
 */

import { motion } from 'framer-motion';
import { Clock, MessageSquare, Zap, Activity, AlertCircle, BarChart3 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { VoiceInterviewPhase } from '@/hooks/useVoiceInterview';
import type { AggregateMetrics } from '@/services/communicationAnalysisService';

interface StatusPanelProps {
  phase: VoiceInterviewPhase;
  elapsedSeconds: number;
  questionCount: number;
  totalQuestions: number;
  metrics: AggregateMetrics | null;
}

export function StatusPanel({
  phase,
  elapsedSeconds,
  questionCount,
  totalQuestions,
  metrics,
}: StatusPanelProps) {
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = totalQuestions > 0 ? (questionCount / totalQuestions) * 100 : 0;

  return (
    <div className="space-y-3">
      {/* Timer & Progress */}
      <Card className="border-border/30 bg-card/40 backdrop-blur-sm">
        <CardContent className="p-4 space-y-3">
          {/* Elapsed Time */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">Elapsed</span>
            </div>
            <span className="text-sm font-mono font-bold text-foreground">
              {formatTime(elapsedSeconds)}
            </span>
          </div>

          {/* Question Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MessageSquare className="w-4 h-4" />
                <span className="text-xs font-medium">Questions</span>
              </div>
              <span className="text-xs font-bold text-foreground">
                {questionCount} / {totalQuestions}
              </span>
            </div>
            <Progress value={progress} className="h-1.5" />
          </div>

          {/* Current Phase */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Zap className="w-4 h-4" />
              <span className="text-xs font-medium">Status</span>
            </div>
            <motion.span
              key={phase}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                phase === 'ai_speaking'
                  ? 'bg-primary/15 text-primary'
                  : phase === 'listening'
                  ? 'bg-emerald-500/15 text-emerald-500'
                  : phase === 'processing'
                  ? 'bg-amber-500/15 text-amber-500'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {phase === 'ai_speaking' ? 'Speaking' :
               phase === 'listening' ? 'Listening' :
               phase === 'processing' ? 'Processing' :
               phase === 'completed' ? 'Done' :
               phase === 'initializing' ? 'Connecting' : 'Error'}
            </motion.span>
          </div>
        </CardContent>
      </Card>

      {/* Communication Metrics */}
      {metrics && metrics.totalQuestions > 0 && (
        <Card className="border-border/30 bg-card/40 backdrop-blur-sm">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-foreground">Live Metrics</span>
            </div>

            {/* Speaking Speed */}
            <MetricRow
              icon={<Activity className="w-3.5 h-3.5" />}
              label="Speaking Speed"
              value={`${metrics.averageWPM} WPM`}
              quality={metrics.averageWPM >= 100 && metrics.averageWPM <= 180 ? 'good' : 'warning'}
            />

            {/* Filler Words */}
            <MetricRow
              icon={<AlertCircle className="w-3.5 h-3.5" />}
              label="Filler Words"
              value={`${metrics.totalFillerWords}`}
              quality={metrics.fillerWordDensity < 3 ? 'good' : metrics.fillerWordDensity < 6 ? 'warning' : 'bad'}
            />

            {/* Response Time */}
            <MetricRow
              icon={<Clock className="w-3.5 h-3.5" />}
              label="Avg Response"
              value={`${(metrics.averageResponseLatencyMs / 1000).toFixed(1)}s`}
              quality={metrics.averageResponseLatencyMs < 3000 ? 'good' : 'warning'}
            />

            {/* Confidence */}
            <MetricRow
              icon={<Zap className="w-3.5 h-3.5" />}
              label="Confidence"
              value={`${metrics.averageConfidence}/10`}
              quality={metrics.averageConfidence >= 7 ? 'good' : metrics.averageConfidence >= 5 ? 'warning' : 'bad'}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Metric Row Sub-component ────────────────────────────────────────────

function MetricRow({
  icon,
  label,
  value,
  quality,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  quality: 'good' | 'warning' | 'bad';
}) {
  const colorClass =
    quality === 'good' ? 'text-emerald-400' :
    quality === 'warning' ? 'text-amber-400' :
    'text-red-400';

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="text-[11px]">{label}</span>
      </div>
      <span className={`text-xs font-bold ${colorClass}`}>
        {value}
      </span>
    </div>
  );
}
