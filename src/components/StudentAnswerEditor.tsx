// ===== Student Answer Editor — Auto-selects Algebra or Geometry editor =====
import { AlgebraEditor } from "./AlgebraEditor";
import { GeometryEditor } from "./GeometryEditor";

interface StudentAnswerEditorProps {
  exerciseType?: string;
  exerciseText?: string;
  onSubmitAlgebra: (steps: string[]) => void;
  onSubmitGeometry: (data: { points: any[]; segments: any[]; labels: Record<string, string>; notes: string }) => void;
  className?: string;
}

function detectEditorType(type?: string, text?: string): "algebra" | "geometry" {
  const t = (type || "").toLowerCase();
  const txt = (text || "").toLowerCase();
  
  if (t.includes("هندس") || t.includes("geometr")) return "geometry";
  if (/ارسم|أنشئ|المثلث|الدائرة|المستقيم|قطعة|مستقيم|تحويل|دوران|انسحاب|تماثل|زاوية/.test(txt)) return "geometry";
  if (/triangle|circle|rectangle|parallelo|trapèze|losange/.test(txt)) return "geometry";
  
  return "algebra";
}

export function StudentAnswerEditor({ exerciseType, exerciseText, onSubmitAlgebra, onSubmitGeometry, className = "" }: StudentAnswerEditorProps) {
  const editorType = detectEditorType(exerciseType, exerciseText);

  if (editorType === "geometry") {
    return <GeometryEditor onSubmit={onSubmitGeometry} className={className} />;
  }

  return <AlgebraEditor onSubmit={onSubmitAlgebra} className={className} />;
}
