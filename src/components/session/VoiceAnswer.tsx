import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Mic, 
  MicOff, 
  Square, 
  Loader2, 
  CheckCircle2,
  Volume2,
  Activity
} from "lucide-react";

interface VoiceAnswerProps {
  question: string;
  onTranscription: (text: string, confidence: number) => void;
  hasSubmitted: boolean;
  transcribedText?: string;
}

export const VoiceAnswer = ({
  question,
  onTranscription,
  hasSubmitted,
  transcribedText,
}: VoiceAnswerProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);

  // Recording timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      setRecordingTime(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up audio analysis for visualization
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      // Visualize audio levels
      const updateAudioLevel = () => {
        if (!analyserRef.current) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average / 255);
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      updateAudioLevel();

      // Set up media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        // Stop visualization
        cancelAnimationFrame(animationFrameRef.current);
        setAudioLevel(0);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());

        // Process audio
        setIsProcessing(true);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        // Simulate transcription (in production, this would call a speech-to-text API)
        await simulateTranscription(audioBlob);
        setIsProcessing(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      setError('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Simulate transcription (replace with actual API call in production)
  const simulateTranscription = async (audioBlob: Blob) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // In production, you would send audioBlob to a speech-to-text service
    // For demo, we'll simulate a response
    const simulatedResponses = [
      "The answer is option B",
      "I think it's the second choice",
      "My answer is approximately 42",
      "The capital of France is Paris",
    ];
    
    const randomResponse = simulatedResponses[Math.floor(Math.random() * simulatedResponses.length)];
    const confidence = 0.85 + Math.random() * 0.15; // 85-100% confidence
    
    onTranscription(randomResponse, confidence);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Question */}
      <Card variant="elevated">
        <CardContent className="p-8 text-center">
          <Volume2 className="w-8 h-8 mx-auto mb-4 text-primary" />
          <h1 className="text-2xl md:text-3xl font-display font-bold">{question}</h1>
          <p className="text-muted-foreground mt-2">Speak your answer clearly</p>
        </CardContent>
      </Card>

      {/* Recording Interface */}
      <Card variant="glass">
        <CardContent className="p-8">
          <AnimatePresence mode="wait">
            {hasSubmitted ? (
              <motion.div
                key="submitted"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center"
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-spark-green/10 text-spark-green mb-4">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Answer Recorded!</span>
                </div>
                {transcribedText && (
                  <div className="mt-4 p-4 rounded-xl bg-muted">
                    <p className="text-sm text-muted-foreground mb-1">Your answer:</p>
                    <p className="font-medium text-lg">"{transcribedText}"</p>
                  </div>
                )}
              </motion.div>
            ) : isProcessing ? (
              <motion.div
                key="processing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-8"
              >
                <Loader2 className="w-12 h-12 mx-auto mb-4 text-primary animate-spin" />
                <p className="font-medium">Processing your answer...</p>
                <p className="text-sm text-muted-foreground">Converting speech to text</p>
              </motion.div>
            ) : (
              <motion.div
                key="recording"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center"
              >
                {/* Audio Visualization */}
                <div className="flex items-center justify-center gap-1 h-24 mb-6">
                  {Array.from({ length: 20 }, (_, i) => (
                    <motion.div
                      key={i}
                      animate={{
                        height: isRecording
                          ? `${20 + audioLevel * 60 + Math.sin(Date.now() / 100 + i) * 10}%`
                          : "20%",
                      }}
                      transition={{ duration: 0.1 }}
                      className={`w-2 rounded-full ${
                        isRecording ? "bg-primary" : "bg-muted"
                      }`}
                    />
                  ))}
                </div>

                {/* Recording Time */}
                {isRecording && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mb-4"
                  >
                    <span className="text-2xl font-mono font-bold text-primary">
                      {formatTime(recordingTime)}
                    </span>
                  </motion.div>
                )}

                {/* Record Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                    isRecording
                      ? "bg-spark-coral text-white"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {isRecording ? (
                    <Square className="w-8 h-8" />
                  ) : (
                    <Mic className="w-8 h-8" />
                  )}
                </motion.button>

                <p className="mt-4 text-sm text-muted-foreground">
                  {isRecording
                    ? "Tap to stop recording"
                    : "Tap to start recording"}
                </p>

                {/* Error Message */}
                {error && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 text-sm text-spark-coral"
                  >
                    {error}
                  </motion.p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Instructions */}
      {!hasSubmitted && !isRecording && !isProcessing && (
        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>💡 Speak clearly and at a normal pace</p>
          <p>🎤 Make sure you're in a quiet environment</p>
          <p>⏱️ You have up to 60 seconds to record</p>
        </div>
      )}
    </div>
  );
};

export default VoiceAnswer;
