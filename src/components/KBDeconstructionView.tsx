// ===== KB Deconstruction View =====
// Fetches and displays pattern-based deconstruction as a flowchart SVG

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DeconstructionFlowchart } from "./DeconstructionFlowchart";

interface DeconstructionData {
  id: string;
  pattern_id: string;
  steps: string[];
  needs: string[];
  notes: string;
  ai_generated: boolean;
  pattern?: {
    name: string;
    type: string;
    description: string;
    steps: string[];
    concepts: string[];
  };
}

interface Props {
  exerciseId: string;
  exerciseText?: string;
  exerciseSteps?: string[];
}

export function KBDeconstructionView({ exerciseId, exerciseSteps }: Props) {
  const [deconstructions, setDeconstructions] = useState<DeconstructionData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!exerciseId) return;
    setLoading(true);
    (async () => {
      try {
        const { data: decons, error: deconErr } = await supabase
          .from("kb_deconstructions")
          .select("*")
          .eq("exercise_id", exerciseId);

        if (deconErr || !decons || decons.length === 0) {
          setDeconstructions([]);
          setLoading(false);
          return;
        }

        const patternIds = [...new Set(decons.map(d => d.pattern_id))];
        const { data: patterns } = await supabase
          .from("kb_patterns")
          .select("*")
          .in("id", patternIds);

        const patternMap = new Map(
          (patterns || []).map(p => [p.id, {
            name: p.name,
            type: p.type || "",
            description: p.description || "",
            steps: Array.isArray(p.steps) ? p.steps as string[] : [],
            concepts: Array.isArray(p.concepts) ? p.concepts as string[] : [],
          }])
        );

        setDeconstructions(decons.map(d => ({
          id: d.id,
          pattern_id: d.pattern_id,
          steps: Array.isArray(d.steps) ? d.steps as string[] : [],
          needs: Array.isArray(d.needs) ? d.needs as string[] : [],
          notes: d.notes || "",
          ai_generated: d.ai_generated || false,
          pattern: patternMap.get(d.pattern_id),
        })));
      } catch (err) {
        console.error("[KBDeconstructionView]", err);
        setDeconstructions([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [exerciseId]);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: "center" }} dir="rtl">
        <div style={{ fontSize: 28, animation: "spin 1s linear infinite" }}>⚙️</div>
        <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", marginTop: 8 }}>
          جارٍ تحميل التفكيك…
        </p>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (deconstructions.length === 0) {
    return (
      <div style={{
        padding: "24px 20px",
        textAlign: "center",
        borderTop: "1px solid hsl(var(--border))",
      }} dir="rtl">
        <div style={{ fontSize: 36, marginBottom: 8 }}>🔍</div>
        <p style={{ fontSize: 13, fontWeight: 700, color: "hsl(var(--muted-foreground))" }}>
          لا يوجد تفكيك لهذا التمرين بعد
        </p>
        <p style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 4 }}>
          يمكنك تفكيكه من لوحة الإدارة أو بالذكاء الاصطناعي
        </p>
      </div>
    );
  }

  return (
    <div>
      {deconstructions.map((decon) => {
        const stepsToShow = decon.steps.length > 0 ? decon.steps : (decon.pattern?.steps || []);
        return (
          <DeconstructionFlowchart
            key={decon.id}
            patternName={decon.pattern?.name || decon.pattern_id}
            patternType={decon.pattern?.type || ""}
            patternDescription={decon.pattern?.description}
            steps={stepsToShow}
            needs={decon.needs}
            concepts={decon.pattern?.concepts || []}
            notes={decon.notes}
            aiGenerated={decon.ai_generated}
          />
        );
      })}
    </div>
  );
}
