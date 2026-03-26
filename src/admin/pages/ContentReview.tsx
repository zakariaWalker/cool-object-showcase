import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const ContentReview = () => {
  const [lessons, setLessons] = useState<any[]>([]);

  const load = () => {
    (supabase as any).from('lessons').select('id, title, lesson_type, is_published, curricula(title, profiles:teacher_id(full_name))')
      .eq('is_published', false)
      .order('created_at', { ascending: false })
      .then(({ data }: any) => setLessons(data || []));
  };

  useEffect(() => { load(); }, []);

  const publishLesson = async (id: string) => {
    await (supabase as any).from('lessons').update({ is_published: true }).eq('id', id);
    toast.success('تم نشر الدرس');
    load();
  };

  const deleteLesson = async (id: string) => {
    await (supabase as any).from('lessons').delete().eq('id', id);
    toast.success('تم حذف الدرس');
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-2">
        <ShieldCheck className="w-5 h-5 text-accent" />
        <p className="text-muted-foreground">محتوى بانتظار المراجعة والنشر</p>
      </div>
      {lessons.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center">
          <CheckCircle2 className="w-8 h-8 text-accent mx-auto mb-3" />
          <p className="text-muted-foreground">لا يوجد محتوى بانتظار المراجعة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lessons.map((l: any) => (
            <div key={l.id} className="bg-card rounded-2xl border border-border p-5 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{l.title}</p>
                <p className="text-xs text-muted-foreground">
                  {l.curricula?.title} · {l.curricula?.profiles?.full_name || 'معلم'}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => publishLesson(l.id)} className="text-xs bg-accent/10 text-accent px-3 py-1.5 rounded-lg hover:bg-accent/20">نشر</button>
                <button onClick={() => deleteLesson(l.id)} className="text-xs bg-destructive/10 text-destructive px-3 py-1.5 rounded-lg hover:bg-destructive/20">حذف</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ContentReview;
