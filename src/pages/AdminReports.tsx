import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  AlertCircle, CheckCircle, Flag, MessageSquare, 
  ExternalLink, Save, ArrowRight, Loader2, ShieldCheck,
  Lock
} from "lucide-react";
import katex from "katex";
import "katex/dist/katex.min.css";


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

interface ExerciseReport {
  id: string;
  exercise_id: string;
  issue_type: string;
  description: string;
  status: string;
  created_at: string;
  student_id: string;
  kb_exercises?: {
    text: string;
    label?: string;
  };
}

export default function AdminReports() {
  const { isAdmin, loading: authLoading } = useAuth();
  const [unlocked, setUnlocked] = useState(isPinValid());
  const [reports, setReports] = useState<ExerciseReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeReport, setActiveReport] = useState<ExerciseReport | null>(null);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  // Auto-unlock if user is verified Supabase admin
  useEffect(() => {
    if (isAdmin) {
      setUnlocked(true);
      savePinSession();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (unlocked) {
      fetchReports();
    }
  }, [unlocked]);

  async function fetchReports() {
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("exercise_reports")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setReports(data as any);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("خطأ في تحميل البلاغات. قد تحتاج لصلاحيات مسؤول.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve(report: ExerciseReport) {
    setSaving(true);
    try {
      // 1. Update the exercise text in KB
      const { error: exError } = await supabase
        .from("kb_exercises")
        .update({ text: editText })
        .eq("id", report.exercise_id);

      if (exError) throw exError;

      // 2. Mark report as resolved
      const { error: repError } = await (supabase as any)
        .from("exercise_reports")
        .update({ status: "resolved" })
        .eq("id", report.id);

      if (repError) throw repError;

      toast.success("تم تصحيح التمرين وإغلاق البلاغ بنجاح");
      setActiveReport(null);
      fetchReports();
    } catch (error) {
      console.error("Error resolving report:", error);
      toast.error("خطأ أثناء حفظ التعديلات");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!unlocked) {
    return <PinGate onUnlock={() => setUnlocked(true)} />;
  }


  return (
    <div className="min-h-screen bg-muted/30 rtl" dir="rtl">
      {/* Topbar */}
      <div className="h-16 bg-card border-b border-border px-8 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-xl">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-black text-foreground">بلاغات التمارين</h1>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">لوحة تحكم المحتوى</p>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => { sessionStorage.removeItem(PIN_STORAGE_KEY); setUnlocked(false); }}
          className="text-xs font-bold gap-2"
        >
          تسجيل الخروج <ArrowRight className="w-3.5 h-3.5" />
        </Button>
      </div>

      <div className="max-w-7xl mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Reports List */}
        <div className={activeReport ? "lg:col-span-5" : "lg:col-span-12"}>
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/50 flex justify-between items-center">
              <h2 className="text-sm font-black flex items-center gap-2">
                <Flag className="w-4 h-4 text-primary" /> قائمة البلاغات الحالية
              </h2>
              <Badge variant="outline" className="text-[10px] font-bold">
                {reports.filter(r => r.status === 'pending').length} بلاغ معلق
              </Badge>
            </div>

            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-20 text-center space-y-4">
                  <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin" />
                  <p className="text-sm text-muted-foreground font-bold">جاري تحميل البلاغات...</p>
                </div>
              ) : reports.length === 0 ? (
                <div className="p-20 text-center text-muted-foreground">لا توجد بلاغات حالية</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-right font-black">المشكلة</TableHead>
                      <TableHead className="text-right font-black">التاريخ</TableHead>
                      <TableHead className="text-right font-black">الحالة</TableHead>
                      <TableHead className="text-center font-black">إجراء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((report) => (
                      <TableRow 
                        key={report.id} 
                        className={`cursor-pointer transition-colors ${activeReport?.id === report.id ? "bg-primary/5" : "hover:bg-muted/50"}`}
                        onClick={async () => {
                          setActiveReport(report);
                          setEditText("جاري تحميل نص التمرين...");
                          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(report.exercise_id);
                          if (isUUID) {
                            const { data } = await (supabase as any).from("kb_exercises").select("text").eq("id", report.exercise_id).maybeSingle();
                            setEditText(data?.text || "تعذر العثور على نص التمرين في قاعدة البيانات (UUID)");
                          } else {
                            setEditText(`تنبيه: هذا التمرين لا ينتمي إلى مكتبة المصادر. معرفه هو: ${report.exercise_id}`);
                          }
                        }}
                      >
                        <TableCell>
                          <div className="space-y-1">
                            <span className="text-xs font-bold truncate max-w-[200px] block">
                              {getIssueTypeLabel(report.issue_type)}
                            </span>
                            <span className="text-[10px] text-muted-foreground block truncate max-w-[200px]">
                              {report.description || "لا يوجد وصف إضافي"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-[10px] font-mono text-muted-foreground">
                          {new Date(report.created_at).toLocaleDateString("ar-EG")}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={report.status === 'pending' ? "destructive" : "secondary"}
                            className="text-[10px] font-black"
                          >
                            {report.status === 'pending' ? "معلق" : "تم الحل"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </div>

        {/* Report Action Area */}
        {activeReport && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            className="lg:col-span-7 space-y-6"
          >
            <div className="bg-card rounded-2xl border border-border shadow-sm p-6 space-y-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-foreground">تفاصيل البلاغ</h3>
                  <p className="text-[11px] text-muted-foreground">معرف التمرين: {activeReport.exercise_id}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setActiveReport(null)} className="text-muted-foreground">✕ إغلاق</Button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                  <p className="text-[10px] font-black uppercase text-primary mb-1">نوع المشكلة</p>
                  <p className="text-sm font-bold">{getIssueTypeLabel(activeReport.issue_type)}</p>
                </div>
                <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                  <p className="text-[10px] font-black uppercase text-primary mb-1">تاريخ التقديم</p>
                  <p className="text-sm font-bold">{new Date(activeReport.created_at).toLocaleString("ar-EG")}</p>
                </div>
              </div>

              {activeReport.description && (
                <div className="p-4 rounded-xl bg-destructive/5 border border-destructive/10">
                  <p className="text-[10px] font-black uppercase text-destructive mb-1 flex items-center gap-1.5">
                    <MessageSquare className="w-3 h-3" /> ملاحظة الطالب
                  </p>
                  <p className="text-xs font-medium leading-relaxed italic">"{activeReport.description}"</p>
                </div>
              )}

              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <label className="text-xs font-black text-foreground flex items-center gap-2">
                    <Save className="w-3.5 h-3.5 text-primary" /> تعديل نص التمرين:
                  </label>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-[10px] font-bold text-primary gap-1.5"
                      onClick={() => {
                        let text = editText;
                        // Common fix: 2 after parenthesis -> ^2
                        text = text.replace(/\)(\d)/g, ")^$1");
                        // Common fix: duplicate sentences
                        const sentences = text.split(" — ");
                        if (sentences.length > 1 && sentences[0].trim() === sentences[1].trim()) {
                          text = sentences[1] + (text.includes(" — ") ? text.split(" — ").slice(2).join(" — ") : "");
                        }
                        setEditText(text);
                        toast.info("تم تطبيق تصحيحات تلقائية سريعة");
                      }}
                    >
                      ✨ تصحيح سريع
                    </Button>
                    <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded font-mono">Markdown/LaTeX Supported</span>
                  </div>
                </div>
                <Textarea 
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="min-h-[200px] font-mono text-sm leading-relaxed p-4 bg-muted/20 border-2 focus-visible:border-primary/50 transition-all rounded-xl shadow-inner whitespace-pre-wrap"
                  dir="ltr"
                />
              </div>

              {/* Live Preview */}
              <div className="space-y-3">
                <label className="text-xs font-black text-foreground flex items-center gap-2">
                  <ExternalLink className="w-3.5 h-3.5 text-primary" /> معاينة مباشرة (كيف سيراها الطالب):
                </label>
                <div className="p-6 bg-card border-2 border-dashed border-border rounded-xl min-h-[100px] flex items-center justify-center text-center text-lg leading-relaxed shadow-sm">
                  <div className="max-w-full overflow-x-auto">
                    <InlineMathPreview text={editText} />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <Button 
                  onClick={() => handleResolve(activeReport)} 
                  disabled={saving || activeReport.status === 'resolved'}
                  className="flex-1 bg-primary text-primary-foreground font-black h-12 gap-2 shadow-lg shadow-primary/20"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  حفظ التعديلات واعتبار المشكلة محلولة
                </Button>
                <Button 
                  variant="outline" 
                  disabled={saving}
                  className="px-6 h-12 font-bold hover:bg-muted"
                >
                  تجاهل
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function getIssueTypeLabel(type: string) {
  const map: Record<string, string> = {
    text_issue: "خطأ في النص",
    math_issue: "خطأ في الرياضيات",
    answer_issue: "خطأ في الخيارات",
    image_issue: "مشكلة في الصورة",
    other: "أخرى",
  };
  return map[type] || type;
}

// ─── Inline Math Preview ───────────────────────────────────────────────────
function InlineMathPreview({ text }: { text: string }) {
  if (!text) return null;
  const segments: { content: string; isDisplay: boolean; isMath: boolean }[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    const displayIdx = remaining.indexOf("$$");
    const inlineIdx = remaining.indexOf("$");
    if (inlineIdx === -1) {
      segments.push({ content: remaining, isDisplay: false, isMath: false });
      break;
    }
    if (displayIdx !== -1 && displayIdx === inlineIdx) {
      const end = remaining.indexOf("$$", displayIdx + 2);
      if (end === -1) {
        segments.push({ content: remaining, isDisplay: false, isMath: false });
        break;
      }
      if (displayIdx > 0) segments.push({ content: remaining.slice(0, displayIdx), isDisplay: false, isMath: false });
      segments.push({ content: remaining.slice(displayIdx + 2, end), isDisplay: true, isMath: true });
      remaining = remaining.slice(end + 2);
    } else {
      const end = remaining.indexOf("$", inlineIdx + 1);
      if (end === -1) {
        segments.push({ content: remaining, isDisplay: false, isMath: false });
        break;
      }
      if (inlineIdx > 0) segments.push({ content: remaining.slice(0, inlineIdx), isDisplay: false, isMath: false });
      segments.push({ content: remaining.slice(inlineIdx + 1, end), isDisplay: false, isMath: true });
      remaining = remaining.slice(end + 1);
    }
  }
  return (
    <>
      {segments.map((seg, i) =>
        seg.isMath ? (
          <KatexSpan key={i} latex={seg.content} display={seg.isDisplay} />
        ) : (
          <bdi key={i} dir="auto" className="math-text-preserve break-words">
            {seg.content}
          </bdi>
        )
      )}
    </>
  );
}

function KatexSpan({ latex, display }: { latex: string; display: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (ref.current) {
      try {
        katex.render(latex, ref.current, { displayMode: display, throwOnError: false, trust: true });
      } catch { if (ref.current) ref.current.textContent = latex; }
    }
  }, [latex, display]);
  return (
    <span ref={ref} dir="ltr" className="inline-math-isolate"
      style={{ display: display ? "block" : "inline-block", unicodeBidi: "isolate", direction: "ltr", maxWidth: "100%", overflowX: "auto", overflowY: "hidden" }} 
    />
  );
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
    <div className="min-h-screen flex items-center justify-center bg-background rtl" dir="rtl">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl" />
      </div>

      <motion.div
        animate={shake ? { x: [-10, 10, -10, 10, 0] } : { x: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md p-10 space-y-8 z-10"
      >
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-primary/5">
            <ShieldCheck className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-foreground">الوصول المحمي</h2>
            <p className="text-sm text-muted-foreground font-medium mt-2">أدخل الرمز السري للوصول إلى لوحة البلاغات</p>
          </div>
        </div>

        <div className="flex gap-4 justify-center" style={{ direction: "ltr" }}>
          {digits.map((d, i) => (
            <input 
              key={i} 
              ref={el => { inputs.current[i] = el; }}
              type="password" 
              inputMode="numeric" 
              maxLength={1}
              value={d} 
              onChange={e => handleDigit(i, e.target.value)} 
              onKeyDown={e => handleKey(i, e)}
              className={`
                w-16 h-20 text-center text-4xl font-black rounded-2xl outline-none transition-all shadow-sm
                ${error ? "border-destructive ring-destructive/20" : "border-border hover:border-primary/50 focus:border-primary ring-primary/20"}
                ${d ? "bg-primary/5 border-primary" : "bg-muted/50"}
                border-2 focus:ring-4
              `}
            />
          ))}
        </div>

        {error && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-sm font-bold text-destructive">
            ❌ الرمز السري غير صحيح
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}
