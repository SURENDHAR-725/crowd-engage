/**
 * LiveTranscript Component
 * 
 * Scrolling transcript panel showing AI questions and user answers
 * in a clean timeline format (NOT chat bubbles).
 */

import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TranscriptEntry } from '@/hooks/useVoiceInterview';

interface LiveTranscriptProps {
  entries: TranscriptEntry[];
  currentAIText?: string;
  currentUserText?: string;
  interimText?: string;
  isAISpeaking?: boolean;
  isListening?: boolean;
}

export function LiveTranscript({
  entries,
  currentAIText = '',
  currentUserText = '',
  interimText = '',
  isAISpeaking = false,
  isListening = false,
}: LiveTranscriptProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, currentAIText, currentUserText, interimText]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div
      ref={scrollRef}
      className="voice-transcript-container flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-thin"
    >
      {/* Past entries */}
      <AnimatePresence mode="popLayout">
        {entries.map((entry) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex gap-3"
          >
            {/* Role indicator */}
            <div className={`flex-shrink-0 w-1 rounded-full ${
              entry.role === 'ai'
                ? 'bg-primary/60'
                : 'bg-emerald-400/60'
            }`} />
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className={`text-[11px] font-semibold uppercase tracking-wider ${
                  entry.role === 'ai' ? 'text-primary/70' : 'text-emerald-400/70'
                }`}>
                  {entry.role === 'ai' ? 'Alex (Interviewer)' : 'You'}
                </span>
                <span className="text-[10px] text-muted-foreground/40">
                  {formatTime(entry.timestamp)}
                </span>
              </div>
              <p className="text-sm text-foreground/85 leading-relaxed">
                {entry.text}
              </p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Live AI text (streaming) */}
      {isAISpeaking && currentAIText && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex gap-3"
        >
          <div className="flex-shrink-0 w-1 rounded-full bg-primary/60 animate-pulse" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-primary/70">
                Alex (Interviewer)
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-primary/50">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                Speaking
              </span>
            </div>
            <p className="text-sm text-foreground/85 leading-relaxed">
              {currentAIText}
              <motion.span
                className="inline-block w-0.5 h-4 bg-primary/60 ml-0.5 align-middle"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              />
            </p>
          </div>
        </motion.div>
      )}

      {/* Live user text (speech-to-text) */}
      {isListening && (currentUserText || interimText) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex gap-3"
        >
          <div className="flex-shrink-0 w-1 rounded-full bg-emerald-400/60 animate-pulse" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-400/70">
                You
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400/50">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                Listening
              </span>
            </div>
            <p className="text-sm text-foreground/85 leading-relaxed">
              {currentUserText}
              {interimText && (
                <span className="text-muted-foreground/50 italic"> {interimText}</span>
              )}
            </p>
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {entries.length === 0 && !currentAIText && !isAISpeaking && (
        <div className="flex items-center justify-center h-full text-muted-foreground/40 text-sm">
          Interview transcript will appear here...
        </div>
      )}
    </div>
  );
}
