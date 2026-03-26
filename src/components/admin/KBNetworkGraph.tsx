// ===== KB Network Graph — Dynamic Force-Directed Visualization =====
// Live physics simulation with filtering by kind & math type

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { Exercise, Pattern, Deconstruction } from "./useAdminKBStore";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  exercises: Exercise[];
  patterns: Pattern[];
  deconstructions: Deconstruction[];
}

interface GraphNode {
  id: string; label: string;
  kind: "type" | "pattern" | "exercise" | "concept";
  type?: string;
  size: number;
  x: number; y: number;
  vx: number; vy: number;
  fx?: number; fy?: number;
  pinned?: boolean;
}

interface GraphEdge {
  source: string; target: string;
  kind: "type-pattern" | "pattern-exercise" | "pattern-concept";
  weight: number;
}

const KIND_LABELS: Record<string, string> = {
  type: "نوع", pattern: "نمط", exercise: "تمرين", concept: "مفهوم",
};

const TYPE_LABELS_AR: Record<string, string> = {
  arithmetic: "حساب", algebra: "جبر", fractions: "كسور", equations: "معادلات",
  geometry_construction: "إنشاءات هندسية", statistics: "إحصاء", probability: "احتمالات",
  functions: "دوال", trigonometry: "مثلثات", sequences: "متتاليات", calculus: "تحليل",
  systems: "جمل معادلات", proportionality: "تناسبية", transformations: "تحويلات",
  solids: "مجسمات", triangle_circle: "مثلث ودائرة", parallelogram: "متوازي أضلاع",
  angles: "زوايا", number_sets: "مجموعات أعداد", advanced_algebra: "جبر متقدم",
  prove: "برهان", bac_prep: "تحضير BAC", factor: "تحليل عوامل",
  solve_equation: "حل معادلات", analytic_geometry: "هندسة تحليلية",
  unclassified: "غير مصنف", other: "أخرى",
};

const DOMAIN_COLORS: Record<string, string> = {
  algebra: "hsl(243 75% 58%)", equations: "hsl(243 75% 58%)",
  advanced_algebra: "hsl(243 60% 50%)", factor: "hsl(243 65% 55%)",
  solve_equation: "hsl(243 70% 52%)", systems: "hsl(243 55% 48%)",
  geometry_construction: "hsl(158 64% 40%)", triangle_circle: "hsl(158 55% 45%)",
  parallelogram: "hsl(158 50% 42%)", angles: "hsl(158 60% 38%)",
  analytic_geometry: "hsl(158 45% 48%)", statistics: "hsl(38 92% 50%)",
  probability: "hsl(277 65% 52%)", functions: "hsl(340 80% 52%)",
  calculus: "hsl(340 70% 48%)", trigonometry: "hsl(340 60% 55%)",
  arithmetic: "hsl(200 70% 50%)", fractions: "hsl(200 60% 45%)",
  proportionality: "hsl(200 55% 48%)", number_sets: "hsl(200 50% 52%)",
  sequences: "hsl(20 80% 50%)", transformations: "hsl(120 50% 40%)",
  solids: "hsl(280 40% 50%)", prove: "hsl(0 60% 50%)", bac_prep: "hsl(45 80% 45%)",
  unclassified: "hsl(220 10% 60%)", other: "hsl(220 10% 55%)",
};

function getColor(type?: string): string {
  return DOMAIN_COLORS[type || "other"] || DOMAIN_COLORS.other;
}

type FilterKind = "all" | "type" | "pattern" | "exercise" | "concept";

export function KBNetworkGraph({ exercises, patterns, deconstructions }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);

  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filterKind, setFilterKind] = useState<FilterKind>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [showLabels, setShowLabels] = useState(true);

  // Use refs for values needed in render loop to avoid stale closures
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const hoveredRef = useRef<GraphNode | null>(null);
  const selectedRef = useRef<GraphNode | null>(null);
  const filterKindRef = useRef<FilterKind>("all");
  const filterTypeRef = useRef("all");
  const showLabelsRef = useRef(true);
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const draggingNode = useRef<GraphNode | null>(null);
  const simRunning = useRef(true);
  const tempRef = useRef(1);
  const [, forceUpdate] = useState(0);

  // Sync state to refs
  useEffect(() => { filterKindRef.current = filterKind; }, [filterKind]);
  useEffect(() => { filterTypeRef.current = filterType; }, [filterType]);
  useEffect(() => { showLabelsRef.current = showLabels; }, [showLabels]);
  useEffect(() => { selectedRef.current = selectedNode; }, [selectedNode]);

  const { nodes, edges, stats, allMathTypes } = useMemo(() => {
    const nodeMap = new Map<string, GraphNode>();
    const edgeList: GraphEdge[] = [];
    const deconByPattern = new Map<string, number>();
    deconstructions.forEach(d => deconByPattern.set(d.patternId, (deconByPattern.get(d.patternId) || 0) + 1));
    const deconExIds = new Set(deconstructions.map(d => d.exerciseId));

    const types = new Set<string>();
    exercises.forEach(e => { if (e.type && e.type !== "unclassified") types.add(e.type); });
    patterns.forEach(p => { if (p.type) types.add(p.type); });

    types.forEach(t => {
      nodeMap.set(`type:${t}`, {
        id: `type:${t}`, label: TYPE_LABELS_AR[t] || t, kind: "type", type: t,
        size: 22, x: 0, y: 0, vx: 0, vy: 0,
      });
    });

    patterns.forEach(p => {
      const usage = deconByPattern.get(p.id) || 0;
      nodeMap.set(`pattern:${p.id}`, {
        id: `pattern:${p.id}`, label: p.name, kind: "pattern", type: p.type,
        size: 10 + Math.min(usage * 2, 12), x: 0, y: 0, vx: 0, vy: 0,
      });
      if (p.type && types.has(p.type)) {
        edgeList.push({ source: `type:${p.type}`, target: `pattern:${p.id}`, kind: "type-pattern", weight: 2 });
      }
      (p.concepts || []).forEach(c => {
        const cId = `concept:${c}`;
        if (!nodeMap.has(cId)) {
          nodeMap.set(cId, { id: cId, label: c, kind: "concept", type: p.type, size: 6, x: 0, y: 0, vx: 0, vy: 0 });
        }
        edgeList.push({ source: `pattern:${p.id}`, target: cId, kind: "pattern-concept", weight: 1 });
      });
    });

    const maxExercises = 80;
    const deconstructedExercises = exercises.filter(e => deconExIds.has(e.id)).slice(0, maxExercises);
    deconstructedExercises.forEach(e => {
      nodeMap.set(`exercise:${e.id}`, {
        id: `exercise:${e.id}`, label: e.text.slice(0, 30), kind: "exercise", type: e.type,
        size: 5, x: 0, y: 0, vx: 0, vy: 0,
      });
    });

    deconstructions.forEach(d => {
      if (nodeMap.has(`pattern:${d.patternId}`) && nodeMap.has(`exercise:${d.exerciseId}`)) {
        edgeList.push({ source: `pattern:${d.patternId}`, target: `exercise:${d.exerciseId}`, kind: "pattern-exercise", weight: 1 });
      }
    });

    // Position type nodes in a circle
    const typeList = [...types];
    const angleStep = (2 * Math.PI) / Math.max(typeList.length, 1);
    const W = 900, H = 700, cx = W / 2, cy = H / 2;

    typeList.forEach((t, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const r = 200;
      const node = nodeMap.get(`type:${t}`)!;
      node.x = cx + r * Math.cos(angle);
      node.y = cy + r * Math.sin(angle);
      node.pinned = true;
    });

    // Position other nodes near their parents
    nodeMap.forEach(node => {
      if (node.kind === "pattern" && node.type) {
        const parent = nodeMap.get(`type:${node.type}`);
        if (parent) {
          node.x = parent.x + (Math.random() - 0.5) * 150;
          node.y = parent.y + (Math.random() - 0.5) * 150;
        } else {
          node.x = cx + (Math.random() - 0.5) * 400;
          node.y = cy + (Math.random() - 0.5) * 400;
        }
      } else if (node.kind === "exercise" || node.kind === "concept") {
        node.x = cx + (Math.random() - 0.5) * 600;
        node.y = cy + (Math.random() - 0.5) * 500;
      }
    });

    const allNodes = [...nodeMap.values()];
    return {
      nodes: allNodes,
      edges: edgeList,
      stats: {
        types: typeList.length, patterns: patterns.length,
        exercises: deconstructedExercises.length,
        concepts: allNodes.filter(n => n.kind === "concept").length,
        edges: edgeList.length,
      },
      allMathTypes: typeList.sort(),
    };
  }, [exercises, patterns, deconstructions]);

  // Initialize simulation
  useEffect(() => {
    nodesRef.current = nodes.map(n => ({ ...n }));
    edgesRef.current = edges;
    tempRef.current = 1;
    simRunning.current = true;

    const nodeArr = nodesRef.current;
    const edgeArr = edgesRef.current;
    const nodeById = new Map(nodeArr.map(n => [n.id, n]));
    const W = 900, H = 700;

    function tick() {
      if (!simRunning.current) return;
      const temp = tempRef.current;
      if (temp < 0.01) {
        // Keep a small ambient motion
        tempRef.current = 0.01;
      } else {
        tempRef.current *= 0.997;
      }

      // Repulsion
      for (let i = 0; i < nodeArr.length; i++) {
        const a = nodeArr[i];
        if (a.pinned && !draggingNode.current) continue;
        for (let j = i + 1; j < nodeArr.length; j++) {
          const b = nodeArr[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist > 350) continue;
          const force = (600 / (dist * dist)) * Math.max(temp, 0.05);
          const fx = force * (dx / dist), fy = force * (dy / dist);
          if (!a.pinned) { a.vx += fx; a.vy += fy; }
          if (!b.pinned) { b.vx -= fx; b.vy -= fy; }
        }
      }

      // Spring attraction along edges
      edgeArr.forEach(e => {
        const s = nodeById.get(e.source), t = nodeById.get(e.target);
        if (!s || !t) return;
        const dx = t.x - s.x, dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const ideal = e.kind === "type-pattern" ? 110 : e.kind === "pattern-exercise" ? 80 : 55;
        const force = (dist - ideal) * 0.015 * e.weight * Math.max(temp, 0.05);
        const fx = force * (dx / dist), fy = force * (dy / dist);
        if (!s.pinned) { s.vx += fx; s.vy += fy; }
        if (!t.pinned) { t.vx -= fx; t.vy -= fy; }
      });

      // Center gravity
      nodeArr.forEach(n => {
        if (n.pinned) return;
        n.vx += (W / 2 - n.x) * 0.0008;
        n.vy += (H / 2 - n.y) * 0.0008;
      });

      // Integrate
      nodeArr.forEach(n => {
        if (n.pinned) return;
        n.x += n.vx * 0.5;
        n.y += n.vy * 0.5;
        n.x = Math.max(20, Math.min(W - 20, n.x));
        n.y = Math.max(20, Math.min(H - 20, n.y));
        n.vx *= 0.75;
        n.vy *= 0.75;
      });
    }

    // Render loop with live simulation
    let frameCount = 0;
    function render() {
      // Run physics every frame
      tick();
      frameCount++;

      const canvas = canvasRef.current;
      if (!canvas) { animRef.current = requestAnimationFrame(render); return; }
      const ctx = canvas.getContext("2d");
      if (!ctx) { animRef.current = requestAnimationFrame(render); return; }

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const cw = rect.width, ch = rect.height;

      ctx.clearRect(0, 0, cw, ch);
      ctx.save();
      const z = zoomRef.current;
      const p = panRef.current;
      ctx.translate(p.x + cw / 2, p.y + ch / 2);
      ctx.scale(z, z);
      ctx.translate(-450, -350);

      // Determine visible nodes
      const fk = filterKindRef.current;
      const ft = filterTypeRef.current;
      let visibleNodes = nodeArr;
      if (fk !== "all" || ft !== "all") {
        const directIds = new Set<string>();
        nodeArr.forEach(n => {
          const kindOk = fk === "all" || n.kind === fk;
          const typeOk = ft === "all" || n.type === ft;
          if (kindOk && typeOk) directIds.add(n.id);
        });
        // Also show connected nodes
        const expandedIds = new Set(directIds);
        edgeArr.forEach(e => {
          if (directIds.has(e.source)) expandedIds.add(e.target);
          if (directIds.has(e.target)) expandedIds.add(e.source);
        });
        visibleNodes = nodeArr.filter(n => expandedIds.has(n.id));
      }
      const visibleIds = new Set(visibleNodes.map(n => n.id));

      // Highlight logic
      const focus = hoveredRef.current || selectedRef.current;
      const highlightIds = new Set<string>();
      if (focus) {
        highlightIds.add(focus.id);
        edgeArr.forEach(e => {
          if (e.source === focus.id) highlightIds.add(e.target);
          if (e.target === focus.id) highlightIds.add(e.source);
        });
      }
      const hasHL = highlightIds.size > 0;

      // Draw edges
      edgeArr.forEach(e => {
        if (!visibleIds.has(e.source) || !visibleIds.has(e.target)) return;
        const s = nodeById.get(e.source), t = nodeById.get(e.target);
        if (!s || !t) return;
        const isHL = highlightIds.has(e.source) && highlightIds.has(e.target);
        const alpha = hasHL ? (isHL ? 0.7 : 0.03) : 0.12;

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = isHL ? getColor(s.type) : `rgba(150,150,150,${alpha})`;
        ctx.lineWidth = isHL ? 2 : 0.5;
        ctx.stroke();
      });

      // Draw nodes
      const time = frameCount * 0.02;
      visibleNodes.forEach(n => {
        const isHL = highlightIds.has(n.id);
        const alpha = hasHL ? (isHL ? 1 : 0.1) : 0.9;
        const color = getColor(n.type);
        const pulse = n.kind === "type" ? 1 + Math.sin(time + n.x * 0.01) * 0.06 : 1;
        const r = n.size * pulse * (isHL ? 1.3 : 1);

        ctx.globalAlpha = alpha;

        if (n.kind === "type") {
          // Glow
          ctx.shadowColor = color;
          ctx.shadowBlur = isHL ? 25 : 12;
          ctx.beginPath();
          ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.shadowBlur = 0;
          // Inner highlight
          ctx.beginPath();
          ctx.arc(n.x, n.y, r * 0.55, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255,255,255,0.25)";
          ctx.fill();
        } else if (n.kind === "pattern") {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.globalAlpha = alpha * 0.85;
          ctx.fill();
          ctx.strokeStyle = "rgba(255,255,255,0.2)";
          ctx.lineWidth = 1;
          ctx.stroke();
        } else if (n.kind === "concept") {
          // Diamond shape
          ctx.beginPath();
          ctx.moveTo(n.x, n.y - r);
          ctx.lineTo(n.x + r, n.y);
          ctx.lineTo(n.x, n.y + r);
          ctx.lineTo(n.x - r, n.y);
          ctx.closePath();
          ctx.fillStyle = color;
          ctx.globalAlpha = alpha * 0.55;
          ctx.fill();
        } else {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.globalAlpha = alpha * 0.45;
          ctx.fill();
        }

        ctx.globalAlpha = 1;

        // Labels
        if (showLabelsRef.current && (n.kind === "type" || isHL || (n.kind === "pattern" && z > 0.8))) {
          ctx.font = n.kind === "type" ? "bold 11px 'Tajawal', sans-serif" : "9px 'Tajawal', sans-serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "top";
          ctx.fillStyle = hasHL && !isHL ? "rgba(150,150,150,0.15)" : "rgba(230,230,230,0.9)";
          const lbl = n.label.length > 18 ? n.label.slice(0, 18) + "…" : n.label;
          ctx.fillText(lbl, n.x, n.y + r + 4);
        }
      });

      ctx.restore();
      animRef.current = requestAnimationFrame(render);
    }

    animRef.current = requestAnimationFrame(render);
    return () => { simRunning.current = false; cancelAnimationFrame(animRef.current); };
  }, [nodes, edges]);

  // Interaction helpers
  function screenToGraph(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const sx = clientX - rect.left, sy = clientY - rect.top;
    const gx = (sx - panRef.current.x - rect.width / 2) / zoomRef.current + 450;
    const gy = (sy - panRef.current.y - rect.height / 2) / zoomRef.current + 350;
    return { x: gx, y: gy };
  }

  function findNodeAt(gx: number, gy: number): GraphNode | null {
    const arr = nodesRef.current;
    for (let i = arr.length - 1; i >= 0; i--) {
      const n = arr[i];
      const dx = n.x - gx, dy = n.y - gy;
      if (dx * dx + dy * dy < (n.size + 6) * (n.size + 6)) return n;
    }
    return null;
  }

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingNode.current) {
      const { x, y } = screenToGraph(e.clientX, e.clientY);
      draggingNode.current.x = x;
      draggingNode.current.y = y;
      draggingNode.current.vx = 0;
      draggingNode.current.vy = 0;
      // Reheat simulation
      tempRef.current = Math.max(tempRef.current, 0.3);
      return;
    }
    if (isPanning.current) {
      const dx = e.clientX - lastMouse.current.x;
      const dy = e.clientY - lastMouse.current.y;
      panRef.current = { x: panRef.current.x + dx, y: panRef.current.y + dy };
      lastMouse.current = { x: e.clientX, y: e.clientY };
      return;
    }
    const { x, y } = screenToGraph(e.clientX, e.clientY);
    const node = findNodeAt(x, y);
    hoveredRef.current = node;
    if (canvasRef.current) canvasRef.current.style.cursor = node ? "pointer" : "grab";
    forceUpdate(v => v + 1); // update tooltip
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const { x, y } = screenToGraph(e.clientX, e.clientY);
    const node = findNodeAt(x, y);
    if (node) {
      draggingNode.current = node;
      node.pinned = true; // pin while dragging
    } else {
      isPanning.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (draggingNode.current) {
      const node = draggingNode.current;
      // Unpin non-type nodes after drag
      if (node.kind !== "type") node.pinned = false;
      // Check if it's a click (no significant drag)
      const { x, y } = screenToGraph(e.clientX, e.clientY);
      const hit = findNodeAt(x, y);
      if (hit && hit.id === node.id) {
        setSelectedNode(prev => prev?.id === node.id ? null : node);
      }
      draggingNode.current = null;
      tempRef.current = Math.max(tempRef.current, 0.5);
    }
    isPanning.current = false;
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    zoomRef.current = Math.max(0.2, Math.min(4, zoomRef.current - e.deltaY * 0.001));
    forceUpdate(v => v + 1);
  }, []);

  const resetView = useCallback(() => {
    zoomRef.current = 1;
    panRef.current = { x: 0, y: 0 };
    tempRef.current = 1; // reheat
    forceUpdate(v => v + 1);
  }, []);

  const selectedDetails = useMemo(() => {
    if (!selectedNode) return null;
    const connected = edgesRef.current
      .filter(e => e.source === selectedNode.id || e.target === selectedNode.id)
      .map(e => {
        const otherId = e.source === selectedNode.id ? e.target : e.source;
        const other = nodesRef.current.find(n => n.id === otherId);
        return other ? { ...other, edgeKind: e.kind } : null;
      })
      .filter(Boolean) as (GraphNode & { edgeKind: string })[];
    return { node: selectedNode, connected };
  }, [selectedNode]);

  const hovered = hoveredRef.current;

  return (
    <div className="space-y-4" dir="rtl">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-black text-foreground">🕸️ شبكة المعرفة التفاعلية</h4>
          <span className="text-[10px] text-muted-foreground">
            {stats.types} أنواع · {stats.patterns} أنماط · {stats.exercises} تمارين · {stats.concepts} مفاهيم
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Kind filter */}
          {(["all", "type", "pattern", "exercise", "concept"] as FilterKind[]).map(k => (
            <button key={k} onClick={() => setFilterKind(k)}
              className="text-[10px] px-2.5 py-1 rounded-full font-bold transition-all"
              style={{
                background: filterKind === k ? "hsl(var(--algebra))" : "hsl(var(--muted))",
                color: filterKind === k ? "#fff" : "hsl(var(--muted-foreground))",
              }}>
              {k === "all" ? "الكل" : KIND_LABELS[k]}
            </button>
          ))}

          {/* Type filter dropdown */}
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="text-[10px] px-2 py-1 rounded border border-border bg-card text-foreground font-bold"
          >
            <option value="all">كل الأنواع</option>
            {allMathTypes.map(t => (
              <option key={t} value={t}>{TYPE_LABELS_AR[t] || t}</option>
            ))}
          </select>

          <div className="w-px h-4 bg-border" />
          <button onClick={() => setShowLabels(l => !l)}
            className="text-[10px] px-2 py-1 rounded border border-border text-muted-foreground hover:bg-muted transition-all">
            {showLabels ? "إخفاء" : "إظهار"} التسميات
          </button>
          <button onClick={resetView}
            className="text-[10px] px-2 py-1 rounded border border-border text-muted-foreground hover:bg-muted transition-all">
            🔄 إعادة ضبط
          </button>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full" style={{ background: "hsl(var(--algebra))", boxShadow: "0 0 8px hsl(243 75% 58% / 0.4)" }} />
          نوع (نابض)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full" style={{ background: "hsl(var(--geometry))" }} />
          نمط
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: "hsl(var(--statistics))", opacity: 0.5 }} />
          تمرين
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rotate-45" style={{ background: "hsl(var(--probability))", opacity: 0.6 }} />
          مفهوم
        </span>
        <span className="mr-auto text-[9px]">🖱️ اسحب العقد · عجلة للتكبير · انقر لعرض التفاصيل</span>
      </div>

      {/* ── Canvas + Detail Panel ── */}
      <div className="flex gap-4">
        <div className="flex-1 rounded-xl border border-border overflow-hidden relative" style={{ background: "hsl(220 20% 8%)" }}>
          <canvas
            ref={canvasRef}
            className="w-full"
            style={{ height: 580 }}
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { isPanning.current = false; draggingNode.current = null; hoveredRef.current = null; forceUpdate(v => v + 1); }}
            onWheel={handleWheel}
          />

          {/* Hover tooltip */}
          <AnimatePresence>
            {hovered && !draggingNode.current && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute top-3 left-3 rounded-lg border border-border p-3 pointer-events-none max-w-[240px]"
                style={{ background: "hsl(220 20% 12% / 0.95)", backdropFilter: "blur(8px)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: getColor(hovered.type) }} />
                  <span className="text-[11px] font-bold text-white">{hovered.label}</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: getColor(hovered.type) + "22", color: getColor(hovered.type) }}>
                  {KIND_LABELS[hovered.kind]}
                  {hovered.type && hovered.kind !== "type" ? ` — ${TYPE_LABELS_AR[hovered.type] || hovered.type}` : ""}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="absolute bottom-3 left-3 text-[9px] text-white/40 font-mono">
            {Math.round(zoomRef.current * 100)}%
          </div>
        </div>

        {/* Detail Panel */}
        <AnimatePresence>
          {selectedDetails && (
            <motion.div
              initial={{ opacity: 0, x: -20, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 280 }}
              exit={{ opacity: 0, x: -20, width: 0 }}
              className="rounded-xl border border-border bg-card p-4 overflow-hidden flex-shrink-0"
              style={{ maxHeight: 580, overflowY: "auto" }}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ background: getColor(selectedDetails.node.type) }} />
                  <span className="text-xs font-black text-foreground">{selectedDetails.node.label}</span>
                </div>
                <button onClick={() => setSelectedNode(null)} className="text-muted-foreground hover:text-foreground text-xs">✕</button>
              </div>

              <div className="text-[10px] mb-3">
                <span className="px-2 py-0.5 rounded-full font-bold" style={{ background: getColor(selectedDetails.node.type) + "22", color: getColor(selectedDetails.node.type) }}>
                  {KIND_LABELS[selectedDetails.node.kind]}
                </span>
                {selectedDetails.node.type && selectedDetails.node.kind !== "type" && (
                  <span className="mr-2 text-muted-foreground">{TYPE_LABELS_AR[selectedDetails.node.type]}</span>
                )}
              </div>

              <div className="text-[10px] font-bold text-muted-foreground mb-2">
                🔗 متصل بـ {selectedDetails.connected.length} عقدة
              </div>

              <div className="space-y-1.5">
                {selectedDetails.connected.map(c => (
                  <div key={c.id}
                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/50 cursor-pointer transition-all"
                    onClick={() => setSelectedNode(nodesRef.current.find(n => n.id === c.id) || null)}>
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: getColor(c.type) }} />
                    <span className="text-[10px] text-foreground truncate flex-1">{c.label}</span>
                    <span className="text-[8px] text-muted-foreground">{KIND_LABELS[c.kind]}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
