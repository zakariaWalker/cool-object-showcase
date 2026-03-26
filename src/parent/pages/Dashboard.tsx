import { useState, useEffect, useCallback } from "react";
import StatCard from "@/shared/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Activity, AlertTriangle, GraduationCap, Clock, TrendingUp, CheckCircle2, UserPlus } from "lucide-react";

const ParentHome = () => {
  const { user } = useAuth();
  const [children, setChildren] = useState<any[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [progress, setProgress] = useState<any[]>([]);

  const loadChildren = useCallback(() => {
    if (!user) return;
    (supabase as any).from('parent_students').select('student_id, profiles:student_id(full_name)').eq('parent_id', user.id)
      .then(({ data }: any) => {
        setChildren(data || []);
        if (data && data.length > 0 && !selectedChild) setSelectedChild(data[0].student_id);
      });
  }, [user, selectedChild]);

  useEffect(() => { loadChildren(); }, [loadChildren]);

  useEffect(() => {
    if (!selectedChild) return;
    (supabase as any).from('student_progress').select('xp, total_exercises, total_correct, level, updated_at')
      .eq('student_id', selectedChild)
      .order('updated_at', { ascending: false })
      .limit(10)
      .then(({ data }) => setProgress(data || []));
  }, [selectedChild]);

  const totalXp = progress.reduce((s, p) => s + (p.xp || 0), 0);
  const totalExercises = progress.reduce((s, p) => s + (p.total_exercises || 0), 0);

  if (children.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border p-8 text-center max-w-lg mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="w-8 h-8 text-destructive" />
        </div>
        <p className="text-lg font-bold mb-2">لم يتم ربط أي طلاب بعد</p>
        <p className="text-sm text-muted-foreground mb-8 leading-relaxed">
          للبدء بمتابعة تقدم أبنائك، يرجى طلب "رمز الربط" من حساب الطالب وإدخاله هنا.
        </p>
        <button
          onClick={() => window.location.href = '/parent/link'}
          className="bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold flex items-center gap-2 mx-auto"
        >
          <UserPlus className="w-5 h-5" />
          ربط حساب طالب جديد
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="bg-card rounded-2xl border border-border p-4 flex items-center gap-4 overflow-x-auto">
        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">الأبناء:</span>
        {children.map((c: any) => (
          <button
            key={c.student_id}
            onClick={() => setSelectedChild(c.student_id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              selectedChild === c.student_id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {c.profiles?.full_name || 'طالب'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="نقاط الخبرة" value={String(totalXp)} icon={<TrendingUp className="w-5 h-5 text-primary-foreground" />} colorClass="bg-accent" />
        <StatCard title="تمارين مكتملة" value={String(totalExercises)} icon={<CheckCircle2 className="w-5 h-5 text-primary-foreground" />} colorClass="bg-primary" />
        <StatCard title="سجلات التقدم" value={String(progress.length)} icon={<Clock className="w-5 h-5 text-primary-foreground" />} colorClass="bg-secondary" />
        <StatCard title="الأبناء" value={String(children.length)} icon={<GraduationCap className="w-5 h-5 text-primary-foreground" />} colorClass="bg-accent" />
      </div>

      {progress.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-6">
          <h2 className="font-bold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" /> آخر التقدم
          </h2>
          <div className="space-y-3">
            {progress.map((p: any, i: number) => (
              <div key={i} className="flex items-start justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full mt-1.5 bg-primary" />
                  <p className="text-sm">المستوى {p.level} — {p.total_correct}/{p.total_exercises} تمارين صحيحة — {p.xp} XP</p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap mr-4">{new Date(p.updated_at).toLocaleDateString('ar')}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ParentHome;
