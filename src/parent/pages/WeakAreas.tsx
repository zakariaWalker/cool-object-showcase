import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { CheckCircle2 } from "lucide-react";

const WeakAreas = () => {
  const { user } = useAuth();
  const [weakAreas, setWeakAreas] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (supabase as any).from('parent_students').select('student_id').eq('parent_id', user.id).then(async ({ data: kids }: any) => {
      if (!kids || kids.length === 0) return;
      const ids = kids.map((k: any) => k.student_id);
      const { data } = await (supabase as any).from('student_progress')
        .select('total_correct, total_exercises, mastery, student_id')
        .in('student_id', ids);
      
      const weak = (data || [])
        .filter((d: any) => d.total_exercises > 0 && (d.total_correct / d.total_exercises) < 0.6)
        .map((d: any) => ({
          student_id: d.student_id,
          pct: Math.round((d.total_correct / d.total_exercises) * 100),
          exercises: d.total_exercises,
        }));
      setWeakAreas(weak);
    });
  }, [user]);

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">المواضيع التي يحتاج أبناؤك لتحسينها (نتائج أقل من 60%)</p>
      {weakAreas.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <CheckCircle2 className="w-8 h-8 text-accent mx-auto mb-3" />
          <p className="text-muted-foreground">لا توجد نقاط ضعف مسجلة — أداء ممتاز!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {weakAreas.map((w: any, i: number) => (
            <div key={i} className="bg-destructive/5 rounded-2xl p-5 border border-destructive/20">
              <div className="flex justify-between items-center mb-1">
                <div>
                  <p className="font-medium text-sm">طالب: {w.student_id.slice(0, 8)}...</p>
                  <p className="text-xs text-muted-foreground">{w.exercises} تمارين</p>
                </div>
                <span className="text-lg font-bold text-destructive">{w.pct}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WeakAreas;
