// ===== Unified KB Upload Page — Multi-country exercise import =====
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Upload, FileJson, FileText, ArrowRight, Check, X, Globe, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Country {
  code: string;
  name_ar: string;
  flag_emoji: string | null;
}

interface CountryGrade {
  grade_code: string;
  grade_label_ar: string;
  cycle: string | null;
}

interface ParsedExercise {
  text: string;
  type?: string;
  chapter?: string;
  grade?: string;
  stream?: string;
  source?: string;
}

export default function AdminKBUpload() {
  const navigate = useNavigate();
  const [countries, setCountries] = useState<Country[]>([]);
  const [grades, setGrades] = useState<CountryGrade[]>([]);
  const [countryCode, setCountryCode] = useState<string>("DZ");
  const [defaultGrade, setDefaultGrade] = useState<string>("");
  const [defaultChapter, setDefaultChapter] = useState<string>("");
  const [defaultSource, setDefaultSource] = useState<string>("");
  const [parsed, setParsed] = useState<ParsedExercise[]>([]);
  const [rawInput, setRawInput] = useState<string>("");
  const [mode, setMode] = useState<"json" | "text">("json");
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState<number>(0);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("countries").select("code, name_ar, flag_emoji").eq("is_active", true).order("name_ar");
      if (data) setCountries(data);
    })();
  }, []);

  useEffect(() => {
    if (!countryCode) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("country_grades").select("grade_code, grade_label_ar, cycle")
        .eq("country_code", countryCode).order("order_index");
      if (data) {
        setGrades(data);
        if (data.length > 0 && !defaultGrade) setDefaultGrade(data[0].grade_code);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countryCode]);

  function parseInput() {
    if (!rawInput.trim()) {
      toast({ title: "الإدخال فارغ", variant: "destructive" });
      return;
    }
    try {
      if (mode === "json") {
        const j = JSON.parse(rawInput);
        const list: ParsedExercise[] = Array.isArray(j) ? j : (j.exercises || []);
        if (!Array.isArray(list)) throw new Error("expected array or { exercises: [] }");
        const cleaned = list
          .map((x: any) => ({
            text: x.text || x.statement || x.content || "",
            type: x.type || "unclassified",
            chapter: x.chapter || x.subdomain || defaultChapter,
            grade: x.grade || defaultGrade,
            stream: x.stream || "",
            source: x.source || defaultSource,
          }))
          .filter(x => x.text);
        setParsed(cleaned);
        toast({ title: `تم تحليل ${cleaned.length} تمرين` });
      } else {
        // Plain text — one exercise per blank-line block
        const blocks = rawInput.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);
        const cleaned = blocks.map(text => ({
          text, type: "unclassified", chapter: defaultChapter, grade: defaultGrade, stream: "", source: defaultSource,
        }));
        setParsed(cleaned);
        toast({ title: `تم تحليل ${cleaned.length} تمرين` });
      }
    } catch (e: any) {
      toast({ title: "خطأ في التحليل", description: e.message, variant: "destructive" });
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const text = await f.text();
    setRawInput(text);
    setMode(f.name.endsWith(".json") ? "json" : "text");
  }

  function removeRow(i: number) {
    setParsed(prev => prev.filter((_, idx) => idx !== i));
  }

  async function commitToKB() {
    if (parsed.length === 0) {
      toast({ title: "لا توجد تمارين للحفظ", variant: "destructive" });
      return;
    }
    setUploading(true);
    setUploaded(0);
    const BATCH = 100;
    let total = 0;
    try {
      for (let i = 0; i < parsed.length; i += BATCH) {
        const slice = parsed.slice(i, i + BATCH);
        const rows = slice.map(p => ({
          text: p.text,
          type: p.type || "unclassified",
          chapter: p.chapter || defaultChapter,
          grade: p.grade || defaultGrade,
          stream: p.stream || "",
          source: p.source || defaultSource,
          country_code: countryCode,
        }));
        const { error } = await (supabase as any).from("kb_exercises").insert(rows);
        if (error) throw error;
        total += rows.length;
        setUploaded(total);
      }
      toast({ title: `تم رفع ${total} تمرين إلى ${countryCode}`, description: "يمكنك الآن الانتقال إلى التصنيف" });
      setParsed([]);
      setRawInput("");
    } catch (e: any) {
      toast({ title: "خطأ في الحفظ", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  const currentCountry = countries.find(c => c.code === countryCode);

  return (
    <div className="min-h-screen bg-background p-6" dir="rtl">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
              <Upload className="w-6 h-6" /> رفع تمارين قاعدة المعرفة
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              ارفع تمارين منهج جديد وابدأ التصنيف والتفكيك
            </p>
          </div>
          <button onClick={() => navigate("/admin")}
            className="text-xs px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted inline-flex items-center gap-1.5">
            <ArrowRight className="w-3.5 h-3.5" /> العودة للوحة
          </button>
        </div>

        {/* Step 1: Country & defaults */}
        <div className="glass-card rounded-xl p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-black">1</div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Globe className="w-4 h-4" /> اختر البلد والمستوى الافتراضي
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">البلد</label>
              <select value={countryCode} onChange={e => { setCountryCode(e.target.value); setDefaultGrade(""); }}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm">
                {countries.map(c => (
                  <option key={c.code} value={c.code}>
                    {c.flag_emoji || ""} {c.name_ar} ({c.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">المستوى الافتراضي</label>
              <select value={defaultGrade} onChange={e => setDefaultGrade(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm">
                <option value="">— اختر —</option>
                {grades.map(g => (
                  <option key={g.grade_code} value={g.grade_code}>{g.grade_label_ar}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">الفصل/الباب</label>
              <input value={defaultChapter} onChange={e => setDefaultChapter(e.target.value)}
                placeholder="مثال: الجبر" className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">المصدر</label>
              <input value={defaultSource} onChange={e => setDefaultSource(e.target.value)}
                placeholder="مثال: كتاب 4 متوسط" className="w-full px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm" />
            </div>
          </div>
        </div>

        {/* Step 2: Upload / paste */}
        <div className="glass-card rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-black">2</div>
              <h2 className="text-base font-bold text-foreground">ارفع ملفاً أو الصق المحتوى</h2>
            </div>
            <div className="flex gap-1">
              <button onClick={() => setMode("json")}
                className={`text-xs px-3 py-1.5 rounded-lg border inline-flex items-center gap-1.5 ${mode === "json" ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-muted-foreground"}`}>
                <FileJson className="w-3.5 h-3.5" /> JSON
              </button>
              <button onClick={() => setMode("text")}
                className={`text-xs px-3 py-1.5 rounded-lg border inline-flex items-center gap-1.5 ${mode === "text" ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-muted-foreground"}`}>
                <FileText className="w-3.5 h-3.5" /> نص عادي
              </button>
            </div>
          </div>

          <div className="mb-3">
            <label className="cursor-pointer inline-flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-dashed border-primary/40 bg-primary/5 text-primary hover:bg-primary/10">
              <Upload className="w-3.5 h-3.5" /> اختر ملف .json أو .txt
              <input type="file" accept=".json,.txt" onChange={handleFile} className="hidden" />
            </label>
          </div>

          <textarea value={rawInput} onChange={e => setRawInput(e.target.value)}
            placeholder={mode === "json"
              ? '[{"text": "...", "grade": "...", "chapter": "..."}, ...] أو {"exercises": [...]}'
              : "تمرين 1...\n\nتمرين 2...\n\n(افصل بين التمارين بسطر فارغ)"}
            className="w-full h-48 px-3 py-2 rounded-lg border border-border bg-card text-foreground text-sm font-mono leading-relaxed" />

          <button onClick={parseInput}
            className="mt-3 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-bold inline-flex items-center gap-1.5">
            <Check className="w-4 h-4" /> تحليل المحتوى
          </button>
        </div>

        {/* Step 3: Preview & commit */}
        {parsed.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-black">3</div>
                <h2 className="text-base font-bold text-foreground">
                  معاينة ({parsed.length} تمرين) — سيُرفع إلى {currentCountry?.flag_emoji} {currentCountry?.name_ar}
                </h2>
              </div>
              <button onClick={commitToKB} disabled={uploading}
                className="px-4 py-2 rounded-lg bg-accent text-accent-foreground text-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-50">
                {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> {uploaded}/{parsed.length}</> : <><Upload className="w-4 h-4" /> حفظ في القاعدة</>}
              </button>
            </div>

            <div className="max-h-[400px] overflow-y-auto space-y-2 border border-border rounded-lg p-2">
              {parsed.map((p, i) => (
                <div key={i} className="flex items-start gap-2 p-2 rounded border border-border bg-card">
                  <span className="text-xs text-muted-foreground font-mono w-6 flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foreground line-clamp-2 leading-relaxed">{p.text}</div>
                    <div className="flex gap-1.5 mt-1 flex-wrap">
                      {p.grade && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{p.grade}</span>}
                      {p.chapter && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{p.chapter}</span>}
                      {p.type && p.type !== "unclassified" && <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">{p.type}</span>}
                    </div>
                  </div>
                  <button onClick={() => removeRow(i)} className="text-destructive hover:bg-destructive/10 p-1 rounded">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 text-xs text-muted-foreground">
              💡 بعد الحفظ: انتقل إلى <button onClick={() => navigate("/admin")} className="text-primary underline font-bold">لوحة الإدارة</button> ← التصنيف، ثم التفكيك (اختر بلد <strong>{countryCode}</strong> من الفلتر).
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
