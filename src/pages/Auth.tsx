import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { QEDLogo } from "@/components/QEDLogo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";

const GRADE_LEVELS = [
  { id: "middle", label: "المتوسط", grades: [
    { id: "middle_1", label: "1AM", sub: "أولى متوسط" },
    { id: "middle_2", label: "2AM", sub: "ثانية متوسط" },
    { id: "middle_3", label: "3AM", sub: "ثالثة متوسط" },
    { id: "middle_4", label: "4AM", sub: "رابعة متوسط (BEM)" },
  ]},
  { id: "secondary", label: "الثانوي", grades: [
    { id: "secondary_1", label: "1AS", sub: "أولى ثانوي" },
    { id: "secondary_2", label: "2AS", sub: "ثانية ثانوي" },
    { id: "secondary_3", label: "3AS", sub: "ثالثة ثانوي (BAC)" },
  ]},
];

const STREAMS: Record<string, { id: string; label: string }[]> = {
  secondary_1: [
    { id: "S", label: "علوم" }, { id: "L", label: "آداب" },
  ],
  secondary_2: [
    { id: "S", label: "علوم تجريبية" }, { id: "M", label: "رياضيات" },
    { id: "MT", label: "تقني رياضي" }, { id: "GE", label: "تسيير و اقتصاد" },
  ],
  secondary_3: [
    { id: "S", label: "علوم تجريبية" }, { id: "M", label: "رياضيات" },
    { id: "MT", label: "تقني رياضي" }, { id: "GE", label: "تسيير و اقتصاد" },
  ],
};

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
  const [grade, setGrade] = useState("middle_4");
  const [stream, setStream] = useState("");
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

  const hasStreams = grade.startsWith("secondary_") && STREAMS[grade];

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "خطأ في الدخول", description: error.message, variant: "destructive" });
    } else {
      navigate(redirectPath);
    }
  };

  const handleSignup = async () => {
    if (!fullName.trim()) {
      toast({ title: "أدخل اسمك الكامل", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, role, grade, stream },
        emailRedirectTo: window.location.origin,
      },
    });
    setLoading(false);
    if (error) {
      toast({ title: "خطأ في التسجيل", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم التسجيل! تحقق من بريدك الإلكتروني لتفعيل حسابك.", description: "ستصلك رسالة تأكيد." });
    }
  };

  const currentLevel = GRADE_LEVELS.find(l => l.grades.some(g => g.id === grade));

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
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

              {/* Grade selection (for students) */}
              {role === "student" && (
                <>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground mb-2 block">المستوى الدراسي</label>
                    <div className="flex gap-2 mb-2">
                      {GRADE_LEVELS.map(level => (
                        <button
                          key={level.id}
                          onClick={() => { setGrade(level.grades[0].id); setStream(""); }}
                          className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${
                            currentLevel?.id === level.id
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card text-muted-foreground border-border hover:border-primary/40"
                          }`}
                        >
                          {level.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {currentLevel?.grades.map(g => (
                        <button
                          key={g.id}
                          onClick={() => { setGrade(g.id); if (STREAMS[g.id]) setStream(STREAMS[g.id][0].id); else setStream(""); }}
                          className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${
                            grade === g.id
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-card text-muted-foreground border-border hover:border-primary/50"
                          }`}
                        >
                          {g.label} — {g.sub}
                        </button>
                      ))}
                    </div>
                  </div>

                  {hasStreams && (
                    <div>
                      <label className="text-xs font-bold text-muted-foreground mb-2 block">🎯 الشعبة</label>
                      <div className="flex gap-1.5 flex-wrap">
                        {STREAMS[grade].map(s => (
                          <button
                            key={s.id}
                            onClick={() => setStream(s.id)}
                            className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all border ${
                              stream === s.id
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-card text-muted-foreground border-border hover:border-primary/50"
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
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
