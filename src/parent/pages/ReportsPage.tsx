import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const ReportsPage = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (supabase as any).from('parent_students').select('student_id, profiles:student_id(full_name)').eq('parent_id', user.id).then(async ({ data: kids }: any) => {
      if (!kids) return;
      const enriched = await Promise.all(kids.map(async (k: any) => {
        const { data: prog } = await (supabase as any).from('student_progress').select('xp, total_exercises, total_correct').eq('student_id', k.student_id);
        const totalEx = (prog || []).reduce((s: number, p: any) => s + (p.total_exercises || 0), 0);
        const totalCorrect = (prog || []).reduce((s: number, p: any) => s + (p.total_correct || 0), 0);
        const avgPct = totalEx > 0 ? Math.round((totalCorrect / totalEx) * 100) : 0;
        return { name: k.profiles?.full_name || 'طالب', total: totalEx, correct: totalCorrect, avg: avgPct };
      }));
      setChildren(enriched);
    });
  }, [user]);

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">تقارير شاملة عن أداء أبنائك</p>
      {children.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <p className="text-muted-foreground">لا توجد بيانات بعد</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {children.map((c, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-6">
              <h3 className="font-bold text-lg mb-4">{c.name}</h3>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">إجمالي التمارين</span><span className="font-bold">{c.total}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">الإجابات الصحيحة</span><span className="font-bold text-accent">{c.correct}</span></div>
                <div className="flex justify-between"><span className="text-sm text-muted-foreground">نسبة النجاح</span><span className={`font-bold ${c.avg >= 60 ? 'text-accent' : 'text-destructive'}`}>{c.avg}%</span></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportsPage;
