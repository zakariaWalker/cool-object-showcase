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
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const animRef = useRef<number>(0);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"radial" | "cluster" | "hierarchy">("radial");

  // Camera state
  const camRef = useRef({ x: 0, y: 0, zoom: 1 });
  const dragRef = useRef<{ active: boolean; startX: number; startY: number; camStartX: number; camStartY: number }>({
    active: false, startX: 0, startY: 0, camStartX: 0, camStartY: 0,
  });

  const errorCountMap = useMemo(() => {
    const m: Record<string, number> = {};
    errors.forEach((e) => { m[e.skill_id] = (m[e.skill_id] || 0) + 1; });
    return m;
  }, [errors]);

  const filteredSkills = useMemo(() => {
    if (domainFilter === "all") return skills;
    return skills.filter((s) => s.domain === domainFilter);
  }, [skills, domainFilter]);

  const activeDomains = useMemo(() => {
    const ds = new Set<string>();
    skills.forEach((s) => ds.add(s.domain || "other"));
    return Array.from(ds);
  }, [skills]);

  // Initialize node positions with radial / cluster / hierarchy layout
  useEffect(() => {
    if (filteredSkills.length === 0) return;

    const byDomain: Record<string, Skill[]> = {};
    filteredSkills.forEach((s) => {
      const d = s.domain || "other";
      if (!byDomain[d]) byDomain[d] = [];
      byDomain[d].push(s);
    });

    const domains = Object.keys(byDomain);
    const cX = 600, cY = 400;
    const nodes: GraphNode[] = [];

    if (viewMode === "radial") {
      domains.forEach((domain, di) => {
        const angle = (di / domains.length) * Math.PI * 2 - Math.PI / 2;
        const clusterRadius = 180 + domains.length * 15;
        const cx = cX + Math.cos(angle) * clusterRadius;
        const cy = cY + Math.sin(angle) * clusterRadius;
        const items = byDomain[domain];
        items.forEach((skill, si) => {
          const subAngle = (si / items.length) * Math.PI * 2;
          const subR = 30 + items.length * 10;
          const baseR = 14 + (skill.difficulty || 1) * 3;
          nodes.push({
            id: skill.id, skill,
            x: cx + Math.cos(subAngle) * subR + (Math.random() - 0.5) * 20,
            y: cy + Math.sin(subAngle) * subR + (Math.random() - 0.5) * 20,
            vx: 0, vy: 0,
            radius: baseR,
            errCount: errorCountMap[skill.id] || 0,
          });
        });
      });
    } else if (viewMode === "cluster") {
      const cols = Math.ceil(Math.sqrt(domains.length));
      domains.forEach((domain, di) => {
        const col = di % cols;
        const row = Math.floor(di / cols);
        const cx = 200 + col * 380;
        const cy = 200 + row * 380;
        const items = byDomain[domain];
        items.forEach((skill, si) => {
          const gridCols = Math.ceil(Math.sqrt(items.length));
          const gCol = si % gridCols;
          const gRow = Math.floor(si / gridCols);
          const baseR = 14 + (skill.difficulty || 1) * 3;
          nodes.push({
            id: skill.id, skill,
            x: cx + (gCol - gridCols / 2) * 65 + (Math.random() - 0.5) * 10,
            y: cy + (gRow - gridCols / 2) * 65 + (Math.random() - 0.5) * 10,
            vx: 0, vy: 0,
            radius: baseR,
            errCount: errorCountMap[skill.id] || 0,
          });
        });
      });
    } else {
      // hierarchy: sort by bloom level top->bottom
      const sorted = [...filteredSkills].sort((a, b) => (a.bloom_level || 1) - (b.bloom_level || 1));
      const bloomGroups: Record<number, Skill[]> = {};
      sorted.forEach((s) => {
        const bl = s.bloom_level || 1;
        if (!bloomGroups[bl]) bloomGroups[bl] = [];
        bloomGroups[bl].push(s);
      });
      const levels = Object.keys(bloomGroups).map(Number).sort();
      levels.forEach((lvl, li) => {
        const items = bloomGroups[lvl];
        items.forEach((skill, si) => {
          const baseR = 14 + (skill.difficulty || 1) * 3;
          nodes.push({
            id: skill.id, skill,
            x: 200 + (si - items.length / 2) * 70 + (Math.random() - 0.5) * 10,
            y: 100 + li * 120,
            vx: 0, vy: 0,
            radius: baseR,
            errCount: errorCountMap[skill.id] || 0,
          });
        });
      });
    }

    const edges: GraphEdge[] = deps
      .filter((d) => nodes.some((n) => n.id === d.from_skill_id) && nodes.some((n) => n.id === d.to_skill_id))
      .map((d) => ({ from: d.from_skill_id, to: d.to_skill_id, type: d.dependency_type }));

    nodesRef.current = nodes;
    edgesRef.current = edges;

    // Light force simulation (30 iterations)
    for (let iter = 0; iter < 30; iter++) {
      const nodeMap: Record<string, GraphNode> = {};
      nodesRef.current.forEach((n) => { nodeMap[n.id] = n; });

      // Repulsion
      for (let i = 0; i < nodesRef.current.length; i++) {
        for (let j = i + 1; j < nodesRef.current.length; j++) {
          const a = nodesRef.current[i], b = nodesRef.current[j];
          let dx = b.x - a.x, dy = b.y - a.y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const minDist = a.radius + b.radius + 30;
          if (dist < minDist) {
            const force = (minDist - dist) * 0.3;
            const fx = (dx / dist) * force, fy = (dy / dist) * force;
            a.x -= fx; a.y -= fy;
            b.x += fx; b.y += fy;
          }
        }
      }
      // Edge attraction
      edges.forEach((e) => {
        const a = nodeMap[e.from], b = nodeMap[e.to];
        if (!a || !b) return;
        let dx = b.x - a.x, dy = b.y - a.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const targetDist = 100;
        if (dist > targetDist) {
          const force = (dist - targetDist) * 0.01;
          const fx = (dx / dist) * force, fy = (dy / dist) * force;
          a.x += fx; a.y += fy;
          b.x -= fx; b.y -= fy;
        }
      });
    }

    // Center camera on the graph
    if (nodesRef.current.length > 0) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      nodesRef.current.forEach((n) => {
        minX = Math.min(minX, n.x - n.radius);
        maxX = Math.max(maxX, n.x + n.radius);
        minY = Math.min(minY, n.y - n.radius);
        maxY = Math.max(maxY, n.y + n.radius);
      });
      const gw = maxX - minX + 200, gh = maxY - minY + 200;
      const container = containerRef.current;
      if (container) {
        const cw = container.clientWidth, ch = container.clientHeight;
        const zoom = Math.min(cw / gw, ch / gh, 1.5);
        camRef.current = {
          x: -(minX - 100) * zoom + (cw - gw * zoom) / 2,
          y: -(minY - 100) * zoom + (ch - gh * zoom) / 2,
          zoom,
        };
      }
    }
  }, [filteredSkills, deps, errorCountMap, viewMode]);

  // Canvas rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      const container = containerRef.current;
      if (!container) return;
      canvas.width = container.clientWidth * dpr;
      canvas.height = container.clientHeight * dpr;
      canvas.style.width = container.clientWidth + "px";
      canvas.style.height = container.clientHeight + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const domainColorValues: Record<string, string> = {
      algebra: "#6366f1",
      geometry: "#f59e0b",
      statistics: "#10b981",
      probability: "#ef4444",
      functions: "#8b5cf6",
      other: "#64748b",
    };

    const bloomLabels = ["", "تذكر", "فهم", "تطبيق", "تحليل", "تقييم", "إبداع"];

    function hexToRgb(hex: string) {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    }

    let frameTime = 0;
    function draw() {
      if (!ctx || !canvas) return;
      const w = canvas.width / dpr, h = canvas.height / dpr;
      const cam = camRef.current;
      frameTime += 0.016;

      ctx.clearRect(0, 0, w, h);

      // Background subtle grid
      ctx.save();
      ctx.translate(cam.x, cam.y);
      ctx.scale(cam.zoom, cam.zoom);

      const gridSize = 50;
      ctx.strokeStyle = "rgba(120, 120, 140, 0.06)";
      ctx.lineWidth = 0.5 / cam.zoom;
      const startX = Math.floor(-cam.x / cam.zoom / gridSize) * gridSize - gridSize;
      const startY = Math.floor(-cam.y / cam.zoom / gridSize) * gridSize - gridSize;
      const endX = startX + w / cam.zoom + gridSize * 2;
      const endY = startY + h / cam.zoom + gridSize * 2;
      for (let gx = startX; gx < endX; gx += gridSize) {
        ctx.beginPath(); ctx.moveTo(gx, startY); ctx.lineTo(gx, endY); ctx.stroke();
      }
      for (let gy = startY; gy < endY; gy += gridSize) {
        ctx.beginPath(); ctx.moveTo(startX, gy); ctx.lineTo(endX, gy); ctx.stroke();
      }

      const nodes = nodesRef.current;
      const edges = edgesRef.current;
      const nodeMap: Record<string, GraphNode> = {};
      nodes.forEach((n) => { nodeMap[n.id] = n; });

      // Draw domain zone backgrounds (faint circles)
      if (viewMode === "radial") {
        const byDomain: Record<string, GraphNode[]> = {};
        nodes.forEach((n) => {
          const d = n.skill.domain || "other";
          if (!byDomain[d]) byDomain[d] = [];
          byDomain[d].push(n);
        });
        Object.entries(byDomain).forEach(([domain, dns]) => {
          if (dns.length < 2) return;
          let cx = 0, cy = 0;
          dns.forEach((n) => { cx += n.x; cy += n.y; });
          cx /= dns.length; cy /= dns.length;
          let maxR = 0;
          dns.forEach((n) => {
            const d = Math.sqrt((n.x - cx) ** 2 + (n.y - cy) ** 2) + n.radius;
            if (d > maxR) maxR = d;
          });
          const color = domainColorValues[domain] || domainColorValues.other;
          const rgb = hexToRgb(color);
          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR + 40);
          grad.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.06)`);
          grad.addColorStop(0.7, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.03)`);
          grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(cx, cy, maxR + 40, 0, Math.PI * 2);
          ctx.fill();

          // Domain label
          ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.4)`;
          ctx.font = `bold ${14 / cam.zoom > 14 ? 14 : Math.max(10, 14)}px Inter, system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText(
            `${DOMAIN_ICONS[domain] || "•"} ${domain}`,
            cx, cy - maxR - 18,
          );
        });
      }

      // Draw edges (bezier curves)
      edges.forEach((edge) => {
        const from = nodeMap[edge.from], to = nodeMap[edge.to];
        if (!from || !to) return;

        const isHighlighted = hoveredNode && (hoveredNode.id === edge.from || hoveredNode.id === edge.to);
        const isSelected = selectedNode && (selectedNode.id === edge.from || selectedNode.id === edge.to);
        const opacity = hoveredNode
          ? (isHighlighted ? 0.8 : 0.08)
          : selectedNode
            ? (isSelected ? 0.9 : 0.08)
            : 0.2;

        const dx = to.x - from.x, dy = to.y - from.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const perpX = -dy / dist * 25, perpY = dx / dist * 25;
        const midX = (from.x + to.x) / 2 + perpX;
        const midY = (from.y + to.y) / 2 + perpY;

        // Edge color from source domain
        const edgeColor = domainColorValues[from.skill.domain] || domainColorValues.other;
        const rgb = hexToRgb(edgeColor);

        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
        ctx.lineWidth = isHighlighted || isSelected ? 2.5 : 1.2;
        if (edge.type === "enhances") {
          ctx.setLineDash([6, 4]);
        } else {
          ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.quadraticCurveTo(midX, midY, to.x, to.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Arrowhead
        const t = 0.85;
        const arrowX = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * midX + t * t * to.x;
        const arrowY = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * midY + t * t * to.y;
        const tangentX = 2 * (1 - t) * (midX - from.x) + 2 * t * (to.x - midX);
        const tangentY = 2 * (1 - t) * (midY - from.y) + 2 * t * (to.y - midY);
        const angle = Math.atan2(tangentY, tangentX);
        const arrowSize = isHighlighted || isSelected ? 8 : 5;

        ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
        ctx.beginPath();
        ctx.moveTo(arrowX + Math.cos(angle) * arrowSize, arrowY + Math.sin(angle) * arrowSize);
        ctx.lineTo(arrowX + Math.cos(angle + 2.5) * arrowSize, arrowY + Math.sin(angle + 2.5) * arrowSize);
        ctx.lineTo(arrowX + Math.cos(angle - 2.5) * arrowSize, arrowY + Math.sin(angle - 2.5) * arrowSize);
        ctx.closePath();
        ctx.fill();
      });

      // Draw nodes
      nodes.forEach((node) => {
        const color = domainColorValues[node.skill.domain] || domainColorValues.other;
        const rgb = hexToRgb(color);
        const isHovered = hoveredNode?.id === node.id;
        const isSel = selectedNode?.id === node.id;
        const isConnected = hoveredNode && edges.some(
          (e) => (e.from === hoveredNode.id && e.to === node.id) || (e.to === hoveredNode.id && e.from === node.id),
        );
        const dimmed = (hoveredNode && !isHovered && !isConnected) || (selectedNode && !isSel && !edges.some(
          (e) => (e.from === selectedNode.id && e.to === node.id) || (e.to === selectedNode.id && e.from === node.id),
        ));

        const r = node.radius;
        const alphaBase = dimmed ? 0.15 : 1;

        // Outer glow
        if ((isHovered || isSel) && !dimmed) {
          const glow = ctx.createRadialGradient(node.x, node.y, r, node.x, node.y, r * 2.5);
          glow.addColorStop(0, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0.3)`);
          glow.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 0)`);
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(node.x, node.y, r * 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Animated pulse ring for hovered
        if (isHovered) {
          const pulseR = r + 4 + Math.sin(frameTime * 4) * 3;
          ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${0.4 + Math.sin(frameTime * 4) * 0.15})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(node.x, node.y, pulseR, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Main circle with gradient
        const grad = ctx.createRadialGradient(node.x - r * 0.3, node.y - r * 0.3, 0, node.x, node.y, r);
        if (isSel || isHovered) {
          grad.addColorStop(0, `rgba(${Math.min(255, rgb.r + 60)}, ${Math.min(255, rgb.g + 60)}, ${Math.min(255, rgb.b + 60)}, ${alphaBase})`);
          grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alphaBase})`);
        } else {
          grad.addColorStop(0, `rgba(${Math.min(255, rgb.r + 40)}, ${Math.min(255, rgb.g + 40)}, ${Math.min(255, rgb.b + 40)}, ${alphaBase * 0.85})`);
          grad.addColorStop(1, `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alphaBase * 0.7})`);
        }
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fill();

        // Border
        ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${dimmed ? 0.1 : (isHovered || isSel ? 1 : 0.5)})`;
        ctx.lineWidth = isHovered || isSel ? 2.5 : 1;
        ctx.stroke();

        // Bloom level ring (outer arc)
        const bloomFrac = (node.skill.bloom_level || 1) / 6;
        ctx.strokeStyle = `rgba(255, 255, 255, ${dimmed ? 0.05 : 0.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 3, -Math.PI / 2, -Math.PI / 2 + bloomFrac * Math.PI * 2);
        ctx.stroke();

        // Label inside node
        if (!dimmed) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
          ctx.font = `bold ${Math.max(7, r * 0.55)}px Inter, system-ui, sans-serif`;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          const label = (node.skill.name_ar || node.skill.name).slice(0, 8);
          ctx.fillText(label, node.x, node.y);
        }

        // Error indicator badge
        if (node.errCount > 0 && !dimmed) {
          const badgeR = 7;
          const bx = node.x + r * 0.7, by = node.y - r * 0.7;
          ctx.fillStyle = "#ef4444";
          ctx.beginPath();
          ctx.arc(bx, by, badgeR, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.font = "bold 8px Inter, system-ui, sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(String(node.errCount), bx, by);
        }

        // Difficulty dots below node
        if (!dimmed) {
          const diff = node.skill.difficulty || 1;
          const dotStartX = node.x - (diff - 1) * 4;
          for (let d = 0; d < diff; d++) {
            ctx.fillStyle = `rgba(255, 255, 255, ${d < diff ? 0.7 : 0.2})`;
            ctx.beginPath();
            ctx.arc(dotStartX + d * 8, node.y + r + 7, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });

      ctx.restore();

      // ── Mini-map ──
      const mmW = 140, mmH = 100;
      const mmX = w - mmW - 12, mmY = h - mmH - 12;
      ctx.fillStyle = "rgba(15, 15, 25, 0.7)";
      ctx.strokeStyle = "rgba(100, 100, 120, 0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(mmX, mmY, mmW, mmH, 8);
      ctx.fill();
      ctx.stroke();

      if (nodes.length > 0) {
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        nodes.forEach((n) => {
          minX = Math.min(minX, n.x); maxX = Math.max(maxX, n.x);
          minY = Math.min(minY, n.y); maxY = Math.max(maxY, n.y);
        });
        const gw = maxX - minX + 100, gh = maxY - minY + 100;
        const mmScale = Math.min((mmW - 16) / gw, (mmH - 16) / gh);
        const mmOx = mmX + 8 + ((mmW - 16) - gw * mmScale) / 2;
        const mmOy = mmY + 8 + ((mmH - 16) - gh * mmScale) / 2;

        nodes.forEach((n) => {
          const color = domainColorValues[n.skill.domain] || domainColorValues.other;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(
            mmOx + (n.x - minX + 50) * mmScale,
            mmOy + (n.y - minY + 50) * mmScale,
            2, 0, Math.PI * 2,
          );
          ctx.fill();
        });

        // Viewport rect
        const vpX = (-cam.x / cam.zoom - minX + 50) * mmScale + mmOx;
        const vpY = (-cam.y / cam.zoom - minY + 50) * mmScale + mmOy;
        const vpW = (w / cam.zoom) * mmScale;
        const vpH = (h / cam.zoom) * mmScale;
        ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
        ctx.lineWidth = 1;
        ctx.strokeRect(vpX, vpY, vpW, vpH);
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [hoveredNode, selectedNode, viewMode]);

  // Mouse interaction handlers
  const screenToWorld = useCallback((sx: number, sy: number) => {
    const cam = camRef.current;
    return { x: (sx - cam.x) / cam.zoom, y: (sy - cam.y) / cam.zoom };
  }, []);

  const getNodeAt = useCallback((wx: number, wy: number): GraphNode | null => {
    const nodes = nodesRef.current;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const n = nodes[i];
      const dx = wx - n.x, dy = wy - n.y;
      if (dx * dx + dy * dy <= (n.radius + 4) * (n.radius + 4)) return n;
    }
    return null;
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const wp = screenToWorld(sx, sy);
    const node = getNodeAt(wp.x, wp.y);

    if (node) {
      setSelectedNode((prev) => prev?.id === node.id ? null : node);
      onSelect(node.skill);
    } else {
      setSelectedNode(null);
      dragRef.current = { active: true, startX: e.clientX, startY: e.clientY, camStartX: camRef.current.x, camStartY: camRef.current.y };
    }
  }, [screenToWorld, getNodeAt, onSelect]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;

    if (dragRef.current.active) {
      camRef.current.x = dragRef.current.camStartX + (e.clientX - dragRef.current.startX);
      camRef.current.y = dragRef.current.camStartY + (e.clientY - dragRef.current.startY);
      return;
    }

    const wp = screenToWorld(sx, sy);
    const node = getNodeAt(wp.x, wp.y);
    setHoveredNode(node);
    setTooltipPos({ x: sx, y: sy });
  }, [screenToWorld, getNodeAt]);

  const handleMouseUp = useCallback(() => {
    dragRef.current.active = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const cam = camRef.current;
    const oldZoom = cam.zoom;
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(3, Math.max(0.2, oldZoom * zoomFactor));
    cam.x = sx - (sx - cam.x) * (newZoom / oldZoom);
    cam.y = sy - (sy - cam.y) * (newZoom / oldZoom);
    cam.zoom = newZoom;
  }, []);

  const depDetailsForNode = useCallback((nodeId: string) => {
    const edges = edgesRef.current;
    const nodes = nodesRef.current;
    const deps = edges.filter((e) => e.from === nodeId).map((e) => nodes.find((n) => n.id === e.to)?.skill).filter(Boolean);
    const dependents = edges.filter((e) => e.to === nodeId).map((e) => nodes.find((n) => n.id === e.from)?.skill).filter(Boolean);
    return { deps, dependents };
  }, []);

  if (skills.length === 0) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        <Brain size={48} className="mx-auto mb-4 opacity-30" />
        <p className="text-lg">لا توجد مهارات بعد — ارفع منهجاً أولاً</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Controls bar */}
      <div className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-muted-foreground">العرض:</span>
          {(["radial", "cluster", "hierarchy"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className="px-2.5 py-1 rounded-md text-[11px] font-bold transition-all"
              style={{
                background: viewMode === m ? "hsl(var(--primary))" : "transparent",
                color: viewMode === m ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
              }}
            >
              {m === "radial" ? "🌐 شعاعي" : m === "cluster" ? "🧩 عنقودي" : "📊 هرمي"}
            </button>
          ))}
        </div>
        <div className="w-px h-5 bg-border" />
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-muted-foreground">المجال:</span>
          <button
            onClick={() => setDomainFilter("all")}
            className="px-2 py-1 rounded-md text-[11px] font-bold transition-all"
            style={{
              background: domainFilter === "all" ? "hsl(var(--primary))" : "transparent",
              color: domainFilter === "all" ? "hsl(var(--primary-foreground))" : "hsl(var(--muted-foreground))",
            }}
          >
            الكل
          </button>
          {activeDomains.map((d) => (
            <button
              key={d}
              onClick={() => setDomainFilter(d)}
              className="px-2 py-1 rounded-md text-[11px] font-bold transition-all"
              style={{
                background: domainFilter === d ? DOMAIN_COLORS[d] || DOMAIN_COLORS.other : "transparent",
                color: domainFilter === d ? "#fff" : DOMAIN_COLORS[d] || DOMAIN_COLORS.other,
              }}
            >
              {DOMAIN_ICONS[d] || "•"} {d}
            </button>
          ))}
        </div>
        <div className="mr-auto flex items-center gap-2 text-[10px] text-muted-foreground">
          <span>🖱️ اسحب للتحريك</span>
          <span>🔍 مرر للتكبير</span>
          <span>👆 انقر على مهارة</span>
        </div>
      </div>

      {/* Canvas + Legend */}
      <div className="flex gap-3">
        <div
          ref={containerRef}
          className="flex-1 bg-[#0c0c18] border border-border rounded-xl overflow-hidden relative"
          style={{ height: 560 }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { handleMouseUp(); setHoveredNode(null); }}
            onWheel={handleWheel}
            className="cursor-grab active:cursor-grabbing"
          />

          {/* Tooltip */}
          <AnimatePresence>
            {hoveredNode && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute z-30 pointer-events-none"
                style={{
                  left: Math.min(tooltipPos.x + 16, (containerRef.current?.clientWidth || 600) - 280),
                  top: Math.min(tooltipPos.y - 10, (containerRef.current?.clientHeight || 400) - 180),
                }}
              >
                <div className="bg-card/95 backdrop-blur-xl border border-border rounded-xl p-3 shadow-2xl w-64" dir="rtl">
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: DOMAIN_COLORS[hoveredNode.skill.domain] || DOMAIN_COLORS.other }}
                    />
                    <span className="font-bold text-sm text-foreground">{hoveredNode.skill.name_ar || hoveredNode.skill.name}</span>
                  </div>
                  {hoveredNode.skill.name_ar && (
                    <div className="text-[10px] text-muted-foreground mb-1 font-mono">{hoveredNode.skill.name}</div>
                  )}
                  <p className="text-[11px] text-muted-foreground mb-2 line-clamp-2">{hoveredNode.skill.description}</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[9px] font-bold rounded">
                      {DOMAIN_ICONS[hoveredNode.skill.domain]} {hoveredNode.skill.domain}
                    </span>
                    <span className="px-1.5 py-0.5 bg-secondary text-secondary-foreground text-[9px] font-bold rounded">
                      B{hoveredNode.skill.bloom_level} · {BLOOM_LABELS[hoveredNode.skill.bloom_level] || ""}
                    </span>
                    <span className="px-1.5 py-0.5 bg-secondary text-secondary-foreground text-[9px] font-bold rounded">
                      D{hoveredNode.skill.difficulty}
                    </span>
                    {hoveredNode.errCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-destructive/20 text-destructive text-[9px] font-bold rounded">
                        ⚠ {hoveredNode.errCount} أخطاء
                      </span>
                    )}
                  </div>
                  {(() => {
                    const { deps: skillDeps, dependents } = depDetailsForNode(hoveredNode.id);
                    return (
                      <>
                        {skillDeps.length > 0 && (
                          <div className="text-[10px] text-muted-foreground">
                            <span className="font-bold text-foreground">يعتمد على: </span>
                            {skillDeps.map((s: any) => s.name_ar || s.name).join("، ")}
                          </div>
                        )}
                        {dependents.length > 0 && (
                          <div className="text-[10px] text-muted-foreground mt-0.5">
                            <span className="font-bold text-foreground">تعتمد عليه: </span>
                            {dependents.map((s: any) => s.name_ar || s.name).join("، ")}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Legend sidebar */}
        <div className="w-56 bg-card border border-border rounded-xl p-4 space-y-4 shrink-0">
          <h3 className="text-xs font-black text-foreground">📖 دليل الخريطة</h3>

          {/* Domain legend */}
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-bold text-muted-foreground">المجالات</h4>
            {activeDomains.map((d) => {
              const count = skills.filter((s) => s.domain === d).length;
              return (
                <div key={d} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: DOMAIN_COLORS[d] || DOMAIN_COLORS.other }} />
                  <span className="text-foreground font-medium">{DOMAIN_ICONS[d] || "•"} {d}</span>
                  <span className="mr-auto text-muted-foreground text-[10px]">{count}</span>
                </div>
              );
            })}
          </div>

          {/* Size legend */}
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-bold text-muted-foreground">حجم العقدة = الصعوبة</h4>
            <div className="flex items-end gap-2 justify-center py-1">
              {[1, 2, 3, 4, 5].map((d) => (
                <div key={d} className="flex flex-col items-center gap-1">
                  <div
                    className="rounded-full bg-primary/40"
                    style={{ width: 10 + d * 4, height: 10 + d * 4 }}
                  />
                  <span className="text-[9px] text-muted-foreground">{d}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bloom ring */}
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-bold text-muted-foreground">حلقة بلوم الخارجية</h4>
            <div className="flex flex-wrap gap-1">
              {BLOOM_LABELS.slice(1).map((label, i) => (
                <span key={i} className="px-1.5 py-0.5 bg-secondary text-secondary-foreground text-[9px] rounded">
                  B{i + 1} {label}
                </span>
              ))}
            </div>
          </div>

          {/* Arrows */}
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-bold text-muted-foreground">الأسهم</h4>
            <div className="text-[10px] text-muted-foreground space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-primary" />
                <span>متطلب مسبق</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-0.5 bg-primary/50 border-t border-dashed border-primary" />
                <span>تعزيز / ارتباط</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="border-t border-border pt-3 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">المهارات</span>
              <span className="font-bold text-foreground">{filteredSkills.length}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">الروابط</span>
              <span className="font-bold text-foreground">{edgesRef.current.length}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">الأخطاء</span>
              <span className="font-bold text-destructive">{errors.length}</span>
            </div>
          </div>
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
