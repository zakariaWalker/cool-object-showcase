export const ALGEBRA_TEMPLATES = [
  // --- Primary Level ---
  {
    name: "عملية عمودية (جمع/طرح)",
    level: "primary",
    description: "ترتيب الأعداد وإجراء العملية",
    steps: [
      "  125",
      "+ 456",
      "------",
      "  581"
    ]
  },
  // --- Middle Level (4AM) ---
  {
    name: "PGCD (خوارزمية إقليدس)",
    level: "middle",
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
    level: "middle",
    description: "حل جملة معادلتين من الدرجة الأولى بمجهولين",
    steps: [
      "\\begin{cases} ax + by = c \\\\ a'x + b'y = c' \\end{cases}",
      "من (1) نجد: x = ...",
      "بتعويض x في (2): ...",
      "إذن: y = ... ، x = ...",
      "الثنائية (x, y) هي حل للجملة"
    ]
  },
  // --- Secondary Level (BAC) ---
  {
    name: "دراسة دالة (المشتقة)",
    level: "secondary",
    description: "حساب المشتقة وتحديد اتجاه التغير",
    steps: [
      "f(x) = ...",
      "f'(x) = ...",
      "إشارة f'(x) هي ...",
      "f متزايدة على ... ومتناقصة على ..."
    ]
  },
  {
    name: "الأعداد المركبة",
    level: "secondary",
    description: "الشكل الأسي والجبري لعدد مركب",
    steps: [
      "z = a + bi",
      "|z| = \\sqrt{a^2 + b^2}",
      "\\cos \\theta = a/|z|, \\sin \\theta = b/|z|",
      "z = |z|e^{i\\theta}"
    ]
  },
  {
    name: "التكامل بالتجزئة",
    level: "secondary",
    description: "حساب تكامل باستخدام قانون التجزئة",
    steps: [
      "\\int u(x)v'(x) dx = [u(x)v(x)] - \\int u'(x)v(x) dx",
      "u(x) = ..., v'(x) = ...",
      "u'(x) = ..., v(x) = ...",
      "I = ..."
    ]
  }
];
