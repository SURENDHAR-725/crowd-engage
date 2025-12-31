import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import type { ChaosReaction } from "@/lib/database.types";

interface ChaosEffectsProps {
  enabled: boolean;
  onReaction?: (reaction: ChaosReaction) => void;
}

// Confetti explosion effect
const triggerConfetti = (intensity: number = 1) => {
  const count = Math.floor(200 * intensity);
  const defaults = {
    origin: { y: 0.7 },
    zIndex: 9999,
  };

  function fire(particleRatio: number, opts: confetti.Options) {
    confetti({
      ...defaults,
      ...opts,
      particleCount: Math.floor(count * particleRatio),
    });
  }

  fire(0.25, { spread: 26, startVelocity: 55 });
  fire(0.2, { spread: 60 });
  fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
  fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
  fire(0.1, { spread: 120, startVelocity: 45 });
};

// Fireworks effect
const triggerFireworks = (intensity: number = 1) => {
  const duration = 3000 * intensity;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  const interval: ReturnType<typeof setInterval> = setInterval(() => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    confetti({
      ...defaults,
      particleCount,
      origin: { x: Math.random(), y: Math.random() - 0.2 },
    });
  }, 250);
};

// Rainbow effect (falling colors)
const triggerRainbow = (intensity: number = 1) => {
  const colors = ['#ff0000', '#ff7f00', '#ffff00', '#00ff00', '#0000ff', '#4b0082', '#9400d3'];
  
  colors.forEach((color, index) => {
    setTimeout(() => {
      confetti({
        particleCount: Math.floor(30 * intensity),
        angle: 90,
        spread: 45,
        origin: { x: (index + 1) / 8, y: 0 },
        colors: [color],
        zIndex: 9999,
      });
    }, index * 100);
  });
};

export const ChaosEffects = ({ enabled, onReaction }: ChaosEffectsProps) => {
  const [currentEffect, setCurrentEffect] = useState<ChaosReaction | null>(null);
  const [shaking, setShaking] = useState(false);

  const triggerEffect = useCallback((reaction: ChaosReaction) => {
    if (!enabled) return;

    setCurrentEffect(reaction);
    onReaction?.(reaction);

    switch (reaction.type) {
      case 'confetti':
        triggerConfetti(reaction.intensity);
        break;
      case 'fireworks':
        triggerFireworks(reaction.intensity);
        break;
      case 'rainbow':
        triggerRainbow(reaction.intensity);
        break;
      case 'shake':
        setShaking(true);
        setTimeout(() => setShaking(false), 500 * reaction.intensity);
        break;
      case 'explosion':
        // Combine multiple effects for explosion
        triggerConfetti(reaction.intensity);
        setShaking(true);
        setTimeout(() => {
          setShaking(false);
          triggerFireworks(reaction.intensity * 0.5);
        }, 300);
        break;
    }

    // Clear effect after animation
    setTimeout(() => setCurrentEffect(null), 3000);
  }, [enabled, onReaction]);

  // Expose trigger function globally for external calls
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__triggerChaosEffect = triggerEffect;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__triggerChaosEffect;
      }
    };
  }, [triggerEffect]);

  if (!enabled) return null;

  return (
    <>
      {/* Screen shake wrapper */}
      <motion.div
        animate={shaking ? {
          x: [0, -10, 10, -10, 10, 0],
          y: [0, -5, 5, -5, 5, 0],
        } : {}}
        transition={{ duration: 0.5 }}
        className="fixed inset-0 pointer-events-none z-[9998]"
      />

      {/* Floating emojis for certain triggers */}
      <AnimatePresence>
        {currentEffect && (
          <FloatingEmojis type={currentEffect.trigger} />
        )}
      </AnimatePresence>
    </>
  );
};

// Floating emoji overlay
const FloatingEmojis = ({ type }: { type: ChaosReaction['trigger'] }) => {
  const emojiMap = {
    'milestone': ['🎉', '🎊', '🏆', '⭐'],
    'correct-answer': ['✅', '🎯', '💯', '🔥'],
    'streak': ['🔥', '⚡', '💪', '🚀'],
    'time-bonus': ['⏱️', '💨', '⚡', '🏃'],
    'manual': ['🎉', '👏', '🙌', '✨'],
  };

  const emojis = emojiMap[type] || emojiMap.manual;

  return (
    <div className="fixed inset-0 pointer-events-none z-[9997] overflow-hidden">
      {Array.from({ length: 20 }, (_, i) => (
        <motion.div
          key={i}
          initial={{
            x: Math.random() * window.innerWidth,
            y: window.innerHeight + 50,
            rotate: Math.random() * 360,
            scale: 0.5 + Math.random() * 0.5,
          }}
          animate={{
            y: -100,
            rotate: Math.random() * 720,
          }}
          exit={{ opacity: 0 }}
          transition={{
            duration: 2 + Math.random() * 2,
            delay: Math.random() * 0.5,
            ease: "easeOut",
          }}
          className="absolute text-4xl"
        >
          {emojis[Math.floor(Math.random() * emojis.length)]}
        </motion.div>
      ))}
    </div>
  );
};

// Chaos Mode Controls for host
interface ChaosControlsProps {
  onTrigger: (type: ChaosReaction['type']) => void;
}

export const ChaosControls = ({ onTrigger }: ChaosControlsProps) => {
  const effects: { type: ChaosReaction['type']; emoji: string; label: string }[] = [
    { type: 'confetti', emoji: '🎊', label: 'Confetti' },
    { type: 'fireworks', emoji: '🎆', label: 'Fireworks' },
    { type: 'rainbow', emoji: '🌈', label: 'Rainbow' },
    { type: 'shake', emoji: '📳', label: 'Shake' },
    { type: 'explosion', emoji: '💥', label: 'Explosion' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {effects.map((effect) => (
        <motion.button
          key={effect.type}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => onTrigger(effect.type)}
          className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-spark-coral/20 border border-primary/30 hover:border-primary transition-all"
        >
          <span className="text-2xl">{effect.emoji}</span>
          <p className="text-xs mt-1">{effect.label}</p>
        </motion.button>
      ))}
    </div>
  );
};

// Auto-trigger chaos effects based on events
export const useChaosMode = (enabled: boolean) => {
  const triggerEffect = useCallback((
    type: ChaosReaction['type'],
    trigger: ChaosReaction['trigger'],
    intensity: number = 1
  ) => {
    if (!enabled) return;

    const reaction: ChaosReaction = { type, trigger, intensity };
    
    if (typeof window !== 'undefined' && (window as any).__triggerChaosEffect) {
      (window as any).__triggerChaosEffect(reaction);
    }
  }, [enabled]);

  const onCorrectAnswer = useCallback(() => {
    triggerEffect('confetti', 'correct-answer', 0.7);
  }, [triggerEffect]);

  const onStreak = useCallback((streakCount: number) => {
    if (streakCount >= 5) {
      triggerEffect('explosion', 'streak', 1);
    } else if (streakCount >= 3) {
      triggerEffect('fireworks', 'streak', 0.8);
    }
  }, [triggerEffect]);

  const onMilestone = useCallback((milestone: string) => {
    triggerEffect('rainbow', 'milestone', 1);
  }, [triggerEffect]);

  const onTimeBonus = useCallback(() => {
    triggerEffect('confetti', 'time-bonus', 0.5);
  }, [triggerEffect]);

  return {
    triggerEffect,
    onCorrectAnswer,
    onStreak,
    onMilestone,
    onTimeBonus,
  };
};

export default ChaosEffects;
