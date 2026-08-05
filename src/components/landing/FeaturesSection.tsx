import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Mic, 
  Brain,
  FileText,
  Headphones,
  BarChart3,
  TrendingUp
} from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: Mic,
    title: "AI Interview",
    description: "Practice realistic technical and HR interviews with an intelligent AI interviewer and receive instant feedback on communication, confidence, and technical accuracy.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Brain,
    title: "AI Quiz Generator",
    description: "Generate personalized quizzes instantly from any topic, job role, or uploaded PDF using AI.",
    color: "text-spark-coral",
    bg: "bg-spark-coral/10",
  },
  {
    icon: FileText,
    title: "Resume-Based Interview",
    description: "Upload your resume and let AI generate interview questions tailored to your skills, projects, and experience.",
    color: "text-spark-purple",
    bg: "bg-spark-purple/10",
  },
  {
    icon: Headphones,
    title: "Voice Interview",
    description: "Experience natural voice conversations with AI for realistic mock interview practice.",
    color: "text-spark-pink",
    bg: "bg-spark-pink/10",
  },
  {
    icon: BarChart3,
    title: "Performance Analytics",
    description: "Track scores, strengths, weaknesses, and personalized improvement recommendations after every interview.",
    color: "text-spark-green",
    bg: "bg-spark-green/10",
  },
  {
    icon: TrendingUp,
    title: "Progress Dashboard",
    description: "Monitor interview history, quiz performance, skill growth, and readiness over time.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5 },
  },
};

export function FeaturesSection() {
  return (
    <section className="py-16 sm:py-20 md:py-24 relative overflow-hidden px-4 sm:px-6">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] sm:w-[600px] md:w-[800px] h-[400px] sm:h-[600px] md:h-[800px] bg-primary/5 rounded-full blur-3xl -z-10" />

      <div className="container mx-auto px-2 sm:px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 sm:mb-12 md:mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-primary font-semibold text-xs sm:text-sm uppercase tracking-wider">
              Features
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-5xl font-display font-bold mt-3 sm:mt-4 mb-4 sm:mb-6">
              Everything You Need to{" "}
              <span className="text-gradient">Ace Your Next Interview</span>
            </h2>
            <p className="text-base sm:text-lg text-muted-foreground">
              Our AI-powered platform combines realistic mock interviews, AI quiz generation, 
              resume analysis, voice interaction, and detailed performance analytics to help 
              users become interview-ready.
            </p>
          </motion.div>
        </div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6"
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card variant="glass" className="card-hover h-full">
                <CardHeader className="p-4 sm:p-6">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-3 sm:mb-4`}>
                    <feature.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-lg sm:text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-sm sm:text-base">
                    {feature.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
