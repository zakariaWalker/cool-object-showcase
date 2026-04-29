import { callGemini, GeminiError, extractJSON } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─────────────────────────────────────────────────────────────
// CURRICULUM REGISTRY
// Each entry: topics students MUST see, example exercise starters,
// and the required section structure for a full paper.
// ─────────────────────────────────────────────────────────────
type Curriculum = {
  labelAr: string;
  examType: string;
  topics: string[];
  sectionBlueprint: Array<{ titleAr: string; topicHint: string; points: number; subQMin: number; subQMax: number }>;
  integrationContext: string;
  /** Regex checks of mandatory concepts that MUST appear in the generated paper text. */
  mandatoryConcepts?: Array<{ re: RegExp; label: string }>;
  /** Target average Bloom level and minimum count of B5/B6 sub-questions. */
  bloomTarget?: { avgMin: number; avgMax: number; highMin: number };
};

const CURRICULUM: Record<string, Curriculum> = {
  // ───────── 3AS — Terminale Sciences (BAC) ─────────
  "3AS": {
    labelAr: "السنة الثالثة ثانوي - شعبة العلوم",
    examType: "BAC",
    topics: [
      "المتتاليات الحسابية: الحد العام $u_n=u_0+nr$، المجموع $S_n$، إثبات أنها حسابية بإيجاد $r$",
      "المتتاليات الهندسية: الحد العام $u_n=u_0\\cdot q^n$، $S_n=u_0\\cdot\\frac{1-q^{n+1}}{1-q}$، إثبات أنها هندسية بإيجاد $q$، النهاية حسب $|q|$",
      "المتتاليات التراجعية $u_{n+1}=f(u_n)$: الرتابة، إثبات بالتراجع، متتالية مساعدة هندسية، حساب $\\lim u_n$",
      "نهايات الدوال: الصور غير المحددة، التكافؤات الأسية واللوغاريتمية، $\\lim\\frac{e^x}{x^n}$ و $\\lim\\frac{\\ln x}{x}$",
      "المستقيمات المقاربة (الأفقية والعمودية والمائلة $y=ax+b$) ووضعية المنحنى بالنسبة للمقارب المائل",
      "دراسة دالة كاملة: $D_f$، النهايات على الأطراف، إشارة $f'$، جدول التغيرات، المماسات، رسم $(C_f)$",
      "حساب المشتقات: مشتق $\\ln u$، $e^u$، $u^n$، الجداء، الخارج، الدالة المركبة، معادلة المماس",
      "الدالتان $\\exp$ و $\\ln$: الخصائص، حل المعادلات والمتراجحات الأسية واللوغاريتمية مع شرط الوجود",
      "متراجحة لوغاريتمية: مثل $\\ln(x+1)<\\ln(2x-3)$ مع تحديد $D$",
      "المناقشة البيانية لعدد حلول $f(x)=m$ حسب الوسيط $m$",
      "مبرهنة القيم المتوسطة (TVI) والتقريب التكراري",
      "المعادلات التفاضلية الخطية $y'+ay=b$ و $y'=ay$ مع شرط ابتدائي",
      "التكامل: الدوال الأصلية، التكامل بالتجزئة، حساب المساحات",
      "الاحتمالات: $P_A(B)$، الاستقلالية، شجرة، قانون احتمالي، أمل رياضي",
      "الأعداد المركبة: الجبرية والمثلثية والأسية، حل المعادلات في $\\mathbb{C}$، التفسير الهندسي",
      "الهندسة في الفضاء: الجداء السلمي، معادلة المستوى، تقاطع مستقيم/مستوى، المسافات",
    ],
    sectionBlueprint: [
      { titleAr: "التمرين الأول: المتتاليات", topicHint: "متتالية تراجعية + متتالية مساعدة هندسية: الحدود الأولى، إثبات بالتراجع، إثبات الطبيعة الهندسية، الحد العام، النهاية، المجموع", points: 4, subQMin: 5, subQMax: 7 },
      { titleAr: "التمرين الثاني: الأعداد المركبة أو الاحتمالات", topicHint: "أعداد مركبة (معادلة في $\\mathbb{C}$، شكل مثلثي، تفسير هندسي) أو احتمالات (شجرة، شرطي، قانون)", points: 4, subQMin: 4, subQMax: 6 },
      { titleAr: "التمرين الثالث: دراسة دالة لوغاريتمية/أسية", topicHint: "$D_f$، النهايات، $f'$، جدول التغيرات، إثبات مقارب مائل ودراسة الوضعية، TVI، رسم، مناقشة بيانية لـ $f(x)=m$، متراجحة لوغاريتمية", points: 7, subQMin: 7, subQMax: 9 },
      { titleAr: "المسألة الإدماجية: تكامل + معادلة تفاضلية + متتاليات", topicHint: "حل $y'+ay=b$، دراسة الدالة الحل، تكامل/مساحة، متتالية $u_n=\\int_0^n f(t)dt$ ورتابتها ونهايتها، تفسير في السياق", points: 5, subQMin: 5, subQMax: 7 },
    ],
    integrationContext: "تبريد جسم، نمو سكاني، تركيز دواء، تفريغ مكثف",
    mandatoryConcepts: [
      { re: /متتالي(ة|ات).*هندسي|q\^|أساس(ها)?\s*[qـ]/, label: "المتتاليات الهندسية" },
      { re: /بالتراجع|التراجع/i, label: "البرهان بالتراجع" },
      { re: /مقارب\s*مائل|y\s*=\s*[a-z]?x\s*\+/, label: "المقارب المائل" },
      { re: /جدول\s*التغير|جدول\s*تغيرات/, label: "جدول التغيرات" },
      { re: /مناقش(ة|).*بياني|عدد\s*الحلول|f\(x\)\s*=\s*m/, label: "المناقشة البيانية" },
      { re: /متراجح(ة|ات).*(لوغاريتم|ln|أس|exp|e\^)/, label: "متراجحة لوغاريتمية/أسية" },
      { re: /معادل(ة|ات)\s*تفاضلي|y'\s*\+|y'\s*=/, label: "المعادلة التفاضلية" },
      { re: /تكامل|∫|بدائي|مساحة/, label: "التكامل/المساحة" },
    ],
    bloomTarget: { avgMin: 3.6, avgMax: 4.4, highMin: 5 },
  },

  // ───────── 2AS — Première Sciences ─────────
  "2AS": {
    labelAr: "السنة الثانية ثانوي",
    examType: "Devoir",
    topics: [
      "الدوال العددية: $D_f$، الرتابة، الإشارة، الدراسة الكاملة، التمثيل البياني",
      "المشتقات: قواعد الاشتقاق، المماس، استعمال $f'$ لدراسة التغيرات",
      "المتتاليات العددية: الحسابية والهندسية، الحد العام، المجموع، النهايات الأولية",
      "كثيرات الحدود والقسمة الإقليدية، التحليل، حل معادلات ومتراجحات من الدرجة 2",
      "الحدوديات والمعادلات الناطقة (شرط الوجود، علامة بسط ومقام)",
      "المثلثية: الدوران، الزوايا الموجهة، $\\sin$ و $\\cos$ و $\\tan$، المعادلات المثلثية الأساسية",
      "الهندسة التحليلية في المستوي: المتجهات، معادلات المستقيم والدائرة، التقاطع",
      "الإحصاء: الوسط، الوسيط، التباين، الانحراف المعياري، المخططات",
    ],
    sectionBlueprint: [
      { titleAr: "التمرين الأول: المتتاليات", topicHint: "إثبات أن متتالية حسابية أو هندسية، إيجاد الحد العام، حساب مجموع، استنتاج بسيط للنهاية", points: 4, subQMin: 4, subQMax: 6 },
      { titleAr: "التمرين الثاني: كثيرات الحدود/المعادلات", topicHint: "تحليل كثير حدود من الدرجة 3 بمعرفة جذر، حل معادلة من الدرجة 2 ومتراجحة", points: 4, subQMin: 4, subQMax: 5 },
      { titleAr: "التمرين الثالث: دراسة دالة", topicHint: "$D_f$، النهايات، $f'$، جدول التغيرات، معادلة المماس، رسم", points: 5, subQMin: 5, subQMax: 7 },
      { titleAr: "المسألة الإدماجية: تطبيق", topicHint: "وضعية حياتية تجمع بين دالة ومعادلة أو هندسة تحليلية", points: 7, subQMin: 5, subQMax: 6 },
    ],
    integrationContext: "تخطيط مدني، اقتصاد بسيط، مسافة وسرعة، تكاليف إنتاج",
    mandatoryConcepts: [
      { re: /متتالي/, label: "المتتاليات" },
      { re: /مشتق|f'/, label: "المشتقات" },
      { re: /جدول\s*التغير/, label: "جدول التغيرات" },
      { re: /درج(ة|ـة)\s*(الـ)?ثاني|x\^?2|x²/, label: "الدرجة الثانية" },
    ],
    bloomTarget: { avgMin: 3.2, avgMax: 4.0, highMin: 3 },
  },

  // ───────── 1AS — Tronc commun ─────────
  "1AS": {
    labelAr: "السنة الأولى ثانوي",
    examType: "Devoir",
    topics: [
      "الحساب في $\\mathbb{R}$: الجذور، القيمة المطلقة، المتراجحات",
      "كثيرات الحدود من الدرجة الثانية: التحليل، الجذور، إشارة $ax^2+bx+c$",
      "الدوال المرجعية ($x^2$, $\\sqrt{x}$, $\\frac{1}{x}$، التآلفية): التغيرات والتمثيل",
      "المتجهات والإحداثيات في المستوي، معادلة المستقيم",
      "الهندسة المستوية: المثلثات، نظرية طاليس، المتوازي أضلاع",
      "الإحصاء الوصفي: الوسط، الوسيط، المنوال، المخططات",
      "المثلثية: الزوايا والقياس بالراديان، $\\sin$، $\\cos$",
    ],
    sectionBlueprint: [
      { titleAr: "التمرين الأول: حساب في $\\mathbb{R}$", topicHint: "متراجحات بالقيمة المطلقة أو الجذور، تبسيط عبارات", points: 4, subQMin: 3, subQMax: 5 },
      { titleAr: "التمرين الثاني: كثيرات حدود", topicHint: "تحليل، حل معادلة من الدرجة 2، إشارة الثلاثي الحدودي", points: 4, subQMin: 4, subQMax: 5 },
      { titleAr: "التمرين الثالث: دالة وتمثيل بياني", topicHint: "تغيرات دالة تآلفية أو ناطقة بسيطة، الرسم، قراءة بيانية", points: 5, subQMin: 4, subQMax: 6 },
      { titleAr: "المسألة الإدماجية", topicHint: "هندسة تحليلية أو وضعية حياتية تجمع جبر وهندسة", points: 7, subQMin: 4, subQMax: 6 },
    ],
    integrationContext: "حديقة مستطيلة، حركة جسم، تكلفة شراء، إحصاء صفي",
    mandatoryConcepts: [
      { re: /درج(ة|ـة)\s*(الـ)?ثاني|x\^?2|x²/, label: "الدرجة الثانية" },
      { re: /إشار(ة|ـة)/, label: "دراسة الإشارة" },
      { re: /متجه|إحداثي/, label: "المتجهات/الإحداثيات" },
    ],
    bloomTarget: { avgMin: 3.0, avgMax: 3.8, highMin: 2 },
  },

  // ───────── BEM (4AM) — Brevet ─────────
  "4AM": {
    labelAr: "السنة الرابعة متوسط (شهادة BEM)",
    examType: "BEM",
    topics: [
      "الحساب العددي: الجذور التربيعية، الكتابة العلمية، PGCD، الترتيب والقيمة المطلقة",
      "الجبر: النشر، التحليل (عامل مشترك، متطابقات شهيرة، فرق مربعين)، حل معادلات الدرجة 1 وجمل معادلات",
      "الهندسة: مبرهنة فيثاغورس وعكسها، طاليس وعكسها، النسب المثلثية في مثلث قائم، الدائرة، الزوايا المحيطية والمركزية",
      "الدوال الخطية والتآلفية: جدول قيم، تمثيل بياني، معادلة المستقيم $y=ax+b$",
      "الإحصاء: الوسط الحسابي، الوسيط، المنوال، المخططات",
      "التناسب والنسب المئوية، حساب الفائدة",
      "التحويلات في المستوي: التناظر، الانسحاب، الدوران",
      "المجسمات: الموشور، الأسطوانة، الهرم، الكرة (المساحات والحجوم)",
    ],
    sectionBlueprint: [
      { titleAr: "التمرين الأول: حساب عددي", topicHint: "جذور تربيعية + كتابة علمية + PGCD وكسور غير قابلة للاختزال", points: 4, subQMin: 3, subQMax: 5 },
      { titleAr: "التمرين الثاني: جبر", topicHint: "نشر وتحليل بمتطابقات شهيرة + حل معادلة من الدرجة 1 أو جملة معادلتين", points: 4, subQMin: 4, subQMax: 5 },
      { titleAr: "التمرين الثالث: هندسة", topicHint: "مثلث ودائرة بأبعاد محددة: تطبيق طاليس أو فيثاغورس + نسبة مثلثية + إنشاء", points: 4, subQMin: 4, subQMax: 6 },
      { titleAr: "المسألة الإدماجية", topicHint: "وضعية حياتية تجمع دالة تآلفية + هندسة (مساحة/حجم) + تناسب", points: 8, subQMin: 5, subQMax: 7 },
    ],
    integrationContext: "بناء، تبليط، حديقة، رحلة مدرسية، اشتراك هاتفي، فاتورة كهرباء",
    mandatoryConcepts: [
      { re: /طاليس|فيثاغور/, label: "طاليس/فيثاغورس" },
      { re: /متطابق(ة|ـة)|نشر|تحليل/, label: "النشر والتحليل" },
      { re: /دال(ة|ـة)\s*(تآلفي|خطي)|y\s*=\s*[a-z]?x/, label: "الدالة التآلفية/الخطية" },
      { re: /إحصاء|وسيط|وسط\s*حسابي|منوال/, label: "الإحصاء" },
    ],
    bloomTarget: { avgMin: 2.8, avgMax: 3.6, highMin: 2 },
  },

  // ───────── 3AM ─────────
  "3AM": {
    labelAr: "السنة الثالثة متوسط",
    examType: "Devoir",
    topics: [
      "الأعداد النسبية والكسور والعمليات",
      "الحساب الحرفي: النشر والتحليل بالعامل المشترك",
      "المعادلات من الدرجة الأولى بمجهول واحد",
      "نظرية فيثاغورس وعكسها",
      "الزوايا والمستقيمات المتوازية والقاطعة",
      "التناسبية والنسب المئوية",
      "الإحصاء الوصفي",
    ],
    sectionBlueprint: [
      { titleAr: "التمرين الأول: حساب", topicHint: "عمليات على الأعداد النسبية والكسور", points: 4, subQMin: 3, subQMax: 5 },
      { titleAr: "التمرين الثاني: جبر", topicHint: "نشر، تحليل، حل معادلة من الدرجة 1", points: 5, subQMin: 4, subQMax: 5 },
      { titleAr: "التمرين الثالث: هندسة", topicHint: "تطبيق فيثاغورس + حساب طول/زاوية", points: 4, subQMin: 3, subQMax: 5 },
      { titleAr: "المسألة الإدماجية", topicHint: "وضعية يومية: تناسبية + هندسة + إحصاء", points: 7, subQMin: 4, subQMax: 6 },
    ],
    integrationContext: "حديقة، شراء أدوات، رحلة، مسابقة رياضية",
    mandatoryConcepts: [
      { re: /فيثاغور/, label: "فيثاغورس" },
      { re: /معادل(ة|ـة)/, label: "المعادلات" },
      { re: /تناسب|نسب(ة|ـة)\s*مئوي/, label: "التناسبية/النسب المئوية" },
    ],
    bloomTarget: { avgMin: 2.6, avgMax: 3.3, highMin: 1 },
  },

  // ───────── 2AM ─────────
  "2AM": {
    labelAr: "السنة الثانية متوسط",
    examType: "Devoir",
    topics: [
      "الأعداد العشرية النسبية، الكسور",
      "النشر والاختزال (تمهيد للحساب الحرفي)",
      "المثلث ومتوازي الأضلاع، نظرية مجموع الزوايا",
      "التناظر المركزي",
      "حساب المساحات والمحيطات",
      "التناسبية",
    ],
    sectionBlueprint: [
      { titleAr: "التمرين الأول: حساب", topicHint: "عمليات على الكسور والأعداد العشرية النسبية", points: 5, subQMin: 3, subQMax: 5 },
      { titleAr: "التمرين الثاني: هندسة", topicHint: "متوازي أضلاع: خصائص، إنشاء، حساب زوايا", points: 5, subQMin: 4, subQMax: 5 },
      { titleAr: "التمرين الثالث: تناسبية", topicHint: "جدول تناسبية + نسبة مئوية + سرعة أو سلم", points: 4, subQMin: 3, subQMax: 4 },
      { titleAr: "المسألة الإدماجية", topicHint: "وضعية واقعية تجمع حساب وهندسة", points: 6, subQMin: 4, subQMax: 5 },
    ],
    integrationContext: "ملعب، حديقة، رحلة، شراء",
    mandatoryConcepts: [
      { re: /كسر|عشري|نسبي/, label: "الأعداد" },
      { re: /متوازي\s*الأضلاع|مثلث/, label: "أشكال هندسية" },
      { re: /تناسب/, label: "التناسبية" },
    ],
    bloomTarget: { avgMin: 2.4, avgMax: 3.0, highMin: 1 },
  },

  // ───────── 1AM ─────────
  "1AM": {
    labelAr: "السنة الأولى متوسط",
    examType: "Devoir",
    topics: [
      "الأعداد الطبيعية والعشرية، العمليات الأربع",
      "قابلية القسمة (2، 3، 5، 9، 10)",
      "الكسور: التبسيط، المقارنة، الجمع والطرح",
      "الزوايا، أنواع المثلثات",
      "محيط ومساحة المربع، المستطيل، المثلث، الدائرة",
      "التناسبية البسيطة",
    ],
    sectionBlueprint: [
      { titleAr: "التمرين الأول: حساب", topicHint: "عمليات على الكسور والأعداد العشرية + قابلية القسمة", points: 5, subQMin: 3, subQMax: 5 },
      { titleAr: "التمرين الثاني: هندسة", topicHint: "إنشاء مثلث + قياس زوايا + حساب مساحة", points: 5, subQMin: 3, subQMax: 5 },
      { titleAr: "التمرين الثالث: تناسبية", topicHint: "جدول تناسبية بسيط (شراء، سرعة)", points: 4, subQMin: 3, subQMax: 4 },
      { titleAr: "المسألة الإدماجية", topicHint: "وضعية يومية تجمع حساب ومساحة وتناسبية", points: 6, subQMin: 3, subQMax: 5 },
    ],
    integrationContext: "تبليط غرفة، شراء أدوات مدرسية، رحلة",
    mandatoryConcepts: [
      { re: /كسر|عشري/, label: "الكسور والأعداد العشرية" },
      { re: /مساح(ة|ـة)|محيط/, label: "المساحة والمحيط" },
      { re: /تناسب/, label: "التناسبية" },
    ],
    bloomTarget: { avgMin: 2.2, avgMax: 2.8, highMin: 0 },
  },
};

// Aliases — different countries call the same level differently
const GRADE_ALIASES: Record<string, string> = {
  // Algeria primary keys (already in CURRICULUM)
  "1AM": "1AM", "2AM": "2AM", "3AM": "3AM", "4AM": "4AM",
  "1AS": "1AS", "2AS": "2AS", "3AS": "3AS",
  // Generic / French
  "BEM": "4AM", "BAC": "3AS",
  "TERMINALE": "3AS", "PREMIERE": "2AS", "SECONDE": "1AS",
  "3MOY": "3AM", "4MOY": "4AM",
  // Tunisia equivalents
  "BAC_TN": "3AS", "9EME": "4AM", "BAC_MA": "3AS",
};

const DEFAULT_CURRICULUM_KEY = "4AM";

function resolveCurriculumKey(grade: string, country?: string): string {
  if (!grade) return DEFAULT_CURRICULUM_KEY;
  const g = grade.trim().toUpperCase().replace(/\s+/g, "");
  if (CURRICULUM[g]) return g;
  if (GRADE_ALIASES[g]) return GRADE_ALIASES[g];
  // Loose matches
  if (g.includes("3AS") || g.includes("BAC") || g.includes("TERMINALE")) return "3AS";
  if (g.includes("2AS") || g.includes("PREMIERE")) return "2AS";
  if (g.includes("1AS") || g.includes("SECONDE")) return "1AS";
  if (g.includes("4AM") || g.includes("BEM") || g.includes("9EME")) return "4AM";
  if (g.includes("3AM") || g.includes("3MOY")) return "3AM";
  if (g.includes("2AM")) return "2AM";
  if (g.includes("1AM")) return "1AM";
  return DEFAULT_CURRICULUM_KEY;
}


// ─────────────────────────────────────────────────────────────
// BUILD PROMPT
// ─────────────────────────────────────────────────────────────
function buildSyntheticPrompt(
  template: Record<string, unknown>,
  grade: string,
  patterns: Record<string, unknown> | undefined,
  country: string,
  currKey: string,
): string {
  const curr = CURRICULUM[currKey];

  const topicList = curr.topics.map((t, i) => `  ${i + 1}. ${t}`).join("\n");

  const blueprintText = curr.sectionBlueprint
    .map((s, i) => {
      return `  • ${s.titleAr} (${s.points} نقاط): موضوع "${s.topicHint}" — يجب أن يحتوي على ${s.subQMin} إلى ${s.subQMax} أسئلة فرعية مرقمة ومترابطة منطقياً`;
    })
    .join("\n");

  const totalSubQ = curr.sectionBlueprint.reduce((sum, s) => sum + s.subQMin, 0);

  return `أنت مفتش رياضيات معتمد متخصص في منهاج ${curr.labelAr} ${country === "DZ" ? "(المنهاج الجزائري)" : `(${country})`}.
مهمتك: توليد امتحان كامل من نوع "${template.format ?? curr.examType}" للمستوى ${grade}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
المنهاج الإلزامي لهذا المستوى (${currKey})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
المواضيع المقررة التي يجب أن يغطيها الامتحان:
${topicList}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
الهيكل الإلزامي للامتحان
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${blueprintText}

▸ إجمالي الأسئلة الفرعية: لا يقل عن ${totalSubQ} سؤالاً فرعياً (مجموع كل التمارين).
▸ المسألة الإدماجية: ${curr.integrationContext}.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
قواعد صياغة الأسئلة (إلزامية)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. كل تمرين يبدأ بعبارة افتتاحية تحدد السياق:
   - للمتتاليات: "لتكن $(u_n)$ متتالية حيث $u_0 = ...$ و $u_{n+1} = ...$"
   - للدوال: "لتكن الدالة $f$ المعرفة على المجال $I$ بـ: $f(x) = ...$"
   - للهندسة: "ABC مثلث قائم في A حيث $AB = ...$ سم، $AC = ...$ سم"

2. بنية الأسئلة الفرعية الإلزامية:
   - كل سؤال فرعي = فعل أمر واحد فقط: أحسب / أثبت أن / استنتج / أنشئ / أرسم / حلّ / بيّن أن / أدرس
   - تدرج الصعوبة: السؤال 1 = B2، السؤال 2-3 = B3، الأسئلة الأخيرة = B4-B5
   - الترابط المنطقي: كل سؤال يبني على نتيجة السؤال السابق

3. مستويات بلوم الهدف لكل تمرين (إلزامي - الامتحان الرسمي يصل إلى B5-B6):
   - التمرين 1 (المتتاليات): يبدأ B2 ثم يصعد إلى B4-B5 (إثبات بالتراجع، استنتاج النهاية، حساب مجموع، ربط متتاليتين)
   - التمرين 2: B3-B5 (تطبيق + تحليل + برهنة في $\\mathbb{C}$ أو احتمالات)
   - التمرين 3 (دراسة دالة): B3-B6 — يجب أن يحتوي إلزامياً على: (أ) دراسة إشارة المشتقة، (ب) جدول التغيرات، (ج) إثبات وجود مقارب مائل ودراسة الوضعية، (د) المناقشة البيانية لعدد حلول $f(x)=m$، (هـ) حل متراجحة لوغاريتمية أو أسية
   - المسألة الإدماجية: B4-B6 (تحليل + تركيب + تقييم) — تربط حتمياً بين دالة + متتالية + معادلة تفاضلية أو تكامل
   ➤ متوسط بلوم المستهدف للورقة كاملة: بين **3.6 و 4.4**.
   ➤ يجب ألا يقل عدد الأسئلة من مستوى B5 أو B6 عن **5 أسئلة فرعية** في الورقة كاملة.

3.b ربط المفاهيم (Cross-concept linking) — إلزامي:
   - يجب أن يحتوي تمرين واحد على الأقل على ربط بين موضوعين (مثلاً: استخدام دراسة دالة لإثبات رتابة متتالية، أو استخدام التكامل لتعريف متتالية، أو استخدام TVI ثم متراجحة لوغاريتمية).
   - تجنّب المسائل المنفصلة المغلقة على نفسها.

3.c توزيع الصعوبة المستهدف:
   - سهل (B2): 20% كحد أقصى
   - متوسط (B3-B4): 50%
   - صعب (B5-B6): 30% على الأقل — لا يجوز أن يكون صفراً

3.d المفاهيم الإلزامية للبكالوريا (3AS) — يجب أن يظهر كلٌّ منها على الأقل مرة واحدة:
   ✓ المتتاليات الهندسية (إثبات الطبيعة + الحد العام + المجموع + النهاية)
   ✓ الإثبات بالتراجع
   ✓ المقارب المائل + دراسة الوضعية
   ✓ جدول التغيرات الكامل
   ✓ المناقشة البيانية لعدد حلول $f(x)=m$
   ✓ متراجحة لوغاريتمية أو أسية مع شرط مجموعة التعريف
   ✓ معادلة تفاضلية $y'+ay=b$ مع شرط ابتدائي
   ✓ تكامل (مساحة أو تكامل بالتجزئة)

4. LaTeX:
   - داخل النص: $...$
   - أسطر مستقلة: $$...$$
   - لا تستخدم \\\\ أو %% أو رموز TeX غير قياسية
   - الأرقام والوحدات خارج LaTeX: "يساوي $x = 5$ سم"

5. اكتمال الأسئلة (حرج):
   - كل سؤال فرعي يجب أن يكون جملة عربية كاملة مع المطلوب الواضح
   - لا تقطع جملة في منتصفها
   - لا تترك سؤالاً دون مطلوب محدد

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
صيغة الإخراج: JSON فقط، لا markdown، لا شرح خارجي
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{
  "exam": {
    "title": "اختبار في الرياضيات - ${curr.labelAr}",
    "format": "${template.format ?? curr.examType}",
    "grade": "${grade}",
    "duration": ${template.duration ?? 120},
    "totalPoints": ${template.totalPoints ?? 20},
    "sections": [
      {
        "id": "section_1",
        "title": "التمرين الأول",
        "points": 5,
        "topicCovered": "اسم الموضوع المغطى",
        "exercises": [
          {
            "id": "ex_1",
            "text": "لتكن ...\\n\\n1) أحسب ... (1ن)\\n2) بيّن أن ... (1.5ن)\\n3) استنتج ... (1.5ن)\\n4) حلّ في $\\\\mathbb{R}$ المعادلة ... (1ن)",
            "points": 5,
            "type": "sequences",
            "source": "ai",
            "bloomLevel": 3,
            "subQuestionCount": 4
          }
        ]
      }
    ]
  }
}`;
}

function buildEnhancePrompt(kbExam: unknown, currKey: string): string {
  const curr = CURRICULUM[currKey];
  const topicList = curr.topics.map((t, i) => `  ${i + 1}. ${t}`).join("\n");

  return `أنت مفتش رياضيات معتمد. لديك امتحان مستخرج من قاعدة المعرفة. مهمتك تطويره ليطابق معايير امتحان ${curr.labelAr} الرسمي.

الامتحان الحالي:
${JSON.stringify(kbExam)}

المواضيع المقررة لهذا المستوى التي يجب أن يغطيها الامتحان المحسّن:
${topicList}

التحسينات المطلوبة (إلزامية):
1. تحقق من أن كل تمرين يغطي موضوعاً من المنهاج أعلاه - إذا كان موضوع التمرين لا ينتمي لهذا المستوى، أعد كتابته بموضوع مناسب
2. أكمل الأسئلة الفرعية الناقصة أو المقطوعة - كل سؤال يجب أن يكون جملة عربية كاملة مع مطلوب واضح
3. أضف أسئلة فرعية للتمارين القصيرة: كل تمرين يجب أن يحتوي على 4 إلى 6 أسئلة فرعية مرقمة
4. أعد صياغة الأسئلة بالأسلوب الرسمي: "نعتبر" / "لتكن" / "بيّن أن" / "استنتج" / "حلّ في $\\mathbb{R}$"
5. وزّع النقاط بشكل واقعي (0.5 إلى 2 نقطة لكل سؤال فرعي)
6. أضف bloomLevel (1-6) لكل تمرين - استهدف متوسطاً بين 3.0 و 3.8 للورقة كاملة
7. أضف حقل topicCovered لكل section
8. تأكد من سلامة LaTeX داخل $...$

أعد JSON بنفس الهيكل مع التحسينات. JSON فقط، لا markdown.`;
}

// ─────────────────────────────────────────────────────────────
// HANDLER
// ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, template, grade, patterns, kbExam, style, country = "DZ" } = await req.json();

    const currKey = resolveCurriculumKey(grade ?? "", country);
    const curr = CURRICULUM[currKey];

    let prompt: string;

    if (mode === "synthetic") {
      prompt = buildSyntheticPrompt(template ?? {}, grade ?? "", patterns, country, currKey);
    } else {
      prompt = buildEnhancePrompt(kbExam, currKey);
    }

    const systemInstruction = [
      `أنت مفتش رياضيات معتمد متخصص في منهاج ${curr.labelAr}.`,
      "أجب بـ JSON صالح فقط.",
      "لا markdown، لا ```json، لا أي نص خارج JSON الخام.",
      "كل سؤال فرعي يجب أن يكون جملة عربية كاملة غير مقطوعة.",
      `الامتحان يجب أن يتضمن مواضيع ${currKey} الرسمية فقط، لا مواضيع من سنوات أدنى.`,
    ].join(" ");

    const response = await callGemini([{ role: "user", parts: [{ text: prompt }] }], {
      systemInstruction,
      temperature: 0.55,
      maxOutputTokens: 16384,
    });

    const parsed = extractJSON(response.text);

    // ── Post-generation validation ────────────────────────────
    const exam = (parsed as Record<string, unknown>).exam as Record<string, unknown> | undefined;
    const sections = (exam?.sections as unknown[]) ?? [];
    const warnings: string[] = [];

    let totalSubQ = 0;
    let totalBloom = 0;
    let bloomCount = 0;
    let highBloomQs = 0;
    const allText: string[] = [];

    for (const sec of sections as Array<Record<string, unknown>>) {
      const exs = (sec.exercises as Array<Record<string, unknown>>) ?? [];
      for (const ex of exs) {
        const text = (ex.text as string) ?? "";
        allText.push(text);
        const matches = text.match(/^\s*\d+[\)\.]/gm);
        const count = matches?.length ?? 0;
        totalSubQ += count;
        ex.subQuestionCount = count;
        if (count < 3) {
          warnings.push(`تمرين ${ex.id}: يحتوي على ${count} أسئلة فرعية فقط (الحد الأدنى 3)`);
        }
        const b = Number(ex.bloomLevel) || 3;
        totalBloom += b * Math.max(count, 1);
        bloomCount += Math.max(count, 1);
        if (b >= 5) highBloomQs += count;
      }
    }

    const avgBloom = bloomCount ? totalBloom / bloomCount : 0;
    const fullText = allText.join("\n");

    // Per-curriculum mandatory concept checks (data-driven, all levels)
    const mandatory = curr.mandatoryConcepts ?? [];
    for (const { re, label } of mandatory) {
      if (!re.test(fullText)) warnings.push(`مفهوم مفقود (${currKey}): ${label}`);
    }

    // Bloom targets (per curriculum)
    const bloom = curr.bloomTarget;
    if (bloom) {
      if (avgBloom < bloom.avgMin) {
        warnings.push(`متوسط بلوم ${avgBloom.toFixed(2)} منخفض (المستهدف ≥ ${bloom.avgMin})`);
      }
      if (highBloomQs < bloom.highMin) {
        warnings.push(`أسئلة B5/B6 = ${highBloomQs} (المستهدف ≥ ${bloom.highMin})`);
      }
    }

    // Per-curriculum minimum sub-question count, derived from blueprint
    const minSubQ = curr.sectionBlueprint.reduce((s, x) => s + x.subQMin, 0);
    if (totalSubQ < minSubQ) {
      warnings.push(`إجمالي الأسئلة الفرعية ${totalSubQ} أقل من الحد الأدنى لـ ${currKey} (${minSubQ}).`);
    }

    return new Response(
      JSON.stringify({
        ...parsed,
        _meta: {
          curriculumKey: currKey,
          totalSubQuestions: totalSubQ,
          avgBloom: Number(avgBloom.toFixed(2)),
          highBloomQuestions: highBloomQs,
          warnings,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    if (err instanceof GeminiError) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: err.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
