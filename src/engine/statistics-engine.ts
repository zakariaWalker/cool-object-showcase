// ===== Statistics Engine =====
// Full deterministic local computation — no API calls needed.
// Covers: central tendency, dispersion, quartiles, IQR, histogram, z-scores.

import { StatisticsResult, StatisticsStep, HistogramBin } from "./types";

// ─── Helpers ────────────────────────────────────────────────────────────────

function sorted(data: number[]): number[] {
  return [...data].sort((a, b) => a - b);
}

function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a));
  b = Math.abs(Math.round(b));
  return b === 0 ? a : gcd(b, a % b);
}

function toFraction(numerator: number, denominator: number): string {
  if (denominator === 0) return "∞";
  const g = gcd(Math.abs(Math.round(numerator)), Math.abs(Math.round(denominator)));
  const n = Math.round(numerator) / g;
  const d = Math.round(denominator) / g;
  if (d === 1) return `${n}`;
  return `\\frac{${n}}{${d}}`;
}

function r4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

// ─── Core computations ───────────────────────────────────────────────────────

function computeMean(data: number[]): number {
  return data.reduce((s, v) => s + v, 0) / data.length;
}

function computeMedian(s: number[]): number {
  const n = s.length;
  if (n % 2 === 0) return (s[n / 2 - 1] + s[n / 2]) / 2;
  return s[Math.floor(n / 2)];
}

function computeMode(data: number[]): number[] {
  const freq: Record<number, number> = {};
  for (const v of data) freq[v] = (freq[v] || 0) + 1;
  const maxF = Math.max(...Object.values(freq));
  if (maxF === 1) return []; // no mode
  return Object.entries(freq)
    .filter(([, f]) => f === maxF)
    .map(([v]) => Number(v))
    .sort((a, b) => a - b);
}

function computeVariance(data: number[], mean: number): number {
  return data.reduce((s, v) => s + (v - mean) ** 2, 0) / data.length;
}

function computeQuartile(s: number[], q: 0.25 | 0.75): number {
  const pos = q * (s.length - 1);
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return lo === hi ? s[lo] : s[lo] + (pos - lo) * (s[hi] - s[lo]);
}

function computeBins(s: number[], n: number): HistogramBin[] {
  const min = s[0];
  const max = s[s.length - 1];
  const numBins = Math.max(3, Math.ceil(Math.sqrt(n)));
  const width = (max - min) / numBins || 1;
  const bins: HistogramBin[] = [];

  for (let i = 0; i < numBins; i++) {
    const lo = min + i * width;
    const hi = i === numBins - 1 ? max + 0.0001 : lo + width;
    const count = s.filter(v => v >= lo && v < hi).length;
    bins.push({
      min: r4(lo),
      max: r4(hi),
      count,
      frequency: r4(count / n),
      label: `[${r4(lo)} ; ${r4(hi)}[`,
    });
  }
  return bins;
}

// ─── Step builder ────────────────────────────────────────────────────────────

function buildSteps(
  data: number[],
  s: number[],
  n: number,
  mean: number,
  median: number,
  mode: number[],
  variance: number,
  stdDev: number,
  rangeVal: number,
  q1: number,
  q3: number,
  iqr: number,
): StatisticsStep[] {
  const steps: StatisticsStep[] = [];
  const sum = data.reduce((a, b) => a + b, 0);

  steps.push({
    index: 0,
    name: "Sort & Count",
    nameAr: "الترتيب والعدد",
    formula: "n = \\text{card}(X)",
    substitution: `n = ${n}`,
    result: n,
    resultLabel: "n",
    explanation: `السلسلة المرتبة: {${s.join(" , ")}}`,
  });

  steps.push({
    index: 1,
    name: "Mean",
    nameAr: "المتوسط الحسابي",
    formula: "\\bar{x} = \\frac{\\sum x_i}{n}",
    substitution: `\\bar{x} = \\frac{${data.join("+")}} {${n}} = \\frac{${r4(sum)}}{${n}}`,
    result: r4(mean),
    resultLabel: "\\bar{x}",
    explanation: "مجموع كل القيم مقسوماً على عددها",
  });

  const medDesc = n % 2 === 0
    ? `المتوسط بين x_{${n / 2}} = ${s[n / 2 - 1]} و x_{${n / 2 + 1}} = ${s[n / 2]}`
    : `القيمة الوسطى x_{${Math.floor(n / 2) + 1}} = ${s[Math.floor(n / 2)]}`;

  steps.push({
    index: 2,
    name: "Median",
    nameAr: "الوسيط",
    formula: n % 2 === 0
      ? "Me = \\frac{x_{n/2} + x_{n/2+1}}{2}"
      : "Me = x_{(n+1)/2}",
    substitution: medDesc,
    result: r4(median),
    resultLabel: "Me",
    explanation: "القيمة التي تقسم السلسلة إلى نصفين متساويين",
  });

  steps.push({
    index: 3,
    name: "Mode",
    nameAr: "المنوال",
    formula: "Mo = \\text{argmax freq}(x_i)",
    substitution: mode.length > 0
      ? `Mo = ${mode.join(", ")} (التكرار الأكبر)`
      : "لا يوجد منوال (كل القيم لها نفس التكرار)",
    result: mode.length > 0 ? mode.join(", ") : "∄",
    resultLabel: "Mo",
    explanation: "القيمة الأكثر تكراراً في السلسلة",
  });

  steps.push({
    index: 4,
    name: "Variance",
    nameAr: "التباين",
    formula: "V = \\frac{\\sum (x_i - \\bar{x})^2}{n}",
    substitution: `V = \\frac{${data.map(v => `(${v} - ${r4(mean)})^2`).join("+")}}{${n}}`,
    result: r4(variance),
    resultLabel: "V",
    explanation: "متوسط مربعات الانحرافات عن المتوسط",
  });

  steps.push({
    index: 5,
    name: "Standard Deviation",
    nameAr: "الانحراف المعياري",
    formula: "\\sigma = \\sqrt{V}",
    substitution: `\\sigma = \\sqrt{${r4(variance)}}`,
    result: r4(stdDev),
    resultLabel: "\\sigma",
    explanation: "جذر التباين — يقيس تشتت البيانات حول المتوسط",
  });

  steps.push({
    index: 6,
    name: "Range",
    nameAr: "المدى",
    formula: "E = x_{max} - x_{min}",
    substitution: `E = ${s[s.length - 1]} - ${s[0]}`,
    result: r4(rangeVal),
    resultLabel: "E",
    explanation: "الفرق بين أكبر قيمة وأصغر قيمة",
  });

  steps.push({
    index: 7,
    name: "Quartiles Q1 & Q3",
    nameAr: "الربيعان Q1 وQ3",
    formula: "Q_1 = \\text{médiane}(x \\leq Me) \\quad Q_3 = \\text{médiane}(x \\geq Me)",
    substitution: `Q_1 = ${r4(q1)}, \\quad Q_3 = ${r4(q3)}`,
    result: `Q_1 = ${r4(q1)},\\; Q_3 = ${r4(q3)}`,
    resultLabel: "Q_1, Q_3",
    explanation: "يقسمان السلسلة إلى أرباع — يُستخدمان لاكتشاف الشواذ",
  });

  steps.push({
    index: 8,
    name: "Inter-quartile Range",
    nameAr: "المدى الربيعي",
    formula: "IQR = Q_3 - Q_1",
    substitution: `IQR = ${r4(q3)} - ${r4(q1)}`,
    result: r4(iqr),
    resultLabel: "IQR",
    explanation: "يمثل التشتت للـ 50% الوسطى من البيانات",
  });

  return steps;
}

// ─── Main entry ──────────────────────────────────────────────────────────────

export function analyzeStatistics(rawData: number[]): StatisticsResult {
  if (rawData.length === 0) throw new Error("البيانات فارغة");

  const data = rawData.filter(v => isFinite(v));
  const n = data.length;
  const s = sorted(data);

  const mean = computeMean(data);
  const median = computeMedian(s);
  const mode = computeMode(data);
  const variance = computeVariance(data, mean);
  const stdDev = Math.sqrt(variance);
  const rangeVal = s[s.length - 1] - s[0];
  const q1 = computeQuartile(s, 0.25);
  const q3 = computeQuartile(s, 0.75);
  const iqr = q3 - q1;
  const bins = computeBins(s, n);
  const zScores = data.map(v => stdDev > 0 ? r4((v - mean) / stdDev) : 0);

  const steps = buildSteps(data, s, n, mean, median, mode, variance, stdDev, rangeVal, q1, q3, iqr);

  return {
    domain: "statistics",
    data,
    n,
    mean: r4(mean),
    median: r4(median),
    mode,
    variance: r4(variance),
    stdDev: r4(stdDev),
    range: r4(rangeVal),
    min: s[0],
    max: s[s.length - 1],
    q1: r4(q1),
    q3: r4(q3),
    iqr: r4(iqr),
    bins,
    zScores,
    steps,
  };
}

/** Parse dataset — supports flat numbers OR frequency tables (value:count or value×count) */
export function parseDataset(input: string): number[] {
  const lines = input.split("\n").map((l: string) => l.trim()).filter(Boolean);

  // ── Frequency table: "10:5" or "10×5" pairs ──────────────────────────────
  const pairMatches = [...input.matchAll(/(\d+(?:[.,]\d+)?)\s*[;:×x]\s*(\d+)/g)];
  if (pairMatches.length >= 2) {
    const data: number[] = [];
    for (const m of pairMatches) {
      const val = parseFloat(m[1].replace(",", "."));
      const count = parseInt(m[2]);
      if (!isNaN(val) && !isNaN(count) && count > 0 && count <= 500) {
        for (let i = 0; i < count; i++) data.push(val);
      }
    }
    if (data.length >= 2) return data;
  }

  // ── Two-row xi/ni table ───────────────────────────────────────────────────
  if (lines.length >= 2) {
    for (let i = 0; i < lines.length - 1; i++) {
      const vals = lines[i].split(/[\s;,|]+/).map((s: string) => parseFloat(s.replace(",", "."))).filter((n: number) => !isNaN(n));
      const counts = lines[i + 1].split(/[\s;,|]+/).map((s: string) => parseInt(s)).filter((n: number) => !isNaN(n) && n > 0);
      if (vals.length === counts.length && vals.length >= 2 && counts.every((c: number) => c <= 300)) {
        const data: number[] = [];
        vals.forEach((v: number, j: number) => { for (let k = 0; k < counts[j]; k++) data.push(v); });
        if (data.length >= 3) return data;
      }
    }
  }

  // ── Flat list fallback ────────────────────────────────────────────────────
  const data: number[] = [];
  for (const line of lines) {
    const cleanLine = line.replace(/^[\d]+[.)\-\s]+/, "").trim();
    const nums = cleanLine.split(/[,;\s]+/).map((s: string) => parseFloat(s.replace(",", ".").trim())).filter((n: number) => !isNaN(n));
    data.push(...nums);
  }
  return data;
}
