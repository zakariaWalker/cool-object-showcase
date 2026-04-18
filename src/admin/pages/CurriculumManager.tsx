// ===== Multi-Country Curriculum Manager =====
// Admin tool to manage curricula across multiple countries
// (e.g., Algeria, Oman) and map universal skills to country-specific grades.

import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Globe, Plus, Link2, Trash2, Search, BookOpen, GraduationCap } from "lucide-react";

type Country = {
  code: string;
  name_ar: string;
  name_en: string;
  primary_language: string;
  curriculum_framework: string | null;
  flag_emoji: string | null;
  is_active: boolean;
};

type Grade = {
  id: string;
  country_code: string;
  grade_code: string;
  grade_label_ar: string;
  cycle: string | null;
  order_index: number;
};

type Skill = {
  id: string;
  name: string;
  name_ar: string | null;
  domain: string | null;
  subdomain: string | null;
  is_universal: boolean;
};

type Mapping = {
  id: string;
  skill_id: string;
  country_code: string;
  grade_code: string;
  semester: number | null;
  chapter_label: string | null;
  order_in_curriculum: number;
};

export default function CurriculumManager() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("DZ");
  const [selectedGrade, setSelectedGrade] = useState<string>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddCountry, setShowAddCountry] = useState(false);

  // ── Load all data ──────────────────────────────────────────────────────────
  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [c, g, s, m] = await Promise.all([
      supabase.from("countries").select("*").order("name_ar"),
      supabase.from("country_grades").select("*").order("order_index"),
      supabase.from("kb_skills").select("id, name, name_ar, domain, subdomain, is_universal").limit(2000),
      supabase.from("curriculum_mappings").select("*"),
    ]);
    if (c.data) setCountries(c.data);
    if (g.data) setGrades(g.data);
    if (s.data) setSkills(s.data);
    if (m.data) setMappings(m.data);
    setLoading(false);
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const countryGrades = useMemo(
    () => grades.filter(g => g.country_code === selectedCountry),
    [grades, selectedCountry]
  );

  const country = useMemo(
    () => countries.find(c => c.code === selectedCountry),
    [countries, selectedCountry]
  );

  const mappingsByGrade = useMemo(() => {
    const map = new Map<string, Mapping[]>();
    mappings
      .filter(m => m.country_code === selectedCountry)
      .forEach(m => {
        const arr = map.get(m.grade_code) ?? [];
        arr.push(m);
        map.set(m.grade_code, arr);
      });
    return map;
  }, [mappings, selectedCountry]);

  const filteredSkills = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return skills.slice(0, 30);
    return skills.filter(s =>
      (s.name?.toLowerCase().includes(q)) ||
      (s.name_ar?.toLowerCase().includes(q)) ||
      (s.domain?.toLowerCase().includes(q))
    ).slice(0, 50);
  }, [skills, search]);

  const mappedSkillIds = useMemo(() => {
    if (!selectedGrade) return new Set<string>();
    return new Set((mappingsByGrade.get(selectedGrade) ?? []).map(m => m.skill_id));
  }, [mappingsByGrade, selectedGrade]);

  // ── Actions ────────────────────────────────────────────────────────────────
  async function mapSkill(skillId: string) {
    if (!selectedGrade) { toast.error("اختر صفاً أولاً"); return; }
    const { error } = await supabase.from("curriculum_mappings").insert({
      skill_id: skillId,
      country_code: selectedCountry,
      grade_code: selectedGrade,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("تمت الإضافة");
    loadAll();
  }

  async function unmapSkill(mappingId: string) {
    const { error } = await supabase.from("curriculum_mappings").delete().eq("id", mappingId);
    if (error) { toast.error(error.message); return; }
    toast.success("تمت الإزالة");
    loadAll();
  }

  if (loading) {
    return <div className="p-8 text-muted-foreground">جارٍ التحميل...</div>;
  }

  return (
    <div className="p-6 space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary" />
            إدارة المناهج متعددة الدول
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            اربط المهارات الكونية بالصفوف الدراسية لكل دولة
          </p>
        </div>
        <button
          onClick={() => setShowAddCountry(true)}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> إضافة دولة
        </button>
      </div>

      {/* Country selector */}
      <div className="flex flex-wrap gap-2">
        {countries.map(c => (
          <button
            key={c.code}
            onClick={() => { setSelectedCountry(c.code); setSelectedGrade(""); }}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
              selectedCountry === c.code
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-card text-muted-foreground border border-border hover:bg-muted"
            }`}
          >
            <span className="text-lg mr-1">{c.flag_emoji}</span>
            {c.name_ar}
          </button>
        ))}
      </div>

      {/* Country info */}
      {country && (
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{country.flag_emoji}</span>
            <div>
              <div className="font-black text-foreground">{country.name_ar} ({country.name_en})</div>
              <div className="text-xs text-muted-foreground">
                {country.curriculum_framework} · لغة: {country.primary_language}
              </div>
            </div>
            <div className="mr-auto text-sm text-muted-foreground">
              {countryGrades.length} صفوف · {Array.from(mappingsByGrade.values()).flat().length} مهارة مربوطة
            </div>
          </div>
        </div>
      )}

      {/* Two-column: Grades list + Skill mapper */}
      <div className="grid grid-cols-12 gap-4">
        {/* Grades */}
        <div className="col-span-12 lg:col-span-4 bg-card border border-border rounded-xl p-4">
          <h3 className="font-black text-sm text-foreground flex items-center gap-2 mb-3">
            <GraduationCap className="w-4 h-4" /> الصفوف الدراسية
          </h3>
          <div className="space-y-1 max-h-[600px] overflow-auto">
            {["primary", "middle", "secondary"].map(cycle => {
              const cg = countryGrades.filter(g => g.cycle === cycle);
              if (cg.length === 0) return null;
              const cycleLabel = cycle === "primary" ? "ابتدائي" : cycle === "middle" ? "متوسط" : "ثانوي";
              return (
                <div key={cycle}>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase mt-3 mb-1 px-2">
                    {cycleLabel}
                  </div>
                  {cg.map(g => {
                    const count = (mappingsByGrade.get(g.grade_code) ?? []).length;
                    return (
                      <button
                        key={g.id}
                        onClick={() => setSelectedGrade(g.grade_code)}
                        className={`w-full text-right px-3 py-2 rounded-lg text-sm transition flex items-center justify-between ${
                          selectedGrade === g.grade_code
                            ? "bg-primary/10 text-primary font-bold border border-primary/30"
                            : "hover:bg-muted text-foreground"
                        }`}
                      >
                        <span>{g.grade_label_ar}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          count > 0 ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                        }`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Skill mapper */}
        <div className="col-span-12 lg:col-span-8 bg-card border border-border rounded-xl p-4">
          {!selectedGrade ? (
            <div className="text-center py-12 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-30" />
              اختر صفاً من القائمة لبدء ربط المهارات
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black text-sm text-foreground">
                  المهارات المربوطة بـ {countryGrades.find(g => g.grade_code === selectedGrade)?.grade_label_ar}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {(mappingsByGrade.get(selectedGrade) ?? []).length} مهارة
                </span>
              </div>

              {/* Mapped skills */}
              <div className="space-y-2 mb-6 max-h-60 overflow-auto">
                {(mappingsByGrade.get(selectedGrade) ?? []).map(m => {
                  const s = skills.find(sk => sk.id === m.skill_id);
                  if (!s) return null;
                  return (
                    <div key={m.id} className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg">
                      <Link2 className="w-4 h-4 text-primary" />
                      <div className="flex-1 text-sm">
                        <div className="font-bold text-foreground">{s.name_ar || s.name}</div>
                        <div className="text-[10px] text-muted-foreground">{s.domain} · {s.subdomain}</div>
                      </div>
                      <button
                        onClick={() => unmapSkill(m.id)}
                        className="p-1 hover:bg-destructive/10 text-destructive rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
                {(mappingsByGrade.get(selectedGrade) ?? []).length === 0 && (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    لا توجد مهارات مربوطة بعد. ابحث وأضف من الأسفل.
                  </div>
                )}
              </div>

              {/* Add new skill */}
              <div className="border-t border-border pt-4">
                <div className="relative mb-2">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="ابحث عن مهارة لربطها..."
                    className="w-full pr-9 pl-3 py-2 bg-background border border-border rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-1 max-h-60 overflow-auto">
                  {filteredSkills.filter(s => !mappedSkillIds.has(s.id)).map(s => (
                    <button
                      key={s.id}
                      onClick={() => mapSkill(s.id)}
                      className="w-full text-right p-2 hover:bg-muted rounded-lg flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4 text-primary" />
                      <div className="flex-1">
                        <div className="text-sm text-foreground">{s.name_ar || s.name}</div>
                        <div className="text-[10px] text-muted-foreground">{s.domain}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Add country modal */}
      {showAddCountry && (
        <AddCountryModal onClose={() => setShowAddCountry(false)} onAdded={loadAll} />
      )}
    </div>
  );
}

// ── Add Country Modal ────────────────────────────────────────────────────────
function AddCountryModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [code, setCode] = useState("");
  const [nameAr, setNameAr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [framework, setFramework] = useState("");
  const [flag, setFlag] = useState("");

  async function submit() {
    if (!code || !nameAr || !nameEn) { toast.error("املأ الحقول الإلزامية"); return; }
    const { error } = await supabase.from("countries").insert({
      code: code.toUpperCase(),
      name_ar: nameAr,
      name_en: nameEn,
      curriculum_framework: framework || null,
      flag_emoji: flag || null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("تمت إضافة الدولة");
    onAdded();
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl p-6 w-[480px] max-w-[90vw]" onClick={e => e.stopPropagation()}>
        <h3 className="font-black text-lg text-foreground mb-4">إضافة دولة جديدة</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-muted-foreground">رمز الدولة (ISO 2-letter) *</label>
            <input value={code} onChange={e => setCode(e.target.value)} placeholder="مثال: MA" maxLength={2}
              className="w-full px-3 py-2 mt-1 bg-background border border-border rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground">الاسم بالعربية *</label>
            <input value={nameAr} onChange={e => setNameAr(e.target.value)} placeholder="المغرب"
              className="w-full px-3 py-2 mt-1 bg-background border border-border rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground">الاسم بالإنجليزية *</label>
            <input value={nameEn} onChange={e => setNameEn(e.target.value)} placeholder="Morocco"
              className="w-full px-3 py-2 mt-1 bg-background border border-border rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground">إطار المنهاج</label>
            <input value={framework} onChange={e => setFramework(e.target.value)} placeholder="مثال: المنهاج الوطني المغربي"
              className="w-full px-3 py-2 mt-1 bg-background border border-border rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs font-bold text-muted-foreground">علم الدولة (إيموجي)</label>
            <input value={flag} onChange={e => setFlag(e.target.value)} placeholder="🇲🇦"
              className="w-full px-3 py-2 mt-1 bg-background border border-border rounded-lg text-sm" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-muted text-muted-foreground rounded-lg text-sm font-bold">إلغاء</button>
          <button onClick={submit} className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-bold">إضافة</button>
        </div>
      </div>
    </div>
  );
}
