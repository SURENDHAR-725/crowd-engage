import { Button } from "@/components/ui/button";
import { ArrowRight, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export function CTASection() {
  return (
    <section className="py-24 relative overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="relative max-w-4xl mx-auto"
        >
          {/* Card */}
          <div className="relative rounded-3xl overflow-hidden">
            {/* Gradient Background */}
            <div className="absolute inset-0 btn-gradient opacity-90" />
            
            {/* Pattern overlay */}
            <div 
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23fff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />

            {/* Content */}
            <div className="relative z-10 p-12 md:p-16 text-center text-primary-foreground">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/20 backdrop-blur-sm mb-6">
                <Zap className="w-4 h-4" />
                <span className="text-sm font-medium">Ready to spark engagement?</span>
              </div>

              <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">
                Start Engaging Your
                <br />
                Audience Today
              </h2>

              <p className="text-lg md:text-xl opacity-90 max-w-2xl mx-auto mb-10">
                Join thousands of presenters, educators, and event hosts who are 
                transforming their sessions with CrowdSpark.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/dashboard">
                  <Button 
                    size="xl" 
                    className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 shadow-elevated"
                  >
                    Create Free Account
                    <ArrowRight className="w-5 h-5" />
                  </Button>
                </Link>
                <Link to="/join">
                  <Button 
                    size="xl" 
                    variant="outline"
                    className="border-2 border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
                  >
                    Join a Session
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Floating decorations */}
          <div className="absolute -top-8 -left-8 w-24 h-24 rounded-full bg-spark-yellow/30 blur-2xl" />
          <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-spark-purple/30 blur-2xl" />
        </motion.div>
      </div>
    </section>
  );
}
