/**
 * LiveTranscript Component
 * 
 * Replaces the old scrolling transcript with a centered, live 
 * focal view, similar to ChatGPT Voice.
 */

import { motion, AnimatePresence } from 'framer-motion';
import type { VoiceInterviewPhase } from '@/hooks/useVoiceInterview';

interface LiveTranscriptProps {
  phase: VoiceInterviewPhase;
  visibleAIText: string;
  currentUserText: string;
  interimText: string;
}

export function LiveTranscript({
  phase,
  visibleAIText,
  currentUserText,
  interimText,
}: LiveTranscriptProps) {
  
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-hidden h-full">
      <AnimatePresence mode="wait">
        
        {/* AI Speaking State */}
        {phase === 'ai_speaking' && (
          <motion.div
            key="ai_speaking"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="text-center max-w-3xl w-full"
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Alex is speaking
              </span>
            </div>
            <p className="text-2xl sm:text-3xl lg:text-4xl font-display font-medium text-foreground/90 leading-tight">
              {visibleAIText || '...'}
              <motion.span
                className="inline-block w-1.5 h-6 sm:h-8 lg:h-10 bg-primary/60 ml-2 align-middle"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
            </p>
          </motion.div>
        )}

        {/* Listening State (User Speaking) */}
        {phase === 'listening' && (
          <motion.div
            key="listening"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="text-center max-w-3xl w-full"
          >
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Listening to you
              </span>
            </div>
            
            <p className="text-2xl sm:text-3xl lg:text-4xl font-display font-medium text-foreground/90 leading-tight">
              {currentUserText}
              {interimText && (
                <span className="text-muted-foreground/50 italic"> {interimText}</span>
              )}
              {!currentUserText && !interimText && (
                <span className="text-muted-foreground/30 italic">Start speaking...</span>
              )}
            </p>
          </motion.div>
        )}

        {/* Processing / Thinking State */}
        {(phase === 'processing' || phase === 'initializing') && (
          <motion.div
            key="processing"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="text-center max-w-3xl w-full flex flex-col items-center justify-center"
          >
            <div className="flex gap-2 mb-6">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-4 h-4 bg-primary/50 rounded-full"
                  animate={{
                    y: ['0%', '-50%', '0%'],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>
            <p className="text-xl font-display text-muted-foreground">
              {phase === 'initializing' ? 'Setting up...' : 'Thinking...'}
            </p>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
