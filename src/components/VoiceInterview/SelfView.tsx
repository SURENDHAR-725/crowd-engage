/**
 * SelfView Component
 * 
 * Small picture-in-picture webcam view of the user,
 * positioned in the corner like a video call self-view.
 */

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VideoOff } from 'lucide-react';

interface SelfViewProps {
  isVisible: boolean;
}

export function SelfView({ isVisible }: SelfViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCamera, setHasCamera] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!isVisible) {
      // Stop camera when hidden
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      setHasCamera(false);
      return;
    }

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 320, height: 240, facingMode: 'user' },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setHasCamera(true);
      } catch {
        setHasCamera(false);
      }
    };

    startCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
    };
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ type: 'spring', damping: 20, stiffness: 300 }}
          className="fixed bottom-24 right-4 z-50 w-36 h-28 sm:w-44 sm:h-32 rounded-xl overflow-hidden border-2 border-border/40 shadow-xl bg-card/80"
        >
          {hasCamera ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
              style={{ transform: 'scaleX(-1)' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted/40">
              <VideoOff className="w-6 h-6 text-muted-foreground/50" />
            </div>
          )}
          
          {/* "You" label */}
          <div className="absolute bottom-1 left-1.5 px-1.5 py-0.5 bg-black/50 rounded text-[9px] text-white/80 font-medium">
            You
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
