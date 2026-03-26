// ===== Home Dashboard — Workflow-driven landing page =====
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { GamificationDashboard } from "@/components/GamificationDashboard";

const WORKFLOW = [
  {
    step: 1,
    path: "/gaps",
    title: "التقييم التشخيصي",
    subtitle: "حدد مستواك واكتشف ثغراتك",
    description: "تقييم تكيّفي يعرض عليك تمارين من قاعدة المعرفة ويحلل إجاباتك لتحديد المفاهيم الغائبة والأنماط الضعيفة.",
    emoji: "🔍",
    colorVar: "--algebra",
  },
  {
    step: 2,
    path: "/learn",
    title: "مسار التعلم",
    subtitle: "خطة مخصصة حسب ثغراتك",
    description: "مسار تعليمي مرتّب من الأسهل للأصعب، مبني على التفكيك والأنماط — يركّز على المفاهيم التي تحتاج تقويتها.",
    emoji: "🗺️",
    colorVar: "--geometry",
  },
  {
    step: 3,
    path: "/exercises",
    title: "حل التمارين",
    subtitle: "تدرّب باستخدام المحررات التفاعلية",
    description: "مكتبة تمارين مع محرر جبر (خطوات + رموز رياضية) ومحرر هندسة (رسم SVG تفاعلي) — حل واحصل على التفكيك فوراً.",
    emoji: "📝",
    colorVar: "--probability",
  },
  {
    step: 4,
    path: "/tutor",
    title: "المدرّس الذكي",
    subtitle: "شرح مخصص بالذكاء الاصطناعي",
    description: "اطلب تلميحاً، حلاً كاملاً، أو تحليل أخطائك — المدرّس يتكيّف مع مستواك ويشرح بأسلوب يناسبك.",
    emoji: "🤖",
    colorVar: "--functions",
  },
];

export default function Home() {
  const [stats, setStats] = useState({ exercises: 0, patterns: 0, deconstructions: 0 });

  useEffect(() => {
    async function load() {
      const [ex, pat, dec] = await Promise.all([
        supabase.from("kb_exercises").select("id", { count: "exact", head: true }),
        supabase.from("kb_patterns").select("id", { count: "exact", head: true }),
        supabase.from("kb_deconstructions").select("id", { count: "exact", head: true }),
      ]);
      setStats({
        exercises: ex.count || 0,
        patterns: pat.count || 0,
        deconstructions: dec.count || 0,
      });
    }
    load();
  }, []);

  return (
    <div className="h-full overflow-y-auto" dir="rtl">
      {/* Hero */}
      <div className="relative overflow-hidden bg-gradient-to-bl from-primary/10 via-background to-background px-6 py-12">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: "radial-gradient(circle at 20% 50%, hsl(var(--primary)) 0%, transparent 50%), radial-gradient(circle at 80% 20%, hsl(var(--primary)) 0%, transparent 50%)"
        }} />
        <div className="relative max-w-4xl mx-auto text-center space-y-4">
          <div className="text-5xl mb-2">🎓</div>
          <h1 className="text-3xl font-black text-foreground">
            محرك الرياضيات <span className="bg-gradient-to-l from-primary to-purple-500 bg-clip-text text-transparent">QED</span>
          </h1>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto leading-relaxed">
            منصة تعليمية ذكية تعتمد على قاعدة معرفة مفكّكة — تقييم تشخيصي → مسار تعلم مخصص → تمارين تفاعلية → مدرّس ذكي
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-6 mt-6">
            <StatBadge value={stats.exercises} label="تمرين" />
            <StatBadge value={stats.patterns} label="نمط" />
            <StatBadge value={stats.deconstructions} label="تفكيك" />
          </div>
        </div>
      </div>
      {/* Two-column: Gamification + Workflow */}
      <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gamification sidebar */}
        <div className="lg:col-span-1">
          <GamificationDashboard
            onStartDailyChallenge={(id) => { window.location.href = `/exercises?challenge=${id}`; }}
          />
        </div>

        {/* Workflow steps */}
        <div className="lg:col-span-2">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-lg">📋</span>
          <h2 className="text-lg font-black text-foreground">مسار العمل</h2>
          <span className="text-xs text-muted-foreground">— اتبع الخطوات بالترتيب للحصول على أفضل نتيجة</span>
        </div>

        <div className="space-y-4">
          {WORKFLOW.map((item, i) => (
            <Link
              key={item.step}
              to={item.path}
              className="block rounded-2xl border p-6 hover:shadow-lg transition-all group"
              style={{
                borderColor: `hsl(var(${item.colorVar}) / 0.2)`,
                background: `hsl(var(${item.colorVar}) / 0.04)`,
              }}
            >
              <div className="flex items-start gap-5">
                {/* Step number */}
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-lg font-black flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform"
                  style={{ background: `linear-gradient(135deg, hsl(var(${item.colorVar})), hsl(var(${item.colorVar}) / 0.7))` }}
                >
                  {item.step}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{item.emoji}</span>
                    <h3 className="text-base font-black text-foreground">{item.title}</h3>
                  </div>
                  <p className="text-xs font-bold mb-1" style={{ color: `hsl(var(${item.colorVar}))` }}>{item.subtitle}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                </div>

                {/* Arrow */}
                <div className="flex-shrink-0 text-muted-foreground group-hover:text-primary transition-colors text-lg mt-3">
                  ←
                </div>
              </div>

              {/* Connector line to next step */}
              {i < WORKFLOW.length - 1 && (
                <div className="mr-[22px] mt-4 h-4 border-r-2 border-dashed border-border" />
              )}
            </Link>
          ))}
        </div>

        {/* Cycle indicator */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border text-xs text-muted-foreground">
            <span>🔄</span>
            <span>بعد الانتهاء، أعد التقييم التشخيصي لقياس تقدمك</span>
          </div>
        </div>

        {/* Quick access */}
        <div className="mt-10 pt-6 border-t border-border">
          <h3 className="text-sm font-bold text-foreground mb-3">⚡ وصول سريع</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickLink to="/admin" emoji="⚙️" label="لوحة الإدارة" desc="إدارة قاعدة المعرفة" />
            <QuickLink to="/algebra" emoji="🔢" label="الجبر" desc="محرك الجبر المباشر" />
            <QuickLink to="/geometry" emoji="📐" label="الهندسة" desc="محرك الهندسة المباشر" />
            <QuickLink to="/statistics" emoji="📊" label="الإحصاء" desc="محرك الإحصاء المباشر" />
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

function StatBadge({ value, label }: { value: number; label: string }) {
  return (
    <div className="text-center">
      <div className="text-xl font-black text-foreground">{value.toLocaleString("ar-DZ")}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function QuickLink({ to, emoji, label, desc }: { to: string; emoji: string; label: string; desc: string }) {
  return (
    <Link
      to={to}
      className="p-3 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-all group"
    >
      <div className="text-lg mb-1">{emoji}</div>
      <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors">{label}</div>
      <div className="text-[10px] text-muted-foreground">{desc}</div>
    </Link>
  );
}
