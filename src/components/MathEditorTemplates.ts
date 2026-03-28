export const ALGEBRA_TEMPLATES = [
  {
    name: "PGCD (خوارزمية إقليدس)",
    description: "حساب القاسم المشترك الأكبر باستخدام القسمات المتتالية",
    steps: [
      "PGCD(a, b) = ?",
      "a = b \\times q_1 + r_1",
      "b = r_1 \\times q_2 + r_2",
      "r_1 = r_2 \\times q_3 + 0",
      "PGCD(a, b) = r_2"
    ]
  },
  {
    name: "جملة معادلتين",
    description: "حل جملة معادلتين من الدرجة الأولى بمجهولين",
    steps: [
      "\\begin{cases} ax + by = c \\\\ a'x + b'y = c' \\end{cases}",
      "من (1) نجد: x = ...",
      "بتعويض x في (2): ...",
      "إذن: y = ... ، x = ...",
      "الثنائية (x, y) هي حل للجملة"
    ]
  },
  {
    name: "دالة خطية / تألفية",
    description: "تحليل وحساب صور وأعداد بالدوال",
    steps: [
      "f(x) = ax + b",
      "حساب صورة العدد 2: f(2) = a(2) + b",
      "إيجاد العدد الذي صورته 5: f(x) = 5",
      "ax + b = 5 \\Rightarrow x = ..."
    ]
  },
  {
    name: "نشر وتبسيط",
    description: "نشر عبارات جبرية باستخدام المتطابقات الشهيرة",
    steps: [
      "A = (a + b)^2 = a^2 + 2ab + b^2",
      "B = (a - b)^2 = a^2 - 2ab + b^2",
      "C = (a - b)(a + b) = a^2 - b^2"
    ]
  }
];
