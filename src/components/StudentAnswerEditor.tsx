// ===== Student Answer Editor — Auto-selects Algebra or Geometry editor and Level =====
// Level is resolved with this priority:
//   1. The student's REGISTERED grade (from profile via useUserCurriculum) — primary source of truth
//   2. The exercise's declared level (e.g. for archived BAC exam in middle student profile)
//   3. Heuristic detection from the exercise text
import { AlgebraEditor } from "./AlgebraEditor";
import { GeometryEditor } from "./GeometryEditor";
import { useUserCurriculum } from "@/hooks/useUserCurriculum";

type Level = "primary" | "middle" | "secondary";

interface StudentAnswerEditorProps {
  exerciseType?: string;
  exerciseLevel?: string; // Optional override (e.g. when solving an exam from a different level)
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

// Map a registered grade_code (e.g. "1AM", "2AS", "G7") to an editor Level
function gradeCodeToLevel(code?: string): Level | null {
  if (!code) return null;
  const c = code.toUpperCase();
  // Algerian middle (1AM..4AM) and secondary (1AS..3AS)
  if (/^[1-4]AM$/.test(c)) return "middle";
  if (/^[1-3]AS$/.test(c)) return "secondary";
  // Generic grade levels (G1..G12)
  const m = c.match(/^G(\d{1,2})$/);
  if (m) {
    const g = parseInt(m[1], 10);
    if (g <= 5) return "primary";
    if (g <= 9) return "middle";
    return "secondary";
  }
  // Primary cycle
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

export function StudentAnswerEditor({ exerciseType, exerciseLevel, exerciseText, onSubmitAlgebra, onSubmitGeometry, className = "" }: StudentAnswerEditorProps) {
  const { gradeCode } = useUserCurriculum();
  const editorType = detectEditorType(exerciseType, exerciseText);

  // Priority: registered grade → explicit exerciseLevel prop → text heuristic
  const resolvedLevel: Level =
    gradeCodeToLevel(gradeCode) ||
    (exerciseLevel ? detectLevelFromText(exerciseLevel, exerciseText) : detectLevelFromText(undefined, exerciseText));

  // Lock the level whenever it derives from the registered profile (so students can't accidentally change it).
  const lockLevel = !!gradeCodeToLevel(gradeCode);

  if (editorType === "geometry") {
    return <GeometryEditor onSubmit={onSubmitGeometry} initialLevel={resolvedLevel} exerciseText={exerciseText} lockLevel={lockLevel} className={className} />;
  }

  return <AlgebraEditor onSubmit={onSubmitAlgebra} initialLevel={resolvedLevel} className={className} />;
}
