import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const LearningPath = () => {
  const { user } = useAuth();

  const defaultPath = [
    { id: "1", title: "أساسيات الجبر", topics: ["المعادلات", "المتراجحات", "النظمات"], status: "available" },
    { id: "2", title: "التحليل", topics: ["النهايات", "الاشتقاق", "التكامل"], status: "available" },
    { id: "3", title: "الهندسة", topics: ["المثلثات", "الدوائر", "المساحات"], status: "available" },
    { id: "4", title: "الاحتمالات والإحصاء", topics: ["الاحتمالات", "التوزيعات", "الإحصاء الوصفي"], status: "available" },
    { id: "5", title: "الدوال", topics: ["دوال كثيرة الحدود", "الدوال الأسية", "الدوال اللوغاريتمية"], status: "available" },
  ];

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">مسار التعلم المخصص لك</p>
      <div className="space-y-3">
        {defaultPath.map((item, i) => (
          <div key={item.id} className="bg-card rounded-2xl border border-border p-5 card-hover">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 bg-primary text-primary-foreground">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{item.title}</p>
                <p className="text-xs text-muted-foreground">{item.topics.join(" · ")}</p>
              </div>
              <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full">ابدأ</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LearningPath;
