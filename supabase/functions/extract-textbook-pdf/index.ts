// ===== Extract Textbook PDF — chunked Gemini extraction following Algerian template =====
// Splits the PDF into page ranges and extracts exercises from each chunk.
// Output template matches kb_exercises columns: text, type, chapter, grade, stream, source.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExtractedExercise {
  text: string;
  type: string;
  chapter: string;
  grade: string;
  stream: string;
  source: string;
}

const SYSTEM_PROMPT = `أنت خبير في تحليل الكتب المدرسية للرياضيات. مهمتك استخراج التمارين فقط من صفحات الكتاب وتنسيقها وفق قالب صارم.

قواعد الإخراج:
1) استخرج كل تمرين كاملاً (مع جميع أسئلته الفرعية).
2) استعمل صيغة:  "...نص المقدمة... — سؤال 1 ... / سؤال 2 ... / سؤال 3 ..." حيث يفصل الشرطة الطويلة (—) المعطيات عن الأسئلة، وتفصل الشرطة المائلة (/) بين الأسئلة الفرعية.
3) كل المعادلات والصيغ الرياضية بـ LaTeX داخل $...$ (مثال: $x^2 + 3x = 0$، $f(x)=2x+1$).
4) لا تستخرج: الدروس، الأمثلة المحلولة، الأنشطة التمهيدية، التمارين المحلولة بالكامل في الكتاب.
5) صنّف نوع التمرين (type) من بين: compute, simplify, expand, factor, solve_equation, solve_inequality, prove, geometry, statistics, probability, functions, other.
6) استخرج اسم الفصل/الباب (chapter) من العناوين الظاهرة في الصفحة بالعربية.
7) استعمل source = "تمرين N" (رقم التمرين كما هو في الكتاب) أو اسم الكتاب إذا توفر.
8) إذا لم تجد تمارين في الصفحات، أرجع مصفوفة فارغة [].

أرجع JSON فقط بهذا الشكل بدون أي شرح:
{ "exercises": [ { "text": "...", "type": "...", "chapter": "...", "source": "تمرين N" } ] }`;

function stripCodeFences(t: string): string {
  return t.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
}

function safeJsonParse(text: string): any {
  let cleaned = stripCodeFences(text);
  const start = cleaned.search(/[\{\[]/);
  if (start === -1) return null;
  cleaned = cleaned.substring(start);
  // Try to find balanced end
  try { return JSON.parse(cleaned); } catch {}
  // Auto-close
  const opens = (cleaned.match(/\{/g) || []).length;
  const closes = (cleaned.match(/\}/g) || []).length;
  const opensB = (cleaned.match(/\[/g) || []).length;
  const closesB = (cleaned.match(/\]/g) || []).length;
  let fix = cleaned;
  for (let i = 0; i < opensB - closesB; i++) fix += "]";
  for (let i = 0; i < opens - closes; i++) fix += "}";
  try { return JSON.parse(fix); } catch { return null; }
}

async function callGeminiOnPdfChunk(base64Pdf: string, hint: string): Promise<ExtractedExercise[]> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) throw new Error("GEMINI_API_KEY not configured");
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        role: "user",
        parts: [
          { inlineData: { mimeType: "application/pdf", data: base64Pdf } },
          { text: `${hint}\n\nاستخرج التمارين من هذه الصفحات وفق القالب المطلوب.` },
        ],
      }],
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
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
    .map((p: any) => p.text ?? "").join("").trim();
  if (!text) return [];

  const parsed = safeJsonParse(text);
  if (!parsed) return [];
  const arr = Array.isArray(parsed) ? parsed : (parsed.exercises || []);
  if (!Array.isArray(arr)) return [];
  return arr
    .map((x: any): ExtractedExercise => ({
      text: String(x.text || x.statement || "").trim(),
      type: String(x.type || "unclassified").trim(),
      chapter: String(x.chapter || "").trim(),
      grade: "",
      stream: "",
      source: String(x.source || "").trim(),
    }))
    .filter(x => x.text && x.text.length > 10);
}

async function splitPdfIntoChunks(bytes: Uint8Array, pagesPerChunk: number): Promise<Uint8Array[]> {
  const src = await PDFDocument.load(bytes);
  const total = src.getPageCount();
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < total; i += pagesPerChunk) {
    const out = await PDFDocument.create();
    const indices = [];
    for (let j = i; j < Math.min(i + pagesPerChunk, total); j++) indices.push(j);
    const copied = await out.copyPages(src, indices);
    copied.forEach(p => out.addPage(p));
    chunks.push(await out.save());
  }
  return chunks;
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
  }
  return btoa(bin);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      filePath,           // path inside educational-materials bucket OR exam-pdfs
      bucket = "educational-materials",
      grade = "",
      stream = "",
      countryCode = "DZ",
      defaultSource = "",
      pagesPerChunk = 4,
      maxChunks = 50,
    } = body;

    if (!filePath) {
      return new Response(JSON.stringify({ error: "filePath is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Download PDF
    const { data: file, error: dlErr } = await supabase.storage.from(bucket).download(filePath);
    if (dlErr || !file) throw new Error(`Failed to download PDF: ${dlErr?.message || "no file"}`);
    const bytes = new Uint8Array(await file.arrayBuffer());
    console.log(`[extract-textbook-pdf] downloaded ${bytes.length} bytes from ${bucket}/${filePath}`);

    // Split into chunks
    const chunks = await splitPdfIntoChunks(bytes, pagesPerChunk);
    console.log(`[extract-textbook-pdf] split into ${chunks.length} chunks of ${pagesPerChunk} pages`);
    const limited = chunks.slice(0, maxChunks);

    // Process chunks sequentially to respect rate limits
    const allExercises: ExtractedExercise[] = [];
    const chunkResults: { chunk: number; count: number; error?: string }[] = [];

    for (let i = 0; i < limited.length; i++) {
      const startPage = i * pagesPerChunk + 1;
      const endPage = Math.min((i + 1) * pagesPerChunk, chunks.length * pagesPerChunk);
      const hint = `هذه صفحات ${startPage}-${endPage} من كتاب رياضيات${grade ? ` للمستوى ${grade}` : ""}.`;
      try {
        const b64 = bytesToBase64(limited[i]);
        const exs = await callGeminiOnPdfChunk(b64, hint);
        // enrich with grade/stream/country/source defaults
        const enriched = exs.map(e => ({
          ...e,
          grade: grade || e.grade,
          stream: stream || e.stream,
          source: e.source || defaultSource || `صفحات ${startPage}-${endPage}`,
        }));
        allExercises.push(...enriched);
        chunkResults.push({ chunk: i + 1, count: enriched.length });
        console.log(`[extract-textbook-pdf] chunk ${i + 1}/${limited.length}: ${enriched.length} exercises`);
        // small delay to avoid 429
        await new Promise(r => setTimeout(r, 600));
      } catch (e: any) {
        const msg = e?.message || String(e);
        chunkResults.push({ chunk: i + 1, count: 0, error: msg.slice(0, 200) });
        console.error(`[extract-textbook-pdf] chunk ${i + 1} failed:`, msg);
        // backoff on rate limit
        if (msg.includes("429")) await new Promise(r => setTimeout(r, 4000));
      }
    }

    // Deduplicate by normalized text
    const seen = new Set<string>();
    const deduped = allExercises.filter(e => {
      const key = e.text.replace(/\s+/g, " ").trim().slice(0, 200);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return new Response(JSON.stringify({
      success: true,
      totalChunks: limited.length,
      totalExtracted: allExercises.length,
      uniqueExercises: deduped.length,
      exercises: deduped,
      chunkResults,
      countryCode,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[extract-textbook-pdf] error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
