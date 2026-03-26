import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const BadgesPage = () => {
  const { user } = useAuth();
  const [totalExercises, setTotalExercises] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("student_progress")
      .select("total_exercises")
      .eq("student_id", user.id)
      .then(({ data }) => {
        const total = (data || []).reduce((s, d) => s + (d.total_exercises || 0), 0);
        setTotalExercises(total);
      });
  }, [user]);

  const allBadges = [
    { emoji: "🏅", name: "متعلم نشط", desc: "أكمل أول تمرين", earned: totalExercises >= 1 },
    { emoji: "⭐", name: "نجم المنصة", desc: "أكمل 5 تمارين", earned: totalExercises >= 5 },
    { emoji: "🔥", name: "سلسلة حارقة", desc: "أكمل 10 تمارين", earned: totalExercises >= 10 },
    { emoji: "🎯", name: "القناص", desc: "أكمل 20 تمريناً", earned: totalExercises >= 20 },
    { emoji: "🏆", name: "بطل الرياضيات", desc: "أكمل 50 تمريناً", earned: totalExercises >= 50 },
    { emoji: "💎", name: "الماسي", desc: "أكمل 100 تمرين", earned: totalExercises >= 100 },
  ];

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">شاراتك وإنجازاتك — أكملت {totalExercises} تمريناً</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {allBadges.map((b) => (
          <div key={b.name} className={`bg-card rounded-2xl border p-6 text-center transition-opacity ${b.earned ? "border-primary/50" : "border-border opacity-50"}`}>
            <span className="text-5xl block mb-3">{b.emoji}</span>
            <p className="font-bold">{b.name}</p>
            <p className="text-xs text-muted-foreground mt-1">{b.desc}</p>
            {b.earned && <span className="inline-block mt-2 text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">مكتسبة ✓</span>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BadgesPage;
