import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const PlatformAnalytics = () => {
  const [stats, setStats] = useState({ totalProgress: 0, avgXp: 0, totalStudents: 0 });

  useEffect(() => {
    supabase.from('student_progress').select('xp, total_exercises, total_correct').then(({ data }) => {
      if (!data) return;
      const avgXp = data.length > 0 ? Math.round(data.reduce((s, d) => s + (d.xp || 0), 0) / data.length) : 0;
      setStats({ totalProgress: data.length, avgXp, totalStudents: data.length });
    });
  }, []);

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">تحليلات المنصة والاستخدام</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border border-border p-6 text-center">
          <p className="text-3xl font-black text-primary">{stats.totalProgress}</p>
          <p className="text-sm text-muted-foreground">إجمالي سجلات التقدم</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-6 text-center">
          <p className="text-3xl font-black text-accent">{stats.avgXp}</p>
          <p className="text-sm text-muted-foreground">متوسط نقاط الخبرة</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-6 text-center">
          <p className="text-3xl font-black text-secondary-foreground">{stats.totalStudents}</p>
          <p className="text-sm text-muted-foreground">طلاب نشطون</p>
        </div>
      </div>
    </div>
  );
};

export default PlatformAnalytics;
