export const GRADE_LABELS: Record<string, string> = {
  middle_1: "أولى متوسط",
  middle_2: "ثانية متوسط",
  middle_3: "ثالثة متوسط",
  middle_4: "رابعة متوسط (BEM)",
  secondary_1: "أولى ثانوي",
  secondary_2: "ثانية ثانوي",
  secondary_3: "بكالوريا (BAC)",
};

export const GRADE_MAPPING: Record<string, string> = {
  middle_1: "1AM",
  middle_2: "2AM",
  middle_3: "3AM",
  middle_4: "4AM",
  secondary_1: "1AS",
  secondary_2: "2AS",
  secondary_3: "3AS",
};

export function getGradeLabel(grade: string | null | undefined): string {
  if (!grade) return "مستوى غير محدد";
  return GRADE_LABELS[grade] || grade;
}

export function getInternalGrade(grade: string | null | undefined): string {
  if (!grade) return "";
  return GRADE_MAPPING[grade] || "";
}
