import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Save, RotateCcw, LogOut, AlertCircle, Upload, Globe } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminClassify } from "@/components/admin/AdminClassify";
import { AdminPatterns } from "@/components/admin/AdminPatterns";
import { AdminDeconstruct } from "@/components/admin/AdminDeconstruct";
import { AdminKBViewer } from "@/components/admin/AdminKBViewer";
import { AdminViz } from "@/components/admin/AdminViz";
import { useAdminKBStore } from "@/components/admin/useAdminKBStore";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || "2026";
const PIN_STORAGE_KEY = "elmentor_admin_auth";
const PIN_TTL_MS = 4 * 60 * 60 * 1000;

function isPinValid(): boolean {
  try {
    const raw = sessionStorage.getItem(PIN_STORAGE_KEY);
    if (!raw) return false;
    const { ts } = JSON.parse(raw);
    return Date.now() - ts < PIN_TTL_MS;
  } catch { return false; }
}

function savePinSession() {
  try { sessionStorage.setItem(PIN_STORAGE_KEY, JSON.stringify({ ts: Date.now() })); } catch {}
}

// ─── PIN Gate ─────────────────────────────────────────────────────────────────

function PinGate({ onUnlock }: { onUnlock: () => void }) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState(false);
  const [shake, setShake] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  function handleDigit(i: number, val: string) {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    setError(false);
    if (val && i < 3) inputs.current[i + 1]?.focus();
    if (val && next.every(d => d !== "")) {
      const pin = next.join("");
      if (pin === ADMIN_PIN) { savePinSession(); onUnlock(); }
      else {
        setError(true); setShake(true);
        setTimeout(() => { setDigits(["", "", "", ""]); setShake(false); inputs.current[0]?.focus(); }, 700);
      }
    }
  }

  function handleKey(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  }

  useEffect(() => { inputs.current[0]?.focus(); }, []);

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(210 55% 18%) 100%)", direction: "rtl" }}>
      <motion.div
        animate={shake ? { x: [-10, 10, -10, 10, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        className="glass-card rounded-3xl p-12 text-center min-w-[320px]"
        style={{ background: "hsl(var(--primary) / 0.15)", border: "1px solid hsl(var(--primary-foreground) / 0.12)" }}>
        <div className="mb-4 flex justify-center"><Lock className="w-12 h-12" style={{ color: "hsl(var(--accent))" }} /></div>
        <h2 className="text-xl font-black text-primary-foreground mb-1">لوحة الإدارة</h2>
        <p className="text-xs mb-8" style={{ color: "hsl(var(--primary-foreground) / 0.55)" }}>أدخل الـ PIN للوصول إلى قاعدة المعرفة</p>
        <div className="flex gap-3 justify-center mb-6" style={{ direction: "ltr" }}>
          {digits.map((d, i) => (
            <input key={i} ref={el => { inputs.current[i] = el; }}
              type="password" inputMode="numeric" maxLength={1}
              value={d} onChange={e => handleDigit(i, e.target.value)} onKeyDown={e => handleKey(i, e)}
              className="w-14 h-16 text-center text-3xl font-black rounded-xl outline-none transition-all"
              style={{
                border: `2px solid ${error ? "hsl(var(--destructive))" : d ? "hsl(var(--accent))" : "hsl(var(--primary-foreground) / 0.2)"}`,
                background: d ? "hsl(var(--accent) / 0.15)" : "hsl(var(--primary-foreground) / 0.07)",
                color: "hsl(var(--primary-foreground))",
              }} />
          ))}
        </div>
        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs mb-4 flex items-center justify-center gap-1.5" style={{ color: "hsl(var(--destructive))" }}>
            <AlertCircle className="w-3.5 h-3.5" /> PIN غير صحيح
          </motion.p>
        )}
        <p className="text-[11px]" style={{ color: "hsl(var(--primary-foreground) / 0.35)" }}>الجلسة تنتهي بعد 4 ساعات</p>
      </motion.div>
    </div>
  );
}

// ─── Admin Panel ──────────────────────────────────────────────────────────────

const VIEW_META: Record<string, [string, string]> = {
  dashboard: ["لوحة التحكم", "نظرة شاملة على المنهاج الجزائري الكامل"],
  classify: ["1. التصنيف", "صنّف التمارين حسب النوع"],
  patterns: ["2. مكتبة الأنماط", "عرّف أنماط التفكيك القابلة لإعادة الاستخدام"],
  deconstruct: ["3. التفكيك", "فكّك التمارين بسرعة باستخدام الأنماط"],
  kb: ["قاعدة المعرفة", "المخرجات المنظمة الجاهزة للذكاء الاصطناعي"],
  viz: ["شبكة المعرفة", "العلاقة بين الأصناف والأنماط والتمارين"],
};

function AdminPanel({ onLogout }: { onLogout: () => void }) {
  const navigate = useNavigate();
  const store = useAdminKBStore();
  const [title, subtitle] = VIEW_META[store.view] || ["", ""];
  const [countries, setCountries] = useState<{ code: string; name_ar: string; flag_emoji: string | null }[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("countries").select("code, name_ar, flag_emoji").eq("is_active", true).order("name_ar");
      if (data) setCountries(data);
    })();
  }, []);

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file"; input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          store.importData(data);
        } catch { alert("ملف JSON غير صالح"); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleExport = () => {
    const data = store.exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `math-kb-export-${Date.now()}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const handleLoadExercises = () => {
    store.reload();
  };

  const handleSaveToDB = async () => {
    const ok = await store.saveAllToDB();
    if (ok) alert(`تم حفظ ${store.exercises.length} تمرين + ${store.patterns.length} نمط + ${store.deconstructions.length} تفكيك في قاعدة البيانات`);
    else alert("حدث خطأ أثناء الحفظ");
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ direction: "rtl" }}>
      <AdminSidebar
        view={store.view}
        setView={store.setView}
        stats={store.stats}
        onImport={handleImport}
        onExport={handleExport}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="h-14 flex-shrink-0 flex items-center gap-3 px-6 border-b border-border bg-card">
          <span className="text-base font-bold text-foreground">{title}</span>
          <span className="text-muted-foreground">—</span>
          <span className="text-sm text-muted-foreground flex-1">{subtitle}</span>

          {/* Country selector */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded border border-border bg-card">
            <Globe className="w-3.5 h-3.5 text-muted-foreground" />
            <select value={store.countryFilter} onChange={e => store.setCountryFilter(e.target.value)}
              className="bg-transparent text-xs font-bold text-foreground outline-none cursor-pointer">
              {countries.length === 0 && <option value="DZ">🇩🇿 الجزائر</option>}
              {countries.map(c => (
                <option key={c.code} value={c.code}>{c.flag_emoji || ""} {c.name_ar}</option>
              ))}
            </select>
          </div>

          <button onClick={() => navigate("/admin/kb/upload")}
            className="text-xs px-3 py-1.5 rounded font-bold text-primary-foreground btn-press inline-flex items-center gap-1.5"
            style={{ background: "hsl(var(--accent))" }}>
            <Upload className="w-3.5 h-3.5" /> رفع تمارين
          </button>
          <button onClick={() => store.resetAll()}
            className="text-xs px-3 py-1.5 rounded border border-border text-muted-foreground bg-card hover:bg-muted transition-all inline-flex items-center gap-1.5">
            <RotateCcw className="w-3.5 h-3.5" /> مسح
          </button>
          <button onClick={handleLoadExercises}
            className="text-xs px-3 py-1.5 rounded font-bold text-primary-foreground btn-press"
            style={{ background: "hsl(var(--primary))" }}>
            تحميل
          </button>
          <button onClick={handleSaveToDB} disabled={store.loading}
            className="text-xs px-3 py-1.5 rounded font-bold text-primary-foreground btn-press inline-flex items-center gap-1.5"
            style={{ background: "hsl(var(--primary))" }}>
            <Save className="w-3.5 h-3.5" /> {store.loading ? "..." : "حفظ"}
          </button>
          <button onClick={() => { try { sessionStorage.removeItem(PIN_STORAGE_KEY); } catch {} onLogout(); }}
            className="text-xs px-3 py-1.5 rounded border font-bold inline-flex items-center gap-1.5"
            style={{ background: "hsl(var(--destructive) / 0.12)", color: "hsl(var(--destructive))", borderColor: "hsl(var(--destructive) / 0.3)" }}>
            <LogOut className="w-3.5 h-3.5" /> خروج
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6" style={{ background: "hsl(var(--background))" }}>
          {store.view === "dashboard" && (
            <AdminDashboard
              exercises={store.exercises}
              deconstructions={store.deconstructions}
              stats={store.stats}
              gradeFilter={store.gradeFilter}
              setGradeFilter={store.setGradeFilter}
              setView={store.setView}
              loaded={store.loaded}
              onLoadExercises={handleLoadExercises}
              countryCode={store.countryFilter}
            />
          )}
          {store.view === "classify" && (
            <AdminClassify
              exercises={store.filteredExercises}
              searchQuery={store.searchQuery}
              setSearchQuery={store.setSearchQuery}
              gradeFilter={store.gradeFilter}
              setGradeFilter={store.setGradeFilter}
              onClassify={store.classifyExercise}
              countryCode={store.countryFilter}
            />
          )}
          {store.view === "patterns" && (
            <AdminPatterns
              patterns={store.patterns}
              onAdd={store.addPattern}
              onUpdate={store.updatePattern}
              onDelete={store.deletePattern}
              reload={store.reload}
            />
          )}
          {store.view === "deconstruct" && (
            <AdminDeconstruct
              exercises={store.exercises}
              patterns={store.patterns}
              deconstructions={store.deconstructions}
              onAdd={store.addDeconstruction}
              onUpdateDeconstruction={store.updateDeconstruction}
              onDeleteDeconstruction={store.deleteDeconstruction}
              reload={store.reload}
              countryCode={store.countryFilter}
            />
          )}
          {store.view === "kb" && (
            <AdminKBViewer
              exercises={store.exercises}
              patterns={store.patterns}
              deconstructions={store.deconstructions}
            />
          )}
          {store.view === "viz" && (
            <AdminViz
              exercises={store.exercises}
              patterns={store.patterns}
              deconstructions={store.deconstructions}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Page Entry ───────────────────────────────────────────────────────────────

export default function AdminKBPage() {
  const [unlocked, setUnlocked] = useState(isPinValid);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("admin_bypass") === ADMIN_PIN) { savePinSession(); setUnlocked(true); }
  }, []);

  return (
    <AnimatePresence mode="wait">
      {unlocked ? (
        <motion.div key="panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-screen">
          <AdminPanel onLogout={() => setUnlocked(false)} />
        </motion.div>
      ) : (
        <motion.div key="gate" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <PinGate onUnlock={() => setUnlocked(true)} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
