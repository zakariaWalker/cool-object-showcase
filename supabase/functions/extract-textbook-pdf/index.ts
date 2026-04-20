// ===== Extract Textbook PDF — adaptive multi-country extraction =====
// Supports DZ (Algeria/imadrassa schema) and OM (Oman/Cambridge textbook schema).
// Add new countries by extending COUNTRY_CONFIGS.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-info, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Country config ────────────────────────────────────────────────────────────

interface CountryConfig {
  /** Human-readable label used in prompts */
  label: string;
  /** Hint injected per chunk: receives startPage, endPage, grade */
  chunkHint: (startPage: number, endPage: number, grade: string) => string;
  /** Full system prompt for this country */
  systemPrompt: string;
  /** Map raw grade string → canonical grade stored in kb_exercises */
  normalizeGrade: (raw: string) => string;
  /** Map raw stream string → canonical stream */
  normalizeStream: (raw: string) => string;
  /** Build a source string if the model doesn't return one */
  defaultSource: (startPage: number, endPage: number) => string;
}

const COUNTRY_CONFIGS: Record<string, CountryConfig> = {
  // ── Algeria ──────────────────────────────────────────────────────────────────
  DZ: {
    label: "الجزائر",
    chunkHint: (s, e, grade) => `هذه صفحات ${s}-${e} من كتاب رياضيات جزائري${grade ? ` للمستوى ${grade}` : ""}.`,
    systemPrompt: `أنت خبير في تحليل الكتب المدرسية للرياضيات الجزائرية (المنهج الجزائري AM/BAC).
مهمتك استخراج التمارين فقط وتنسيقها وفق قالب صارم.

قواعد الإخراج:
1) استخرج كل تمرين كاملاً مع جميع أسئلته الفرعية.
2) صيغة النص: "...نص المقدمة... — سؤال 1 ... / سؤال 2 ... / سؤال 3 ..."
   الشرطة الطويلة (—) تفصل المعطيات عن الأسئلة، الشرطة المائلة (/) تفصل الأسئلة الفرعية.
3) كل المعادلات بـ LaTeX داخل $...$ (مثال: $x^2 + 3x = 0$).
4) لا تستخرج: الدروس، الأمثلة المحلولة، الأنشطة التمهيدية.
5) صنّف type من: compute | simplify | expand | factor | solve_equation | solve_inequality | prove | geometry | statistics | probability | functions | other.
6) استخرج chapter من عناوين الصفحة بالعربية.
7) source = "تمرين N" حسب رقم التمرين في الكتاب.
8) إذا لم تجد تمارين، أرجع [].

أرجع JSON فقط بدون أي شرح:
{ "exercises": [ { "text": "...", "type": "...", "chapter": "...", "source": "تمرين N" } ] }`,
    normalizeGrade: (r) => r || "",
    normalizeStream: (r) => r || "",
    defaultSource: (s, e) => `صفحات ${s}-${e}`,
  },

  // ── Oman ─────────────────────────────────────────────────────────────────────
  OM: {
    label: "سلطنة عُمان",
    chunkHint: (s, e, grade) =>
      `هذه صفحات ${s}-${e} من كتاب الرياضيات العُماني (Cambridge)${grade ? ` للصف ${grade}` : ""}.
هيكل الكتاب: الوحدة → القسم (مثل ١-٢) → مثال → تمارين (مرقّمة داخل مربع "تمارين ١-٢-أ").
استخرج التمارين المرقّمة فقط. لا تستخرج الأمثلة المحلولة.`,
    systemPrompt: `أنت خبير في تحليل كتب الرياضيات العُمانية (Cambridge / وزارة التربية عُمان).
مهمتك استخراج التمارين المرقّمة فقط وتنسيقها وفق قالب صارم.

قواعد الإخراج:
1) استخرج كل تمرين مرقّم كاملاً مع أسئلته الفرعية (i, ii, iii أو أ, ب, ج).
2) صيغة النص: "...نص المقدمة... — سؤال أ: ... / سؤال ب: ... / سؤال ج: ..."
3) كل المعادلات بـ LaTeX داخل $...$ (مثال: $y > 2x + 1$، $f(x) = x^2 - 3$).
4) إذا كان التمرين يتضمن رسماً بيانياً أو شكلاً هندسياً، أضف وصفاً موجزاً له بين [مربعين] مثال: [رسم بياني: خط مستقيم يقطع محور الصادات عند ٣].
5) لا تستخرج: الأمثلة المحلولة (مثال ١، مثال ٢...)، النصوص النظرية، الملاحظات.
6) صنّف type من: compute | simplify | expand | factor | solve_equation | solve_inequality | prove | geometry | statistics | probability | functions | graph | other.
7) chapter = اسم الوحدة + اسم القسم كما يظهر في رأس الصفحة (مثال: "الوحدة الأولى: استخدام التمثيلات البيانية — ١-٢ تمثيل المناطق").
8) source = رقم التمرين كما هو في الكتاب (مثال: "تمرين ٣" أو "٥" من قسم "تمارين ١-٢-أ").
9) إذا لم تجد تمارين، أرجع [].

أرجع JSON فقط بدون أي شرح:
{ "exercises": [ { "text": "...", "type": "...", "chapter": "...", "source": "..." } ] }`,
    normalizeGrade: (r) => {
      const map: Record<string, string> = {
        "10": "Grade10",
        grade10: "Grade10",
        العاشر: "Grade10",
        "11": "Grade11",
        grade11: "Grade11",
        "الحادي عشر": "Grade11",
        "12": "Grade12",
        grade12: "Grade12",
        "الثاني عشر": "Grade12",
        "9": "Grade9",
        grade9: "Grade9",
        التاسع: "Grade9",
      };
      return map[r?.toLowerCase?.() ?? ""] || r || "";
    },
    normalizeStream: (r) => {
      const map: Record<string, string> = {
        pure: "pure_math",
        بحتة: "pure_math",
        "رياضيات بحتة": "pure_math",
        applied: "applied_math",
        تطبيقية: "applied_math",
        basic: "basic_math",
        أساسية: "basic_math",
        advanced: "advanced_math",
        متقدمة: "advanced_math",
      };
      return map[r?.toLowerCase?.() ?? ""] || r || "";
    },
    defaultSource: (s, e) => `صفحات ${s}-${e}`,
  },

  // ── Template for future countries ──────────────────────────────────────────
  // XX: { label: "...", chunkHint: ..., systemPrompt: ..., normalizeGrade: ..., normalizeStream: ..., defaultSource: ... },
};

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ExtractedExercise {
  text: string;
  type: string;
  chapter: string;
  grade: string;
  stream: string;
  source: string;
  country_code: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function stripCodeFences(t: string): string {
  return t
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
}

function safeJsonParse(text: string): any {
  let cleaned = stripCodeFences(text);
  const start = cleaned.search(/[\{\[]/);
  if (start === -1) return null;
  cleaned = cleaned.substring(start);
  try {
    return JSON.parse(cleaned);
  } catch {}
  const opens = (cleaned.match(/\{/g) || []).length;
  const closes = (cleaned.match(/\}/g) || []).length;
  const opensB = (cleaned.match(/\[/g) || []).length;
  const closesB = (cleaned.match(/\]/g) || []).length;
  let fix = cleaned;
  for (let i = 0; i < opensB - closesB; i++) fix += "]";
  for (let i = 0; i < opens - closes; i++) fix += "}";
  try {
    return JSON.parse(fix);
  } catch {
    return null;
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk)
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
  return btoa(bin);
}

async function splitPdfIntoChunks(bytes: Uint8Array, pagesPerChunk: number): Promise<Uint8Array[]> {
  const src = await PDFDocument.load(bytes);
  const total = src.getPageCount();
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < total; i += pagesPerChunk) {
    const out = await PDFDocument.create();
    const indices: number[] = [];
    for (let j = i; j < Math.min(i + pagesPerChunk, total); j++) indices.push(j);
    const copied = await out.copyPages(src, indices);
    copied.forEach((p) => out.addPage(p));
    chunks.push(await out.save());
  }
  return chunks;
}

// ─── Gemini call ───────────────────────────────────────────────────────────────

async function callGeminiOnPdfChunk(base64Pdf: string, hint: string, systemPrompt: string): Promise<any[]> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY not configured");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "application/pdf", data: base64Pdf } },
            { text: `${hint}\n\nاستخرج التمارين من هذه الصفحات وفق القالب المطلوب.` },
          ],
        },
      ],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        temperature: 0.15,
        maxOutputTokens: 8192,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini ${res.status}: ${err.slice(0, 300)}`);
  }

  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts ?? [])
    .map((p: any) => p.text ?? "")
    .join("")
    .trim();
  if (!text) return [];

  const parsed = safeJsonParse(text);
  if (!parsed) return [];
  return Array.isArray(parsed) ? parsed : (parsed.exercises ?? []);
}

// ─── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      filePath,
      bucket = "educational-materials",
      grade = "",
      stream = "",
      countryCode = "DZ", // "DZ" | "OM" | future codes
      defaultSource = "",
      pagesPerChunk = 4,
      maxChunks = 50,
    } = body;

    if (!filePath)
      return new Response(JSON.stringify({ error: "filePath is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    // Resolve country config — fall back to DZ if unknown
    const cc = countryCode.toUpperCase();
    const config: CountryConfig = COUNTRY_CONFIGS[cc] ?? COUNTRY_CONFIGS["DZ"];
    console.log(`[extract-textbook-pdf] country=${cc} (${config.label})`);

    // Normalize grade & stream for this country
    const normalizedGrade = config.normalizeGrade(grade);
    const normalizedStream = config.normalizeStream(stream);

    // Download PDF
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: file, error: dlErr } = await supabase.storage.from(bucket).download(filePath);
    if (dlErr || !file) throw new Error(`Failed to download: ${dlErr?.message || "no file"}`);
    const bytes = new Uint8Array(await file.arrayBuffer());
    console.log(`[extract-textbook-pdf] downloaded ${bytes.length} bytes`);

    // Split + process
    const chunks = await splitPdfIntoChunks(bytes, pagesPerChunk);
    const limited = chunks.slice(0, maxChunks);
    console.log(`[extract-textbook-pdf] ${limited.length} chunks × ${pagesPerChunk} pages`);

    const allExercises: ExtractedExercise[] = [];
    const chunkResults: { chunk: number; count: number; error?: string }[] = [];

    for (let i = 0; i < limited.length; i++) {
      const startPage = i * pagesPerChunk + 1;
      const endPage = Math.min((i + 1) * pagesPerChunk, chunks.length * pagesPerChunk);
      const hint = config.chunkHint(startPage, endPage, normalizedGrade);

      try {
        const b64 = bytesToBase64(limited[i]);
        const raw = await callGeminiOnPdfChunk(b64, hint, config.systemPrompt);

        const enriched: ExtractedExercise[] = raw
          .map((x: any) => ({
            text: String(x.text || x.statement || "").trim(),
            type: String(x.type || "unclassified").trim(),
            chapter: String(x.chapter || "").trim(),
            grade: normalizedGrade || String(x.grade || "").trim(),
            stream: normalizedStream || String(x.stream || "").trim(),
            source: String(x.source || "") || defaultSource || config.defaultSource(startPage, endPage),
            country_code: cc,
          }))
          .filter((x: ExtractedExercise) => x.text.length > 10);

        allExercises.push(...enriched);
        chunkResults.push({ chunk: i + 1, count: enriched.length });
        console.log(`[chunk ${i + 1}/${limited.length}] ${enriched.length} exercises`);
        await new Promise((r) => setTimeout(r, 600));
      } catch (e: any) {
        const msg = e?.message || String(e);
        chunkResults.push({ chunk: i + 1, count: 0, error: msg.slice(0, 200) });
        console.error(`[chunk ${i + 1}] failed:`, msg);
        if (msg.includes("429")) await new Promise((r) => setTimeout(r, 4000));
      }
    }

    // Deduplicate by normalized text
    const seen = new Set<string>();
    const deduped = allExercises.filter((e) => {
      const key = e.text.replace(/\s+/g, " ").trim().slice(0, 200);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return new Response(
      JSON.stringify({
        success: true,
        countryCode: cc,
        country: config.label,
        grade: normalizedGrade,
        stream: normalizedStream,
        totalChunks: limited.length,
        totalExtracted: allExercises.length,
        uniqueExercises: deduped.length,
        exercises: deduped,
        chunkResults,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e: any) {
    console.error("[extract-textbook-pdf] error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
