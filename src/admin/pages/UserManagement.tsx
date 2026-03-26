import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const UserManagement = () => {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    ((supabase as any).from('profiles').select('id, full_name, created_at, user_roles(role)'))
      .order('created_at', { ascending: false })
      .then(({ data }: any) => setUsers(data || []));
  }, []);

  const roleLabel = (role: string) => {
    const map: Record<string, string> = { student: 'طالب', teacher: 'معلم', admin: 'مدير', parent: 'ولي أمر' };
    return map[role] || role;
  };

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">إدارة جميع الحسابات على المنصة</p>
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-right p-4 text-sm font-medium text-muted-foreground">الاسم</th>
              <th className="text-right p-4 text-sm font-medium text-muted-foreground">الدور</th>
              <th className="text-right p-4 text-sm font-medium text-muted-foreground">تاريخ التسجيل</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u: any, i: number) => (
              <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="p-4 text-sm font-medium">{u.full_name || 'بدون اسم'}</td>
                <td className="p-4">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {roleLabel(u.user_roles?.[0]?.role || 'student')}
                  </span>
                </td>
                <td className="p-4 text-sm text-muted-foreground">{new Date(u.created_at).toLocaleDateString('ar')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default UserManagement;
