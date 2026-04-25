// JSON importer for deconstructions.
// Accepts an array of deconstruction objects matching the schema below
// and adds them through the existing onAdd callback (so they sync to Supabase).
import { useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Upload, Download, FileJson, Loader2 } from "lucide-react";
import { Exercise, Pattern, Deconstruction } from "./useAdminKBStore";

interface Props {
  exercises: Exercise[];
  patterns: Pattern[];
  countryCode: string;
  onAdd: (d: Deconstruction) => void | Promise<void>;
}

// ---- Schema (also used as the downloadable template) ----
const ItemSchema = z.object({
  exerciseId: z.string().min(1, "exerciseId required"),
  patternId: z.string().optional().default(""),
  steps: z.array(z.string()).optional().default([]),
  needs: z.array(z.string()).optional().default([]),
  notes: z.string().optional().default(""),
  countryCode: z.string().optional(),
});

const FileSchema = z.object({
  $schema: z.string().optional(),
  countryCode: z.string().optional(),
  deconstructions: z.array(ItemSchema).min(1, "At least one deconstruction required"),
});

const SAMPLE_TEMPLATE = {
  $schema: "https://mathkb.lovable.app/schemas/deconstructions-v1",
  countryCode: "OM",
  deconstructions: [
    {
      exerciseId: "REPLACE_WITH_EXERCISE_UUID_FROM_KB",
      patternId: "OPTIONAL_PATTERN_UUID_OR_EMPTY_STRING",
      steps: [
        "اقرأ السؤال وحدّد المعطيات",
        "اكتب المعادلة المناسبة",
        "حلّ المعادلة خطوة بخطوة",
        "تحقّق من النتيجة",
      ],
      needs: [
        "مفهوم: حلّ المعادلات من الدرجة الأولى",
        "مهارة: العمليات على الأعداد النسبية",
      ],
      notes: "ملاحظات تربوية اختيارية لهذا التفكيك",
      countryCode: "OM",
    },
  ],
};

export function DeconstructionImporter({ exercises, patterns, countryCode, onAdd }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const downloadTemplate = () => {
    const blob = new Blob([JSON.stringify(SAMPLE_TEMPLATE, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "deconstructions-template.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("تم تنزيل قالب JSON ✓");
  };

  const handleFile = async (file: File) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("الحجم الأقصى 10MB");
      return;
    }
    setBusy(true);
    try {
      const text = await file.text();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        toast.error("ملف JSON غير صالح");
        return;
      }

      // Allow both `{ deconstructions: [...] }` and a bare array
      const wrapped = Array.isArray(json) ? { deconstructions: json } : json;
      const parsed = FileSchema.safeParse(wrapped);
      if (!parsed.success) {
        const first = parsed.error.errors[0];
        toast.error(`Schema غير صالح: ${first?.path.join(".")} — ${first?.message}`);
        return;
      }

      const exerciseIds = new Set(exercises.map(e => e.id));
      const patternIds = new Set(patterns.map(p => p.id));
      const items = parsed.data.deconstructions;
      const fallbackCountry = parsed.data.countryCode || countryCode || "DZ";

      let added = 0;
      let skippedMissingExercise = 0;
      let skippedMissingPattern = 0;

      setProgress({ done: 0, total: items.length });
      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        if (!exerciseIds.has(it.exerciseId)) {
          skippedMissingExercise++;
          setProgress({ done: i + 1, total: items.length });
          continue;
        }
        const safePatternId = it.patternId && patternIds.has(it.patternId) ? it.patternId : "";
        if (it.patternId && !safePatternId) skippedMissingPattern++;

        await onAdd({
          id: crypto.randomUUID(),
          exerciseId: it.exerciseId,
          patternId: safePatternId,
          steps: it.steps,
          needs: it.needs,
          notes: it.notes,
          countryCode: it.countryCode || fallbackCountry,
          createdAt: new Date().toISOString(),
        });
        added++;
        setProgress({ done: i + 1, total: items.length });
      }

      const parts: string[] = [`✓ أُضيف ${added}`];
      if (skippedMissingExercise) parts.push(`تجاهل ${skippedMissingExercise} (تمرين غير موجود)`);
      if (skippedMissingPattern) parts.push(`${skippedMissingPattern} نمط غير موجود (حُفظ بدون نمط)`);
      toast.success(parts.join(" • "));
    } catch (err: any) {
      toast.error(`خطأ غير متوقع: ${err?.message || "?"}`);
    } finally {
      setBusy(false);
      setProgress({ done: 0, total: 0 });
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="glass-card rounded-lg p-4 border border-secondary/30">
      <div className="flex items-center justify-between mb-3 gap-2">
        <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
          <FileJson className="w-4 h-4" /> رفع تفكيكات من ملف JSON
        </h4>
        {busy && (
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">{progress.done}/{progress.total}</span>
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground mb-3 leading-relaxed">
        ارفع ملف JSON يحوي مصفوفة <code className="px-1 rounded bg-muted">deconstructions</code>.
        كل عنصر يحتاج <code className="px-1 rounded bg-muted">exerciseId</code> صحيح من قاعدة البيانات،
        مع <code>patternId</code> اختياري، و<code>steps</code>، <code>needs</code>، <code>notes</code>.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={downloadTemplate}
          disabled={busy}
          className="px-3 py-2 rounded-lg text-xs font-bold border border-border bg-card text-foreground hover:bg-muted transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" /> تنزيل قالب JSON
        </button>

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="px-3 py-2 rounded-lg text-xs font-bold bg-secondary text-secondary-foreground hover:opacity-90 transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
        >
          <Upload className="w-3.5 h-3.5" /> رفع ملف JSON
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />
      </div>

      {busy && progress.total > 0 && (
        <div className="mt-3 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-secondary transition-all"
            style={{ width: `${(progress.done / progress.total) * 100}%` }}
          />
        </div>
      )}
    </div>
  );
}
