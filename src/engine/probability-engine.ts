// ===== Probability Engine =====
// Local deterministic solver for classical probability experiments.
// Supports: coins, dice, urns, compound experiments.

import { ProbabilityResult, ProbabilityEvent, TreeNode, ProbabilityStep, ExperimentType } from "./types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function gcd(a: number, b: number): number {
  a = Math.abs(Math.round(a)); b = Math.abs(Math.round(b));
  return b === 0 ? a : gcd(b, a % b);
}

function fraction(num: number, den: number): string {
  if (den === 0) return "∞";
  const g = gcd(num, den);
  const n = num / g, d = den / g;
  return d === 1 ? `${n}` : `\\frac{${n}}{${d}}`;
}

function cartesian<T>(a: T[], b: T[]): [T, T][] {
  return a.flatMap(x => b.map(y => [x, y] as [T, T]));
}

// ─── Experiment parsers ───────────────────────────────────────────────────────

interface ParsedExperiment {
  type: ExperimentType;
  description: string;
  trials: number;
  // for urn
  balls?: { color: string; count: number }[];
  // for dice
  diceFaces?: number;
}

export function parseProbabilityInput(input: string): ParsedExperiment {
  const t = input.toLowerCase();

  // Urn / bag
  if (/urne|sac|urn|boule|كرة|كرات|حقيبة/.test(t)) {
    const balls: { color: string; count: number }[] = [];
    const patterns = [
      /(\d+)\s*(rouge|red|حمراء|أحمر)/gi,
      /(\d+)\s*(bleu[e]?|blue|زرقاء|أزرق)/gi,
      /(\d+)\s*(vert[e]?|green|خضراء|أخضر)/gi,
      /(\d+)\s*(noire?|black|سوداء|أسود)/gi,
      /(\d+)\s*(blanc[h]?[e]?|white|بيضاء|أبيض)/gi,
      /(\d+)\s*(jaune|yellow|صفراء|أصفر)/gi,
    ];
    const labels = ["rouge", "bleue", "verte", "noire", "blanche", "jaune"];
    patterns.forEach((p, i) => {
      const m = t.match(p);
      if (m) {
        const numMatch = m[0].match(/\d+/);
        if (numMatch) balls.push({ color: labels[i], count: parseInt(numMatch[0]) });
      }
    });
    if (balls.length === 0) {
      // fallback: try "3 rouge, 2 bleue, 5 verte" style
      const raw = input.match(/(\d+)\s+([a-zA-Zأ-ي]+)/g);
      if (raw) raw.forEach(m => {
        const parts = m.trim().split(/\s+/);
        balls.push({ color: parts[1], count: parseInt(parts[0]) });
      });
    }
    return { type: "urn", description: input.trim(), trials: 1, balls };
  }

  // Two dice
  if (/deux dés|2 dés|دو حجر|مرتين.*نرد|deux fois.*dé/.test(t)) {
    return { type: "compound_dice", description: input.trim(), trials: 2, diceFaces: 6 };
  }

  // One die
  if (/dé|نرد|dice/.test(t)) {
    return { type: "dice_roll", description: input.trim(), trials: 1, diceFaces: 6 };
  }

  // Two coins
  if (/deux pièces|2 pièces|عملتين|مرتين.*عملة/.test(t)) {
    return { type: "compound_coin", description: input.trim(), trials: 2 };
  }

  // One coin
  return { type: "coin_flip", description: input.trim(), trials: 1 };
}

// ─── Solvers ─────────────────────────────────────────────────────────────────

function solveCoin(trials: number): Pick<ProbabilityResult, "sampleSpace" | "totalOutcomes" | "events" | "tree" | "steps"> {
  const faces = ["P", "F"]; // Pile, Face
  const facesFull = ["Pile (P)", "Face (F)"];

  if (trials === 1) {
    const sampleSpace = faces;
    const total = 2;
    const events: ProbabilityEvent[] = [
      { name: "P(Pile)", nameAr: "P(وجه)", outcomes: ["P"], probability: 0.5, fraction: fraction(1, 2) },
      { name: "P(Face)", nameAr: "P(كتابة)", outcomes: ["F"], probability: 0.5, fraction: fraction(1, 2) },
    ];
    const tree: TreeNode = {
      label: "Lancer", probability: 1, fractionLabel: "1", cumulativeProbability: 1, depth: 0,
      children: faces.map(f => ({
        label: f, probability: 0.5, fractionLabel: fraction(1, 2),
        cumulativeProbability: 0.5, outcome: f, children: [], depth: 1,
      })),
    };
    const steps: ProbabilityStep[] = [
      { index: 0, name: "Sample space", nameAr: "فضاء العينة", formula: "\\Omega = \\{P, F\\}", result: "|\\Omega| = 2", explanation: "لنجة متوازنة: وجهان متكافئان" },
      { index: 1, name: "P(Pile)", nameAr: "P(وجه)", formula: "P(A) = \\frac{|A|}{|\\Omega|}", result: `P(P) = ${fraction(1, 2)}`, explanation: "حدث واحد من اثنين" },
    ];
    return { sampleSpace, totalOutcomes: total, events, tree, steps };
  }

  // Two coins
  const pairs = cartesian(faces, faces);
  const sampleSpace = pairs.map(([a, b]) => `${a}${b}`);
  const total = sampleSpace.length;

  const twoHead = sampleSpace.filter(o => o === "PP");
  const atLeastOne = sampleSpace.filter(o => o.includes("P"));
  const zeroHead = sampleSpace.filter(o => o === "FF");

  const events: ProbabilityEvent[] = [
    { name: "P(2 Piles)", nameAr: "P(وجهان)", outcomes: twoHead, probability: twoHead.length / total, fraction: fraction(twoHead.length, total) },
    { name: "P(≥1 Pile)", nameAr: "P(وجه واحد على الأقل)", outcomes: atLeastOne, probability: atLeastOne.length / total, fraction: fraction(atLeastOne.length, total) },
    { name: "P(0 Pile)", nameAr: "P(بدون وجه)", outcomes: zeroHead, probability: zeroHead.length / total, fraction: fraction(zeroHead.length, total) },
    { name: "P(1 Pile exactement)", nameAr: "P(وجه واحد بالضبط)", outcomes: ["PF", "FP"], probability: 2 / total, fraction: fraction(2, total) },
  ];

  const tree: TreeNode = {
    label: "Départ", probability: 1, fractionLabel: "1", cumulativeProbability: 1, depth: 0,
    children: faces.map(f1 => ({
      label: f1, probability: 0.5, fractionLabel: fraction(1, 2), cumulativeProbability: 0.5, depth: 1,
      children: faces.map(f2 => ({
        label: f2, probability: 0.5, fractionLabel: fraction(1, 2),
        cumulativeProbability: 0.25, outcome: `${f1}${f2}`, children: [], depth: 2,
      })),
    })),
  };

  const steps: ProbabilityStep[] = [
    { index: 0, name: "Sample space", nameAr: "فضاء العينة", formula: "\\Omega = \\{PP, PF, FP, FF\\}", result: "|\\Omega| = 4", explanation: "كل النتائج الممكنة لرمي عملتين" },
    ...events.map((e, i) => ({
      index: i + 1, name: e.name, nameAr: e.nameAr,
      formula: `P(A) = \\frac{|A|}{|\\Omega|}`,
      result: `${e.name} = ${e.fraction} = ${(e.probability * 100).toFixed(1)}\\%`,
      explanation: `النتائج الملائمة: {${e.outcomes.join(", ")}} — عددها ${e.outcomes.length}`,
    })),
  ];

  return { sampleSpace, totalOutcomes: total, events, tree, steps };
}

function solveDice(trials: number, faces: number = 6): Pick<ProbabilityResult, "sampleSpace" | "totalOutcomes" | "events" | "tree" | "steps"> {
  const faceArr = Array.from({ length: faces }, (_, i) => i + 1);

  if (trials === 1) {
    const sampleSpace = faceArr.map(String);
    const total = faces;
    const even = faceArr.filter(f => f % 2 === 0);
    const gt4 = faceArr.filter(f => f > 4);
    const primes = faceArr.filter(f => [2, 3, 5].includes(f));

    const events: ProbabilityEvent[] = [
      { name: "P(pair)", nameAr: "P(زوجي)", outcomes: even.map(String), probability: even.length / total, fraction: fraction(even.length, total) },
      { name: "P(>4)", nameAr: "P(أكبر من 4)", outcomes: gt4.map(String), probability: gt4.length / total, fraction: fraction(gt4.length, total) },
      { name: "P(premier)", nameAr: "P(أولي)", outcomes: primes.map(String), probability: primes.length / total, fraction: fraction(primes.length, total) },
    ];

    const tree: TreeNode = {
      label: "Lancer", probability: 1, fractionLabel: "1", cumulativeProbability: 1, depth: 0,
      children: faceArr.map(f => ({
        label: String(f), probability: 1 / faces, fractionLabel: fraction(1, faces),
        cumulativeProbability: 1 / faces, outcome: String(f), children: [], depth: 1,
      })),
    };

    const steps: ProbabilityStep[] = [
      { index: 0, name: "Sample space", nameAr: "فضاء العينة", formula: `\\Omega = \\{1, 2, 3, 4, 5, 6\\}`, result: "|\\Omega| = 6", explanation: "حجر نرد متوازن: 6 وجوه متكافئة" },
      ...events.map((e, i) => ({ index: i + 1, name: e.name, nameAr: e.nameAr, formula: "P(A) = \\frac{|A|}{|\\Omega|}", result: `${e.name} = ${e.fraction}`, explanation: `{${e.outcomes.join(", ")}}` })),
    ];

    return { sampleSpace, totalOutcomes: total, events, tree, steps };
  }

  // Two dice — target sums
  const pairs = cartesian(faceArr, faceArr);
  const sampleSpace = pairs.map(([a, b]) => `(${a},${b})`);
  const total = pairs.length;

  const sum7 = pairs.filter(([a, b]) => a + b === 7);
  const sum12 = pairs.filter(([a, b]) => a + b === 12);
  const doubles = pairs.filter(([a, b]) => a === b);
  const sum10plus = pairs.filter(([a, b]) => a + b >= 10);

  const events: ProbabilityEvent[] = [
    { name: "P(somme=7)", nameAr: "P(المجموع=7)", outcomes: sum7.map(([a, b]) => `(${a},${b})`), probability: sum7.length / total, fraction: fraction(sum7.length, total) },
    { name: "P(somme=12)", nameAr: "P(المجموع=12)", outcomes: sum12.map(([a, b]) => `(${a},${b})`), probability: sum12.length / total, fraction: fraction(sum12.length, total) },
    { name: "P(doublet)", nameAr: "P(ضعف)", outcomes: doubles.map(([a, b]) => `(${a},${b})`), probability: doubles.length / total, fraction: fraction(doubles.length, total) },
    { name: "P(somme≥10)", nameAr: "P(المجموع≥10)", outcomes: sum10plus.map(([a, b]) => `(${a},${b})`), probability: sum10plus.length / total, fraction: fraction(sum10plus.length, total) },
  ];

  // Abbreviated tree (only show first 3 branches for readability)
  const tree: TreeNode = {
    label: "Dé 1", probability: 1, fractionLabel: "1", cumulativeProbability: 1, depth: 0,
    children: faceArr.slice(0, 4).map(f1 => ({
      label: String(f1), probability: 1 / faces, fractionLabel: fraction(1, faces), cumulativeProbability: 1 / faces, depth: 1,
      children: faceArr.slice(0, 3).map(f2 => ({
        label: String(f2), probability: 1 / faces, fractionLabel: fraction(1, faces),
        cumulativeProbability: 1 / (faces * faces), outcome: `(${f1},${f2})`, children: [], depth: 2,
      })),
    })),
  };

  const steps: ProbabilityStep[] = [
    { index: 0, name: "Sample space", nameAr: "فضاء العينة", formula: "\\Omega = \\{1,...,6\\}^2", result: `|\\Omega| = 36`, explanation: "لكل حجر نرد 6 وجوه → المجموع 6×6=36 نتيجة" },
    ...events.map((e, i) => ({ index: i + 1, name: e.name, nameAr: e.nameAr, formula: "P(A) = \\frac{|A|}{|\\Omega|}", result: `${e.name} = ${e.fraction}`, explanation: `عدد النتائج الملائمة: ${e.outcomes.length}` })),
  ];

  return { sampleSpace, totalOutcomes: total, events, tree, steps };
}

function solveUrn(balls: { color: string; count: number }[], withReplacement = false): Pick<ProbabilityResult, "sampleSpace" | "totalOutcomes" | "events" | "tree" | "steps"> {
  const total = balls.reduce((s, b) => s + b.count, 0);
  const sampleSpace: string[] = [];
  balls.forEach(b => {
    for (let i = 0; i < b.count; i++) sampleSpace.push(`${b.color}${i + 1}`);
  });

  // ── Single draw (same as before) ──────────────────────────────────────────
  const singleEvents: ProbabilityEvent[] = balls.map(b => ({
    name: `P(${b.color})`,
    nameAr: `P(${b.color})`,
    outcomes: Array.from({ length: b.count }, (_, i) => `${b.color}${i + 1}`),
    probability: b.count / total,
    fraction: fraction(b.count, total),
  }));

  // ── Two-draw events (with or without replacement) ─────────────────────────
  const twoDrawEvents: ProbabilityEvent[] = [];
  if (balls.length >= 2) {
    for (const b of balls) {
      // P(same color twice)
      const p1 = b.count / total;
      const p2 = withReplacement ? b.count / total : (b.count - 1) / (total - 1);
      const num = withReplacement ? b.count * b.count : b.count * (b.count - 1);
      const den = withReplacement ? total * total : total * (total - 1);
      twoDrawEvents.push({
        name: `P(${b.color},${b.color})`,
        nameAr: `P(${b.color} ثم ${b.color})`,
        outcomes: [],
        probability: num / den,
        fraction: fraction(num, den),
      });
    }
    // P(two different colors) — first pair
    const b0 = balls[0], b1 = balls[1];
    const mixNum = withReplacement
      ? 2 * b0.count * b1.count
      : b0.count * b1.count + b1.count * b0.count;
    const mixDen = withReplacement ? total * total : total * (total - 1);
    twoDrawEvents.push({
      name: `P(${b0.color},${b1.color}) ou inverse`,
      nameAr: `P(لون مختلط)`,
      outcomes: [],
      probability: mixNum / mixDen,
      fraction: fraction(mixNum, mixDen),
    });
  }

  const events = [...singleEvents, ...twoDrawEvents];

  const tree: TreeNode = {
    label: "الحقيبة", probability: 1, fractionLabel: "1", cumulativeProbability: 1, depth: 0,
    children: balls.map(b => ({
      label: b.color,
      probability: b.count / total,
      fractionLabel: fraction(b.count, total),
      cumulativeProbability: b.count / total,
      outcome: b.color,
      depth: 1,
      children: withReplacement
        ? balls.map(b2 => ({
            label: b2.color,
            probability: b2.count / total,
            fractionLabel: fraction(b2.count, total),
            cumulativeProbability: (b.count / total) * (b2.count / total),
            outcome: `${b.color}→${b2.color}`,
            children: [], depth: 2,
          }))
        : balls.map(b2 => {
            const remaining = b2.color === b.color ? b2.count - 1 : b2.count;
            const denom = total - 1;
            return {
              label: b2.color,
              probability: remaining / denom,
              fractionLabel: fraction(remaining, denom),
              cumulativeProbability: (b.count / total) * (remaining / denom),
              outcome: `${b.color}→${b2.color}`,
              children: [], depth: 2,
            };
          }).filter(c => c.probability > 0),
    })),
  };

  const modeAr = withReplacement ? "مع الإرجاع" : "بدون إرجاع";
  const steps: ProbabilityStep[] = [
    { index: 0, name: "Total balls", nameAr: `مجموع الكرات (${modeAr})`, formula: "n = \\sum n_i", result: `n = ${total}`, explanation: `${balls.map(b => `${b.count} ${b.color}`).join(" + ")} = ${total}` },
    ...singleEvents.map((e, i) => ({
      index: i + 1, name: e.name, nameAr: e.nameAr,
      formula: "P(A) = \\frac{n_A}{n}", result: `${e.name} = ${e.fraction}`,
      explanation: `${balls[i].count} كرة من أصل ${total}`,
    })),
    ...(twoDrawEvents.length > 0 ? [{
      index: singleEvents.length + 1,
      name: "Two draws",
      nameAr: `سحب مرتين — ${modeAr}`,
      formula: withReplacement ? "P(A∩B) = P(A)×P(B)" : "P(A∩B) = P(A)×P(B|A)",
      result: twoDrawEvents.map(e => `${e.nameAr}: ${e.fraction}`).join(" | "),
      explanation: withReplacement ? "الكرة تُعاد بعد كل سحب" : "الكرة لا تُعاد — المقام يصبح n−1",
    }] : []),
  ];

  return { sampleSpace, totalOutcomes: total, events, tree, steps };
}

// ─── Main entry ──────────────────────────────────────────────────────────────

export function solveProbability(input: string): ProbabilityResult {
  const exp = parseProbabilityInput(input);
  let result: Pick<ProbabilityResult, "sampleSpace" | "totalOutcomes" | "events" | "tree" | "steps">;

  switch (exp.type) {
    case "coin_flip":
    case "compound_coin":
      result = solveCoin(exp.trials);
      break;
    case "dice_roll":
    case "compound_dice":
      result = solveDice(exp.trials, exp.diceFaces);
      break;
    case "urn":
      // Detect "sans remise" / "بدون إرجاع" for without-replacement
      const withRepl = !/sans remise|without replacement|بدون إرجاع|sans remplacement/i.test(exp.description);
      result = solveUrn(exp.balls || [], withRepl);
      break;
    default:
      result = solveCoin(1);
  }

  return {
    domain: "probability",
    experimentType: exp.type,
    experimentDescription: exp.description,
    ...result,
  };
}
