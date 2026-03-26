// ===== Misconception Panel =====
// Shows student's attempt, detects errors, gives targeted hint.

import { useState, useCallback } from "react";
import { detectMisconception } from "@/engine/misconception-detector";
import { explainMisconception } from "@/engine/ai-layer";
import { Misconception } from "@/engine/types";
import { LatexRenderer } from "./LatexRenderer";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  correctAnswer: string;
  domain: string;
}

const SEVERITY_COLORS = {
  low: "text-green-400 border-green-400/30 bg-green-400/5",
  medium: "text-yellow-400 border-yellow-400/30 bg-yellow-400/5",
  high: "text-red-400 border-red-400/30 bg-red-400/5",
};

export function MisconceptionPanel({ correctAnswer, domain }: Props) {
  const [attempt, setAttempt] = useState("");
  const [misconception, setMisconception] = useState<Misconception | null>(null);
  const [aiHint, setAiHint] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  const check = useCallback(() => {
    if (!attempt.trim()) return;
    const result = detectMisconception(attempt, correctAnswer);
    setMisconception(result);
    setChecked(true);
    setAiHint(null);
  }, [attempt, correctAnswer]);

  const getAIHint = useCallback(async () => {
    if (!misconception) return;
    setAiLoading(true);
    try {
      const hint = await explainMisconception(
        misconception.labelFr,
        attempt,
        correctAnswer,
        "fr"
      );
      setAiHint(hint);
    } catch (e) {
      setAiHint(`Erreur: ${e instanceof Error ? e.message : "inconnu"}`);
    } finally {
      setAiLoading(false);
    }
  }, [misconception, attempt, correctAnswer]);

  return (
    <div className="border-t border-border mt-4 pt-4">
      <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-3">
        تحقق من إجابتك — Vérifier ma réponse
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={attempt}
          onChange={e => { setAttempt(e.target.value); setChecked(false); setMisconception(null); }}
          onKeyDown={e => e.key === "Enter" && check()}
          placeholder="اكتب إجابتك هنا..."
          className="flex-1 bg-background border border-border rounded-sm px-3 py-2 text-[13px] focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground"
          dir="auto"
        />
        <button
          onClick={check}
          disabled={!attempt.trim()}
          className="px-4 py-2 border border-border rounded-sm text-[12px] text-muted-foreground hover:text-foreground hover:border-primary/50 disabled:opacity-40 transition-colors"
        >
          تحقق
        </button>
      </div>

      <AnimatePresence>
        {checked && misconception && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-3 p-3 border rounded-sm ${SEVERITY_COLORS[misconception.severity]}`}
          >
            {misconception.type === "correct" ? (
              <div className="text-[13px] font-semibold">✓ إجابة صحيحة! {misconception.labelAr}</div>
            ) : (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider">{misconception.labelAr}</span>
                  <span className="text-[10px] opacity-70">— {misconception.labelFr}</span>
                </div>
                <p className="text-[12px] mb-2">{misconception.description}</p>
                <p className="text-[11px] opacity-80 leading-relaxed">{misconception.hint}</p>

                {!aiHint && (
                  <button
                    onClick={getAIHint}
                    disabled={aiLoading}
                    className="mt-2 text-[11px] underline underline-offset-2 opacity-70 hover:opacity-100"
                  >
                    {aiLoading ? "NIM cherche..." : "✦ Explication NIM détaillée →"}
                  </button>
                )}
                {aiHint && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-2 pt-2 border-t border-current/20"
                  >
                    <div className="text-[10px] opacity-60 uppercase tracking-wider mb-1">✦ Gemini AI</div>
                    <p className="text-[11px] leading-relaxed">{aiHint}</p>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
