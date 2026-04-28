// ===== Cognitive Entry Header =====
// First thing the student sees on an exercise: a clear answer to
// "what am I doing, why, and where do I start?".
// Includes always-visible help affordances (hint / similar / method).

import { useState } from "react";
import { Lightbulb, BookOpen, Target, Clock, Trophy, ChevronDown, Sparkles } from "lucide-react";

export interface CognitiveEntryProps {
  skill: string;          // e.g. "التحليل بالمربع الكامل"
  level?: string;         // "1AS" | "2AS" | "3AS" | "BEM" ...
  difficulty?: "facile" | "moyen" | "difficile" | string;
  durationMin?: number;
  xpReward?: number;
  goal?: string;          // "هدف الدرس: ..."
  firstStepHint?: string; // "ابدأ بالتحقق هل الحدّان طرفيّان مربّعان؟"
  hint?: string;
  similarExample?: string;
  method?: string;        // step-by-step method narrative
}

type Panel = "hint" | "similar" | "method" | null;

export function CognitiveEntryHeader(props: CognitiveEntryProps) {
  const {
    skill, level, difficulty, durationMin, xpReward,
    goal, firstStepHint, hint, similarExample, method,
  } = props;
  const [open, setOpen] = useState<Panel>(null);
  const toggle = (p: Panel) => setOpen((cur) => (cur === p ? null : p));

  const diffColor =
    difficulty === "facile"
      ? "bg-emerald-500/15 text-emerald-700 border-emerald-500/30"
      : difficulty === "difficile"
      ? "bg-rose-500/15 text-rose-700 border-rose-500/30"
      : "bg-amber-500/15 text-amber-700 border-amber-500/30";

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-l from-primary/5 via-card to-card overflow-hidden" dir="rtl">
      {/* Top meta row */}
      <div className="flex flex-wrap items-center gap-2 px-4 pt-4">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{skill}</span>
        </div>
        {level && (
          <span className="px-2.5 py-1 rounded-full bg-card border border-border text-[11px] font-bold text-foreground">
            المستوى: {level}
          </span>
        )}
        {difficulty && (
          <span className={`px-2.5 py-1 rounded-full border text-[11px] font-bold capitalize ${diffColor}`}>
            {difficulty === "facile" ? "سهل" : difficulty === "difficile" ? "صعب" : "متوسط"}
          </span>
        )}
        {typeof durationMin === "number" && (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-card border border-border text-[11px] font-bold text-muted-foreground">
            <Clock className="w-3 h-3" /> {durationMin} د
          </span>
        )}
        {typeof xpReward === "number" && (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-[11px] font-bold text-amber-700">
            <Trophy className="w-3 h-3" /> +{xpReward} XP
          </span>
        )}
      </div>

      {/* Goal + first-step prompt */}
      <div className="px-4 py-3 space-y-2">
        {goal && (
          <div className="flex items-start gap-2">
            <Target className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">هدف الدرس</span>
              <p className="text-sm text-foreground font-bold leading-snug">{goal}</p>
            </div>
          </div>
        )}
        {firstStepHint && (
          <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2.5 flex items-start gap-2">
            <span className="text-base">👉</span>
            <div className="flex-1">
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider">ابدأ من هنا</span>
              <p className="text-sm text-foreground leading-snug">{firstStepHint}</p>
            </div>
          </div>
        )}
      </div>

      {/* Always-visible help bar — hide buttons with no content instead of showing them faded */}
      {(hint || similarExample || method) && (
        <div className="flex items-stretch border-t border-border">
          {hint && (
            <HelpButton icon="💡" label="تلميح" active={open === "hint"} onClick={() => toggle("hint")} />
          )}
          {similarExample && (
            <HelpButton icon="📘" label="مثال مشابه" active={open === "similar"} onClick={() => toggle("similar")} />
          )}
          {method && (
            <HelpButton icon="🎯" label="شرح الطريقة" active={open === "method"} onClick={() => toggle("method")} />
          )}
        </div>
      )}

      {/* Expanded help panel */}
      {open && (
        <div className="px-4 py-3 bg-muted/30 border-t border-border animate-in fade-in slide-in-from-top-1 duration-200">
          {open === "hint" && hint && (
            <HelpBody icon={<Lightbulb className="w-4 h-4" />} title="تلميح">{hint}</HelpBody>
          )}
          {open === "similar" && similarExample && (
            <HelpBody icon={<BookOpen className="w-4 h-4" />} title="مثال مشابه">{similarExample}</HelpBody>
          )}
          {open === "method" && method && (
            <HelpBody icon={<Target className="w-4 h-4" />} title="الطريقة خطوة بخطوة">{method}</HelpBody>
          )}
        </div>
      )}
    </div>
  );
}

function HelpButton({
  icon, label, onClick, active, disabled,
}: { icon: string; label: string; onClick: () => void; active: boolean; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition-colors border-l border-border last:border-l-0 ${
        disabled
          ? "text-muted-foreground/40 cursor-not-allowed"
          : active
          ? "bg-primary/10 text-primary"
          : "text-foreground hover:bg-muted"
      }`}
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
      {!disabled && <ChevronDown className={`w-3 h-3 transition-transform ${active ? "rotate-180" : ""}`} />}
    </button>
  );
}

function HelpBody({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-[11px] font-bold text-primary uppercase mb-1">{title}</div>
        <div className="text-sm text-foreground leading-relaxed whitespace-pre-line">{children}</div>
      </div>
    </div>
  );
}
