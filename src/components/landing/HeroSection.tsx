import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16 px-4 sm:px-6">
      {/* Animated Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/4 left-1/4 w-48 sm:w-72 md:w-96 h-48 sm:h-72 md:h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-48 sm:w-72 md:w-96 h-48 sm:h-72 md:h-96 bg-spark-coral/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "2s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] sm:w-[450px] md:w-[600px] h-[300px] sm:h-[450px] md:h-[600px] bg-spark-teal/10 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: "4s" }} />
      </div>

      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 -z-10 opacity-[0.02]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="container mx-auto px-2 sm:px-4">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-primary/10 text-primary border border-primary/20 mb-6 sm:mb-8"
          >
            <Zap className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-xs sm:text-sm font-medium">Real-time audience engagement</span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-display font-bold leading-tight mb-4 sm:mb-6"
          >
            Make Your{" "}
            <span className="text-gradient">Presentations</span>
            <br />
            Come Alive
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 sm:mb-10"
          >
            Transform passive audiences into active participants with live polls, 
            quizzes, word clouds, and interactive games. Real-time results that 
            spark engagement.
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mb-12 sm:mb-16"
          >
            <Link to="/dashboard" className="w-full sm:w-auto">
              <Button variant="gradient" size="xl" className="group w-full sm:w-auto">
                Start for Free
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Button variant="glass" size="xl" className="group w-full sm:w-auto">
              <Play className="w-4 h-4 sm:w-5 sm:h-5" />
              Watch Demo
            </Button>
          </motion.div>

        </div>

        {/* Floating Elements */}
        <div className="absolute top-1/4 right-10 hidden lg:block animate-float">
          <div className="w-16 h-16 rounded-2xl bg-spark-coral/20 backdrop-blur-sm border border-spark-coral/30 flex items-center justify-center">
            <span className="text-2xl">📊</span>
          </div>
        </div>
        <div className="absolute bottom-1/3 left-10 hidden lg:block animate-float" style={{ animationDelay: "2s" }}>
          <div className="w-16 h-16 rounded-2xl bg-primary/20 backdrop-blur-sm border border-primary/30 flex items-center justify-center">
            <span className="text-2xl">🎯</span>
          </div>
        </div>
        <div className="absolute top-1/2 right-20 hidden lg:block animate-float" style={{ animationDelay: "4s" }}>
          <div className="w-12 h-12 rounded-xl bg-spark-teal/20 backdrop-blur-sm border border-spark-teal/30 flex items-center justify-center">
            <span className="text-xl">✨</span>
          </div>
        </div>
      </div>
    </section>
  );
}
