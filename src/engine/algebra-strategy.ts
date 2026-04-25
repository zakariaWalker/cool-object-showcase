// ===== Algebra Strategy Inferencer =====
// Reads a free-form problem statement (Arabic / French / English) and returns
// a "solving guide": the kind of task, the recommended method, the key symbols
// the student should use, and a skeleton of solution steps.
//
// Pure presentation/heuristic layer — no engine, no network.

export type AlgebraTaskKind =
  | "linear_equation"
  | "quadratic_equation"
  | "system_equations"
  | "inequality"
  | "factoring"
  | "expansion"
  | "simplify"
  | "fraction"
  | "derivative"
  | "integral"
  | "limit"
  | "function_study"
  | "complex_number"
  | "sequence"
  | "logarithm"
  | "exponential"
  | "trigonometry"
  | "arithmetic"
  | "pgcd_ppcm"
  | "generic";

export interface AlgebraStrategy {
  kind: AlgebraTaskKind;
  titleAr: string;
  methodAr: string;          // 1-2 sentence description of the method
  bulletStepsAr: string[];   // ordered "how to solve" bullets
  keySymbols: string[];      // symbol labels the student will likely need
  exampleStepsLatex: string[]; // optional template scaffold (LaTeX-ish)
  pitfallsAr?: string[];     // common mistakes
}

// ────────────────────────── Detection ──────────────────────────

export function detectAlgebraKind(text: string): AlgebraTaskKind {
  const t = (text || "").toLowerCase();

  // Calculus
  if (/مشتق|اشتق|دالة المشتق|dérivée|derivative|f'\(/.test(t)) return "derivative";
  if (/تكامل|أوجد التكامل|intégrale|integral|∫/.test(t)) return "integral";
  if (/نهاية|lim|limite|limit/.test(t)) return "limit";
  if (/دراسة الدالة|اتجاه التغير|tableau de variation|study the function/.test(t))
    return "function_study";

  // Numbers & algebra structures
  if (/مركب|complexe|complex|module|argument|i\^2|i²/.test(t)) return "complex_number";
  if (/متتالية|suite|sequence|u_n|u\(n\)/.test(t)) return "sequence";
  if (/لوغاريتم|ln\(|log\(|logarithm/.test(t)) return "logarithm";
  if (/أسي|exponentielle|exponential|e\^/.test(t)) return "exponential";
  if (/جيب|جتا|ظل|sin|cos|tan|trigonom/.test(t)) return "trigonometry";

  // School algebra
  if (/جملة|système|system|\{[^}]*=/.test(t)) return "system_equations";
  if (/متراجحة|inéquation|inequality|≤|≥|<|>/.test(t)) return "inequality";
  if (/حلل|تحليل|factorise|factoriser|factor/.test(t)) return "factoring";
  if (/انشر|طور|développer|expand/.test(t)) return "expansion";
  if (/بسّط|بسط|simplifie|simplify/.test(t)) return "simplify";
  if (/كسر|fraction/.test(t)) return "fraction";
  if (/pgcd|ppcm|قاسم مشترك|مضاعف مشترك|gcd|lcm/.test(t)) return "pgcd_ppcm";

  // Equations — quadratic vs linear
  const hasEquation = /=/.test(t) || /معادلة|équation|equation|حلّ|حل/.test(t);
  if (hasEquation) {
    if (/x\^?2|x²|x\*\*2|من الدرجة الثانية|second degré|quadratic/.test(t))
      return "quadratic_equation";
    return "linear_equation";
  }

  // Plain arithmetic statements
  if (/[+\-×÷*/]\s*\d/.test(t) && !/[a-zA-Zا-ي]/.test(t)) return "arithmetic";

  return "generic";
}

// ────────────────────────── Strategy library ──────────────────────────

const STRATEGIES: Record<AlgebraTaskKind, AlgebraStrategy> = {
  linear_equation: {
    kind: "linear_equation",
    titleAr: "معادلة من الدرجة الأولى",
    methodAr:
      "اعزل المجهول x: انقل الحدود التي تحتوي x إلى طرف، والثوابت إلى الطرف الآخر، ثم اقسم على معامل x.",
    bulletStepsAr: [
      "اجمع الحدود المتشابهة في كلّ طرف.",
      "انقل حدود x إلى الطرف الأيسر، والثوابت إلى الأيمن (أو العكس).",
      "اقسم على معامل x للحصول على الحلّ.",
      "تحقّق بالتعويض في المعادلة الأصلية.",
    ],
    keySymbols: ["+", "-", "×", "÷", "="],
    exampleStepsLatex: [
      "2x + 3 = 7",
      "2x = 7 - 3",
      "2x = 4",
      "x = 2",
    ],
    pitfallsAr: [
      "نسيان قلب الإشارة عند نقل الحدود.",
      "القسمة على معامل سالب دون عكس الإشارة.",
    ],
  },
  quadratic_equation: {
    kind: "quadratic_equation",
    titleAr: "معادلة من الدرجة الثانية",
    methodAr:
      "ضع المعادلة على الشكل ax² + bx + c = 0، ثم احسب المميّز Δ = b² − 4ac واستنتج الحلول.",
    bulletStepsAr: [
      "اكتب المعادلة على الشكل القياسي ax² + bx + c = 0.",
      "احسب Δ = b² − 4ac.",
      "إذا Δ > 0: حلّان x = (−b ± √Δ) / (2a).",
      "إذا Δ = 0: حلّ مضاعف x = −b / (2a).",
      "إذا Δ < 0: لا توجد حلول حقيقية (أو حلّان مركّبان).",
    ],
    keySymbols: ["x²", "√", "±", "=", "frac"],
    exampleStepsLatex: [
      "ax^2 + bx + c = 0",
      "\\Delta = b^2 - 4ac",
      "x = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}",
    ],
    pitfallsAr: ["نسيان الإشارة ± أمام الجذر.", "خطأ في حساب b² (تربيع عدد سالب)."],
  },
  system_equations: {
    kind: "system_equations",
    titleAr: "جملة معادلتين",
    methodAr:
      "استعمل التعويض أو الجمع لإلغاء أحد المجهولين، ثم احسب الثاني وعوّض للحصول على الأول.",
    bulletStepsAr: [
      "اختر طريقة: التعويض أو الجمع.",
      "ألغِ أحد المجهولين (x أو y).",
      "احسب المجهول المتبقي.",
      "عوّض في إحدى المعادلتين لإيجاد الآخر.",
      "اكتب الحلّ على شكل ثنائية (x ; y).",
    ],
    keySymbols: ["{=}", "+", "-", "=", "⇒"],
    exampleStepsLatex: [
      "\\begin{cases} 2x + y = 5 \\\\ x - y = 1 \\end{cases}",
      "3x = 6",
      "x = 2,\\ y = 1",
    ],
  },
  inequality: {
    kind: "inequality",
    titleAr: "متراجحة",
    methodAr:
      "تعامل معها كمعادلة، لكن انتبه: عند الضرب أو القسمة بعدد سالب يُعكس اتجاه المتراجحة.",
    bulletStepsAr: [
      "اعزل المجهول كما في المعادلة.",
      "عند الضرب/القسمة بعدد سالب: اعكس ≤ إلى ≥.",
      "اكتب مجموعة الحلّ على شكل مجال.",
    ],
    keySymbols: ["≤", "≥", "<", ">", "ℝ"],
    exampleStepsLatex: ["-2x \\geq 6", "x \\leq -3", "S = ]-\\infty,\\ -3]"],
    pitfallsAr: ["نسيان عكس الإشارة عند القسمة على عدد سالب."],
  },
  factoring: {
    kind: "factoring",
    titleAr: "تحليل عبارة",
    methodAr:
      "ابحث عن عامل مشترك، أو استعمل المتطابقات الشهيرة (a²−b²)، (a+b)²، (a−b)².",
    bulletStepsAr: [
      "ابحث عن عامل مشترك بين الحدود.",
      "تحقّق إن كانت العبارة فرق مربّعين أو مربّع كامل.",
      "اكتب العبارة كحاصل ضرب عوامل.",
    ],
    keySymbols: ["x²", "(", ")", "−", "+"],
    exampleStepsLatex: [
      "x^2 - 9",
      "= (x-3)(x+3)",
    ],
  },
  expansion: {
    kind: "expansion",
    titleAr: "نشر / تطوير",
    methodAr: "استعمل خاصيّة التوزيع وامتطابقات النشر: (a+b)² = a² + 2ab + b².",
    bulletStepsAr: [
      "اضرب كلّ حدّ من القوس الأول في كلّ حدّ من الثاني.",
      "اختزل الحدود المتشابهة.",
    ],
    keySymbols: ["x²", "+", "-", "×"],
    exampleStepsLatex: ["(x+2)^2", "= x^2 + 4x + 4"],
  },
  simplify: {
    kind: "simplify",
    titleAr: "تبسيط عبارة",
    methodAr: "اجمع الحدود المتشابهة، اختزل الكسور، وحلّل قبل الاختصار.",
    bulletStepsAr: [
      "اجمع الحدود المتشابهة (نفس درجة x).",
      "اختزل الكسور بقسمة البسط والمقام على عامل مشترك.",
      "تحقّق من شروط وجود الكسر (المقام ≠ 0).",
    ],
    keySymbols: ["frac", "+", "-", "x²"],
    exampleStepsLatex: ["\\frac{2x^2 + 4x}{2x}", "= x + 2 \\quad (x \\neq 0)"],
  },
  fraction: {
    kind: "fraction",
    titleAr: "عمليات على الكسور",
    methodAr: "وحّد المقامات قبل الجمع/الطرح، اضرب البسط بالبسط والمقام بالمقام للضرب.",
    bulletStepsAr: [
      "حدّد المقام المشترك.",
      "حوّل كلّ كسر إلى نفس المقام.",
      "أجرِ العملية على البسوط فقط.",
      "اختصر النتيجة إن أمكن.",
    ],
    keySymbols: ["frac", "+", "-", "×"],
    exampleStepsLatex: [
      "\\frac{1}{2} + \\frac{1}{3}",
      "= \\frac{3 + 2}{6} = \\frac{5}{6}",
    ],
  },
  derivative: {
    kind: "derivative",
    titleAr: "حساب المشتقة",
    methodAr:
      "طبّق قواعد الاشتقاق: (xⁿ)' = n·xⁿ⁻¹، (uv)' = u'v + uv'، (u/v)' = (u'v − uv')/v².",
    bulletStepsAr: [
      "حدّد بنية الدالة (مجموع، جداء، حاصل قسمة، تركيب).",
      "طبّق القاعدة المناسبة على كلّ جزء.",
      "اختصر النتيجة.",
      "ادرس إشارة f'(x) لتحديد اتجاه التغيّر.",
    ],
    keySymbols: ["f'", "x²", "frac", "+", "-"],
    exampleStepsLatex: [
      "f(x) = x^3 - 2x",
      "f'(x) = 3x^2 - 2",
    ],
  },
  integral: {
    kind: "integral",
    titleAr: "حساب التكامل",
    methodAr:
      "أوجد دالة أصلية F بحيث F' = f، ثم استعمل F(b) − F(a) للتكامل المحدود.",
    bulletStepsAr: [
      "تعرّف على شكل الدالة (كثير حدود، نسبية، أسية…).",
      "استعمل قاعدة التكامل المناسبة أو التكامل بالتجزئة.",
      "احسب F(b) − F(a) للتكامل المحدود.",
    ],
    keySymbols: ["∫", "frac", "ln", "eˣ"],
    exampleStepsLatex: [
      "\\int (3x^2)\\,dx = x^3 + C",
      "\\int_0^1 3x^2\\,dx = 1",
    ],
  },
  limit: {
    kind: "limit",
    titleAr: "حساب نهاية",
    methodAr:
      "عوّض القيمة مباشرة. إن ظهرت حالة عدم تعيين (0/0, ∞/∞)، حلّل أو استعمل المرافق أو قاعدة لوبيتال.",
    bulletStepsAr: [
      "عوّض القيمة في الدالة.",
      "إن كانت النتيجة معرّفة → هي النهاية.",
      "إن ظهرت 0/0: حلّل البسط والمقام واختصر.",
      "إن ظهرت ∞/∞: قسّم على أعلى قوّة.",
    ],
    keySymbols: ["lim", "∞", "frac", "−"],
    exampleStepsLatex: [
      "\\lim_{x \\to 2} \\frac{x^2 - 4}{x - 2}",
      "= \\lim_{x \\to 2} (x+2) = 4",
    ],
  },
  function_study: {
    kind: "function_study",
    titleAr: "دراسة دالة",
    methodAr:
      "حدّد مجال التعريف، احسب النهايات، اشتقّ الدالة، ادرس إشارة f'، ثم ارسم جدول التغيّر.",
    bulletStepsAr: [
      "حدّد Df (مجال التعريف).",
      "احسب النهايات على أطراف Df.",
      "احسب f'(x) وادرس إشارتها.",
      "ارسم جدول التغيّر.",
      "حدّد القيم الحدّية ونقاط التقاطع.",
    ],
    keySymbols: ["f'", "lim", "∞", "ℝ"],
    exampleStepsLatex: [
      "D_f = \\mathbb{R}",
      "f'(x) = \\ldots",
      "f \\nearrow \\text{ sur } \\ldots",
    ],
  },
  complex_number: {
    kind: "complex_number",
    titleAr: "الأعداد المركّبة",
    methodAr:
      "اكتب z = a + ib، احسب |z| = √(a²+b²)، arg(z) = atan2(b,a)، وانتقل بين الأشكال الجبري والمثلّثي والأسي.",
    bulletStepsAr: [
      "حدّد الجزء الحقيقي a والتخيّلي b.",
      "احسب الطويلة |z| والعمدة θ.",
      "اكتب z = |z|·e^(iθ) للشكل الأسي.",
    ],
    keySymbols: ["i", "z̄", "√", "frac"],
    exampleStepsLatex: [
      "z = 1 + i",
      "|z| = \\sqrt{2},\\ \\theta = \\frac{\\pi}{4}",
      "z = \\sqrt{2}\\,e^{i\\pi/4}",
    ],
  },
  sequence: {
    kind: "sequence",
    titleAr: "متتالية عددية",
    methodAr:
      "حدّد نوع المتتالية (حسابية أو هندسية)، استخرج الأساس r أو q، ثم اكتب الصيغة العامّة.",
    bulletStepsAr: [
      "احسب u₁ − u₀ و u₂ − u₁ → إن كانا متساويان فهي حسابية.",
      "احسب u₁/u₀ و u₂/u₁ → إن كانا متساويان فهي هندسية.",
      "اكتب uₙ = u₀ + n·r (حسابية) أو uₙ = u₀·qⁿ (هندسية).",
    ],
    keySymbols: ["+", "×", "x²", "Σ"],
    exampleStepsLatex: ["u_n = u_0 + n \\cdot r", "S_n = \\frac{n(u_0 + u_n)}{2}"],
  },
  logarithm: {
    kind: "logarithm",
    titleAr: "اللوغاريتم",
    methodAr: "استعمل خصائص ln: ln(ab) = ln(a) + ln(b)، ln(a/b) = ln(a) − ln(b).",
    bulletStepsAr: [
      "تأكّد من شروط التعريف (ما داخل ln > 0).",
      "طبّق الخصائص لتبسيط العبارة.",
      "حلّ المعادلة بأخذ الأسّ e^x إن لزم.",
    ],
    keySymbols: ["ln", "eˣ", "=", "−"],
    exampleStepsLatex: ["\\ln(x) = 2", "x = e^2"],
  },
  exponential: {
    kind: "exponential",
    titleAr: "الدالة الأسيّة",
    methodAr: "استعمل: e^a · e^b = e^(a+b)، (e^a)^n = e^(na). لحلّ e^x = k > 0 خذ ln.",
    bulletStepsAr: [
      "بسّط العبارة باستعمال خصائص الأسّ.",
      "لحلّ e^x = k: x = ln(k) (شرط k > 0).",
    ],
    keySymbols: ["eˣ", "ln", "=", "+"],
    exampleStepsLatex: ["e^{x} = 5", "x = \\ln(5)"],
  },
  trigonometry: {
    kind: "trigonometry",
    titleAr: "علاقات مثلّثيّة",
    methodAr:
      "استعمل العلاقات الأساسية: sin² + cos² = 1، علاقات الجمع، والقيم الشهيرة (0, π/6, π/4, π/3, π/2).",
    bulletStepsAr: [
      "حدّد الزاوية المرجعية في الربع المناسب.",
      "استعمل القيم الشهيرة أو الآلة.",
      "احذر من إشارة كلّ من sin و cos حسب الربع.",
    ],
    keySymbols: ["sin", "cos", "tan", "°"],
    exampleStepsLatex: [
      "\\sin^2(x) + \\cos^2(x) = 1",
      "\\cos(\\pi/3) = \\tfrac{1}{2}",
    ],
  },
  arithmetic: {
    kind: "arithmetic",
    titleAr: "عمليّة حسابيّة",
    methodAr: "احترم أولويّة العمليات: الأقواس، ثم الضرب والقسمة، ثم الجمع والطرح.",
    bulletStepsAr: [
      "احسب ما داخل الأقواس أوّلاً.",
      "أجرِ الضرب والقسمة من اليسار إلى اليمين.",
      "ثم الجمع والطرح من اليسار إلى اليمين.",
    ],
    keySymbols: ["+", "-", "×", "÷", "="],
    exampleStepsLatex: ["2 + 3 \\times 4", "= 2 + 12 = 14"],
  },
  pgcd_ppcm: {
    kind: "pgcd_ppcm",
    titleAr: "PGCD / PPCM",
    methodAr:
      "استعمل خوارزميّة إقليدس: قسّم a على b وخذ الباقي r، ثم a ← b، b ← r، حتى r = 0.",
    bulletStepsAr: [
      "ابدأ بأكبر العددين.",
      "أجرِ القسمة الإقليدية المتتاليّة.",
      "PGCD هو آخر باقٍ غير معدوم.",
      "PPCM(a,b) = (a × b) / PGCD(a,b).",
    ],
    keySymbols: ["÷", "=", "×"],
    exampleStepsLatex: [
      "PGCD(48, 18)",
      "48 = 18 \\times 2 + 12",
      "18 = 12 \\times 1 + 6",
      "12 = 6 \\times 2 + 0 \\Rightarrow PGCD = 6",
    ],
  },
  generic: {
    kind: "generic",
    titleAr: "مسألة جبريّة عامّة",
    methodAr:
      "حدّد المعطيات والمطلوب، اكتب الخطوات بترتيب منطقي، وبرّر كلّ انتقال بقاعدة أو خاصيّة.",
    bulletStepsAr: [
      "أعد صياغة المسألة بكلماتك.",
      "اكتب المعطيات والعلاقات المعروفة.",
      "خطّط للحلّ قبل الكتابة.",
      "اكتب كلّ خطوة في سطر مستقلّ مع تبريرها.",
    ],
    keySymbols: ["=", "+", "-", "⇒"],
    exampleStepsLatex: ["\\text{المعطيات: } \\ldots", "\\text{المطلوب: } \\ldots"],
  },
};

export function getAlgebraStrategy(text: string): AlgebraStrategy {
  return STRATEGIES[detectAlgebraKind(text)];
}
