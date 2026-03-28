// ===== Student Answer Editor — Auto-selects Algebra or Geometry editor and Level =====
import { AlgebraEditor } from "./AlgebraEditor";
import { GeometryEditor } from "./GeometryEditor";

type Level = "primary" | "middle" | "secondary";

interface StudentAnswerEditorProps {
  exerciseType?: string;
  exerciseLevel?: string; // Optional: can be passed from parent
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

function detectLevel(level?: string, text?: string): Level {
  const l = (level || "").toLowerCase();
  const txt = (text || "").toLowerCase();

  if (l.includes("primary") || l.includes("ابتدائي") || /سنة أولى|سنة ثانية|سنة ثالثة|سنة رابعة|سنة خامسة/.test(txt)) return "primary";
  if (l.includes("secondary") || l.includes("ثانوي") || l.includes("bac") || /بكالوريا|مشتق|نهاية|تكامل|مركبة/.test(txt)) return "secondary";

  return "middle"; // Default to middle (4AM level)
}

export function StudentAnswerEditor({ exerciseType, exerciseLevel, exerciseText, onSubmitAlgebra, onSubmitGeometry, className = "" }: StudentAnswerEditorProps) {
  const editorType = detectEditorType(exerciseType, exerciseText);
  const initialLevel = detectLevel(exerciseLevel, exerciseText);

  if (editorType === "geometry") {
    return <GeometryEditor onSubmit={onSubmitGeometry} initialLevel={initialLevel} className={className} />;
  }

  return <AlgebraEditor onSubmit={onSubmitAlgebra} initialLevel={initialLevel} className={className} />;
}
