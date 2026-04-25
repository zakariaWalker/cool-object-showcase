// ===== Student Answer Editor — Auto-selects Algebra or Geometry editor and Level =====
// Geometry exercises now open the JSXGraph-powered GeometryCanvas (GeoGebra-style)
// seeded from the exercise text and verified against inferred constraints.
import { useMemo } from "react";
import { AlgebraEditor } from "./AlgebraEditor";
import { GeometryCanvas } from "./geometry/GeometryCanvas";
import { useUserCurriculum } from "@/hooks/useUserCurriculum";
import { buildAutoFigureSpec } from "@/engine/figures/factory";
import { inferConstraints } from "@/engine/figures/construction-checks";

type Level = "primary" | "middle" | "secondary";

interface StudentAnswerEditorProps {
  exerciseType?: string;
  exerciseLevel?: string;
  exerciseText?: string;
  onSubmitAlgebra: (steps: string[]) => void;
  onSubmitGeometry: (data: any) => void;
  className?: string;
}

function detectEditorType(type?: string, text?: string): "algebra" | "geometry" {
  const t = (type || "").toLowerCase();
  const txt = (text || "").toLowerCase();

  if (t.includes("هندس") || t.includes("geometr")) return "geometry";
  if (/ارسم|أنشئ|المثلث|الدائرة|المستقيم|قطعة|مستقيم|تحويل|دوران|انسحاب|تماثل|زاوية|دالة|منحنى/.test(txt)) return "geometry";
  if (/triangle|circle|rectangle|parallelo|trapèze|losange|function|plot|curve/.test(txt)) return "geometry";

  return "algebra";
}

function gradeCodeToLevel(code?: string): Level | null {
  if (!code) return null;
  const c = code.toUpperCase();
  if (/^[1-4]AM$/.test(c)) return "middle";
  if (/^[1-3]AS$/.test(c)) return "secondary";
  const m = c.match(/^G(\d{1,2})$/);
  if (m) {
    const g = parseInt(m[1], 10);
    if (g <= 5) return "primary";
    if (g <= 9) return "middle";
    return "secondary";
  }
  if (/(PRIM|ابتدائ|ELEMENTARY)/i.test(code)) return "primary";
  if (/(MIDDLE|MOYEN|متوسط|COLLEGE)/i.test(code)) return "middle";
  if (/(SEC|LYC|ثانوي|HIGH|BAC)/i.test(code)) return "secondary";
  return null;
}

function detectLevelFromText(level?: string, text?: string): Level {
  const l = (level || "").toLowerCase();
  const txt = (text || "").toLowerCase();

  if (l.includes("primary") || l.includes("ابتدائي") || /سنة أولى|سنة ثانية|سنة ثالثة|سنة رابعة|سنة خامسة/.test(txt)) return "primary";
  if (l.includes("secondary") || l.includes("ثانوي") || l.includes("bac") || /بكالوريا|مشتق|نهاية|تكامل|مركبة/.test(txt)) return "secondary";

  return "middle";
}

export function StudentAnswerEditor({
  exerciseType,
  exerciseLevel,
  exerciseText,
  onSubmitAlgebra,
  onSubmitGeometry,
  className = "",
}: StudentAnswerEditorProps) {
  const { gradeCode } = useUserCurriculum();
  const editorType = detectEditorType(exerciseType, exerciseText);

  const resolvedLevel: Level =
    gradeCodeToLevel(gradeCode) ||
    (exerciseLevel
      ? detectLevelFromText(exerciseLevel, exerciseText)
      : detectLevelFromText(undefined, exerciseText));

  // Seed figure + constraints from the exercise text (memoised).
  const figureSpec = useMemo(
    () => buildAutoFigureSpec({ text: exerciseText || "", type: exerciseType }),
    [exerciseText, exerciseType],
  );
  const constraints = useMemo(() => inferConstraints(exerciseText || ""), [exerciseText]);

  if (editorType === "geometry") {
    return (
      <div className={className}>
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
          <span>📐</span> لوحة الإنشاء التفاعلية
        </div>
        <GeometryCanvas
          seedSpec={figureSpec}
          constraints={constraints}
          onSubmit={(r) => onSubmitGeometry(r)}
        />
      </div>
    );
  }

  return <AlgebraEditor onSubmit={onSubmitAlgebra} initialLevel={resolvedLevel} className={className} />;
}
