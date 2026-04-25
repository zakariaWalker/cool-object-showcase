// ===== Interactive Geometry Canvas =====
// JSXGraph-powered drawing board with a tool palette. Lets the student
// build the construction (points, lines, perpendiculars, parallels, circles)
// and verifies it against the constraints inferred from the step.

import { useEffect, useRef, useState, useCallback } from "react";
import "jsxgraph/distrib/jsxgraph.css";
import JXG from "jsxgraph";
import type { FigureSpec } from "@/engine/figures/types";
import type { Constraint } from "@/engine/figures/construction-checks";

type Tool =
  | "select"
  | "point"
  | "segment"
  | "line"
  | "circle"
  | "perpendicular"
  | "parallel"
  | "midpoint";

interface Props {
  /** Initial figure to seed the board with (e.g. circle (C), triangle ABC). */
  seedSpec?: FigureSpec | null;
  /** Constraints inferred from the current step description. */
  constraints: Constraint[];
  /** Called whenever the verification result changes. */
  onVerify?: (result: VerifyResult) => void;
  /** Called when the student presses the “check” button. */
  onSubmit?: (result: VerifyResult) => void;
}

export interface VerifyResult {
  passed: number;
  total: number;
  details: Array<{ constraint: Constraint; ok: boolean; reason?: string }>;
}

const EPS = 0.15; // px tolerance in board coords

// ---- Helpers ----
function dot(a: any, b: any) { return a[0] * b[0] + a[1] * b[1]; }
function sub(p: any, q: any) { return [p.X() - q.X(), p.Y() - q.Y()]; }
function len(v: number[]) { return Math.hypot(v[0], v[1]); }

function angleBetween(p1: any, p2: any, p3: any, p4: any): number {
  const v1 = sub(p2, p1);
  const v2 = sub(p4, p3);
  const cos = dot(v1, v2) / (len(v1) * len(v2));
  return Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
}

export function GeometryCanvas({ seedSpec, constraints, onSubmit }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const boardRef = useRef<any>(null);
  const elementsRef = useRef<Map<string, any>>(new Map());
  const [tool, setTool] = useState<Tool>("point");
  const [pendingPoints, setPendingPoints] = useState<any[]>([]);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);
  const [labelCounter, setLabelCounter] = useState(0);

  // --- Mount JSXGraph board once ---
  useEffect(() => {
    if (!containerRef.current) return;
    const board = JXG.JSXGraph.initBoard(containerRef.current, {
      boundingbox: [-6, 6, 6, -6],
      axis: false,
      showCopyright: false,
      showNavigation: false,
      keepAspectRatio: true,
      grid: true,
      pan: { enabled: true, needTwoFingers: false, needShift: false },
      zoom: { enabled: true, wheel: true, needShift: false, factorX: 1.1, factorY: 1.1 },
      showFullscreen: false,
      defaultAxes: undefined,
    });
    boardRef.current = board;

    // Seed with figure spec if present
    if (seedSpec) seedBoard(board, seedSpec, elementsRef.current);

    return () => {
      try { JXG.JSXGraph.freeBoard(board); } catch { /* ignore */ }
      boardRef.current = null;
      elementsRef.current.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedSpec?.kind]);

  // --- Tool click handler ---
  const handleBoardClick = useCallback(
    (e: any) => {
      const board = boardRef.current;
      if (!board) return;
      const coords = board.getUsrCoordsOfMouse(e);
      const [x, y] = coords;

      if (tool === "point") {
        const label = nextLabel(elementsRef.current, labelCounter);
        setLabelCounter((c) => c + 1);
        const p = board.create("point", [x, y], { name: label, size: 4, fillColor: "#3b82f6", strokeColor: "#1e40af" });
        elementsRef.current.set(`point:${label}`, p);
        return;
      }

      // Tools that need 2 picks (segment/line/circle) — find nearest existing point or create one
      const nearest = findNearestPoint(board, x, y, 0.4);
      const point = nearest || (() => {
        const label = nextLabel(elementsRef.current, labelCounter);
        setLabelCounter((c) => c + 1);
        const p = board.create("point", [x, y], { name: label, size: 4, fillColor: "#3b82f6" });
        elementsRef.current.set(`point:${label}`, p);
        return p;
      })();

      const newPending = [...pendingPoints, point];
      setPendingPoints(newPending);

      const finishWith = (creator: () => void) => {
        creator();
        setPendingPoints([]);
      };

      if (tool === "segment" && newPending.length === 2) {
        finishWith(() => {
          const seg = board.create("segment", newPending, { strokeColor: "#0f172a", strokeWidth: 2 });
          elementsRef.current.set(`segment:${newPending[0].name}${newPending[1].name}`, seg);
        });
      } else if (tool === "line" && newPending.length === 2) {
        finishWith(() => {
          const ln = board.create("line", newPending, { strokeColor: "#0f172a", strokeWidth: 2, straightFirst: true, straightLast: true });
          elementsRef.current.set(`line:${newPending[0].name}${newPending[1].name}`, ln);
        });
      } else if (tool === "circle" && newPending.length === 2) {
        finishWith(() => {
          const c = board.create("circle", newPending, { strokeColor: "#7c3aed", strokeWidth: 2 });
          elementsRef.current.set(`circle:${newPending[0].name}`, c);
        });
      } else if (tool === "midpoint" && newPending.length === 2) {
        finishWith(() => {
          const label = nextLabel(elementsRef.current, labelCounter);
          setLabelCounter((c) => c + 1);
          const m = board.create("midpoint", newPending, { name: label, size: 4, fillColor: "#10b981" });
          elementsRef.current.set(`point:${label}`, m);
        });
      } else if ((tool === "perpendicular" || tool === "parallel") && newPending.length === 3) {
        // Pick: 2 points defining the reference line/segment, then 1 point through which to draw
        finishWith(() => {
          const refLine = board.create("line", [newPending[0], newPending[1]], { visible: false });
          const through = newPending[2];
          if (tool === "perpendicular") {
            const ln = board.create("perpendicular", [refLine, through], { strokeColor: "#dc2626", strokeWidth: 2, dash: 2 });
            elementsRef.current.set(`perp:${through.name}`, ln);
          } else {
            const ln = board.create("parallel", [refLine, through], { strokeColor: "#16a34a", strokeWidth: 2, dash: 2 });
            elementsRef.current.set(`para:${through.name}`, ln);
          }
        });
      }
    },
    [tool, pendingPoints, labelCounter],
  );

  // Attach native click — JSXGraph’s `down` event fires reliably
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const handler = (e: any) => {
      // Ignore drags on existing elements
      if (e.target && (e.target as HTMLElement).tagName === "ellipse") return;
      handleBoardClick(e);
    };
    board.on("down", handler);
    return () => { try { board.off("down", handler); } catch {} };
  }, [handleBoardClick]);

  // Reset pending picks when changing tool
  useEffect(() => { setPendingPoints([]); }, [tool]);

  // --- Verification ---
  const runVerification = (): VerifyResult => {
    const details: VerifyResult["details"] = [];
    for (const c of constraints) {
      const r = checkConstraint(c, elementsRef.current);
      details.push({ constraint: c, ok: r.ok, reason: r.reason });
    }
    const passed = details.filter((d) => d.ok).length;
    return { passed, total: details.length, details };
  };

  const handleSubmit = () => {
    const r = runVerification();
    setVerifyResult(r);
    onSubmit?.(r);
  };

  const handleReset = () => {
    const board = boardRef.current;
    if (!board) return;
    JXG.JSXGraph.freeBoard(board);
    elementsRef.current.clear();
    setPendingPoints([]);
    setVerifyResult(null);
    setLabelCounter(0);
    if (containerRef.current) {
      const newBoard = JXG.JSXGraph.initBoard(containerRef.current, {
        boundingbox: [-6, 6, 6, -6],
        axis: false, showCopyright: false, showNavigation: false,
        keepAspectRatio: true, grid: true, showFullscreen: false,
      });
      boardRef.current = newBoard;
      if (seedSpec) seedBoard(newBoard, seedSpec, elementsRef.current);
    }
  };

  return (
    <div className="space-y-3">
      {/* Tool palette */}
      <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-border bg-card" dir="ltr">
        {([
          ["point", "📍 نقطة"],
          ["segment", "— قطعة"],
          ["line", "／ مستقيم"],
          ["circle", "◯ دائرة"],
          ["perpendicular", "⟂ عمودي"],
          ["parallel", "∥ موازي"],
          ["midpoint", "· منتصف"],
        ] as Array<[Tool, string]>).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTool(id)}
            className={`px-2.5 py-1.5 text-xs font-bold rounded transition-all ${
              tool === id
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted text-foreground hover:bg-accent"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          onClick={handleReset}
          className="ml-auto px-2.5 py-1.5 text-xs font-bold rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-all"
        >
          ↺ مسح
        </button>
      </div>

      {/* Tool hint */}
      <div className="text-[11px] text-muted-foreground px-2" dir="rtl">
        {toolHint(tool, pendingPoints.length)}
      </div>

      {/* Board */}
      <div
        ref={containerRef}
        className="w-full bg-background border-2 border-border rounded-lg overflow-hidden"
        style={{ height: 380, touchAction: "none" }}
        dir="ltr"
      />

      {/* Constraints to satisfy */}
      {constraints.length > 0 && (
        <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-1.5" dir="rtl">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">المطلوب إنشاؤه:</div>
          {constraints.map((c, i) => {
            const det = verifyResult?.details[i];
            return (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className={det ? (det.ok ? "text-emerald-600" : "text-destructive") : "text-muted-foreground"}>
                  {det ? (det.ok ? "✓" : "✗") : "○"}
                </span>
                <span className={det && !det.ok ? "text-destructive" : "text-foreground"}>{c.description}</span>
                {det && !det.ok && det.reason && (
                  <span className="text-[10px] text-muted-foreground">— {det.reason}</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Submit */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          className="px-6 py-2.5 bg-primary text-primary-foreground font-bold rounded-lg shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
        >
          ✓ تحقق من الإنشاء
        </button>
      </div>
    </div>
  );
}

// ====================================================================
// Helpers
// ====================================================================

function toolHint(tool: Tool, pending: number): string {
  const remaining = (need: number) => need - pending;
  switch (tool) {
    case "point": return "اضغط في أي مكان لإضافة نقطة جديدة.";
    case "segment": return remaining(2) > 0 ? `اختر ${remaining(2)} نقطة لرسم القطعة.` : "";
    case "line": return remaining(2) > 0 ? `اختر ${remaining(2)} نقطة لرسم المستقيم.` : "";
    case "circle": return remaining(2) > 0 ? (pending === 0 ? "اختر مركز الدائرة، ثم نقطة على الدائرة." : "اختر نقطة على الدائرة.") : "";
    case "midpoint": return remaining(2) > 0 ? `اختر ${remaining(2)} نقطة لإيجاد منتصف القطعة.` : "";
    case "perpendicular":
    case "parallel": {
      if (pending === 0) return "اختر النقطة الأولى للمستقيم المرجعي.";
      if (pending === 1) return "اختر النقطة الثانية للمستقيم المرجعي.";
      if (pending === 2) return "اختر النقطة التي يمر منها المستقيم الجديد.";
      return "";
    }
    default: return "";
  }
}

function nextLabel(elements: Map<string, any>, counter: number): string {
  const used = new Set<string>();
  elements.forEach((_, k) => {
    if (k.startsWith("point:")) used.add(k.split(":")[1]);
  });
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  for (let i = counter; i < counter + alphabet.length; i++) {
    const l = alphabet[i % alphabet.length];
    if (!used.has(l)) return l;
  }
  return `P${counter}`;
}

function findNearestPoint(board: any, x: number, y: number, threshold: number) {
  let best: any = null;
  let bestDist = Infinity;
  for (const obj of Object.values(board.objects) as any[]) {
    if (obj.elType !== "point") continue;
    const d = Math.hypot(obj.X() - x, obj.Y() - y);
    if (d < bestDist) { bestDist = d; best = obj; }
  }
  return bestDist < threshold ? best : null;
}

function seedBoard(board: any, spec: FigureSpec, store: Map<string, any>) {
  // 2D vertices only — drop the z component for the canvas
  if (spec.vertices) {
    const pts: Record<string, any> = {};
    for (const [name, p] of Object.entries(spec.vertices)) {
      const [x, y] = p;
      const point = board.create("point", [x, y], {
        name, size: 4, fillColor: "#94a3b8", strokeColor: "#475569", fixed: false,
      });
      pts[name] = point;
      store.set(`point:${name}`, point);
    }
    if (spec.edges) {
      for (const [a, b] of spec.edges) {
        if (pts[a] && pts[b]) {
          const seg = board.create("segment", [pts[a], pts[b]], {
            strokeColor: "#94a3b8", strokeWidth: 1.5, dash: 0,
          });
          store.set(`segment:${a}${b}`, seg);
        }
      }
    }
  }
  if (spec.kind === "circle" && spec.dims?.radius) {
    const center = board.create("point", [0, 0], { name: "O", size: 4, fillColor: "#94a3b8" });
    store.set("point:O", center);
    const c = board.create("circle", [center, spec.dims.radius], {
      strokeColor: "#7c3aed", strokeWidth: 2,
    });
    store.set("circle:O", c);
  }
}

// ====================================================================
// Constraint checking
// ====================================================================

function findPoint(store: Map<string, any>, label: string) {
  return store.get(`point:${label}`);
}

function checkConstraint(c: Constraint, store: Map<string, any>): { ok: boolean; reason?: string } {
  const labels = c.labels || [];
  switch (c.kind) {
    case "create_point": {
      const p = findPoint(store, labels[0]);
      return p ? { ok: true } : { ok: false, reason: `النقطة ${labels[0]} مفقودة` };
    }
    case "create_segment":
    case "create_line":
    case "chord":
    case "diameter": {
      const [a, b] = labels;
      const pa = findPoint(store, a), pb = findPoint(store, b);
      if (!pa || !pb) return { ok: false, reason: "نقطة مفقودة" };
      // Check that a segment/line exists between them
      const has = Array.from(store.entries()).some(([k, el]) => {
        if (!k.startsWith("segment:") && !k.startsWith("line:")) return false;
        const ends = el.point1 && el.point2 ? [el.point1.name, el.point2.name] : [];
        return ends.includes(a) && ends.includes(b);
      });
      return has ? { ok: true } : { ok: false, reason: `لم يتم رسم [${a}${b}]` };
    }
    case "perpendicular": {
      const [a1, b1, a2, b2] = labels;
      const pa1 = findPoint(store, a1), pb1 = findPoint(store, b1);
      const pa2 = findPoint(store, a2), pb2 = findPoint(store, b2);
      if (!pa1 || !pb1 || !pa2 || !pb2) {
        // Maybe the perpendicular line was created via the tool — check perp:* keys
        const hasPerp = Array.from(store.keys()).some((k) => k.startsWith("perp:"));
        return hasPerp ? { ok: true } : { ok: false, reason: "النقاط أو الخطوط مفقودة" };
      }
      const ang = angleBetween(pa1, pb1, pa2, pb2);
      const ok = Math.abs(ang - 90) < 3 || Math.abs(ang - 270) < 3;
      return ok ? { ok: true } : { ok: false, reason: `الزاوية ${ang.toFixed(0)}° (يجب 90°)` };
    }
    case "parallel": {
      const [a1, b1, a2, b2] = labels;
      const pa1 = findPoint(store, a1), pb1 = findPoint(store, b1);
      const pa2 = findPoint(store, a2), pb2 = findPoint(store, b2);
      if (!pa1 || !pb1 || !pa2 || !pb2) {
        const hasPara = Array.from(store.keys()).some((k) => k.startsWith("para:"));
        return hasPara ? { ok: true } : { ok: false, reason: "النقاط مفقودة" };
      }
      const ang = angleBetween(pa1, pb1, pa2, pb2);
      const ok = Math.abs(ang) < 3 || Math.abs(ang - 180) < 3;
      return ok ? { ok: true } : { ok: false, reason: `الزاوية ${ang.toFixed(0)}° (يجب 0° أو 180°)` };
    }
    case "on_circle": {
      const p = findPoint(store, labels[0]);
      const circle = Array.from(store.entries()).find(([k]) => k.startsWith("circle:"))?.[1];
      if (!p || !circle) return { ok: false, reason: "النقطة أو الدائرة مفقودة" };
      const r = circle.Radius();
      const center = circle.center;
      const d = Math.hypot(p.X() - center.X(), p.Y() - center.Y());
      return Math.abs(d - r) < EPS ? { ok: true } : { ok: false, reason: "النقطة ليست على الدائرة" };
    }
    case "midpoint": {
      const [m, a, b] = labels;
      const pm = findPoint(store, m), pa = findPoint(store, a), pb = findPoint(store, b);
      if (!pm || !pa || !pb) return { ok: false, reason: "نقطة مفقودة" };
      const mx = (pa.X() + pb.X()) / 2, my = (pa.Y() + pb.Y()) / 2;
      const ok = Math.abs(pm.X() - mx) < EPS && Math.abs(pm.Y() - my) < EPS;
      return ok ? { ok: true } : { ok: false, reason: "ليست في المنتصف" };
    }
    default:
      return { ok: false, reason: "نوع غير مدعوم" };
  }
}
