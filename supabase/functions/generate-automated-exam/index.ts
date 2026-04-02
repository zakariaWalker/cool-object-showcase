import { callGemini, GeminiError, extractJSON } from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { mode, template, grade, patterns, kbExam, style } = await req.json();

    const bloomInstructions = `
مستويات بلوم التصنيفية التي يجب تغطيتها:
- B1 (تذكر): سؤال استرجاعي مباشر (تعريف، قاعدة)
- B2 (فهم): تفسير أو إعادة صياغة
- B3 (تطبيق): تطبيق مباشر لقاعدة أو خوارزمية — يُستخدم كثيراً في التمارين القصيرة
- B4 (تحليل): تفكيك مسألة إلى أجزاء، مقارنة
- B5 (تقييم): تبرير، برهان، نقد حل مقترح
- B6 (إبداع): مسألة مفتوحة، بناء حل جديد`;

    const exerciseFormatRules = `
قواعد كتابة التمارين (مهم جداً):
1. كل تمرين يجب أن يحتوي على عدة أسئلة فرعية (3-5 أسئلة) مرقمة: 1) ... 2) ... 3) ...
2. النص الرياضي يُكتب بصيغة LaTeX محاط بـ $...$ للعبارات المضمنة و $$...$$ للمعادلات المنفصلة
3. يجب أن يبدأ كل تمرين بعبارة تمهيدية (énoncé) ثم تتبعها الأسئلة
4. التمارين يجب ألا تكون قصيرة جداً — كل تمرين يجب أن يشغل على الأقل 5-8 أسطر
5. المسألة الإدماجية (الجزء الثاني) تكون أطول بكثير (10-15 سطراً) مع سياق واقعي
6. استخدم الرموز العربية: نعتبر، ليكن، بيّن أن، أحسب، أنشر ثم بسّط، حلّ المعادلة
7. الهندسة: اذكر الشكل والأبعاد بوضوح (مثلاً: ABC مثلث قائم في B حيث AB = 3 سم و BC = 4 سم)`;

    let prompt = "";
    if (mode === "synthetic") {
      prompt = `أنت خبير معتمد في بناء امتحانات الرياضيات الجزائرية وفق مناهج الجيل الثاني.
قم ببناء امتحان كامل بصيغة ${template.labelAr} للمستوى ${grade}.

${bloomInstructions}

${exerciseFormatRules}

المعايير البيداغوجية المستهدفة:
- منحنى الصعوبة: ${patterns?.difficultyCurve || 'linear'} (يبدأ بسؤال سهل ويتدرج)
- نسبة الأسئلة غير المباشرة: ${patterns?.explicitImplicitRatio || 0.4}
- ملاحظات هيكلية: ${patterns?.structuralNotes || 'توزيع متوازن بين الجبر والهندسة والدوال'}

توزيع بلوم المطلوب:
- التمارين القصيرة (الجزء الأول): B2-B4 (فهم، تطبيق، تحليل)
- المسألة الإدماجية (الجزء الثاني): B4-B6 (تحليل، تقييم، إبداع)

قالب الأقسام: ${JSON.stringify(template.sections)}

أعد النتيجة كـ JSON فقط بالهيكل التالي:
{
  "exam": {
    "title": "عنوان الامتحان",
    "format": "${template.format}",
    "grade": "${grade}",
    "duration": ${template.duration},
    "totalPoints": ${template.totalPoints},
    "sections": [
      {
        "id": "section_id",
        "title": "عنوان القسم",
        "points": 5,
        "exercises": [
          {
            "id": "ex_unique",
            "text": "نص التمرين الكامل مع الأسئلة الفرعية...",
            "points": 5,
            "type": "algebra|geometry|analysis|probability|statistics",
            "source": "ai",
            "bloomLevel": 3
          }
        ]
      }
    ]
  }
}

تنبيه: كل تمرين يجب أن يحتوي على 3-5 أسئلة فرعية مرقمة. لا تولد تمارين قصيرة من سطر واحد!`;
    } else {
      prompt = `أنت خبير تربوي. قم بتطوير وتحسين هذا الامتحان المقترح المستخرج من قاعدة البيانات ليطابق المعايير البيداغوجية الحديثة.
الامتحان الحالي: ${JSON.stringify(kbExam)}

${bloomInstructions}

${exerciseFormatRules}

المطلوب:
1. حافظ على جوهر التمارين لتبقى واقعية (Authentic)
2. أضف أسئلة فرعية إذا كان التمرين قصيراً (أقل من 3 أسئلة)
3. قم بتحسين صياغة الأسئلة لتطابق منحنى الصعوبة: ${patterns?.difficultyCurve || 'linear'}
4. أضف حقل bloomLevel لكل تمرين (1-6)
5. تأكد أن كل LaTeX محاط بـ $...$ بشكل صحيح
6. التمارين يجب أن تكون طويلة ومفصلة (5-8 أسطر على الأقل)

أعد النتيجة بنفس هيكل JSON الخاص بالامتحان المرفق مع إضافة bloomLevel لكل تمرين.`;
    }

    const response = await callGemini(
      [{ role: "user", parts: [{ text: prompt }] }],
      {
        systemInstruction: "أنت خبير في بناء امتحانات الرياضيات الجزائرية وفق مناهج الجيل الثاني. أجب دائماً بـ JSON صالح فقط بدون أي نص إضافي.",
        temperature: 0.25,
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
