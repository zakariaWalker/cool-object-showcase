import { useState } from "react";

const FlashcardReview = () => {
  const [flipped, setFlipped] = useState<Set<number>>(new Set());

  const toggleFlip = (i: number) => {
    setFlipped((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };

  const defaultCards = [
    { question_text: "ما هي صيغة حل المعادلة التربيعية؟", correct_answer: "x = (-b ± √(b²-4ac)) / 2a" },
    { question_text: "ما هو مجموع زوايا المثلث؟", correct_answer: "١٨٠ درجة" },
    { question_text: "قانون فيثاغورس", correct_answer: "a² + b² = c²" },
    { question_text: "مشتقة sin(x)", correct_answer: "cos(x)" },
    { question_text: "تكامل 1/x", correct_answer: "ln|x| + C" },
    { question_text: "صيغة مساحة الدائرة", correct_answer: "π × r²" },
  ];

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">اضغط على البطاقة لكشف الإجابة — نظام التكرار المتباعد</p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {defaultCards.map((card, i) => (
          <button
            key={i}
            onClick={() => toggleFlip(i)}
            className="bg-card rounded-2xl border border-border p-6 card-hover text-right min-h-[200px] flex flex-col justify-between w-full"
          >
            <div>
              <span className="text-xs text-muted-foreground mb-2 block">بطاقة {i + 1}</span>
              <p className="font-bold text-lg">{card.question_text}</p>
            </div>
            {flipped.has(i) && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm text-primary font-medium">{card.correct_answer}</p>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default FlashcardReview;
