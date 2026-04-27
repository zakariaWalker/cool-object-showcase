import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { QEDLogo } from "@/components/QEDLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { CountryGradePicker } from "@/components/CountryGradePicker";
import { migrateAnonymousDataIfNeeded } from "@/lib/migrateAnonymousData";

const ROLES = [
  { id: "student", label: "تلميذ", emoji: "🎓", desc: "أحل التمارين وأتعلم" },
  { id: "teacher", label: "أستاذ", emoji: "👨‍🏫", desc: "أتابع تلاميذي" },
  { id: "parent", label: "ولي أمر", emoji: "👨‍👧", desc: "أتابع ابني/ابنتي" },
];

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("student");
  const [countryCode, setCountryCode] = useState("DZ");
  const [gradeCode, setGradeCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1); // signup steps

  const queryParams = new URLSearchParams(window.location.search);
  const redirectPath = queryParams.get("redirect") || "/home";

  // Redirect if already logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate(redirectPath);
    });
  }, [navigate, redirectPath]);

  const handleLogin = async () => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "خطأ في الدخول", description: error.message, variant: "destructive" });
    } else {
      // Claim the anonymous diagnostic/gap trail (if any) for this account
      if (data.user) {
        const result = await migrateAnonymousDataIfNeeded(data.user.id);
        if (result?.ok && !result.skipped && (result.gaps_moved || result.attempts_moved)) {
          toast({
            title: "✅ تم استرجاع تقدّمك السابق",
            description: `${result.attempts_moved || 0} محاولة و ${result.gaps_moved || 0} ثغرة محفوظة`,
          });
        }
      }
      navigate(redirectPath);
    }
  };

  const handleSignup = async () => {
    if (!fullName.trim()) {
      toast({ title: "أدخل اسمك الكامل", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role, country_code: countryCode, grade_code: gradeCode },
        emailRedirectTo: window.location.origin,
      },
    });
    // Best-effort: persist country/grade on the profile right away (handle_new_user trigger created the row)
    if (!error && data.user && countryCode && gradeCode) {
      await (supabase as any)
        .from("profiles")
        .update({ country_code: countryCode, grade_code: gradeCode })
        .eq("id", data.user.id);
    }
    setLoading(false);
    if (error) {
      toast({ title: "خطأ في التسجيل", description: error.message, variant: "destructive" });
    } else {
      // If email confirmation is off, we already have a session — claim anon trail now.
      if (data.session && data.user) {
        await migrateAnonymousDataIfNeeded(data.user.id);
      }
      toast({ title: "تم التسجيل! تحقق من بريدك الإلكتروني لتفعيل حسابك.", description: "ستصلك رسالة تأكيد." });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        {/* Back to landing nav */}
        <div className="flex items-center justify-center mb-6">
          <Link
            to="/"
            className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            رجوع للرئيسية
          </Link>
        </div>

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <QEDLogo size="xl" />
        </div>

        <div className="bg-card rounded-2xl shadow-xl border border-border p-8">
          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setMode("login"); setStep(1); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                mode === "login"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              تسجيل الدخول
            </button>
            <button
              onClick={() => { setMode("signup"); setStep(1); }}
              className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                mode === "signup"
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              حساب جديد
            </button>
          </div>

          {mode === "login" ? (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">البريد الإلكتروني</label>
                <Input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="email@example.com" dir="ltr" className="text-left"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">كلمة المرور</label>
                <Input
                  type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" dir="ltr" className="text-left"
                />
              </div>
              <Button onClick={handleLogin} disabled={loading || !email || !password} className="w-full h-12 text-base font-bold">
                {loading ? "جاري الدخول..." : "دخول"}
              </Button>
            </div>
          ) : step === 1 ? (
            /* Signup Step 1: Role & Grade */
            <div className="space-y-5">
              {/* Role Selection */}
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-2 block">أنا...</label>
                <div className="grid grid-cols-3 gap-2">
                  {ROLES.map(r => (
                    <button
                      key={r.id}
                      onClick={() => setRole(r.id)}
                      className={`p-3 rounded-xl border-2 text-center transition-all ${
                        role === r.id
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border hover:border-primary/30"
                      }`}
                    >
                      <div className="text-2xl mb-1">{r.emoji}</div>
                      <div className="text-xs font-bold">{r.label}</div>
                      <div className="text-[9px] text-muted-foreground">{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Country + Grade picker (for students) */}
              {role === "student" && (
                <CountryGradePicker
                  countryCode={countryCode}
                  gradeCode={gradeCode}
                  onChange={(c, g) => { setCountryCode(c); setGradeCode(g); }}
                />
              )}

              <Button onClick={() => setStep(2)} className="w-full h-11 text-sm font-bold">
                التالي ←
              </Button>
            </div>
          ) : (
            /* Signup Step 2: Credentials */
            <div className="space-y-4">
              <button onClick={() => setStep(1)} className="text-xs text-primary font-bold hover:underline">
                → رجوع
              </button>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">الاسم الكامل</label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="محمد أحمد" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">البريد الإلكتروني</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" dir="ltr" className="text-left" />
              </div>
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1 block">كلمة المرور</label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="6 أحرف على الأقل" dir="ltr" className="text-left" />
              </div>
              <Button onClick={handleSignup} disabled={loading || !email || !password || !fullName} className="w-full h-12 text-base font-bold">
                {loading ? "جاري التسجيل..." : "إنشاء حساب"}
              </Button>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          أول قاعدة معرفة رياضية عربية 🇩🇿
        </p>
      </div>
    </div>
  );
}
