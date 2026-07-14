/**
 * VoiceInterview Page
 * 
 * Full-screen immersive voice interview experience
 * styled like Google Meet / Microsoft Teams.
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle, ArrowLeft, CheckCircle2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useVoiceInterview } from '@/hooks/useVoiceInterview';
import { AIAvatar } from '@/components/VoiceInterview/AIAvatar';
import { VoiceWaveform } from '@/components/VoiceInterview/VoiceWaveform';
import { LiveTranscript } from '@/components/VoiceInterview/LiveTranscript';
import { InterviewControls } from '@/components/VoiceInterview/InterviewControls';
import { StatusPanel } from '@/components/VoiceInterview/StatusPanel';
import { SelfView } from '@/components/VoiceInterview/SelfView';

const VoiceInterview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isCameraOn, setIsCameraOn] = useState(false);
  const experienceLevel = searchParams.get('experience') || '1-3 Years';

  const {
    phase,
    session,
    transcript,
    currentAIText,
    currentUserText,
    interimText,
    questionCount,
    elapsedSeconds,
    isMuted,
    error,
    communicationMetrics,
    initialize,
    endInterview,
    toggleMute,
  } = useVoiceInterview();

  // Initialize on mount
  useEffect(() => {
    if (id) {
      initialize(id, experienceLevel);
    }
  }, [id]);

  // Redirect on completion
  useEffect(() => {
    if (phase === 'completed' && id) {
      const timer = setTimeout(() => {
        navigate(`/interview/report/${id}`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [phase, id, navigate]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      toggleMute();
    } else if (e.key === 'c' || e.key === 'C') {
      e.preventDefault();
      setIsCameraOn(prev => !prev);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (phase !== 'completed' && phase !== 'initializing') {
        if (confirm('Are you sure you want to end the interview?')) {
          endInterview();
        }
      }
    }
  }, [toggleMute, endInterview, phase]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleEndInterview = () => {
    if (confirm('Are you sure you want to end this interview? Your report will be generated from completed answers.')) {
      endInterview();
    }
  };

  // ─── Loading State ─────────────────────────────────────────────────────

  if (phase === 'initializing') {
    return (
      <div className="voice-interview-bg min-h-screen flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-5 text-center max-w-sm"
        >
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground font-display">Setting Up Your Interview</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Preparing AI interviewer and requesting microphone access...
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Error State ───────────────────────────────────────────────────────

  if (phase === 'error') {
    return (
      <div className="voice-interview-bg min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-md border-border/50 bg-card/60 backdrop-blur-sm">
          <CardContent className="p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="font-display font-bold text-lg">Unable to Start Interview</h2>
            <p className="text-sm text-muted-foreground">
              {error || 'An unexpected error occurred. Please check your microphone permissions and try again.'}
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <Button variant="outline" onClick={() => navigate('/interview')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>
              <Button onClick={() => id && initialize(id)}>Try Again</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Completed State ───────────────────────────────────────────────────

  if (phase === 'completed') {
    return (
      <div className="voice-interview-bg min-h-screen flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center max-w-md text-center gap-5"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-emerald-500 animate-pulse" />
          </div>
          <div>
            <h2 className="font-display font-bold text-xl text-foreground">Interview Complete!</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Generating your detailed performance report...
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 px-4 py-2 rounded-xl border border-border animate-pulse">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            Redirecting to your report...
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Active Interview ──────────────────────────────────────────────────

  return (
    <div className="voice-interview-bg min-h-screen flex flex-col">
      {/* Main content area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        
        {/* Left / Main Area */}
        <div className="flex-1 flex flex-col min-h-0">
          
          {/* Top: AI Avatar + Waveform */}
          <div className="flex-shrink-0 flex flex-col items-center justify-center py-6 sm:py-10 px-4">
            <AIAvatar phase={phase} />
            
            <div className="w-full max-w-md mt-6">
              <VoiceWaveform
                isActive={phase === 'ai_speaking'}
                variant="ai"
              />
            </div>

            {/* User waveform when listening */}
            {phase === 'listening' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="w-full max-w-md mt-3"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-[11px] text-emerald-400/70 font-medium uppercase tracking-wider">
                    Your microphone
                  </span>
                </div>
                <VoiceWaveform
                  isActive={phase === 'listening' && !isMuted}
                  variant="user"
                />
              </motion.div>
            )}
          </div>

          {/* Bottom: Live Transcript */}
          <div className="flex-1 min-h-0 border-t border-border/20 bg-background/30 backdrop-blur-sm">
            <LiveTranscript
              entries={transcript}
              currentAIText={currentAIText}
              currentUserText={currentUserText}
              interimText={interimText}
              isAISpeaking={phase === 'ai_speaking'}
              isListening={phase === 'listening'}
            />
          </div>
        </div>

        {/* Right Sidebar: Status Panel */}
        <div className="hidden lg:block w-72 border-l border-border/20 bg-background/20 backdrop-blur-sm p-4 overflow-y-auto">
          <StatusPanel
            phase={phase}
            elapsedSeconds={elapsedSeconds}
            questionCount={questionCount}
            totalQuestions={5}
            metrics={communicationMetrics}
          />
        </div>
      </div>

      {/* Bottom: Controls Bar */}
      <div className="flex-shrink-0 border-t border-border/20 bg-background/40 backdrop-blur-lg">
        <InterviewControls
          phase={phase}
          isMuted={isMuted}
          isCameraOn={isCameraOn}
          onToggleMute={toggleMute}
          onToggleCamera={() => setIsCameraOn(prev => !prev)}
          onEndInterview={handleEndInterview}
        />
      </div>

      {/* Self View (PIP) */}
      <SelfView isVisible={isCameraOn} />
    </div>
  );
};

export default VoiceInterview;
