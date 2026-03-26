import { useState, useEffect } from "react";
import StatCard from "@/shared/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, CheckCircle2, Clock, GraduationCap } from "lucide-react";

const TeacherHome = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({ curricula: 0, lessons: 0, published: 0, draft: 0 });
  const [recentLessons, setRecentLessons] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ count: cCount }, { count: lCount }, { count: pubCount }, { data: recent }] = await Promise.all([
        (supabase as any).from("curricula").select("*", { count: "exact", head: true }).eq("teacher_id", user.id),
        (supabase as any).from("lessons").select("*", { count: "exact", head: true }),
        (supabase as any).from("lessons").select("*", { count: "exact", head: true }).eq("is_published", true),
        (supabase as any).from("lessons").select("title, created_at, is_published, curricula(title)").order("created_at", { ascending: false }).limit(5),
      ]);
      setStats({ curricula: cCount ?? 0, lessons: lCount ?? 0, published: pubCount ?? 0, draft: (lCount ?? 0) - (pubCount ?? 0) || 0 });
      setRecentLessons(recent ?? []);
    };
    load();
  }, [user]);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="المناهج" value={String(stats.curricula)} icon={<BookOpen className="w-5 h-5 text-primary-foreground" />} colorClass="bg-secondary" />
        <StatCard title="الدروس" value={String(stats.lessons)} icon={<GraduationCap className="w-5 h-5 text-primary-foreground" />} colorClass="bg-primary" />
        <StatCard title="منشور" value={String(stats.published)} icon={<CheckCircle2 className="w-5 h-5 text-primary-foreground" />} colorClass="bg-accent" />
        <StatCard title="مسودة" value={String(stats.draft)} icon={<Clock className="w-5 h-5 text-primary-foreground" />} colorClass="bg-muted" />
      </div>

      <div className="bg-card rounded-2xl border border-border p-6">
        <h2 className="font-bold mb-4">آخر الدروس</h2>
        {recentLessons.length === 0 ? (
          <p className="text-muted-foreground text-sm">لا توجد دروس بعد. ابدأ بإنشاء منهج جديد!</p>
        ) : (
          <div className="space-y-3">
            {recentLessons.map((l: any, i: number) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium">{l.title}</p>
                  <p className="text-xs text-muted-foreground">{l.curricula?.title}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${l.is_published ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"}`}>
                  {l.is_published ? "منشور" : "مسودة"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherHome;
