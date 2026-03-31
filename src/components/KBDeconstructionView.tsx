// ===== KB Deconstruction View =====
// Fetches and displays pattern-based deconstruction as a flowchart SVG
// Allows AI deconstruction trigger when no deconstruction exists

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DeconstructionFlowchart } from "./DeconstructionFlowchart";
import { GuidedStepView } from "./GuidedStepView";
import { toast } from "sonner";

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
  guided?: boolean; // default true — step-by-step mode
}

export function KBDeconstructionView({ exerciseId, exerciseText, exerciseSteps, guided = true }: Props) {
  const [deconstructions, setDeconstructions] = useState<DeconstructionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);

  const loadDeconstructions = useCallback(async () => {
    if (!exerciseId) return;
    setLoading(true);
    try {
      const { data: decons, error: deconErr } = await (supabase as any)
        .from("kb_deconstructions")
        .select("*")
        .eq("exercise_id", exerciseId);

      if (deconErr || !decons || decons.length === 0) {
        setDeconstructions([]);
        setLoading(false);
        return;
      }

      const patternIds = [...new Set(decons.map(d => d.pattern_id))];
      const { data: patterns } = await (supabase as any)
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
  }, [exerciseId]);

  useEffect(() => { loadDeconstructions(); }, [loadDeconstructions]);

  // AI Deconstruction trigger
  const handleAIDeconstruct = async () => {
    if (!exerciseId) return;
    setAiLoading(true);
    try {
      // Fetch the exercise data from DB
      const { data: exData } = await (supabase as any)
        .from("kb_exercises")
        .select("id, text, type, grade")
        .eq("id", exerciseId)
        .single();

      if (!exData) {
        toast.error("لم يتم العثور على التمرين في قاعدة البيانات");
        setAiLoading(false);
        return;
      }

      // Fetch existing patterns for the AI to match against
      const { data: patterns } = await (supabase as any)
        .from("kb_patterns")
        .select("id, name, type, steps");

      const { data, error } = await supabase.functions.invoke("ai-deconstruct", {
        body: {
          exercises: [{ id: exData.id, text: exData.text, type: exData.type, grade: exData.grade }],
          patterns: (patterns || []).map(p => ({ id: p.id, name: p.name, type: p.type, steps: p.steps })),
          batchSize: 1,
        },
      });

      if (error) {
        toast.error(`خطأ في التفكيك: ${error.message}`);
      } else if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success("✨ تم تفكيك التمرين بالذكاء الاصطناعي!");
        // Reload to show the new deconstruction
        await loadDeconstructions();
      }
    } catch (err: any) {
      console.error("[AI Deconstruct]", err);
      toast.error("خطأ غير متوقع: " + (err.message || ""));
    } finally {
      setAiLoading(false);
    }
  };

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
        <p style={{ fontSize: 11, color: "hsl(var(--muted-foreground))", marginTop: 4, marginBottom: 16 }}>
          فكّكه الآن بالذكاء الاصطناعي أو من لوحة الإدارة
        </p>
        <button
          onClick={handleAIDeconstruct}
          disabled={aiLoading}
          style={{
            padding: "12px 24px",
            borderRadius: 12,
            border: "none",
            background: "hsl(var(--primary))",
            color: "hsl(var(--primary-foreground))",
            fontSize: 13,
            fontWeight: 700,
            cursor: aiLoading ? "wait" : "pointer",
            fontFamily: "'Tajawal', sans-serif",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            opacity: aiLoading ? 0.7 : 1,
            transition: "all 0.2s",
          }}
        >
          {aiLoading ? (
            <>
              <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⚙️</span>
              جارٍ التفكيك…
            </>
          ) : (
            <>🤖 فكّك بالذكاء الاصطناعي</>
          )}
        </button>
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
            exerciseSteps={exerciseSteps}
          />
        );
      })}
    </div>
  );
}
