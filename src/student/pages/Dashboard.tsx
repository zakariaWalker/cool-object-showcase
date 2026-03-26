import { useState, useEffect } from "react";
import StatCard from "@/shared/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Trophy, CheckCircle2, Clock, BarChart3, Star } from "lucide-react";

const StudentDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ totalExercises: 0, totalCorrect: 0, xp: 0, level: 1 });

  useEffect(() => {
    if (!user) return;
    (supabase as any)
      .from("student_progress")
      .select("total_exercises, total_correct, xp, level")
      .eq("student_id", user.id)
      .then(({ data }: any) => {
        if (!data || data.length === 0) return;
        const d = data[0];
        setStats({
          totalExercises: d.total_exercises || 0,
          totalCorrect: d.total_correct || 0,
          xp: d.xp || 0,
          level: d.level || 1,
        });
      });
  }, [user]);

  const pct = stats.totalExercises > 0 ? Math.round((stats.totalCorrect / stats.totalExercises) * 100) : 0;

  const badges = [
    { emoji: "🏅", name: "متعلم نشط", desc: "أكمل أول تمرين", earned: stats.totalExercises >= 1 },
    { emoji: "⭐", name: "نجم المنصة", desc: "أكمل 5 تمارين", earned: stats.totalExercises >= 5 },
    { emoji: "🔥", name: "سلسلة حارقة", desc: "أكمل 10 تمارين", earned: stats.totalExercises >= 10 },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="تمارين مكتملة" value={String(stats.totalExercises)} icon={<CheckCircle2 className="w-5 h-5 text-primary-foreground" />} colorClass="bg-accent" />
        <StatCard title="إجابات صحيحة" value={String(stats.totalCorrect)} icon={<Clock className="w-5 h-5 text-primary-foreground" />} colorClass="bg-primary" />
        <StatCard title="نسبة النجاح" value={`${pct}%`} icon={<Star className="w-5 h-5 text-primary-foreground" />} colorClass="bg-accent" />
        <StatCard title="نقاط الخبرة" value={String(stats.xp)} icon={<BarChart3 className="w-5 h-5 text-primary-foreground" />} colorClass="bg-secondary" />
      </div>

      <div className="bg-card rounded-2xl border border-border p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Trophy className="w-5 h-5 text-primary" />
          شاراتك
        </h2>
        <div className="grid sm:grid-cols-3 gap-4">
          {badges.map((b) => (
            <div key={b.name} className={`bg-muted/50 rounded-xl p-4 flex items-center gap-3 transition-opacity ${!b.earned ? "opacity-40" : ""}`}>
              <span className="text-3xl">{b.emoji}</span>
              <div>
                <p className="font-bold text-sm">{b.name}</p>
                <p className="text-xs text-muted-foreground">{b.desc}</p>
                {b.earned && <span className="text-xs text-accent">مكتسبة ✓</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
