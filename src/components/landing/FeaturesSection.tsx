import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart3, 
  MessageSquare, 
  Timer, 
  Gamepad2, 
  Users, 
  Mic, 
  Brain,
  Sparkles
} from "lucide-react";
import { motion } from "framer-motion";

const features = [
  {
    icon: BarChart3,
    title: "Live Polls",
    description: "Create MCQ, Yes/No, or rating polls with instant real-time results visualization.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Timer,
    title: "Live Quizzes",
    description: "Engage with timed quizzes featuring live scoreboards and competitive rankings.",
    color: "text-spark-coral",
    bg: "bg-spark-coral/10",
  },
  {
    icon: Users,
    title: "Anonymous Mode",
    description: "Enable anonymous participation for honest feedback without any barriers.",
    color: "text-spark-purple",
    bg: "bg-spark-purple/10",
  },
  {
    icon: Gamepad2,
    title: "Mini Games",
    description: "Keep audiences engaged with fun interactive games between sessions.",
    color: "text-spark-pink",
    bg: "bg-spark-pink/10",
  },
  {
    icon: Mic,
    title: "Voice Answers",
    description: "Allow participants to respond using voice input for hands-free engagement.",
    color: "text-spark-green",
    bg: "bg-spark-green/10",
  },
  {
    icon: Brain,
    title: "AI Insights",
    description: "Get AI-powered session summaries and audience sentiment analysis.",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Sparkles,
    title: "Chaos Mode",
    description: "Unleash animated visual effects and reactions for maximum excitement.",
    color: "text-spark-coral",
    bg: "bg-spark-coral/10",
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
    <section className="py-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl -z-10" />

      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">
              Features
            </span>
            <h2 className="text-3xl md:text-5xl font-display font-bold mt-4 mb-6">
              Everything You Need to{" "}
              <span className="text-gradient">Engage</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              From simple polls to AI-powered insights, CrowdSpark has all the tools 
              to transform your presentations into interactive experiences.
            </p>
          </motion.div>
        </div>

        {/* Features Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div key={index} variants={itemVariants}>
              <Card variant="glass" className="card-hover h-full">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4`}>
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                  <CardDescription className="text-base">
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
