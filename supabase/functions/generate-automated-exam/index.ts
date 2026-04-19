import { callGemini, GeminiError, extractJSON } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, template, grade, patterns, kbExam, style, country = "DZ" } = await req.json();

    // ── Pedagogical reference distilled from real BEM/BAC papers ──
    const realExamRules = `
هذه قواعد صارمة مستخرجة من الامتحانات الرسمية الجزائرية الحقيقية (BEM / BAC):

1. البنية القياسية:
   - الجزء الأول: 3 إلى 4 تمارين قصيرة-متوسطة (12 نقطة إجمالاً تقريباً)
   - الجزء الثاني: مسألة إدماجية واحدة (8 نقاط) بسياق واقعي حياتي

2. صياغة كل تمرين تتبع هذه البنية:
   - **عبارة افتتاحية** قصيرة تُحدد السياق (مثال: "نعتبر التعبير الجبري A حيث:")
   - **معطيات رياضية** بصيغة LaTeX سليمة ($A = (2x-3)^2 + (2x-3)(x+5)$)
   - **3 إلى 5 أسئلة فرعية مرقمة** (1) … 2) … 3) …) متدرجة الصعوبة
   - كل سؤال فرعي يبدأ بفعل أمر واحد: أحسب، حلّ، بيّن أن، أنشر ثم بسّط، استنتج، أنشئ، أرسم
   - الأسئلة مترابطة: السؤال الثاني يستعمل نتيجة الأول

3. توزيع الأنواع المتوقع لكل امتحان (يجب احترامه):
   - تمرين 1: حساب عددي / حساب جذور / كتابة علمية / PGCD
   - تمرين 2: حساب جبري (نشر، تبسيط، تحليل، معادلات)
   - تمرين 3: هندسة (فيثاغورس، طالس، نسب مثلثية، أشعة)
   - تمرين 4 (اختياري): إحصاء أو دوال خطية
   - مسألة إدماجية: وضعية حياتية (شراء، بناء، مساحة، رحلة...) تتطلب 4-5 خطوات منطقية

4. الأسلوب اللغوي الإلزامي:
   - ابدأ التمرين بـ: "نعتبر …" / "ليكن …" / "لتكن الدالة …" / "ABC مثلث …"
   - استخدم الصيغ الرسمية: "بيّن أن"، "استنتج"، "أحسب بدلالة x"، "حلّ في R المعادلة"
   - في الهندسة: اذكر الأبعاد بالأرقام والوحدات (سم، م)

5. الترقيم:
   - كل تمرين بين 3 و 6 نقاط (مجموع الأسئلة الفرعية)
   - المسألة الإدماجية = 8 نقاط بالضبط
   - وزّع النقاط على الأسئلة الفرعية بشكل واقعي (0.5 إلى 2 نقطة لكل سؤال)`;

    const bloomPlan = `
توزيع بلوم المعتمد للامتحانات الرسمية:
- التمرين 1 (حساب): B2-B3 (فهم وتطبيق)
- التمرين 2 (جبر): B3-B4 (تطبيق وتحليل)
- التمرين 3 (هندسة): B3-B5 (تطبيق، تحليل، تقييم - برهنة)
- المسألة الإدماجية: B4-B6 (تحليل، تقييم، إبداع)`;

    let prompt = "";
    if (mode === "synthetic") {
      prompt = `أنت مفتش تربوي معتمد متخصص في امتحانات ${template.format === "bem" ? "شهادة التعليم المتوسط (BEM)" : template.format === "bac" ? "البكالوريا (BAC)" : "الفروض الفصلية"} للمنهاج ${country === "DZ" ? "الجزائري" : country}.
مهمتك: توليد امتحان كامل بصيغة ${template.labelAr} للمستوى ${grade} يبدو **كأنه امتحان رسمي حقيقي 100%**.

${realExamRules}

${bloomPlan}

المعايير البيداغوجية المستهدفة:
- منحنى الصعوبة: ${patterns?.difficultyCurve || 'تدريجي صاعد'}
- نسبة الأسئلة غير المباشرة: ${patterns?.explicitImplicitRatio || 0.4}
- توزيع المواضيع: ${patterns?.structuralNotes || 'متوازن: ثلث جبر، ثلث هندسة، ثلث تحليل/إحصاء'}

قالب الأقسام المطلوب احترامه: ${JSON.stringify(template.sections)}

⚠️ تنبيهات حاسمة:
- لا تولّد أي تمرين أقل من 3 أسئلة فرعية
- المسألة الإدماجية يجب أن تكون قصة واقعية متصلة بحياة طالب جزائري
- كل LaTeX يجب أن يكون داخل $...$ (مضمّن) أو $$...$$ (منفصل)
- لا تستخدم \\\\ أو رموز غريبة - فقط LaTeX قياسي
- النص العربي خارج LaTeX، الرموز الرياضية فقط داخله

أعد JSON فقط بالهيكل:
{
  "exam": {
    "title": "${template.format === "bem" ? "اختبار شهادة التعليم المتوسط - دورة تجريبية" : template.format === "bac" ? "اختبار البكالوريا - دورة تجريبية" : "اختبار الفصل"}",
    "format": "${template.format}",
    "grade": "${grade}",
    "duration": ${template.duration},
    "totalPoints": ${template.totalPoints},
    "sections": [
      {
        "id": "section_id",
        "title": "التمرين الأول",
        "points": 4,
        "exercises": [
          {
            "id": "ex_unique_1",
            "text": "نعتبر التعبير: $A = ...$\\n\\n1) أحسب ... (1ن)\\n2) بيّن أن ... (1.5ن)\\n3) استنتج ... (1.5ن)",
            "points": 4,
            "type": "algebra",
            "source": "ai",
            "bloomLevel": 3
          }
        ]
      }
    ]
  }
}`;
    } else {
      prompt = `أنت مفتش تربوي. لديك امتحان مستخرج من قاعدة المعرفة. مهمتك تطويره ليطابق معايير امتحان رسمي حقيقي.

الامتحان الحالي: ${JSON.stringify(kbExam)}

${realExamRules}

${bloomPlan}

التحسينات المطلوبة:
1. حافظ على المواضيع الأساسية لكل تمرين (لا تبدلها)
2. أضف أسئلة فرعية للتمارين القصيرة (يجب أن يحتوي كل تمرين على 3-5 أسئلة فرعية مرقمة)
3. أعد صياغة الأسئلة بأسلوب رسمي (نعتبر، ليكن، بيّن أن، استنتج)
4. حسّن المسألة الإدماجية لتكون قصة واقعية متصلة (طالب جزائري، سياق حياتي)
5. وزّع النقاط بشكل واقعي على الأسئلة الفرعية
6. أضف bloomLevel (1-6) لكل تمرين
7. تأكد من سلامة LaTeX داخل $...$

أعد JSON بنفس الهيكل مع التحسينات.`;
    }

    const response = await callGemini(
      [{ role: "user", parts: [{ text: prompt }] }],
      {
        systemInstruction: "أنت مفتش رياضيات معتمد. أجب بـ JSON صالح فقط بدون أي نص خارج JSON. لا markdown، لا ```json، فقط الـ JSON الخام.",
        temperature: 0.35,
      }
    );

    const parsed = extractJSON(response.text);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    if (err instanceof GeminiError) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: err.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
