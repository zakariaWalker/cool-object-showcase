import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MathExerciseRenderer } from "@/components/MathExerciseRenderer";
import { toast } from "sonner";
import { Plus, Trash2, Sparkles, Eye, Save, RefreshCw, Wand2 } from "lucide-react";

// ─── Local mirror of the safe expression evaluator (so admins can preview without server roundtrips) ───
function tokenize(src: string): any[] {
  const out: any[] = []; let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === " " || c === "\t") { i++; continue; }
    if (c >= "0" && c <= "9") {
      let j = i; while (j < src.length && /[0-9.]/.test(src[j])) j++;
      out.push({ t: "num", v: parseFloat(src.slice(i, j)) }); i = j; continue;
    }
    if (/[a-zA-Z_]/.test(c)) {
      let j = i; while (j < src.length && /[a-zA-Z0-9_]/.test(src[j])) j++;
      out.push({ t: "var", v: src.slice(i, j) }); i = j; continue;
    }
    if (c === "(") { out.push({ t: "lp" }); i++; continue; }
    if (c === ")") { out.push({ t: "rp" }); i++; continue; }
    const two = src.slice(i, i + 2);
    if (["==","!=","<=",">=","&&","||"].includes(two)) { out.push({ t: "op", v: two }); i += 2; continue; }
    if ("+-*/%^<>!".includes(c)) { out.push({ t: "op", v: c }); i++; continue; }
    throw new Error(`bad char ${c}`);
  }
  return out;
}
const PREC: Record<string, number> = { "||":1,"&&":2,"==":3,"!=":3,"<":3,">":3,"<=":3,">=":3,"+":4,"-":4,"*":5,"/":5,"%":5,"^":6,"u-":7,"!":7 };
const RA = new Set(["^","u-","!"]);
function rpn(tokens: any[]) {
  const out: any[] = []; const st: any[] = []; let prev: any = null;
  for (const tk of tokens) {
    if (tk.t === "num" || tk.t === "var") out.push(tk);
    else if (tk.t === "op") {
      let op = tk.v;
      const unary = (op === "-" || op === "!") && (!prev || prev.t === "op" || prev.t === "lp");
      if (unary) op = op === "-" ? "u-" : "!";
      while (st.length) {
        const top = st[st.length-1]; if (top.t !== "op") break;
        if ((PREC[top.v]??0) > (PREC[op]??0) || ((PREC[top.v]??0) === (PREC[op]??0) && !RA.has(op))) out.push(st.pop());
        else break;
      }
      st.push({ t: "op", v: op });
    } else if (tk.t === "lp") st.push(tk);
    else if (tk.t === "rp") { while (st.length && st[st.length-1].t !== "lp") out.push(st.pop()); st.pop(); }
    prev = tk;
  }
  while (st.length) out.push(st.pop());
  return out;
}
function evalRPN(rp: any[], vars: Record<string, number>): number {
  const s: number[] = [];
  for (const tk of rp) {
    if (tk.t === "num") s.push(tk.v);
    else if (tk.t === "var") { if (!(tk.v in vars)) throw new Error(`undef ${tk.v}`); s.push(vars[tk.v]); }
    else if (tk.t === "op") {
      if (tk.v === "u-") { s.push(-s.pop()!); continue; }
      if (tk.v === "!")  { s.push(s.pop()! ? 0 : 1); continue; }
      const b = s.pop()!; const a = s.pop()!;
      const ops: any = { "+":a+b,"-":a-b,"*":a*b,"/":b===0?NaN:a/b,"%":b===0?NaN:a%b,"^":Math.pow(a,b),
        "==":a===b?1:0,"!=":a!==b?1:0,"<":a<b?1:0,">":a>b?1:0,"<=":a<=b?1:0,">=":a>=b?1:0,"&&":a&&b?1:0,"||":a||b?1:0 };
      s.push(ops[tk.v]);
    }
  }
  return s[0];
}
function safeEval(expr: string, vars: Record<string, number>) { return evalRPN(rpn(tokenize(expr)), vars); }
function fillTemplate(tpl: string, vars: Record<string, number>) {
  return tpl.replace(/\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g, (_, k) => k in vars ? String(vars[k]) : `{{${k}}}`);
}
function fmtAns(n: number) { return Number.isInteger(n) ? String(n) : Number(n.toFixed(4)).toString(); }
function sample(v: any) {
  const min = Number(v.min ?? 0), max = Number(v.max ?? 9);
  if (v.type === "float") { const dp = Number(v.decimals ?? 1); return Number((min + (max-min)*Math.random()).toFixed(dp)); }
  return Math.ceil(min) + Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1));
}

// ─── Types ───
type Variable = { name: string; type: "int" | "float"; min: number; max: number; decimals?: number };
type Template = {
  id?: string;
  name: string;
  description: string;
  skill_id: string | null;
  grade_code: string;
  country_code: string;
  domain: string;
  subdomain: string;
  kind: "qcm" | "numeric";
  difficulty: number;
  bloom_level: number;
  template_text: string;
  variables: Variable[];
  answer_expression: string;
  distractor_expressions: string[];
  constraints: string[];
  answer_unit: string;
  hint: string;
  solution_template: string;
  is_active: boolean;
};

const EMPTY: Template = {
  name: "", description: "", skill_id: null, grade_code: "4AM", country_code: "DZ",
  domain: "algebra", subdomain: "", kind: "numeric", difficulty: 1, bloom_level: 3,
  template_text: "احسب \\({{a}} + {{b}}\\)", variables: [
    { name: "a", type: "int", min: 1, max: 9 },
    { name: "b", type: "int", min: 1, max: 9 },
  ],
  answer_expression: "a + b", distractor_expressions: ["a - b", "a * b", "a + b + 1"],
  constraints: [], answer_unit: "", hint: "", solution_template: "", is_active: true,
};

const GRADES = ["1AM","2AM","3AM","4AM","1AS","2AS","3AS"];

export default function QuestionTemplates() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [skills, setSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Template | null>(null);
  const [filterGrade, setFilterGrade] = useState<string>("all");
  const [variantBrowser, setVariantBrowser] = useState<{ tplId: string; rows: any[] } | null>(null);
  const [generating, setGenerating] = useState(false);

  async function load() {
    setLoading(true);
    const [tpls, sk] = await Promise.all([
      supabase.from("question_templates").select("*").order("created_at", { ascending: false }),
      supabase.from("kb_skills").select("id,name,name_ar,grade").order("name"),
    ]);
    setTemplates(tpls.data || []);
    setSkills(sk.data || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => filterGrade === "all" ? templates : templates.filter(t => t.grade_code === filterGrade),
    [templates, filterGrade]
  );

  const skillName = (id: string | null) =>
    id ? (skills.find(s => s.id === id)?.name_ar || skills.find(s => s.id === id)?.name || "—") : "—";

  // ─── Live preview ───
  const preview = useMemo(() => {
    if (!editing) return null;
    try {
      const out: any[] = [];
      for (let attempt = 0; attempt < 50 && out.length < 3; attempt++) {
        const vars: Record<string, number> = {};
        for (const v of editing.variables) vars[v.name] = sample(v);
        let ok = true;
        for (const c of editing.constraints) { try { if (!safeEval(c, vars)) { ok = false; break; } } catch { ok = false; break; } }
        if (!ok) continue;
        let ansN: number; try { ansN = safeEval(editing.answer_expression || "0", vars); } catch { continue; }
        if (!Number.isFinite(ansN)) continue;
        const text = fillTemplate(editing.template_text, vars);
        const opts: string[] = [];
        if (editing.kind === "qcm") {
          const set = new Set<string>([fmtAns(ansN)]);
          for (const e of editing.distractor_expressions) { try { const n = safeEval(e, vars); if (Number.isFinite(n)) set.add(fmtAns(n)); } catch {} }
          opts.push(...Array.from(set));
        }
        out.push({ text, ans: fmtAns(ansN), opts, vars });
      }
      return out;
    } catch (e: any) { return [{ error: String(e?.message || e) }]; }
  }, [editing]);

  async function saveTemplate() {
    if (!editing) return;
    const { id, ...payload } = editing;
    const { data: u } = await supabase.auth.getUser();
    const row = { ...payload, created_by: u.user?.id };
    const q = id
      ? supabase.from("question_templates").update(row).eq("id", id).select("id").maybeSingle()
      : supabase.from("question_templates").insert(row).select("id").maybeSingle();
    const { error } = await q;
    if (error) { toast.error("فشل الحفظ: " + error.message); return; }
    toast.success("تم الحفظ");
    setEditing(null);
    load();
  }

  async function deleteTemplate(id: string) {
    if (!confirm("حذف هذا القالب وجميع متغيراته؟")) return;
    const { error } = await supabase.from("question_templates").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("تم الحذف"); load(); }
  }

  async function generateVariants(tplId: string, count = 30) {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-template-variants", {
        body: { template_id: tplId, count },
      });
      if (error) throw error;
      if (!data?.ok) toast.warning(data?.error || "لم يتم إنتاج أي متغير");
      else toast.success(`تم توليد ${data.inserted} متغير جديد (من ${data.generated} محاولة)`);
    } catch (e: any) { toast.error(String(e?.message || e)); }
    finally { setGenerating(false); }
  }

  async function browseVariants(tplId: string) {
    const { data, error } = await supabase
      .from("question_template_variants")
      .select("*").eq("template_id", tplId).order("created_at", { ascending: false }).limit(200);
    if (error) { toast.error(error.message); return; }
    setVariantBrowser({ tplId, rows: data || [] });
  }

  async function deleteVariant(id: string) {
    const { error } = await supabase.from("question_template_variants").delete().eq("id", id);
    if (error) toast.error(error.message);
    else if (variantBrowser) setVariantBrowser({ ...variantBrowser, rows: variantBrowser.rows.filter(r => r.id !== id) });
  }

  // ───────── Render ─────────
  return (
    <div className="container mx-auto py-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wand2 className="text-primary" /> مولّد الأسئلة بالقواعد
          </h1>
          <p className="text-muted-foreground text-sm">
            أنشئ قوالب بـ متغيرات + معادلة الجواب → ولّد آلاف الأسئلة بدون ذكاء اصطناعي.
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={filterGrade} onValueChange={setFilterGrade}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المستويات</SelectItem>
              {GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={() => setEditing({ ...EMPTY })}><Plus className="ml-1 w-4 h-4" /> قالب جديد</Button>
        </div>
      </div>

      {/* List */}
      {!editing && !variantBrowser && (
        <Card>
          <CardHeader><CardTitle>القوالب ({filtered.length})</CardTitle></CardHeader>
          <CardContent>
            {loading ? <div className="text-sm text-muted-foreground">جارٍ التحميل…</div>
              : filtered.length === 0 ? <div className="text-sm text-muted-foreground">لا توجد قوالب بعد. ابدأ بإنشاء واحد.</div>
              : <div className="space-y-2">
                  {filtered.map(t => (
                    <div key={t.id} className="border rounded-lg p-3 flex items-start justify-between gap-3 hover:bg-muted/30">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium">{t.name}</span>
                          <Badge variant="secondary">{t.grade_code}</Badge>
                          <Badge variant="outline">{t.kind}</Badge>
                          <Badge variant="outline">د. {t.difficulty}</Badge>
                          {!t.is_active && <Badge variant="destructive">معطّل</Badge>}
                          <span className="text-xs text-muted-foreground">المهارة: {skillName(t.skill_id)}</span>
                        </div>
                        <div className="text-sm text-muted-foreground mt-1 truncate">{t.template_text}</div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => browseVariants(t.id)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="outline" disabled={generating}
                          onClick={() => generateVariants(t.id, 30)}>
                          <Sparkles className="w-4 h-4 ml-1" /> ولّد 30
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditing({
                          ...t,
                          variables: Array.isArray(t.variables) ? t.variables : [],
                          distractor_expressions: Array.isArray(t.distractor_expressions) ? t.distractor_expressions : [],
                          constraints: Array.isArray(t.constraints) ? t.constraints : [],
                        })}>تعديل</Button>
                        <Button size="sm" variant="ghost" onClick={() => deleteTemplate(t.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>}
          </CardContent>
        </Card>
      )}

      {/* Variant browser */}
      {variantBrowser && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>المتغيرات ({variantBrowser.rows.length})</CardTitle>
            <Button variant="outline" onClick={() => setVariantBrowser(null)}>عودة</Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {variantBrowser.rows.length === 0 && <div className="text-sm text-muted-foreground">لا توجد متغيرات. اضغط "ولّد 30" لإنتاجها.</div>}
            {variantBrowser.rows.map(r => (
              <div key={r.id} className="border rounded-lg p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <MathExerciseRenderer text={r.question_text} showDiagram={false} />
                    <div className="text-sm mt-2">
                      <span className="text-muted-foreground">الجواب: </span>
                      <span className="font-mono font-bold">{r.answer}</span>
                    </div>
                    {r.kind === "qcm" && Array.isArray(r.options) && (
                      <div className="flex gap-2 flex-wrap mt-1">
                        {r.options.map((o: string, i: number) => (
                          <Badge key={i} variant={o === String(r.answer).split(" ")[0] ? "default" : "outline"}>{o}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => deleteVariant(r.id)}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Editor */}
      {editing && (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>{editing.id ? "تعديل قالب" : "قالب جديد"}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>إلغاء</Button>
              <Button onClick={saveTemplate}><Save className="w-4 h-4 ml-1" /> حفظ</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="basic">
              <TabsList>
                <TabsTrigger value="basic">الأساسيات</TabsTrigger>
                <TabsTrigger value="vars">المتغيرات</TabsTrigger>
                <TabsTrigger value="logic">المعادلات</TabsTrigger>
                <TabsTrigger value="preview">معاينة حية</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>الاسم</Label>
                    <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
                  </div>
                  <div>
                    <Label>المستوى</Label>
                    <Select value={editing.grade_code} onValueChange={v => setEditing({ ...editing, grade_code: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{GRADES.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>المهارة المرتبطة</Label>
                    <Select value={editing.skill_id ?? "none"} onValueChange={v => setEditing({ ...editing, skill_id: v === "none" ? null : v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— لا شيء —</SelectItem>
                        {skills.filter(s => !editing.grade_code || !s.grade || s.grade === editing.grade_code).slice(0, 200)
                          .map(s => <SelectItem key={s.id} value={s.id}>{s.name_ar || s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>النوع</Label>
                    <Select value={editing.kind} onValueChange={v => setEditing({ ...editing, kind: v as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="numeric">إجابة رقمية</SelectItem>
                        <SelectItem value="qcm">اختيار من متعدد</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>الصعوبة (1-5)</Label>
                    <Input type="number" min={1} max={5} value={editing.difficulty}
                      onChange={e => setEditing({ ...editing, difficulty: Number(e.target.value) })} />
                  </div>
                  <div>
                    <Label>مستوى Bloom (1-6)</Label>
                    <Input type="number" min={1} max={6} value={editing.bloom_level}
                      onChange={e => setEditing({ ...editing, bloom_level: Number(e.target.value) })} />
                  </div>
                </div>
                <div>
                  <Label>الوصف</Label>
                  <Textarea value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} />
                  <Label>مُفعّل (يظهر في توليد الأسئلة)</Label>
                </div>
              </TabsContent>

              <TabsContent value="vars" className="space-y-3 mt-4">
                <div className="text-xs text-muted-foreground">
                  استعمل المتغيرات في النص بصيغة <code>{"{{name}}"}</code> وفي المعادلات بالاسم مباشرة.
                </div>
                {editing.variables.map((v, i) => (
                  <div key={i} className="flex gap-2 items-end">
                    <div className="flex-1"><Label>اسم</Label>
                      <Input value={v.name} onChange={e => {
                        const nv = [...editing.variables]; nv[i] = { ...v, name: e.target.value };
                        setEditing({ ...editing, variables: nv });
                      }}/></div>
                    <div className="w-28"><Label>نوع</Label>
                      <Select value={v.type} onValueChange={t => {
                        const nv = [...editing.variables]; nv[i] = { ...v, type: t as any };
                        setEditing({ ...editing, variables: nv });
                      }}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="int">int</SelectItem>
                          <SelectItem value="float">float</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24"><Label>min</Label>
                      <Input type="number" value={v.min} onChange={e => {
                        const nv = [...editing.variables]; nv[i] = { ...v, min: Number(e.target.value) };
                        setEditing({ ...editing, variables: nv });
                      }}/></div>
                    <div className="w-24"><Label>max</Label>
                      <Input type="number" value={v.max} onChange={e => {
                        const nv = [...editing.variables]; nv[i] = { ...v, max: Number(e.target.value) };
                        setEditing({ ...editing, variables: nv });
                      }}/></div>
                    <Button variant="ghost" size="sm" onClick={() => setEditing({ ...editing,
                      variables: editing.variables.filter((_, j) => j !== i) })}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="sm" onClick={() => setEditing({ ...editing,
                  variables: [...editing.variables, { name: `x${editing.variables.length+1}`, type: "int", min: 1, max: 9 }] })}>
                  <Plus className="w-4 h-4 ml-1" /> أضف متغير
                </Button>
              </TabsContent>

              <TabsContent value="logic" className="space-y-4 mt-4">
                <div>
                  <Label>نص السؤال (يدعم KaTeX و {"{{var}}"})</Label>
                  <Textarea rows={3} value={editing.template_text}
                    onChange={e => setEditing({ ...editing, template_text: e.target.value })} />
                </div>
                <div>
                  <Label>معادلة الجواب</Label>
                  <Input className="font-mono" value={editing.answer_expression}
                    onChange={e => setEditing({ ...editing, answer_expression: e.target.value })} />
                  <div className="text-xs text-muted-foreground mt-1">
                    عوامل مدعومة: + - * / % ^ &nbsp; مقارنات: == != &lt; &gt; &lt;= &gt;= &nbsp; منطق: && ||
                  </div>
                </div>
                <div>
                  <Label>وحدة الجواب (اختياري)</Label>
                  <Input value={editing.answer_unit} onChange={e => setEditing({ ...editing, answer_unit: e.target.value })} placeholder="cm, kg…" />
                </div>
                {editing.kind === "qcm" && (
                  <div>
                    <Label>معادلات المشتتات (Distractors)</Label>
                    {editing.distractor_expressions.map((d, i) => (
                      <div key={i} className="flex gap-2 mt-1">
                        <Input className="font-mono" value={d} onChange={e => {
                          const arr = [...editing.distractor_expressions]; arr[i] = e.target.value;
                          setEditing({ ...editing, distractor_expressions: arr });
                        }}/>
                        <Button variant="ghost" size="sm" onClick={() => setEditing({ ...editing,
                          distractor_expressions: editing.distractor_expressions.filter((_, j) => j !== i) })}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => setEditing({ ...editing,
                      distractor_expressions: [...editing.distractor_expressions, ""] })}>
                      <Plus className="w-4 h-4 ml-1" /> أضف مشتت
                    </Button>
                  </div>
                )}
                <div>
                  <Label>قيود (Constraints) - تعابير منطقية يجب أن تتحقق</Label>
                  {editing.constraints.map((c, i) => (
                    <div key={i} className="flex gap-2 mt-1">
                      <Input className="font-mono" value={c} placeholder="(c - b) % a == 0" onChange={e => {
                        const arr = [...editing.constraints]; arr[i] = e.target.value;
                        setEditing({ ...editing, constraints: arr });
                      }}/>
                      <Button variant="ghost" size="sm" onClick={() => setEditing({ ...editing,
                        constraints: editing.constraints.filter((_, j) => j !== i) })}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  ))}
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => setEditing({ ...editing,
                    constraints: [...editing.constraints, ""] })}>
                    <Plus className="w-4 h-4 ml-1" /> أضف قيد
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="space-y-3 mt-4">
                <Button variant="outline" size="sm" onClick={() => setEditing({ ...editing })}>
                  <RefreshCw className="w-4 h-4 ml-1" /> إعادة المعاينة
                </Button>
                {(preview || []).map((p: any, i: number) => p.error
                  ? <div key={i} className="text-destructive text-sm">خطأ: {p.error}</div>
                  : (
                    <div key={i} className="border rounded-lg p-3 space-y-1">
                      <MathExerciseRenderer text={p.text} showDiagram={false} />
                      <div className="text-xs text-muted-foreground">المتغيرات: {JSON.stringify(p.vars)}</div>
                      <div className="text-sm">الجواب: <span className="font-mono font-bold">{p.ans}</span></div>
                      {p.opts.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {p.opts.map((o: string, j: number) => <Badge key={j} variant="outline">{o}</Badge>)}
                        </div>
                      )}
                    </div>
                  )
                )}
                {(!preview || preview.length === 0) && (
                  <div className="text-sm text-destructive">لم تنجح أي محاولة. تحقّق من المعادلة والقيود ونطاق المتغيرات.</div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
