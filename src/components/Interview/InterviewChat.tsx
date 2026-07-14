import { useRef, useEffect } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Bot, User, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { type ChatMessage } from "@/services/aiInterviewService";

interface InterviewChatProps {
  messages: ChatMessage[];
  isGenerating: boolean;
}

export function InterviewChat({ messages, isGenerating }: InterviewChatProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  // Parse evaluation system logs
  const parseEvaluation = (content: string) => {
    try {
      const match = content.match(/\[Evaluation: Score (\d+)\/10\. Feedback: ([\s\S]*)\]/);
      if (match) {
        return {
          score: match[1],
          feedback: match[2]
        };
      }
    } catch (e) {
      console.warn("Failed to parse log evaluation content:", e);
    }
    return null;
  };

  return (
    <Card className="border-border/50 h-[450px] flex flex-col bg-card/30 backdrop-blur-md overflow-hidden shadow-inner">
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg, index) => {
            if (msg.role === 'system') {
              const parsedEval = parseEvaluation(msg.content);
              if (!parsedEval) return null;
              
              // Render real-time feedback from LLM under user answer
              return (
                <motion.div
                  key={`eval-${index}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start pl-12"
                >
                  <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 p-3.5 rounded-2xl max-w-lg text-xs space-y-1.5 flex gap-2.5 items-start">
                    <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold flex items-center gap-1.5">
                        Real-time AI Feedback
                        <span className="bg-emerald-500/20 px-2 py-0.5 rounded-full text-[10px]">
                          {parsedEval.score}/10
                        </span>
                      </p>
                      <p className="mt-1 leading-relaxed">{parsedEval.feedback}</p>
                    </div>
                  </div>
                </motion.div>
              );
            }

            const isRecruiter = msg.role === 'assistant';

            return (
              <motion.div
                key={`msg-${index}`}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-3 ${isRecruiter ? 'justify-start' : 'justify-end'}`}
              >
                {isRecruiter && (
                  <Avatar className="w-9 h-9 border border-primary/20 shrink-0 bg-primary/10">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <Bot className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={`max-w-[75%] p-3.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
                    isRecruiter
                      ? 'bg-muted/70 text-foreground rounded-tl-sm'
                      : 'btn-gradient text-primary-foreground rounded-tr-sm font-medium'
                  }`}
                >
                  {isRecruiter && (
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary mb-1">
                      <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                      Interviewer
                    </div>
                  )}
                  {msg.content}
                </div>

                {!isRecruiter && (
                  <Avatar className="w-9 h-9 border border-spark-teal/20 shrink-0 bg-spark-teal/10">
                    <AvatarFallback className="bg-spark-teal/10 text-spark-teal">
                      <User className="w-4 h-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </motion.div>
            );
          })}

          {isGenerating && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-3 justify-start"
            >
              <Avatar className="w-9 h-9 border border-primary/20 shrink-0 bg-primary/10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  <Bot className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted/70 text-foreground rounded-2xl rounded-tl-sm p-4 text-sm max-w-[70%] shadow-sm">
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/60 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/60 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-foreground/60 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={chatEndRef} />
      </CardContent>
    </Card>
  );
}
