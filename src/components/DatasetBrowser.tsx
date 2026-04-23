// ===== Dataset Browser Component =====
// Upload and browse imadrassa JSON exercise datasets
// No answers shown — uses KB patterns/deconstruction approach

import { useState, useRef } from "react";
import { ImadrassaDataset, ImadrassaExercise } from "@/engine/dataset-types";
import { MathExerciseRenderer } from "./MathExerciseRenderer";
import { motion, AnimatePresence } from "framer-motion";

interface DatasetBrowserProps {
  onSelectExercise: (exercise: ImadrassaExercise) => void;
}

export function DatasetBrowser({ onSelectExercise }: DatasetBrowserProps) {
  const [dataset, setDataset] = useState<ImadrassaDataset | null>(null);
  const [activeChapter, setActiveChapter] = useState<number>(0);
  const [activeExercise, setActiveExercise] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as ImadrassaDataset;
        setDataset(data);
        setActiveChapter(0);
        setActiveExercise(null);
      } catch (err) {
        console.error("Invalid JSON:", err);
      }
    };
    reader.readAsText(file);
  };

  const currentChapter = dataset?.chapters[activeChapter];
  const currentExercise = activeExercise != null ? currentChapter?.exercises[activeExercise] : null;
  const chapters = Array.isArray(dataset?.chapters) ? dataset.chapters : [];
  const meta = dataset?._meta ?? {
    label: "ملف تمارين",
    total_chapters: chapters.length,
    total_exercises: chapters.reduce((sum, chapter) => sum + (chapter.exercises?.length || 0), 0),
  };

  return (
    <div className="flex flex-col h-full">
      {/* Upload area */}
      {!dataset ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center">
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-8 hover:border-primary/50 transition-colors cursor-pointer"
            >
              <div className="text-[32px] mb-2">📁</div>
              <div className="text-[13px] text-foreground mb-1 font-bold">رفع ملف JSON</div>
              <div className="text-[11px] text-muted-foreground">
                صيغة imadrassa أو أي ملف تمارين JSON
              </div>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              onChange={handleUpload}
              className="hidden"
            />
          </div>
        </div>
      ) : (
        <>
          {/* Dataset meta */}
          <div className="p-3 border-b border-border bg-card/50">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] text-foreground font-semibold" dir="rtl">
                  {meta.label}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {meta.total_chapters} فصل — {meta.total_exercises} تمرين
                </div>
              </div>
              <button
                onClick={() => { setDataset(null); setActiveExercise(null); }}
                className="text-[10px] text-muted-foreground hover:text-foreground px-2 py-1 border border-border rounded-md"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Chapters tabs */}
          <div className="border-b border-border overflow-x-auto">
            <div className="flex">
              {chapters.map((ch, i) => (
                <button
                  key={i}
                  onClick={() => { setActiveChapter(i); setActiveExercise(null); }}
                  className={`px-3 py-2 text-[10px] whitespace-nowrap border-b-2 transition-colors ${
                    activeChapter === i
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                  dir="rtl"
                >
                  {ch.chapter.slice(0, 25)}{ch.chapter.length > 25 ? "…" : ""}
                </button>
              ))}
            </div>
          </div>

          {/* Exercise list */}
          <div className="flex-1 overflow-y-auto">
            {currentExercise ? (
              <ExerciseDetail
                exercise={currentExercise}
                onBack={() => setActiveExercise(null)}
                onSolve={() => onSelectExercise(currentExercise)}
              />
            ) : (
              <div className="p-3 space-y-1.5">
                {currentChapter?.exercises.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveExercise(i)}
                    className="w-full text-right p-3 rounded-lg border border-border hover:border-primary/50 transition-colors"
                    dir="rtl"
                  >
                    <div className="text-[12px] text-primary font-semibold mb-0.5">{ex.title}</div>
                    <div className="text-[11px] text-muted-foreground truncate">{ex.statement}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      {ex.questions.length} سؤال
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ===== Exercise Detail View (no answers — solve with engine) =====

function ExerciseDetail({
  exercise,
  onBack,
  onSolve,
}: {
  exercise: ImadrassaExercise;
  onBack: () => void;
  onSolve: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="p-4 space-y-4"
    >
      <button
        onClick={onBack}
        className="text-[11px] text-muted-foreground hover:text-foreground"
      >
        ← رجوع
      </button>

      <div>
        <div className="text-[14px] text-primary font-semibold mb-2">{exercise.title}</div>
        <div className="text-[13px]" dir="rtl">
          <MathExerciseRenderer text={exercise.statement} />
        </div>
      </div>

      {/* Questions — well-formatted with ExerciseRenderer */}
      <div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">الأسئلة</div>
        <div className="space-y-2">
          {exercise.questions.map((q, i) => (
            <div key={i} className="flex items-start gap-2 bg-muted/30 border border-border rounded-lg p-3">
              <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                {i + 1}
              </span>
              <div className="flex-1 text-[12px]" dir="auto">
                <MathExerciseRenderer text={q} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Info banner — no answers, use engine */}
      <div className="p-3 rounded-lg bg-accent/10 border border-accent/20 text-center">
        <div className="text-xs text-accent-foreground">
          💡 حل التمرين بالمحرك لعرض التفكيك والأنماط وتحديد الثغرات
        </div>
      </div>

      {/* Solve with engine */}
      <button
        onClick={onSolve}
        className="w-full px-4 py-3 bg-primary text-primary-foreground text-[13px] font-bold rounded-xl hover:opacity-90 transition-all shadow-lg"
      >
        🔬 حل وتفكيك بالمحرك ⏎
      </button>
    </motion.div>
  );
}
