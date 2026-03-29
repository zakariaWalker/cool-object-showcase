import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExerciseReportModal } from "./ExerciseReportModal";

interface ExerciseReportButtonProps {
  exerciseId: string;
}

export function ExerciseReportButton({ exerciseId }: ExerciseReportButtonProps) {
  return (
    <ExerciseReportModal 
      exerciseId={exerciseId} 
      trigger={
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-7 px-2 text-muted-foreground/50 hover:text-destructive hover:bg-destructive/5 transition-colors gap-1.5 group"
        >
          <Flag className="h-3 w-3 group-hover:fill-destructive/20" />
          <span className="text-[10px] font-black uppercase tracking-tight">إبلاغ</span>
        </Button>
      }
    />
  );
}
