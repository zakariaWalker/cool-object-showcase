import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ShieldCheck, Link2 } from "lucide-react";
import { toast } from "sonner";

const LinkStudent = () => {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || code.length !== 6) return;
    setLoading(true);

    try {
      const { data: codeData, error: codeError } = await (supabase as any)
        .from('student_join_codes')
        .select('student_id')
        .eq('code', code)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (codeError || !codeData) {
        toast.error("الرمز غير صالح أو منتهي الصلاحية");
        setLoading(false);
        return;
      }

      const { error: linkError } = await (supabase as any)
        .from('parent_students')
        .insert({
          parent_id: user.id,
          student_id: codeData.student_id
        });

      if (linkError) {
        if (linkError.code === '23505') { toast.error("هذا الطالب مرتبط بالفعل بحسابك"); }
        else { toast.error("فشل في عملية الربط: " + linkError.message); }
        setLoading(false);
        return;
      }

      await (supabase as any).from('student_join_codes').delete().eq('code', code);
      toast.success("تم ربط الطالب بنجاح! 🎉");
      setCode("");
      setTimeout(() => window.location.href = '/parent', 1500);
    } catch (err) { toast.error("حدث خطأ غير متوقع"); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="bg-card rounded-2xl border border-border p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-6">
          <ShieldCheck className="w-8 h-8 text-accent" />
        </div>
        <h2 className="text-xl font-bold mb-2">ربط حساب طالب جديد</h2>
        <p className="text-muted-foreground text-sm mb-10 leading-relaxed">أدخل الرمز المكون من 6 أرقام الذي يظهر في لوحة تحكم الطالب.</p>
        <form onSubmit={handleLink} className="space-y-6">
          <input type="text" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" className="w-full text-center text-3xl font-black tracking-[0.4em] py-5 rounded-2xl border-2 border-border bg-background focus:border-primary focus:ring-0 transition-all placeholder:text-muted/30" required autoFocus />
          <button type="submit" disabled={loading || code.length !== 6} className="w-full bg-primary text-primary-foreground py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50">
            {loading ? <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" /> : <><Link2 className="w-5 h-5" /> تأكيد الربط </>}
          </button>
        </form>
      </div>
      <div className="bg-muted/50 rounded-2xl p-6 border border-border">
        <h3 className="font-bold text-sm mb-3">كيف أحصل على الرمز؟</h3>
        <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside pr-2">
          <li>يجب على الطالب تسجيل الدخول إلى حسابه.</li>
          <li>الانتقال إلى صفحة "ربط ولي الأمر".</li>
          <li>الضغط على زر "إنشاء رمز جديد".</li>
          <li>قم بنسخ الرمز وإدخاله هنا.</li>
        </ol>
      </div>
    </div>
  );
};

export default LinkStudent;
