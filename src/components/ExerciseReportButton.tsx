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
          className="h-7 px-2.5 text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all gap-1.5 group border border-dashed border-muted-foreground/20 rounded-lg"
        >
          <Flag className="h-3.5 w-3.5 group-hover:fill-destructive/10" />
          <span className="text-[10px] font-black uppercase tracking-tight">إبلاغ عن خطأ</span>
        </Button>
      }
    />
  );
}
