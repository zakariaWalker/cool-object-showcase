import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  Brain,
  GitBranch,
  AlertTriangle,
  FileText,
  Loader2,
  X,
  Search,
  Zap,
  Link2,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// ─── Types ───
interface Skill {
  id: string;
  name: string;
  name_ar: string;
  description: string;
  domain: string;
  subdomain: string;
  grade: string;
  difficulty: number;
  bloom_level: number;
  frequency: number;
  metadata: any;
  created_at: string;
}
interface SkillDep {
  id: string;
  from_skill_id: string;
  to_skill_id: string;
  dependency_type: string;
  strength: number;
}
interface SkillError {
  id: string;
  skill_id: string;
  error_description: string;
  error_type: string;
  frequency: number;
  fix_hint: string;
  severity: string;
}
interface Course {
  id: string;
  title: string;
  description: string;
  grade: string;
  source_type: string;
  file_path: string | null;
  status: string;
  extracted_skills: any;
  user_id: string;
  created_at: string;
}

type View = "upload" | "graph" | "skills" | "errors" | "courses";

const DOMAIN_COLORS: Record<string, string> = {
  algebra: "#6366f1",
  geometry: "#f59e0b",
  statistics: "#10b981",
  probability: "#ef4444",
  functions: "#8b5cf6",
  other: "#64748b",
};

const DOMAIN_ICONS: Record<string, string> = {
  algebra: "∑",
  geometry: "△",
  statistics: "📊",
  probability: "🎲",
  functions: "ƒ",
};

const BLOOM_LABELS = ["", "تذكر", "فهم", "تطبيق", "تحليل", "تقييم", "إبداع"];

// ─── Main Component ───
export default function SkillsKBPage() {
  const [view, setView] = useState<View>("upload");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [deps, setDeps] = useState<SkillDep[]>([]);
  const [errors, setErrors] = useState<SkillError[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [s, d, e, c] = await Promise.all([
      supabase.from("kb_skills").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("kb_skill_dependencies").select("*").limit(1000),
      supabase.from("kb_skill_errors").select("*").limit(1000),
      supabase.from("kb_courses").select("*").order("created_at", { ascending: false }).limit(100),
    ]);
    if (s.data) setSkills(s.data as any);
    if (d.data) setDeps(d.data as any);
    if (e.data) setErrors(e.data as any);
    if (c.data) setCourses(c.data as any);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const tabs: { id: View; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "upload", label: "رفع المنهج", icon: <Upload size={14} /> },
    { id: "skills", label: "المهارات", icon: <Brain size={14} />, count: skills.length },
    { id: "graph", label: "خريطة المهارات", icon: <GitBranch size={14} /> },
    { id: "errors", label: "الأخطاء الشائعة", icon: <AlertTriangle size={14} />, count: errors.length },
    { id: "courses", label: "الكورسات", icon: <BookOpen size={14} />, count: courses.length },
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <div className="border-b border-border bg-card sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 py-2">
          <h1 className="text-sm font-black text-foreground ml-4">🧠 قاعدة المهارات</h1>
          <div className="flex items-center gap-1 mr-4">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setView(t.id)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                style={{
                  background: view === t.id ? "hsl(var(--primary))" : "transparent",
                  color: view === t.id ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
                }}
              >
                {t.icon} {t.label}
                {t.count !== undefined && <span className="text-[10px] opacity-70">({t.count})</span>}
              </button>
            ))}
          </div>
          <div className="mr-auto flex items-center gap-3">
            <QuickStats skills={skills} errors={errors} deps={deps} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4">
        {view === "upload" && (
          <UploadPanel
            onDone={() => {
              loadData();
              setView("skills");
            }}
          />
        )}
        {view === "skills" && (
          <SkillsList
            skills={skills}
            errors={errors}
            deps={deps}
            selected={selectedSkill}
            onSelect={setSelectedSkill}
          />
        )}
        {view === "graph" && <SkillGraph skills={skills} deps={deps} errors={errors} onSelect={setSelectedSkill} />}
        {view === "errors" && <ErrorsPanel errors={errors} skills={skills} />}
        {view === "courses" && <CoursesPanel courses={courses} skills={skills} />}
      </div>
    </div>
  );
}

// ─── Quick Stats ───
function QuickStats({ skills, errors, deps }: { skills: Skill[]; errors: SkillError[]; deps: SkillDep[] }) {
  const domains = useMemo(() => {
    const m: Record<string, number> = {};
    skills.forEach((s) => {
      m[s.domain] = (m[s.domain] || 0) + 1;
    });
    return m;
  }, [skills]);

  return (
    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
      {Object.entries(domains).map(([d, c]) => (
        <span key={d} className="flex items-center gap-1">
          <span style={{ color: DOMAIN_COLORS[d] || DOMAIN_COLORS.other }}>{DOMAIN_ICONS[d] || "•"}</span>
          {c}
        </span>
      ))}
      <span>🔗 {deps.length} رابط</span>
      <span>⚠️ {errors.length} خطأ</span>
    </div>
  );
}

// ─── Upload Panel ───
function UploadPanel({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<"pdf" | "text">("pdf");
  const [title, setTitle] = useState("");
  const [grade, setGrade] = useState("4AM");
  const [textContent, setTextContent] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handlePdfUpload = async (file: File) => {
    setPdfFile(file);
    setTitle(file.name.replace(/\.pdf$/i, ""));
  };

  const handleExtract = async () => {
    if (!title.trim()) {
      toast.error("أدخل عنوان الكورس");
      return;
    }

    let content = textContent;

    if (mode === "pdf" && pdfFile) {
      setProcessing(true);
      setProgress(10);
      toast.info("جاري رفع الملف...");

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("سجل الدخول أولاً");
        setProcessing(false);
        return;
      }

      // 1. Upload to the bucket parse-exam-pdf reads from
      const path = `${user.id}/${Date.now()}_${pdfFile.name}`;
      const { error: upErr } = await supabase.storage.from("exam-pdfs").upload(path, pdfFile);
      if (upErr) {
        toast.error("خطأ في الرفع: " + upErr.message);
        setProcessing(false);
        return;
      }

      setProgress(25);

      // 2. Create exam_uploads record — parse-exam-pdf requires an upload_id
      const { data: uploadRecord, error: recErr } = await supabase
        .from("exam_uploads")
        .insert({
          user_id: user.id,
          file_path: path,
          file_name: pdfFile.name,
          format: "regular",
          status: "pending",
        })
        .select("id")
        .single();

      if (recErr || !uploadRecord) {
        toast.error("خطأ في إنشاء سجل الرفع");
        setProcessing(false);
        return;
      }

      setProgress(35);
      toast.info("جاري تحليل PDF...");

      // 3. Invoke with upload_id (the fix)
      const { data: parseData, error: parseErr } = await supabase.functions.invoke("parse-exam-pdf", {
        body: { upload_id: uploadRecord.id },
      });

      if (parseErr || !parseData?.success) {
        toast.error("خطأ في تحليل PDF: " + (parseData?.error || parseErr?.message));
        setProcessing(false);
        return;
      }

      setProgress(50);

      // 4. Rebuild content from extracted questions stored by parse-exam-pdf
      const { data: questions } = await supabase
        .from("exam_extracted_questions")
        .select("text, section_label")
        .eq("upload_id", uploadRecord.id);

      content = (questions || []).map((q) => `${q.section_label}: ${q.text}`).join("\n\n");

      if (!content.trim()) {
        toast.error("لم يتم استخراج نص من PDF");
        setProcessing(false);
        return;
      }

      setProgress(55);
    } else if (mode === "text" && !textContent.trim()) {
      toast.error("أدخل محتوى الكورس");
      return;
    }

    if (!processing) setProcessing(true);
    setProgress(60);

    // Create course record
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("سجل الدخول أولاً");
      setProcessing(false);
      return;
    }

    const { data: course, error: courseErr } = await supabase
      .from("kb_courses")
      .insert({
        title,
        grade,
        description: content.slice(0, 500),
        source_type: mode,
        user_id: user.id,
        status: "processing",
        file_path: mode === "pdf" ? `${user.id}/${pdfFile?.name}` : null,
      })
      .select("id")
      .single();

    if (courseErr) {
      toast.error("خطأ في إنشاء الكورس");
      setProcessing(false);
      return;
    }

    setProgress(70);
    toast.info("🧠 جاري استخراج المهارات بالذكاء الاصطناعي...");

    const { data: result, error: aiErr } = await supabase.functions.invoke("extract-skills", {
      body: { course_id: course.id, content_text: content, title, grade },
    });

    setProgress(100);
    setProcessing(false);

    if (aiErr || !result?.success) {
      toast.error("خطأ في الاستخراج: " + (result?.error || aiErr?.message));
      return;
    }

    toast.success(`✅ تم استخراج ${result.skills_count} مهارة بنجاح!`);
    onDone();
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl mx-auto space-y-6">
      <div className="bg-card border border-border rounded-xl p-6">
        <h2 className="text-lg font-bold text-foreground mb-1">📚 رفع المنهج أو الكتاب المدرسي</h2>
        <p className="text-sm text-muted-foreground mb-4">
          ارفع كورس أو منهج ليتم تفكيكه إلى مهارات دقيقة مع الأخطاء الشائعة
        </p>

        {/* Mode toggle */}
        <div className="flex gap-2 mb-4">
          <Button variant={mode === "pdf" ? "default" : "outline"} size="sm" onClick={() => setMode("pdf")}>
            <FileText size={14} className="ml-1" /> رفع PDF
          </Button>
          <Button variant={mode === "text" ? "default" : "outline"} size="sm" onClick={() => setMode("text")}>
            <FileText size={14} className="ml-1" /> نص مباشر
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <Input placeholder="عنوان الكورس / الدرس" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Select value={grade} onValueChange={setGrade}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["1AM", "2AM", "3AM", "4AM", "1AS", "2AS", "3AS"].map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {mode === "pdf" ? (
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors">
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              id="pdf-upload"
              onChange={(e) => {
                if (e.target.files?.[0]) handlePdfUpload(e.target.files[0]);
              }}
            />
            <label htmlFor="pdf-upload" className="cursor-pointer">
              {pdfFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText size={20} className="text-primary" />
                  <span className="font-bold text-foreground">{pdfFile.name}</span>
                  <span className="text-xs text-muted-foreground">({(pdfFile.size / 1024 / 1024).toFixed(1)} MB)</span>
                </div>
              ) : (
                <>
                  <Upload size={32} className="mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">اسحب ملف PDF هنا أو انقر للاختيار</p>
                  <p className="text-xs text-muted-foreground mt-1">المنهج، الكتاب المدرسي، ملخص الدروس...</p>
                </>
              )}
            </label>
          </div>
        ) : (
          <Textarea
            placeholder="الصق محتوى الدرس أو المنهج هنا..."
            rows={10}
            value={textContent}
            onChange={(e) => setTextContent(e.target.value)}
            className="font-mono text-xs"
          />
        )}

        {processing && (
          <div className="mt-4 space-y-2">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              {progress < 30
                ? "رفع الملف..."
                : progress < 55
                  ? "تحليل PDF..."
                  : progress < 70
                    ? "تجهيز المحتوى..."
                    : "استخراج المهارات بالذكاء الاصطناعي..."}
            </p>
          </div>
        )}

        <Button className="w-full mt-4" onClick={handleExtract} disabled={processing}>
          {processing ? <Loader2 size={16} className="animate-spin ml-2" /> : <Zap size={16} className="ml-2" />}
          {processing ? "جاري المعالجة..." : "استخراج المهارات"}
        </Button>
      </div>

      {/* Schema info */}
      <div className="bg-card/50 border border-border rounded-xl p-4">
        <h3 className="text-sm font-bold text-foreground mb-2">🧩 كيف يعمل النظام؟</h3>
        <div className="grid grid-cols-3 gap-3 text-xs text-muted-foreground">
          <div className="bg-background rounded-lg p-3 border border-border">
            <div className="text-2xl mb-1">📖</div>
            <div className="font-bold text-foreground">1. المنهج</div>
            <div>كتاب، درس، ملخص</div>
          </div>
          <div className="bg-background rounded-lg p-3 border border-border">
            <div className="text-2xl mb-1">🧠</div>
            <div className="font-bold text-foreground">2. تفكيك المهارات</div>
            <div>AI يستخرج المهارات الدقيقة + الأخطاء</div>
          </div>
          <div className="bg-background rounded-lg p-3 border border-border">
            <div className="text-2xl mb-1">🔗</div>
            <div className="font-bold text-foreground">3. الدمج في KB</div>
            <div>ربط بالأنماط + التمارين + الأخطاء</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Skills List ───
function SkillsList({
  skills,
  errors,
  deps,
  selected,
  onSelect,
}: {
  skills: Skill[];
  errors: SkillError[];
  deps: SkillDep[];
  selected: Skill | null;
  onSelect: (s: Skill | null) => void;
}) {
  const [search, setSearch] = useState("");
  const [domainFilter, setDomainFilter] = useState("all");

  const filtered = useMemo(() => {
    return skills.filter((s) => {
      if (domainFilter !== "all" && s.domain !== domainFilter) return false;
      if (search && !s.name.toLowerCase().includes(search.toLowerCase()) && !s.name_ar?.includes(search)) return false;
      return true;
    });
  }, [skills, search, domainFilter]);

  function errorsForSkill(id: string) {
    return errors.filter((e) => e.skill_id === id);
  }
  function depsForSkill(id: string) {
    return deps.filter((d) => d.from_skill_id === id);
  }

  return (
    <div className="flex gap-4">
      <div className="flex-1 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="ابحث عن مهارة..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 text-sm"
            />
          </div>
          <Select value={domainFilter} onValueChange={setDomainFilter}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              {Object.keys(DOMAIN_COLORS)
                .filter((d) => d !== "other")
                .map((d) => (
                  <SelectItem key={d} value={d}>
                    {DOMAIN_ICONS[d]} {d}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          {filtered.map((skill) => {
            const sErrors = errorsForSkill(skill.id);
            const sDeps = depsForSkill(skill.id);
            const isSelected = selected?.id === skill.id;

            return (
              <motion.div
                key={skill.id}
                layout
                className={`bg-card border rounded-lg p-3 cursor-pointer transition-all hover:border-primary/30 ${isSelected ? "border-primary ring-1 ring-primary/20" : "border-border"}`}
                onClick={() => onSelect(isSelected ? null : skill)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg" style={{ color: DOMAIN_COLORS[skill.domain] || DOMAIN_COLORS.other }}>
                        {DOMAIN_ICONS[skill.domain] || "•"}
                      </span>
                      <span className="font-bold text-sm text-foreground">{skill.name_ar || skill.name}</span>
                      {skill.name_ar && <span className="text-xs text-muted-foreground">({skill.name})</span>}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1">{skill.description}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="text-[10px]">
                      B{skill.bloom_level}
                    </Badge>
                    <Badge variant="outline" className="text-[10px]">
                      D{skill.difficulty}
                    </Badge>
                    {sErrors.length > 0 && (
                      <Badge variant="destructive" className="text-[10px]">
                        <AlertTriangle size={10} className="ml-0.5" /> {sErrors.length}
                      </Badge>
                    )}
                    {sDeps.length > 0 && (
                      <Badge variant="outline" className="text-[10px]">
                        <Link2 size={10} className="ml-0.5" /> {sDeps.length}
                      </Badge>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {skills.length === 0 ? "لم يتم استخراج مهارات بعد — ارفع منهجاً أولاً" : "لا توجد نتائج"}
            </div>
          )}
        </div>
      </div>

      {/* Detail panel */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-80 bg-card border border-border rounded-xl p-4 sticky top-16 h-fit space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-foreground text-sm">{selected.name_ar || selected.name}</h3>
              <button onClick={() => onSelect(null)}>
                <X size={14} />
              </button>
            </div>

            <div className="text-xs text-muted-foreground">{selected.description}</div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-background rounded-lg p-2 border border-border">
                <div className="text-lg font-bold" style={{ color: DOMAIN_COLORS[selected.domain] }}>
                  {DOMAIN_ICONS[selected.domain]}
                </div>
                <div className="text-[10px] text-muted-foreground">{selected.domain}</div>
              </div>
              <div className="bg-background rounded-lg p-2 border border-border">
                <div className="text-lg font-bold text-foreground">B{selected.bloom_level}</div>
                <div className="text-[10px] text-muted-foreground">{BLOOM_LABELS[selected.bloom_level]}</div>
              </div>
              <div className="bg-background rounded-lg p-2 border border-border">
                <div className="text-lg font-bold text-foreground">D{selected.difficulty}</div>
                <div className="text-[10px] text-muted-foreground">صعوبة</div>
              </div>
            </div>

            {/* Errors */}
            {errorsForSkill(selected.id).length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-destructive mb-2 flex items-center gap-1">
                  <AlertTriangle size={12} /> الأخطاء الشائعة
                </h4>
                {errorsForSkill(selected.id).map((err) => (
                  <div key={err.id} className="bg-destructive/5 border border-destructive/10 rounded-lg p-2 mb-1.5">
                    <div className="text-xs text-foreground font-medium">{err.error_description}</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      <Badge variant="outline" className="text-[9px] mr-1">
                        {err.error_type}
                      </Badge>
                      <Badge variant={err.severity === "high" ? "destructive" : "secondary"} className="text-[9px]">
                        {err.severity}
                      </Badge>
                    </div>
                    {err.fix_hint && <div className="text-[10px] text-primary mt-1">💡 {err.fix_hint}</div>}
                  </div>
                ))}
              </div>
            )}

            {/* Dependencies */}
            {depsForSkill(selected.id).length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-foreground mb-2 flex items-center gap-1">
                  <GitBranch size={12} /> المتطلبات المسبقة
                </h4>
                {depsForSkill(selected.id).map((dep) => {
                  const target = skills.find((s) => s.id === dep.to_skill_id);
                  return target ? (
                    <div
                      key={dep.id}
                      className="text-xs bg-background border border-border rounded-lg p-2 mb-1 cursor-pointer hover:border-primary/30"
                      onClick={() => onSelect(target)}
                    >
                      {target.name_ar || target.name}
                    </div>
                  ) : null;
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Skill Graph (Interactive Force-Directed) ───
interface GraphNode {
  id: string;
  skill: Skill;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  errCount: number;
}

interface GraphEdge {
  from: string;
  to: string;
  type: string;
}

function SkillGraph({
  skills,
  deps,
  errors,
  onSelect,
}: {
  skills: Skill[];
  deps: SkillDep[];
  errors: SkillError[];
  onSelect: (s: Skill) => void;
}) {
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [viewMode, setViewMode] = useState<"domain" | "bloom">("domain");

  const errorCountMap = useMemo(() => {
    const m: Record<string, number> = {};
    errors.forEach((e) => { m[e.skill_id] = (m[e.skill_id] || 0) + 1; });
    return m;
  }, [errors]);

  const activeDomains = useMemo(() => {
    const ds = new Set<string>();
    skills.forEach((s) => ds.add(s.domain || "other"));
    return Array.from(ds).sort();
  }, [skills]);

  const filteredSkills = useMemo(() => {
    if (domainFilter === "all") return skills;
    return skills.filter((s) => s.domain === domainFilter);
  }, [skills, domainFilter]);

  // Group skills by domain → subdomain
  const grouped = useMemo(() => {
    const map: Record<string, Record<string, Skill[]>> = {};
    filteredSkills.forEach((s) => {
      const d = s.domain || "other";
      const sd = s.subdomain || "عام";
      if (!map[d]) map[d] = {};
      if (!map[d][sd]) map[d][sd] = [];
      map[d][sd].push(s);
    });
    return map;
  }, [filteredSkills]);

  // Group by bloom level
  const bloomGrouped = useMemo(() => {
    const map: Record<number, Skill[]> = {};
    filteredSkills.forEach((s) => {
      const bl = s.bloom_level || 1;
      if (!map[bl]) map[bl] = [];
      map[bl].push(s);
    });
    return map;
  }, [filteredSkills]);

  // Dependency info for selected skill
  const selectedDeps = useMemo(() => {
    if (!selectedSkill) return { prerequisites: [] as Skill[], dependents: [] as Skill[] };
    const prereqIds = deps.filter(d => d.to_skill_id === selectedSkill.id).map(d => d.from_skill_id);
    const depIds = deps.filter(d => d.from_skill_id === selectedSkill.id).map(d => d.to_skill_id);
    return {
      prerequisites: skills.filter(s => prereqIds.includes(s.id)),
      dependents: skills.filter(s => depIds.includes(s.id)),
    };
  }, [selectedSkill, deps, skills]);

  const DOMAIN_SVG: Record<string, (size: number, color: string) => React.ReactNode> = {
    algebra: (sz, c) => (
      <svg width={sz} height={sz} viewBox="0 0 32 32" fill="none">
        <rect x="2" y="2" width="28" height="28" rx="6" fill={c} fillOpacity="0.15" stroke={c} strokeWidth="1.5"/>
        <text x="16" y="21" textAnchor="middle" fill={c} fontSize="16" fontWeight="bold" fontFamily="serif">x²</text>
      </svg>
    ),
    geometry: (sz, c) => (
      <svg width={sz} height={sz} viewBox="0 0 32 32" fill="none">
        <rect x="2" y="2" width="28" height="28" rx="6" fill={c} fillOpacity="0.15" stroke={c} strokeWidth="1.5"/>
        <polygon points="16,6 6,26 26,26" fill="none" stroke={c} strokeWidth="1.8" strokeLinejoin="round"/>
        <circle cx="16" cy="20" r="2" fill={c}/>
      </svg>
    ),
    statistics: (sz, c) => (
      <svg width={sz} height={sz} viewBox="0 0 32 32" fill="none">
        <rect x="2" y="2" width="28" height="28" rx="6" fill={c} fillOpacity="0.15" stroke={c} strokeWidth="1.5"/>
        <rect x="7" y="18" width="4" height="8" rx="1" fill={c} fillOpacity="0.6"/>
        <rect x="14" y="12" width="4" height="14" rx="1" fill={c} fillOpacity="0.8"/>
        <rect x="21" y="8" width="4" height="18" rx="1" fill={c}/>
      </svg>
    ),
    probability: (sz, c) => (
      <svg width={sz} height={sz} viewBox="0 0 32 32" fill="none">
        <rect x="2" y="2" width="28" height="28" rx="6" fill={c} fillOpacity="0.15" stroke={c} strokeWidth="1.5"/>
        <circle cx="16" cy="16" r="8" fill="none" stroke={c} strokeWidth="1.5"/>
        <circle cx="12" cy="14" r="1.5" fill={c}/><circle cx="20" cy="14" r="1.5" fill={c}/>
        <circle cx="16" cy="19" r="1.5" fill={c}/>
      </svg>
    ),
    functions: (sz, c) => (
      <svg width={sz} height={sz} viewBox="0 0 32 32" fill="none">
        <rect x="2" y="2" width="28" height="28" rx="6" fill={c} fillOpacity="0.15" stroke={c} strokeWidth="1.5"/>
        <text x="16" y="22" textAnchor="middle" fill={c} fontSize="18" fontWeight="bold" fontStyle="italic" fontFamily="serif">ƒ</text>
      </svg>
    ),
  };

  const defaultSvg = (sz: number, c: string) => (
    <svg width={sz} height={sz} viewBox="0 0 32 32" fill="none">
      <rect x="2" y="2" width="28" height="28" rx="6" fill={c} fillOpacity="0.15" stroke={c} strokeWidth="1.5"/>
      <circle cx="16" cy="16" r="6" fill="none" stroke={c} strokeWidth="1.5"/>
      <circle cx="16" cy="16" r="2" fill={c}/>
    </svg>
  );

  const handleClick = (s: Skill) => {
    setSelectedSkill(prev => prev?.id === s.id ? null : s);
    onSelect(s);
  };

  if (skills.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Brain size={48} className="mx-auto mb-4 opacity-30" />
        <p className="text-lg">لا توجد مهارات بعد — ارفع منهجاً أولاً</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-muted-foreground">التنظيم:</span>
          {(["domain", "bloom"] as const).map(m => (
            <button key={m} onClick={() => setViewMode(m)}
              className="px-2.5 py-1 rounded-md text-[11px] font-bold transition-all"
              style={{
                background: viewMode === m ? "hsl(var(--primary))" : "transparent",
                color: viewMode === m ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
              }}>
              {m === "domain" ? "📂 حسب المجال" : "🧠 حسب بلوم"}
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-border" />
        <div className="flex items-center gap-1.5 flex-wrap">
          <button onClick={() => setDomainFilter("all")}
            className="px-2 py-1 rounded-md text-[11px] font-bold transition-all"
            style={{
              background: domainFilter === "all" ? "hsl(var(--primary))" : "transparent",
              color: domainFilter === "all" ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
            }}>الكل ({skills.length})</button>
          {activeDomains.map(d => {
            const count = skills.filter(s => s.domain === d).length;
            return (
              <button key={d} onClick={() => setDomainFilter(d)}
                className="px-2 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1"
                style={{
                  background: domainFilter === d ? (DOMAIN_COLORS[d] || DOMAIN_COLORS.other) : "transparent",
                  color: domainFilter === d ? "#fff" : (DOMAIN_COLORS[d] || DOMAIN_COLORS.other),
                }}>
                {DOMAIN_ICONS[d] || "•"} {d} ({count})
              </button>
            );
          })}
        </div>
        <span className="text-[10px] text-muted-foreground mr-auto">{filteredSkills.length} مهارة · {deps.length} رابط · {errors.length} خطأ</span>
      </div>

      <div className="flex gap-4">
        {/* Main content */}
        <div className="flex-1 space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          {viewMode === "domain" ? (
            Object.entries(grouped).sort((a, b) => Object.values(b[1]).flat().length - Object.values(a[1]).flat().length).map(([domain, subdomains]) => {
              const domainColor = DOMAIN_COLORS[domain] || DOMAIN_COLORS.other;
              const domainSkills = Object.values(subdomains).flat();
              const domainErrors = domainSkills.reduce((sum, s) => sum + (errorCountMap[s.id] || 0), 0);
              const avgBloom = domainSkills.length > 0 ? (domainSkills.reduce((sum, s) => sum + (s.bloom_level || 1), 0) / domainSkills.length).toFixed(1) : "0";
              return (
                <div key={domain} className="rounded-xl border border-border bg-card overflow-hidden">
                  {/* Domain header */}
                  <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: `2px solid ${domainColor}30` }}>
                    {(DOMAIN_SVG[domain] || defaultSvg)(28, domainColor)}
                    <div>
                      <h3 className="text-sm font-black text-foreground capitalize">{domain}</h3>
                      <p className="text-[10px] text-muted-foreground">{domainSkills.length} مهارة · {Object.keys(subdomains).length} فرع · بلوم {avgBloom}</p>
                    </div>
                    {domainErrors > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive text-[10px] font-bold mr-auto">⚠ {domainErrors} خطأ</span>
                    )}
                  </div>
                  {/* Subdomains */}
                  <div className="p-3 space-y-3">
                    {Object.entries(subdomains).sort((a, b) => b[1].length - a[1].length).map(([subdomain, sSkills]) => (
                      <div key={subdomain}>
                        <p className="text-[10px] font-bold text-muted-foreground mb-1.5 px-1">{subdomain} ({sSkills.length})</p>
                        <div className="flex flex-wrap gap-1.5">
                          {sSkills.sort((a, b) => (a.bloom_level || 1) - (b.bloom_level || 1)).map(s => {
                            const isSelected = selectedSkill?.id === s.id;
                            const errCount = errorCountMap[s.id] || 0;
                            const bloomColor = ["", "#94a3b8", "#60a5fa", "#34d399", "#fbbf24", "#f97316", "#ef4444"][s.bloom_level || 1];
                            return (
                              <button key={s.id} onClick={() => handleClick(s)}
                                className="group relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border"
                                style={{
                                  background: isSelected ? `${domainColor}20` : "hsl(var(--muted)/0.5)",
                                  borderColor: isSelected ? domainColor : "hsl(var(--border))",
                                  color: isSelected ? domainColor : "hsl(var(--foreground))",
                                }}>
                                {/* Bloom dot */}
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: bloomColor }} title={`B${s.bloom_level}`} />
                                {s.name_ar || s.name}
                                {/* Difficulty bars */}
                                <span className="flex gap-px ml-1">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <span key={i} className="w-1 rounded-sm" style={{
                                      height: 6 + i,
                                      backgroundColor: i < (s.difficulty || 1) ? domainColor : "hsl(var(--border))",
                                      opacity: i < (s.difficulty || 1) ? 0.7 : 0.3,
                                    }} />
                                  ))}
                                </span>
                                {errCount > 0 && (
                                  <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-destructive text-[8px] text-white flex items-center justify-center font-bold">{errCount}</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            /* Bloom hierarchy view */
            [1, 2, 3, 4, 5, 6].map(level => {
              const levelSkills = bloomGrouped[level] || [];
              if (levelSkills.length === 0) return null;
              const bloomColors = ["", "#94a3b8", "#60a5fa", "#34d399", "#fbbf24", "#f97316", "#ef4444"];
              const bloomNames = ["", "B1 · تذكر", "B2 · فهم", "B3 · تطبيق", "B4 · تحليل", "B5 · تقييم", "B6 · إبداع"];
              return (
                <div key={level} className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="px-4 py-2.5 flex items-center gap-3" style={{ borderBottom: `2px solid ${bloomColors[level]}30` }}>
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: bloomColors[level] }} />
                    <span className="text-sm font-black text-foreground">{bloomNames[level]}</span>
                    <span className="text-[10px] text-muted-foreground">{levelSkills.length} مهارة</span>
                  </div>
                  <div className="p-3 flex flex-wrap gap-1.5">
                    {levelSkills.map(s => {
                      const domainColor = DOMAIN_COLORS[s.domain] || DOMAIN_COLORS.other;
                      const isSelected = selectedSkill?.id === s.id;
                      const errCount = errorCountMap[s.id] || 0;
                      return (
                        <button key={s.id} onClick={() => handleClick(s)}
                          className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all border"
                          style={{
                            background: isSelected ? `${domainColor}20` : "hsl(var(--muted)/0.5)",
                            borderColor: isSelected ? domainColor : "hsl(var(--border))",
                            color: isSelected ? domainColor : "hsl(var(--foreground))",
                          }}>
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: domainColor }} />
                          {s.name_ar || s.name}
                          {errCount > 0 && (
                            <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-destructive text-[8px] text-white flex items-center justify-center font-bold">{errCount}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detail panel */}
        <div className="w-72 shrink-0 space-y-3">
          {selectedSkill ? (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
              className="rounded-xl border border-border bg-card p-4 space-y-3 sticky top-20">
              <div className="flex items-center gap-2">
                {(DOMAIN_SVG[selectedSkill.domain] || defaultSvg)(24, DOMAIN_COLORS[selectedSkill.domain] || DOMAIN_COLORS.other)}
                <div>
                  <h3 className="text-sm font-black text-foreground">{selectedSkill.name_ar || selectedSkill.name}</h3>
                  {selectedSkill.name_ar && <p className="text-[10px] text-muted-foreground font-mono">{selectedSkill.name}</p>}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">{selectedSkill.description}</p>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded text-[9px] font-bold" style={{ background: `${DOMAIN_COLORS[selectedSkill.domain]}20`, color: DOMAIN_COLORS[selectedSkill.domain] }}>
                  {selectedSkill.domain} · {selectedSkill.subdomain}
                </span>
                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[9px] font-bold">
                  B{selectedSkill.bloom_level} · {BLOOM_LABELS[selectedSkill.bloom_level] || ""}
                </span>
                <span className="px-2 py-0.5 rounded bg-muted text-muted-foreground text-[9px] font-bold">
                  صعوبة {selectedSkill.difficulty}/5
                </span>
              </div>
              {/* Dependencies */}
              {selectedDeps.prerequisites.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground mb-1">⬆ يعتمد على:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedDeps.prerequisites.map(s => (
                      <span key={s.id} className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] cursor-pointer" onClick={() => handleClick(s)}>
                        {s.name_ar || s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {selectedDeps.dependents.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-muted-foreground mb-1">⬇ تعتمد عليه:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedDeps.dependents.map(s => (
                      <span key={s.id} className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 text-[10px] cursor-pointer" onClick={() => handleClick(s)}>
                        {s.name_ar || s.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {/* Errors for this skill */}
              {(errorCountMap[selectedSkill.id] || 0) > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-destructive mb-1">⚠ الأخطاء الشائعة:</p>
                  {errors.filter(e => e.skill_id === selectedSkill.id).map(e => (
                    <div key={e.id} className="text-[10px] text-muted-foreground bg-destructive/5 rounded p-1.5 mb-1">
                      {e.error_description}
                      {e.fix_hint && <p className="text-primary mt-0.5">💡 {e.fix_hint}</p>}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <h3 className="text-xs font-black text-foreground">📖 دليل القراءة</h3>
              <div className="space-y-2 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#94a3b8]" /> B1 تذكر
                  <span className="w-2 h-2 rounded-full bg-[#60a5fa]" /> B2 فهم
                  <span className="w-2 h-2 rounded-full bg-[#34d399]" /> B3 تطبيق
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#fbbf24]" /> B4 تحليل
                  <span className="w-2 h-2 rounded-full bg-[#f97316]" /> B5 تقييم
                  <span className="w-2 h-2 rounded-full bg-[#ef4444]" /> B6 إبداع
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <span className="flex gap-px">
                    {[1,2,3].map(i => <span key={i} className="w-1 rounded-sm bg-primary/50" style={{ height: 4+i }} />)}
                  </span>
                  <span>أشرطة الصعوبة</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 rounded-full bg-destructive text-[8px] text-white flex items-center justify-center font-bold">3</span>
                  <span>عدد الأخطاء</span>
                </div>
              </div>
              <p className="text-[10px] text-primary">👆 انقر على مهارة لرؤية التفاصيل</p>

              {/* Summary stats */}
              <div className="border-t border-border pt-3 space-y-1.5">
                {activeDomains.map(d => {
                  const count = skills.filter(s => s.domain === d).length;
                  const pct = skills.length > 0 ? Math.round((count / skills.length) * 100) : 0;
                  const color = DOMAIN_COLORS[d] || DOMAIN_COLORS.other;
                  return (
                    <div key={d} className="flex items-center gap-2">
                      <span className="text-[10px] font-medium text-foreground w-16 truncate">{d}</span>
                      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                      <span className="text-[9px] text-muted-foreground w-6 text-left">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Errors Panel ───
function ErrorsPanel({ errors, skills }: { errors: SkillError[]; skills: Skill[] }) {
  const grouped = useMemo(() => {
    const m: Record<string, { skill: Skill; errors: SkillError[] }> = {};
    errors.forEach((e) => {
      if (!m[e.skill_id]) {
        const skill = skills.find((s) => s.id === e.skill_id);
        if (skill) m[e.skill_id] = { skill, errors: [] };
      }
      m[e.skill_id]?.errors.push(e);
    });
    return Object.values(m).sort((a, b) => b.errors.length - a.errors.length);
  }, [errors, skills]);

  const byType = useMemo(() => {
    const m: Record<string, number> = {};
    errors.forEach((e) => {
      m[e.error_type] = (m[e.error_type] || 0) + 1;
    });
    return m;
  }, [errors]);

  if (errors.length === 0) {
    return <div className="text-center py-20 text-muted-foreground text-sm">لا توجد أخطاء مسجلة بعد</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        {Object.entries(byType).map(([type, count]) => (
          <div key={type} className="bg-card border border-border rounded-lg px-4 py-2 text-center">
            <div className="text-lg font-bold text-destructive">{count}</div>
            <div className="text-[10px] text-muted-foreground">{type}</div>
          </div>
        ))}
      </div>

      {grouped.map(({ skill, errors: errs }) => (
        <div key={skill.id} className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-bold text-sm text-foreground mb-2 flex items-center gap-2">
            <span style={{ color: DOMAIN_COLORS[skill.domain] }}>{DOMAIN_ICONS[skill.domain]}</span>
            {skill.name_ar || skill.name}
            <Badge variant="destructive" className="text-[10px]">
              {errs.length} أخطاء
            </Badge>
          </h3>
          <div className="grid gap-2">
            {errs.map((err) => (
              <div
                key={err.id}
                className="bg-destructive/5 border border-destructive/10 rounded-lg p-3 flex items-start gap-3"
              >
                <AlertTriangle size={14} className="text-destructive mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-foreground">{err.error_description}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-[9px]">
                      {err.error_type}
                    </Badge>
                    <Badge
                      variant={
                        err.severity === "high" ? "destructive" : err.severity === "medium" ? "secondary" : "outline"
                      }
                      className="text-[9px]"
                    >
                      {err.severity}
                    </Badge>
                  </div>
                  {err.fix_hint && <div className="text-[10px] text-primary mt-1.5">💡 الإصلاح: {err.fix_hint}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Courses Panel ───
function CoursesPanel({ courses, skills }: { courses: Course[]; skills: Skill[] }) {
  if (courses.length === 0) {
    return <div className="text-center py-20 text-muted-foreground text-sm">لم يتم رفع كورسات بعد</div>;
  }

  return (
    <div className="grid gap-3">
      {courses.map((course) => {
        const extractedCount = Array.isArray(course.extracted_skills) ? course.extracted_skills.length : 0;
        return (
          <div key={course.id} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-foreground text-sm">{course.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{course.description?.slice(0, 100)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{course.grade}</Badge>
                <Badge
                  variant={
                    course.status === "completed" ? "default" : course.status === "processing" ? "secondary" : "outline"
                  }
                >
                  {course.status === "completed" ? "✅ مكتمل" : course.status === "processing" ? "⏳ معالجة" : "⏸ معلق"}
                </Badge>
                {extractedCount > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    <Brain size={10} className="ml-0.5" /> {extractedCount} مهارة
                  </Badge>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
