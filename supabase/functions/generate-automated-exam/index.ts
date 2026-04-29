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
const CURRICULUM: Record<
  string,
  {
    labelAr: string;
    examType: string;
    topics: string[];
    sectionBlueprint: Array<{ titleAr: string; topicHint: string; points: number; subQMin: number; subQMax: number }>;
    integrationContext: string;
  }
> = {
  // ── Terminal Science (3AS) ────────────────────────────────
  "3AS": {
    labelAr: "السنة الثالثة ثانوي - شعبة العلوم",
    examType: "BAC",
    topics: [
      "المتتاليات الحسابية: تعريف، الحد العام $u_n = u_0 + nr$، مجموع $S_n$، إثبات أن المتتالية حسابية بإيجاد الأساس $r$",
      "المتتاليات الهندسية: تعريف، الحد العام $u_n = u_0 \\cdot q^n$، المجموع $S_n = u_0 \\cdot \\frac{1-q^{n+1}}{1-q}$، إثبات أن المتتالية هندسية بإيجاد الأساس $q$، استنتاج النهاية حسب قيمة $|q|$",
      "المتتاليات التراجعية $u_{n+1} = f(u_n)$: دراسة الرتابة بالاستدلال أو بإشارة $u_{n+1}-u_n$، إثبات بالتراجع أن $u_n$ محصورة، استخدام متتالية مساعدة $v_n$ هندسية أو حسابية، حساب $\\lim u_n$",
      "نهايات الدوال: صور غير محددة $\\frac{0}{0}, \\frac{\\infty}{\\infty}, \\infty - \\infty$، التكافؤات الأسية واللوغاريتمية، نهاية $\\frac{e^x}{x^n}$ و $\\frac{\\ln x}{x}$",
      "المستقيمات المقاربة: الأفقية، العمودية، والمائلة $y = ax+b$ (إثبات وجودها وحساب $a, b$)، وضعية المنحنى بالنسبة للمقارب المائل بدراسة إشارة $f(x)-(ax+b)$",
      "دراسة الدوال الكاملة: مجموعة التعريف، النهايات على الأطراف، حساب $f'(x)$، دراسة إشارة $f'$، جدول التغيرات، المماسات، التمثيل البياني $(C_f)$",
      "حساب المشتقات: مشتق الجداء والخارج والدالة المركبة، مشتق $\\ln u$، $e^u$، $u^n$، معادلة المماس عند نقطة",
      "الدالة الأسية $\\exp$ والدالة اللوغاريتمية $\\ln$: الخصائص الجبرية، حل المعادلات والمتراجحات الأسية واللوغاريتمية مع تحديد مجموعة التعريف",
      "المتراجحات اللوغاريتمية: مثل $\\ln(x+1) < \\ln(2x-3)$ مع شرط الوجود",
      "الدوال الناطقة: المقاربات، المناقشة البيانية لعدد حلول معادلة $f(x)=m$ حسب الوسيط $m$",
      "مبرهنة القيم المتوسطة (TVI) والتقريب التكراري لحل $f(x)=0$",
      "المعادلات التفاضلية الخطية من الدرجة الأولى $y' + ay = b$ و $y' = ay$: الحل العام والحل الخاص بشرط ابتدائي",
      "التكامل: الدوال الأصلية (البدائية)، حساب التكاملات المحدودة، التكامل بالتجزئة، حساب المساحات بين منحنى ومحور الفواصل أو بين منحنيين",
      "الاحتمالات: الاحتمال الشرطي $P_A(B)$، الاستقلالية، شجرة الاحتمالات، ترتيبات وتوافيق، قانون احتمالي",
      "الأعداد المركبة: الصيغة الجبرية والمثلثية والأسية، حل المعادلات في $\\mathbb{C}$، التفسير الهندسي، تحويلات",
      "الهندسة في الفضاء: متجهات، الجداء السلمي، معادلة المستوى، تقاطع مستقيم ومستوى، المسافات",
    ],
    sectionBlueprint: [
      {
        titleAr: "التمرين الأول: المتتاليات",
        topicHint:
          "متتالية تراجعية $u_{n+1}=f(u_n)$ مع متتالية مساعدة $v_n$ هندسية: (1) حساب الحدود الأولى، (2) إثبات بالتراجع أن $u_n$ محصورة أو رتيبة، (3) إثبات أن $v_n$ هندسية وإيجاد أساسها وحدها العام، (4) التعبير عن $u_n$ بدلالة $n$، (5) حساب $\\lim u_n$، (6) حساب مجموع $S_n = \\sum v_k$ واستنتاج",
        points: 4,
        subQMin: 5,
        subQMax: 7,
      },
      {
        titleAr: "التمرين الثاني: الأعداد المركبة أو الاحتمالات",
        topicHint:
          "أعداد مركبة (حل معادلة في $\\mathbb{C}$، شكل مثلثي، تفسير هندسي لتحويل) أو احتمالات (شجرة، احتمال شرطي، قانون احتمالي، أمل رياضي)",
        points: 4,
        subQMin: 4,
        subQMax: 6,
      },
      {
        titleAr: "التمرين الثالث: دراسة دالة لوغاريتمية أو أسية",
        topicHint:
          "دراسة دالة من الشكل $f(x) = (ax+b)e^x$ أو $f(x) = x + \\ln(x+1)$ أو ناطقة مع مقارب مائل: (1) مجموعة التعريف والنهايات على الأطراف، (2) حساب $f'(x)$ ودراسة إشارتها، (3) جدول التغيرات، (4) إثبات وجود مقارب مائل ودراسة الوضعية بالنسبة له، (5) حل معادلة $f(x)=0$ بالتقريب باستخدام TVI، (6) رسم $(C_f)$، (7) المناقشة البيانية لعدد حلول $f(x)=m$، (8) متراجحة لوغاريتمية مرتبطة",
        points: 7,
        subQMin: 7,
        subQMax: 9,
      },
      {
        titleAr: "المسألة الإدماجية: تكامل + معادلة تفاضلية + متتاليات",
        topicHint:
          "وضعية تربط بين دالة ومتتالية: (1) حل معادلة تفاضلية $y'+ay=b$ بشرط ابتدائي، (2) دراسة الدالة الحل، (3) حساب تكامل (مساحة) أو تكامل بالتجزئة، (4) تعريف متتالية $u_n = \\int_0^n f(t)dt$ أو من خلال نقاط على المنحنى، إثبات رتابتها وحساب نهايتها، (5) ربط التحليل بالنتيجة الفيزيائية أو الاقتصادية",
        points: 5,
        subQMin: 5,
        subQMax: 7,
      },
    ],
    integrationContext:
      "سياق علمي حقيقي (تبريد جسم، نمو سكاني، تركيز دواء، تفريغ مكثف) - يُدمج فيه: معادلة تفاضلية، دراسة دالة الحل، حساب مساحة بالتكامل، ومتتالية ترتبط بقيم الدالة في نقاط متتابعة. النتائج النهائية يجب أن تُفسَّر في السياق الواقعي.",
  },

  // ── 2AS (Première) ────────────────────────────────────────
  "2AS": {
    labelAr: "السنة الثانية ثانوي",
    examType: "Fard",
    topics: [
      "الدوال العددية (المجال، الرتابة، الإشارة، الدراسة الكاملة)",
      "المشتقات (تعريف، قواعد الاشتقاق، المماس)",
      "المتتاليات العددية (الحد العام، النهايات الأولية)",
      "الإحصاء (التباين، الانحراف المعياري، التمثيلات البيانية)",
      "المعادلات والمتراجحات من الدرجة الثانية",
      "المثلثية (دوال الجيب والجيب التمام، الدوائر المثلثية)",
      "الهندسة التحليلية (الأشعة، معادلات المستقيم، الدائرة)",
    ],
    sectionBlueprint: [
      {
        titleAr: "التمرين الأول",
        topicHint: "متتاليات أو معادلات من الدرجة الثانية",
        points: 4,
        subQMin: 3,
        subQMax: 5,
      },
      { titleAr: "التمرين الثاني", topicHint: "دراسة دالة مع المشتقات والجدول", points: 5, subQMin: 4, subQMax: 6 },
      { titleAr: "التمرين الثالث", topicHint: "إحصاء أو مثلثية أو هندسة تحليلية", points: 4, subQMin: 3, subQMax: 5 },
      { titleAr: "المسألة الإدماجية", topicHint: "وضعية حياتية تجمع دوال ومعادلات", points: 7, subQMin: 4, subQMax: 5 },
    ],
    integrationContext: "سياق التخطيط المدني أو الاقتصاد البسيط أو المسافة والسرعة",
  },

  // ── BEM (3e Moyenne) ──────────────────────────────────────
  BEM: {
    labelAr: "شهادة التعليم المتوسط",
    examType: "BEM",
    topics: [
      "الحساب العددي (جذور، كتابة علمية، PGCD, PPCM)",
      "الجبر (نشر، تبسيط، تحليل، حل معادلات من الدرجة الأولى والثانية)",
      "الهندسة المستوية (فيثاغورس، طاليس، نسب مثلثية، دائرة، مساحات)",
      "الأعداد النسبية والعمليات عليها",
      "الدوال الخطية والتآلفية (جدول قيم، تمثيل بياني، معادلة المستقيم)",
      "الإحصاء (وسيط، منوال، وسط حسابي، تمثيل بياني)",
      "التناسب والنسب المئوية",
    ],
    sectionBlueprint: [
      {
        titleAr: "التمرين الأول",
        topicHint: "حساب عددي (جذور أو كتابة علمية أو PGCD)",
        points: 4,
        subQMin: 3,
        subQMax: 4,
      },
      { titleAr: "التمرين الثاني", topicHint: "جبر (نشر وتحليل ومعادلة)", points: 4, subQMin: 3, subQMax: 5 },
      {
        titleAr: "التمرين الثالث",
        topicHint: "هندسة مستوية (مثلث أو دائرة بأبعاد محددة)",
        points: 4,
        subQMin: 3,
        subQMax: 4,
      },
      {
        titleAr: "المسألة الإدماجية",
        topicHint: "وضعية حياتية (شراء أو بناء أو مساحة) تجمع أكثر من مبحث",
        points: 8,
        subQMin: 4,
        subQMax: 5,
      },
    ],
    integrationContext: "قصة شراء مواد بناء، تبليط، رحلة مدرسية، حديقة منزلية - طالب جزائري في المدينة",
  },
};

// Default fallback for unknown grades
const DEFAULT_CURRICULUM_KEY = "BEM";

function resolveCurriculumKey(grade: string): string {
  if (!grade) return DEFAULT_CURRICULUM_KEY;
  const g = grade.trim().toUpperCase();
  if (g.includes("3AS") || g.includes("3 AS") || g.includes("BAC")) return "3AS";
  if (g.includes("2AS") || g.includes("2 AS") || g.includes("PREMIERE")) return "2AS";
  if (g.includes("BEM") || g.includes("4EM") || g.includes("3MOY")) return "BEM";
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

3. مستويات بلوم الهدف لكل تمرين:
   - التمرين 1: B2-B3 (فهم وتطبيق مباشر)
   - التمرين 2: B3-B4 (تطبيق وتحليل + رسم)
   - التمرين 3: B3-B5 (تطبيق، تحليل، برهنة)
   - المسألة الإدماجية: B4-B6 (تحليل، تقييم، إبداع)
   ➤ متوسط بلوم المستهدف للورقة كاملة: بين 3.0 و 3.8

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

    const currKey = resolveCurriculumKey(grade ?? "");
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
      temperature: 0.3,
      // Increase output budget so long exams don't get truncated
      maxOutputTokens: 8192,
    });

    const parsed = extractJSON(response.text);

    // ── Post-generation validation (lightweight) ──────────────
    const exam = (parsed as Record<string, unknown>).exam as Record<string, unknown> | undefined;
    const sections = (exam?.sections as unknown[]) ?? [];
    const warnings: string[] = [];

    let totalSubQ = 0;
    for (const sec of sections as Array<Record<string, unknown>>) {
      const exs = (sec.exercises as Array<Record<string, unknown>>) ?? [];
      for (const ex of exs) {
        const text = (ex.text as string) ?? "";
        // Count numbered sub-questions like "1)" or "1."
        const matches = text.match(/^\s*\d+[\)\.]/gm);
        const count = matches?.length ?? 0;
        totalSubQ += count;
        ex.subQuestionCount = count;
        if (count < 3) {
          warnings.push(`تمرين ${ex.id}: يحتوي على ${count} أسئلة فرعية فقط (الحد الأدنى 3)`);
        }
      }
    }

    if (totalSubQ < 12) {
      warnings.push(`إجمالي الأسئلة الفرعية ${totalSubQ} أقل من الحد الأدنى المتوقع (12).`);
    }

    return new Response(
      JSON.stringify({ ...parsed, _meta: { curriculumKey: currKey, totalSubQuestions: totalSubQ, warnings } }),
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
