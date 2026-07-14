import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface InterviewCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color?: string;
  bg?: string;
  type?: string;
  comingSoon?: boolean;
  onClick?: () => void;
}

export function InterviewCard({
  title,
  description,
  icon: Icon,
  color = "text-primary",
  bg = "bg-primary/10",
  type,
  comingSoon = false,
  onClick
}: InterviewCardProps) {
  return (
    <motion.div
      whileHover={{ y: comingSoon ? 0 : -4, scale: comingSoon ? 1 : 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="h-full border-border/50 flex flex-col justify-between overflow-hidden relative">
        {comingSoon && (
          <div className="absolute top-2 right-2 z-10">
            <Badge variant="secondary" className="bg-muted text-muted-foreground text-[10px]">
              Coming Soon
            </Badge>
          </div>
        )}
        
        <CardHeader className="p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            {type && (
              <Badge variant="outline" className="text-xs capitalize font-normal border-border">
                {type}
              </Badge>
            )}
          </div>
          <CardTitle className="text-base sm:text-lg font-display font-bold mt-2">{title}</CardTitle>
          <CardDescription className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2">
            {description}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-4 sm:p-5 pt-0 mt-auto">
          <Button
            className="w-full"
            variant={comingSoon ? "outline" : "gradient"}
            disabled={comingSoon}
            onClick={onClick}
            size="sm"
          >
            {comingSoon ? "Locked" : "Start Setup"}
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
