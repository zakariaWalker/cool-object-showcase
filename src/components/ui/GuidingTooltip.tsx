import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Info, AlertCircle, Lightbulb, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type TooltipType = "info" | "tip" | "warning" | "logic";

interface GuidingTooltipProps {
  type?: TooltipType;
  title?: string;
  description: string;
  children: React.ReactNode;
  active?: boolean;
}

const TYPE_CONFIG = {
  info: {
    icon: <Info className="w-4 h-4" />,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    shadow: "shadow-blue-500/10",
  },
  tip: {
    icon: <Lightbulb className="w-4 h-4" />,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    shadow: "shadow-amber-500/10",
  },
  warning: {
    icon: <AlertCircle className="w-4 h-4" />,
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/20",
    shadow: "shadow-destructive/10",
  },
  logic: {
    icon: <HelpCircle className="w-4 h-4" />,
    color: "text-purple-500",
    bg: "bg-purple-500/10",
    border: "border-purple-500/20",
    shadow: "shadow-purple-500/10",
  },
};

export function GuidingTooltip({
  type = "info",
  title,
  description,
  children,
  active = true,
}: GuidingTooltipProps) {
  const [show, setShow] = React.useState(false);
  const config = TYPE_CONFIG[type];

  if (!active) return <>{children}</>;

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "absolute z-[100] bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-4 rounded-2xl border-2 backdrop-blur-md",
              config.bg,
              config.border,
              config.shadow,
              "shadow-2xl"
            )}
            style={{ direction: "rtl" }}
          >
            {/* Arrow */}
            <div 
              className={cn(
                "absolute top-full left-1/2 -translate-x-1/2 w-4 h-4 -mt-2 rotate-45 border-b-2 border-r-2",
                config.bg,
                config.border
              )}
            />

            <div className="relative space-y-2">
              <div className="flex items-center gap-2">
                <div className={cn("p-1.5 rounded-lg bg-background/80 shadow-sm", config.color)}>
                  {config.icon}
                </div>
                {title && (
                  <h4 className={cn("text-xs font-black", config.color)}>
                    {title}
                  </h4>
                )}
              </div>
              <p className="text-[11px] leading-relaxed font-medium text-foreground/80">
                {description}
              </p>
            </div>

            {/* Subtle Glow */}
            <div className={cn("absolute inset-0 rounded-2xl -z-10 blur-xl opacity-20", config.bg)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
