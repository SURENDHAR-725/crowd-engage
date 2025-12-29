import { motion } from "framer-motion";

const steps = [
  {
    number: "01",
    title: "Create a Session",
    description: "Sign up and create a new interactive session in seconds. Choose from polls, quizzes, or word clouds.",
    color: "from-primary to-spark-teal",
  },
  {
    number: "02",
    title: "Share the Code",
    description: "Get a unique session code to share with your audience. They can join instantly from any device.",
    color: "from-spark-teal to-spark-coral",
  },
  {
    number: "03",
    title: "Engage in Real-Time",
    description: "Watch responses flow in live. Display results on screen and keep your audience engaged.",
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
              No complicated setup. No downloads required. Just create, share, and engage.
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
      </div>
    </section>
  );
}
