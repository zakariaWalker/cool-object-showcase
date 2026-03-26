import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const ActivityLog = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    (supabase as any).from('parent_students').select('student_id').eq('parent_id', user.id).then(async ({ data: kids }: any) => {
      if (!kids || kids.length === 0) return;
      const ids = kids.map((k: any) => k.student_id);
      const { data } = await supabase.from('student_activity_log')
        .select('action, xp_earned, created_at, metadata')
        .in('student_id', ids)
        .order('created_at', { ascending: false })
        .limit(20);
      setActivities(data || []);
    });
  }, [user]);

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">سجل جميع نشاطات أبنائك</p>
      {activities.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <p className="text-muted-foreground">لا توجد نشاطات مسجلة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((a: any, i: number) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <div>
                  <p className="text-sm font-medium">{a.action}</p>
                  <p className="text-xs text-muted-foreground">+{a.xp_earned} XP</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleDateString('ar')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActivityLog;
