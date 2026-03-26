import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const FeedbackPanel = () => {
  const [progress, setProgress] = useState<any[]>([]);

  useEffect(() => {
    (supabase as any)
      .from("student_progress")
      .select("id, xp, total_exercises, total_correct, level, updated_at")
      .order("updated_at", { ascending: false })
      .limit(10)
      .then(({ data }: any) => setProgress(data ?? []));
  }, []);

  const sendFeedback = (type: string) => {
    const labels: Record<string, string> = { good: "تم إرسال تعليق: أحسنت!", improve: "تم إرسال تعليق: يحتاج تحسين", note: "تم إرسال ملاحظة" };
    toast.success(labels[type] ?? "تم إرسال التغذية الراجعة");
  };

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">أرسل تغذية راجعة للطلاب بناءً على أدائهم</p>
      {progress.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <p className="text-muted-foreground">لا توجد بيانات طلاب لتقديم تغذية راجعة</p>
        </div>
      ) : (
        <div className="space-y-4">
          {progress.map((p: any) => {
            const pct = p.total_exercises > 0 ? Math.round((p.total_correct / p.total_exercises) * 100) : 0;
            return (
              <div key={p.id} className="bg-card rounded-2xl border border-border p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-sm">المستوى {p.level} — {p.total_correct}/{p.total_exercises} صحيحة</p>
                    <p className="text-xs text-muted-foreground">النتيجة: {pct}% · {p.xp} XP</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => sendFeedback("good")} className="bg-accent/10 text-accent text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-accent/20 transition-colors">أحسنت! 👏</button>
                    <button onClick={() => sendFeedback("improve")} className="bg-destructive/10 text-destructive text-xs px-3 py-1.5 rounded-lg font-medium hover:bg-destructive/20 transition-colors">تحسين ✍️</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FeedbackPanel;
