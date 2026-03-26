import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const ClassMonitor = () => {
  const [progress, setProgress] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (supabase as any)
      .from("student_progress")
      .select("xp, total_exercises, total_correct, level, updated_at, student_id")
      .order("updated_at", { ascending: false })
      .limit(20)
      .then(({ data }: any) => {
        setProgress(data ?? []);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <div key={i} className="h-14 bg-muted/50 rounded-xl animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">تابع أداء الطلاب في المناهج والاختبارات</p>
      {progress.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <p className="text-muted-foreground">لا توجد بيانات تقدم بعد</p>
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">الطالب</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">المستوى</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">التمارين</th>
                <th className="text-right p-4 text-sm font-medium text-muted-foreground">النتيجة</th>
              </tr>
            </thead>
            <tbody>
              {progress.map((p: any, i: number) => {
                const pct = p.total_exercises > 0 ? Math.round((p.total_correct / p.total_exercises) * 100) : 0;
                return (
                  <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="p-4 text-sm">{p.student_id?.slice(0, 8)}...</td>
                    <td className="p-4 text-sm font-bold">{p.level}</td>
                    <td className="p-4 text-sm">{p.total_correct}/{p.total_exercises}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${pct >= 60 ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"}`}>{pct}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ClassMonitor;
