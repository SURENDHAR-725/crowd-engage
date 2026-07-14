/**
 * AIAvatar Component
 * 
 * Animated AI interviewer avatar with speaking/listening/thinking states.
 */

import { motion } from 'framer-motion';
import { Mic, Volume2, Brain, User } from 'lucide-react';
import type { VoiceInterviewPhase } from '@/hooks/useVoiceInterview';

interface AIAvatarProps {
  phase: VoiceInterviewPhase;
  avatarName?: string;
}

export function AIAvatar({ phase, avatarName = 'Alex' }: AIAvatarProps) {
  const getStatusText = () => {
    switch (phase) {
      case 'ai_speaking': return 'Speaking...';
      case 'listening': return 'Listening...';
      case 'processing': return 'Thinking...';
      case 'initializing': return 'Connecting...';
      case 'completed': return 'Interview Complete';
      case 'error': return 'Error';
      default: return '';
    }
  };

  const getStatusIcon = () => {
    switch (phase) {
      case 'ai_speaking': return <Volume2 className="w-4 h-4" />;
      case 'listening': return <Mic className="w-4 h-4" />;
      case 'processing': return <Brain className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  return (
    <div className="flex flex-col items-center gap-5">
      {/* Avatar Ring */}
      <div className="relative">
        {/* Outer animated ring */}
        <motion.div
          className={`absolute -inset-3 rounded-full ${
            phase === 'ai_speaking'
              ? 'voice-ring-speaking'
              : phase === 'listening'
              ? 'voice-ring-listening'
              : ''
          }`}
          animate={
            phase === 'ai_speaking'
              ? { scale: [1, 1.08, 1], opacity: [0.6, 1, 0.6] }
              : phase === 'listening'
              ? { scale: [1, 1.05, 1], opacity: [0.4, 0.8, 0.4] }
              : phase === 'processing'
              ? { rotate: 360 }
              : {}
          }
          transition={
            phase === 'processing'
              ? { duration: 2, repeat: Infinity, ease: 'linear' }
              : { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
          }
        />

        {/* Secondary pulse ring for speaking */}
        {phase === 'ai_speaking' && (
          <motion.div
            className="absolute -inset-6 rounded-full border-2 border-primary/30"
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0, 0.3] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
          />
        )}

        {/* Avatar Circle */}
        <motion.div
          className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full overflow-hidden"
          animate={
            phase === 'processing'
              ? { scale: [1, 0.97, 1] }
              : {}
          }
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          {/* Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-secondary opacity-90" />
          
          {/* Avatar Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-white/90">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
          </div>

          {/* Equalizer overlay when speaking */}
          {phase === 'ai_speaking' && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-end gap-[3px] h-6">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="w-[3px] bg-white/80 rounded-full"
                  animate={{
                    height: [4, 12 + Math.random() * 12, 4],
                  }}
                  transition={{
                    duration: 0.4 + Math.random() * 0.3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                    delay: i * 0.08,
                  }}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>

      {/* Name and Status */}
      <div className="text-center">
        <h2 className="text-lg font-bold text-foreground font-display">{avatarName}</h2>
        <motion.div
          className="flex items-center justify-center gap-1.5 mt-1"
          key={phase}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <span className={`${
            phase === 'ai_speaking' ? 'text-primary' :
            phase === 'listening' ? 'text-emerald-400' :
            phase === 'processing' ? 'text-amber-400' :
            'text-muted-foreground'
          }`}>
            {getStatusIcon()}
          </span>
          <span className="text-sm text-muted-foreground">
            {getStatusText()}
          </span>
        </motion.div>
      </div>
    </div>
  );
}
