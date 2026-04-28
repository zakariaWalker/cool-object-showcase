// ===== Studio cognitive entry derivation =====
// Studios receive free-text from the user (no pattern/deconstruction record),
// so we derive a sensible CognitiveEntryHeader from the text alone.

import type { CognitiveEntryProps } from "@/components/solver/CognitiveEntryHeader";

export type StudioKind = "algebra" | "geometry";

const LEVEL_LABELS: Record<string, string> = {
  "1AS": "1 ثانوي", "2AS": "2 ثانوي", "3AS": "3 ثانوي",
  "1AM": "1 متوسط", "2AM": "2 متوسط", "3AM": "3 متوسط", "4AM": "4 متوسط",
};

function prettyLevel(code?: string | null): string | undefined {
  if (!code) return undefined;
  if (LEVEL_LABELS[code]) return LEVEL_LABELS[code];
  for (const k of Object.keys(LEVEL_LABELS)) if (code.includes(k)) return LEVEL_LABELS[k];
  if (/secondary/i.test(code)) return "ثانوي";
  if (/middle/i.test(code)) return "متوسط";
  return code;
}

export function deriveStudioCognitive(
  text: string,
  kind: StudioKind,
  level?: string,
  chapter?: string,
): CognitiveEntryProps | null {
  const t = (text || "").trim();
  if (!t) return null;
  const low = t.toLowerCase();
  const niceLevel = prettyLevel(level);

  // ---- Trigonometric identity / proof detection (must come BEFORE generic "مثلث" geometry match) ----
  const isTrigIdentity =
    /\\sin|\\cos|\\tan|\\cot|sin\(|cos\(|tan\(|sin\s*x|cos\s*x|جا\s*\(|جتا\s*\(|ظا\s*\(/.test(low) &&
    /(أثبت|بيّن|برهن|démontr|montr|prouv)/i.test(low);
  const isProof = /(أثبت|بيّن|برهن|démontr|montr|prouv)\s+(أن|que|صحة|l'égalité|l'identité|المتساوية)/i.test(low);

  // ---- Skill detection ----
  let skill = kind === "geometry" ? "إنشاء هندسي" : "حل جبري";
  let goal = "افهم المعطيات والمطلوب، ثم تقدّم خطوة بخطوة.";
  let firstStepHint = "اقرأ النص بتأنٍّ وأعد كتابة المعطيات بكلماتك.";
  let hint = "ابدأ بأبسط ما تراه وتقدّم تدريجياً.";
  let similarExample = "";
  let method = "";

  // Trigonometric identity proof — handle FIRST so a word like "مثلثية" doesn't fall to geometry.
  if (isTrigIdentity || (isProof && /sin|cos|جا|جتا/.test(low))) {
    return {
      skill: "إثبات متطابقة مثلثية",
      level: niceLevel,
      difficulty: "moyen",
      durationMin: 6,
      xpReward: 25,
      goal: "البرهان على صحّة متطابقة مثلثية بتحويل أحد الطرفين حتى يصبح مطابقاً للآخر.",
      firstStepHint: "ابدأ بالطرف الأكثر تعقيداً، ووحّد المقامات إن وجدت كسور.",
      hint: "تذكّر: sin²(x) + cos²(x) = 1، وأن 1 + cos(x) = 2cos²(x/2)، و sin(x) = 2 sin(x/2) cos(x/2).",
      similarExample: "أثبت أن: tan(x) + cot(x) = 1 / (sin(x)·cos(x)).",
      method: "1. اختر طرفاً واحداً للتحويل (الأعقد عادةً).\n2. وحّد المقامات إن لزم الأمر.\n3. استبدل بالمتطابقات الأساسية (sin²+cos²=1، …).\n4. بسّط حتى تصل إلى الطرف الآخر.\n5. اذكر شرط وجود الحدود (المقامات ≠ 0).",
    };
  }

  // Trigonometric circle / coordinates of a point on the unit circle — common 2AS topic.
  // Catch BEFORE generic "circle" geometry detection.
  const isUnitCircle =
    /(دائرة\s+مثلثية|cercle\s+trigonom|cercle\s+unit|الدائرة\s+الوحدوية)/i.test(low) ||
    (/(\\frac\s*\{\s*\d*\s*\\?pi|\bπ\b|\\pi)/i.test(low) && /(cos|sin|tan|جا|جتا|ظا|إحداثيات|coordonn)/i.test(low));
  if (isUnitCircle) {
    return {
      skill: "الدائرة المثلثية وإحداثيات نقطة",
      level: niceLevel,
      difficulty: "moyen",
      durationMin: 7,
      xpReward: 25,
      goal: "تحديد إحداثيات نقطة على الدائرة المثلثية واستنتاج قيمتي الجيب وجيب التمام للزاوية المرتبطة بها.",
      firstStepHint: "حدّد المركز (0,0) ونصف القطر 1، ثم ضع الزاوية x ابتداءً من المحور الموجب للسينات (عكس عقارب الساعة).",
      hint: "إحداثيات النقطة M المرتبطة بالعدد x هي M(cos x, sin x). استعمل الزوايا المرجعية (π/6, π/4, π/3) وقواعد الإشارة في الأرباع.",
      similarExample: "x = 2π/3 ⇒ M = (cos 2π/3, sin 2π/3) = (−1/2, √3/2).",
      method: "1. حدّد الربع الذي تقع فيه الزاوية (5π/6 → الربع الثاني).\n2. احسب الزاوية المرجعية = π − x = π/6.\n3. cos(π/6) = √3/2 و sin(π/6) = 1/2.\n4. طبّق الإشارة حسب الربع: في الربع الثاني، cos < 0 و sin > 0.\n5. النتيجة: M(−√3/2, 1/2)، أي cos(5π/6) = −√3/2 و sin(5π/6) = 1/2.",
    };
  }



  if (kind === "algebra") {
    if (/factoris|تحليل/.test(low) && /مربّ?ع كامل|carré parfait|a²|b²|2ab/.test(low)) {
      skill = "التحليل بالمربع الكامل";
      goal = "التعرّف على الهويات الشهيرة وتحليل العبارات بسرعة.";
      firstStepHint = "تأكّد أن الحدّين الطرفيّين مربّعان، ثم تحقّق من الحدّ الأوسط = 2·a·b.";
      hint = "إذا كانت العبارة من شكل a² + 2ab + b²، فاكتبها مباشرة (a+b)².";
      similarExample = "E = 25x² + 30x + 9 = (5x + 3)²";
      method = "1. تحقّق أن الحدّ الأول مربع كامل (a²).\n2. تحقّق أن الحدّ الأخير مربع كامل (b²).\n3. تأكّد أن الحدّ الأوسط يساوي 2·a·b.\n4. اكتب النتيجة على شكل (a+b)² أو (a−b)² حسب الإشارة.";
    } else if (/factoris|تحليل/.test(low)) {
      skill = "تحليل عبارة جبرية";
      goal = "كتابة العبارة على شكل جداء عوامل.";
      firstStepHint = "ابحث عن عامل مشترك أو هوية شهيرة (a²−b², a²±2ab+b²).";
      similarExample = "9x² − 16 = (3x − 4)(3x + 4)";
    } else if (/équation|معادلة/.test(low)) {
      skill = "حلّ معادلة";
      goal = "إيجاد قيمة المجهول التي تحقّق المساواة.";
      firstStepHint = "اعزل المجهول x في طرف واحد بإجراء العمليات نفسها على الطرفين.";
      similarExample = "2x + 3 = 7  ⇒  2x = 4  ⇒  x = 2";
      method = "1. بسّط كل طرف.\n2. انقل المجاهيل لطرف والثوابت للطرف الآخر.\n3. اقسم على معامل x.\n4. تحقّق بالتعويض.";
    } else if (/inéquation|متراجحة/.test(low)) {
      skill = "حلّ متراجحة";
      goal = "تحديد مجموعة قيم x التي تحقّق المتراجحة.";
      firstStepHint = "تذكّر: إذا ضربت أو قسمت على عدد سالب، فاقلب جهة المتراجحة.";
    } else if (/simplif|بسّط|بسط/.test(low)) {
      skill = "تبسيط عبارة";
      goal = "كتابة العبارة في أبسط صورة ممكنة.";
      firstStepHint = "ابدأ بنشر الأقواس ثم اجمع الحدود المتشابهة.";
    } else if (/développ|انشر|نشر/.test(low)) {
      skill = "نشر عبارة";
      goal = "إزالة الأقواس وكتابة العبارة كمجموع حدود.";
      firstStepHint = "استعمل (a+b)(c+d) = ac + ad + bc + bd.";
    } else if (/fonction|دالة/.test(low)) {
      skill = "دراسة دالة";
      firstStepHint = "حدّد مجموعة التعريف، ثم احسب الصور المطلوبة.";
    }
  } else {
    // geometry
    if (/médiatrice|منصّ?ف عمودي/.test(low)) {
      skill = "إنشاء المنصّف العمودي";
      goal = "رسم المستقيم العمودي على قطعة من منتصفها.";
      firstStepHint = "أنشئ نقطتين متساويتي البُعد من طرفي القطعة، ثم ارسم المستقيم بينهما.";
    } else if (/bissectrice|منصّ?ف زاوية/.test(low)) {
      skill = "إنشاء منصّف زاوية";
      firstStepHint = "ارسم قوساً يقطع ضلعي الزاوية، ثم قوسين متقاطعين من نقطتي التقاطع.";
    } else if (/cercle circonscrit|دائرة محيطة/.test(low)) {
      skill = "الدائرة المحيطة بمثلث";
      firstStepHint = "مركز الدائرة المحيطة هو نقطة تقاطع المنصّفات العمودية لأضلاع المثلث.";
    } else if (/(triangle|مثلث)/.test(low) && /(ارسم|أنشئ|construire|tracer|dessiner)/.test(low)) {
      skill = "إنشاء مثلث";
      goal = "رسم مثلث يحقّق المعطيات (أطوال أو زوايا).";
      firstStepHint = "ابدأ برسم أطول ضلع، ثم استعمل البركار لرسم القوسين.";
    } else if (/cercle|دائرة/.test(low)) {
      skill = "إنشاء دائرة";
      firstStepHint = "حدّد المركز ونصف القطر قبل الرسم.";
    } else if (/parallélogramme|متوازي\s*(ال)?أضلاع|متوازي\s*أضلع/.test(low)) {
      skill = "خصائص متوازي الأضلاع";
      goal = "استعمال خصائص متوازي الأضلاع (الأضلاع، الزوايا، الأقطار) لإيجاد المطلوب.";
      firstStepHint = "تذكّر: في متوازي الأضلاع، الزوايا المتقابلة متقايسة والمتتالية متكاملة (مجموعها 180°).";
    } else if (/(parallèle|مواز[ٍي]|توازي)(?!.*أضلاع)/.test(low) && /(ارسم|أنشئ|construire|tracer|اِرسم)/.test(low)) {
      skill = "إنشاء مستقيم موازٍ";
      firstStepHint = "استعمل الكوس لنقل الميل من المستقيم الأصلي إلى نقطة جديدة.";
    } else if (/perpendicul|عمودي/.test(low)) {
      skill = "إنشاء مستقيم عمودي";
      firstStepHint = "ضع الكوس بحيث ينطبق ضلعه القائم على المستقيم.";
    }
  }

  // ---- Difficulty heuristic ----
  const len = t.length;
  const difficulty: "facile" | "moyen" | "difficile" =
    len < 60 ? "facile" : len > 220 ? "difficile" : "moyen";
  const durationMin = Math.max(2, Math.min(15, Math.round(len / 30)));
  const xpReward = difficulty === "facile" ? 10 : difficulty === "difficile" ? 30 : 20;

  // If a chapter is known and the heuristic skill is generic, prefer the chapter name.
  const isGenericSkill = skill === "حل جبري" || skill === "إنشاء هندسي";
  const finalSkill = isGenericSkill && chapter ? chapter : skill;

  return {
    skill: finalSkill,
    level: niceLevel,
    difficulty,
    durationMin,
    xpReward,
    goal,
    firstStepHint,
    hint,
    similarExample,
    method,
  };
}
