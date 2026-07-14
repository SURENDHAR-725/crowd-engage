/**
 * InterviewControls Component
 * 
 * Bottom control bar styled like Google Meet / Zoom.
 */

import { motion } from 'framer-motion';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { VoiceInterviewPhase } from '@/hooks/useVoiceInterview';

interface InterviewControlsProps {
  phase: VoiceInterviewPhase;
  isMuted: boolean;
  isCameraOn: boolean;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onEndInterview: () => void;
}

export function InterviewControls({
  phase,
  isMuted,
  isCameraOn,
  onToggleMute,
  onToggleCamera,
  onEndInterview,
}: InterviewControlsProps) {
  const isInterviewActive = phase === 'ai_speaking' || phase === 'listening' || phase === 'processing';

  return (
    <motion.div
      className="flex items-center justify-center gap-3 sm:gap-4 py-4 px-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      {/* Mute Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="lg"
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full transition-all ${
              isMuted
                ? 'bg-destructive/20 text-destructive hover:bg-destructive/30'
                : 'bg-muted/60 text-foreground hover:bg-muted'
            }`}
            onClick={onToggleMute}
            disabled={!isInterviewActive}
          >
            {isMuted ? (
              <MicOff className="w-5 h-5 sm:w-6 sm:h-6" />
            ) : (
              <Mic className="w-5 h-5 sm:w-6 sm:h-6" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{isMuted ? 'Unmute (M)' : 'Mute (M)'}</p>
        </TooltipContent>
      </Tooltip>

      {/* Camera Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="lg"
            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full transition-all ${
              !isCameraOn
                ? 'bg-destructive/20 text-destructive hover:bg-destructive/30'
                : 'bg-muted/60 text-foreground hover:bg-muted'
            }`}
            onClick={onToggleCamera}
          >
            {isCameraOn ? (
              <Video className="w-5 h-5 sm:w-6 sm:h-6" />
            ) : (
              <VideoOff className="w-5 h-5 sm:w-6 sm:h-6" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>{isCameraOn ? 'Turn off camera (C)' : 'Turn on camera (C)'}</p>
        </TooltipContent>
      </Tooltip>

      {/* End Interview Button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="destructive"
            size="lg"
            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-red-600 hover:bg-red-700 text-white"
            onClick={onEndInterview}
            disabled={phase === 'completed' || phase === 'initializing'}
          >
            <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>End Interview (Esc)</p>
        </TooltipContent>
      </Tooltip>
    </motion.div>
  );
}
