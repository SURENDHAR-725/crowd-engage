import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Choose Your Practice Mode",
    description: "Select from AI mock interviews, quiz generation, resume-based questions, or voice interview — tailored to your preparation goals.",
    color: "from-primary to-spark-teal",
  },
  {
    number: "02",
    title: "Practice with AI",
    description: "Engage in realistic interview conversations, answer AI-generated questions, and receive real-time feedback on your responses.",
    color: "from-spark-teal to-spark-coral",
  },
  {
    number: "03",
    title: "Analyze & Improve",
    description: "Review detailed performance analytics, track your progress over time, and follow personalized improvement recommendations.",
    color: "from-spark-coral to-spark-purple",
  },
];

export function HowItWorksSection() {
  return (
    <section className="py-24 bg-muted/30">
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
              How It Works
            </span>
            <h2 className="text-3xl md:text-5xl font-display font-bold mt-4 mb-6">
              Get Started in{" "}
              <span className="text-gradient">3 Simple Steps</span>
            </h2>
            <p className="text-lg text-muted-foreground">
              No complicated setup. No downloads required. Just choose your mode, practice, and improve.
            </p>
          </motion.div>
        </div>

        {/* Steps */}
        <div className="max-w-4xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.2 }}
              className="relative flex items-center gap-8 mb-12 last:mb-0"
            >
              {/* Number */}
              <div className={`shrink-0 w-24 h-24 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-elevated`}>
                <span className="text-3xl font-display font-bold text-primary-foreground">
                  {step.number}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1">
                <h3 className="text-2xl font-display font-bold mb-2">
                  {step.title}
                </h3>
                <p className="text-muted-foreground text-lg">
                  {step.description}
                </p>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="absolute left-12 top-24 w-0.5 h-12 bg-gradient-to-b from-primary/50 to-transparent" />
              )}
            </motion.div>
          ))}
        </div>

        {/* Statistics Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-20 sm:mt-24"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 max-w-4xl mx-auto">
            {[
              { value: "500+", label: "AI Questions Generated" },
              { value: "200+", label: "Mock Interviews Completed" },
              { value: "90%", label: "AI Evaluation Accuracy" },
              { value: "15+", label: "Technical Domains" },
            ].map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="text-center p-4 sm:p-6 rounded-2xl bg-muted/50 border border-border/50 backdrop-blur-sm"
              >
                <div className="text-2xl sm:text-3xl md:text-4xl font-display font-bold text-gradient mb-1 sm:mb-2">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
