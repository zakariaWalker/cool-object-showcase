import { useState, useEffect } from "react";
import StatCard from "@/shared/components/StatCard";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserCheck, BookOpen, BarChart3 } from "lucide-react";

const AdminHome = () => {
  const [stats, setStats] = useState({ users: 0, teachers: 0, curricula: 0, lessons: 0 });
  const [recentUsers, setRecentUsers] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const [{ count: uCount }, { count: tCount }, cRes, lRes, { data: recent }] = await Promise.all([
        (supabase as any).from('profiles').select('*', { count: 'exact', head: true }),
        (supabase as any).from('user_roles').select('*', { count: 'exact', head: true }).eq('role', 'teacher'),
        (supabase as any).from('curricula').select('*', { count: 'exact', head: true }).eq('is_published', true),
        (supabase as any).from('lessons').select('*', { count: 'exact', head: true }),
        (supabase as any).from('profiles').select('full_name, created_at, user_roles(role)').order('created_at', { ascending: false }).limit(5),
      ]);
      setStats({ users: uCount || 0, teachers: tCount || 0, curricula: cRes?.count || 0, lessons: lRes?.count || 0 });
      setRecentUsers(recent || []);
    };
    load();
  }, []);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="إجمالي المستخدمين" value={String(stats.users)} icon={<Users className="w-5 h-5 text-primary-foreground" />} colorClass="bg-accent" />
        <StatCard title="المعلمون" value={String(stats.teachers)} icon={<UserCheck className="w-5 h-5 text-primary-foreground" />} colorClass="bg-secondary" />
        <StatCard title="المناهج المنشورة" value={String(stats.curricula)} icon={<BookOpen className="w-5 h-5 text-primary-foreground" />} colorClass="bg-primary" />
        <StatCard title="الدروس" value={String(stats.lessons)} icon={<BarChart3 className="w-5 h-5 text-primary-foreground" />} colorClass="bg-accent" />
      </div>

      <div className="bg-card rounded-2xl border border-border p-6">
        <h2 className="font-bold mb-4">آخر التسجيلات</h2>
        {recentUsers.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا يوجد مستخدمون بعد</p>
        ) : (
          <div className="space-y-3">
            {recentUsers.map((u: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{u.full_name?.[0] || '?'}</div>
                  <div>
                    <p className="text-sm font-medium">{u.full_name || 'بدون اسم'}</p>
                    <p className="text-xs text-muted-foreground">{u.user_roles?.[0]?.role === 'teacher' ? 'معلم' : u.user_roles?.[0]?.role === 'admin' ? 'مدير' : u.user_roles?.[0]?.role === 'parent' ? 'ولي أمر' : 'طالب'}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString('ar')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminHome;
