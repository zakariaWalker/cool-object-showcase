// ===== KB Network Graph — Sophisticated Force-Directed Visualization =====
// Shows relationships: Exercises → Patterns → Types → Concepts
// Interactive: hover, click, zoom, filter

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
  type?: string; // math type for coloring
  size: number;
  x: number; y: number;
  vx: number; vy: number;
  fx?: number; // fixed position
  fy?: number;
}

interface GraphEdge {
  source: string;
  target: string;
  kind: "type-pattern" | "pattern-exercise" | "pattern-concept";
  weight: number;
}

const KIND_LABELS: Record<string, string> = {
  type: "نوع",
  pattern: "نمط",
  exercise: "تمرين",
  concept: "مفهوم",
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
  algebra: "hsl(243 75% 58%)",
  equations: "hsl(243 75% 58%)",
  advanced_algebra: "hsl(243 60% 50%)",
  factor: "hsl(243 65% 55%)",
  solve_equation: "hsl(243 70% 52%)",
  systems: "hsl(243 55% 48%)",
  geometry_construction: "hsl(158 64% 40%)",
  triangle_circle: "hsl(158 55% 45%)",
  parallelogram: "hsl(158 50% 42%)",
  angles: "hsl(158 60% 38%)",
  analytic_geometry: "hsl(158 45% 48%)",
  statistics: "hsl(38 92% 50%)",
  probability: "hsl(277 65% 52%)",
  functions: "hsl(340 80% 52%)",
  calculus: "hsl(340 70% 48%)",
  trigonometry: "hsl(340 60% 55%)",
  arithmetic: "hsl(200 70% 50%)",
  fractions: "hsl(200 60% 45%)",
  proportionality: "hsl(200 55% 48%)",
  number_sets: "hsl(200 50% 52%)",
  sequences: "hsl(20 80% 50%)",
  transformations: "hsl(120 50% 40%)",
  solids: "hsl(280 40% 50%)",
  prove: "hsl(0 60% 50%)",
  bac_prep: "hsl(45 80% 45%)",
  unclassified: "hsl(220 10% 60%)",
  other: "hsl(220 10% 55%)",
};

function getColor(type?: string): string {
  return DOMAIN_COLORS[type || "other"] || DOMAIN_COLORS.other;
}

type FilterKind = "all" | "type" | "pattern" | "exercise" | "concept";

export function KBNetworkGraph({ exercises, patterns, deconstructions }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);

  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [filterKind, setFilterKind] = useState<FilterKind>("all");
  const [showLabels, setShowLabels] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const draggingNode = useRef<GraphNode | null>(null);

  const { nodes, edges, stats } = useMemo(() => {
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
          nodeMap.set(cId, {
            id: cId, label: c, kind: "concept", type: p.type,
            size: 6, x: 0, y: 0, vx: 0, vy: 0,
          });
        }
        edgeList.push({ source: `pattern:${p.id}`, target: cId, kind: "pattern-concept", weight: 1 });
      });
    });

    const maxExercises = 60;
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

    const typeList = [...types];
    const angleStep = (2 * Math.PI) / Math.max(typeList.length, 1);
    const W = 900, H = 700;
    const cx = W / 2, cy = H / 2;

    typeList.forEach((t, i) => {
      const angle = i * angleStep - Math.PI / 2;
      const r = 180;
      const node = nodeMap.get(`type:${t}`)!;
      node.x = cx + r * Math.cos(angle);
      node.y = cy + r * Math.sin(angle);
      node.fx = node.x;
      node.fy = node.y;
    });

    nodeMap.forEach(node => {
      if (node.kind === "pattern" && node.type) {
        const parent = nodeMap.get(`type:${node.type}`);
        if (parent) {
          const jitter = () => (Math.random() - 0.5) * 120;
          node.x = parent.x + jitter();
          node.y = parent.y + jitter();
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
        types: typeList.length,
        patterns: patterns.length,
        exercises: deconstructedExercises.length,
        concepts: allNodes.filter(n => n.kind === "concept").length,
        edges: edgeList.length,
      },
    };
  }, [exercises, patterns, deconstructions]);

  useEffect(() => {
    nodesRef.current = nodes.map(n => ({ ...n }));
    edgesRef.current = edges;

    const W = 900, H = 700;
    const nodeArr = nodesRef.current;
    const edgeArr = edgesRef.current;
    const nodeById = new Map(nodeArr.map(n => [n.id, n]));

    let iteration = 0;
    const maxIter = 200;
    const cooling = 0.995;
    let temp = 1;

    function simulate() {
      if (iteration >= maxIter) return;
      iteration++;
      temp *= cooling;

      for (let i = 0; i < nodeArr.length; i++) {
        const a = nodeArr[i];
        if (a.fx !== undefined) continue;
        for (let j = i + 1; j < nodeArr.length; j++) {
          const b = nodeArr[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist > 300) continue;
          const force = (800 / (dist * dist)) * temp;
          const fx = force * (dx / dist);
          const fy = force * (dy / dist);
          if (a.fx === undefined) { a.vx += fx; a.vy += fy; }
          if (b.fx === undefined) { b.vx -= fx; b.vy -= fy; }
        }
      }

      edgeArr.forEach(e => {
        const s = nodeById.get(e.source);
        const t = nodeById.get(e.target);
        if (!s || !t) return;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const idealDist = e.kind === "type-pattern" ? 100 : e.kind === "pattern-exercise" ? 70 : 50;
        const force = (dist - idealDist) * 0.02 * e.weight * temp;
        const fx = force * (dx / dist);
        const fy = force * (dy / dist);
        if (s.fx === undefined) { s.vx += fx; s.vy += fy; }
        if (t.fx === undefined) { t.vx -= fx; t.vy -= fy; }
      });

      nodeArr.forEach(n => {
        if (n.fx !== undefined) return;
        n.vx += (W / 2 - n.x) * 0.001;
        n.vy += (H / 2 - n.y) * 0.001;
      });

      nodeArr.forEach(n => {
        if (n.fx !== undefined) { n.x = n.fx; n.y = n.fy!; return; }
        n.x += n.vx * 0.4;
        n.y += n.vy * 0.4;
        n.x = Math.max(30, Math.min(W - 30, n.x));
        n.y = Math.max(30, Math.min(H - 30, n.y));
        n.vx *= 0.7;
        n.vy *= 0.7;
      });
    }

    for (let i = 0; i < maxIter; i++) simulate();
    renderLoop();
    return () => cancelAnimationFrame(animRef.current);
  }, [nodes, edges]);

  const getVisibleNodes = useCallback(() => {
    const all = nodesRef.current;
    if (filterKind === "all") return all;
    const filtered = all.filter(n => n.kind === filterKind);
    const filteredIds = new Set(filtered.map(n => n.id));
    edgesRef.current.forEach(e => {
      if (filteredIds.has(e.source)) filteredIds.add(e.target);
      if (filteredIds.has(e.target)) filteredIds.add(e.source);
    });
    return all.filter(n => filteredIds.has(n.id));
  }, [filterKind]);

  function renderLoop() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const W = rect.width;
    const H = rect.height;

    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(pan.x + W / 2, pan.y + H / 2);
    ctx.scale(zoom, zoom);
    ctx.translate(-450, -350);

    const visibleNodes = getVisibleNodes();
    const visibleIds = new Set(visibleNodes.map(n => n.id));
    const highlightIds = new Set<string>();

    if (hoveredNode || selectedNode) {
      const focus = hoveredNode || selectedNode;
      if (focus) {
        highlightIds.add(focus.id);
        edgesRef.current.forEach(e => {
          if (e.source === focus.id) highlightIds.add(e.target);
          if (e.target === focus.id) highlightIds.add(e.source);
        });
      }
    }

    const hasHighlight = highlightIds.size > 0;

    edgesRef.current.forEach(e => {
      if (!visibleIds.has(e.source) || !visibleIds.has(e.target)) return;
      const s = nodesRef.current.find(n => n.id === e.source);
      const t = nodesRef.current.find(n => n.id === e.target);
      if (!s || !t) return;

      const isHighlighted = highlightIds.has(e.source) && highlightIds.has(e.target);
      const alpha = hasHighlight ? (isHighlighted ? 0.6 : 0.04) : 0.15;

      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(t.x, t.y);
      ctx.strokeStyle = isHighlighted ? getColor(s.type) : `rgba(150,150,150,${alpha})`;
      ctx.lineWidth = isHighlighted ? 1.5 : 0.5;
      ctx.stroke();
    });

    visibleNodes.forEach(n => {
      const isHighlighted = highlightIds.has(n.id);
      const alpha = hasHighlight ? (isHighlighted ? 1 : 0.12) : 0.85;
      const color = getColor(n.type);

      ctx.beginPath();
      ctx.arc(n.x, n.y, n.size * (isHighlighted ? 1.3 : 1), 0, Math.PI * 2);

      if (n.kind === "type") {
        ctx.shadowColor = color;
        ctx.shadowBlur = isHighlighted ? 20 : 8;
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.size * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.fill();
      } else if (n.kind === "pattern") {
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha * 0.8;
        ctx.fill();
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.lineWidth = 1;
        ctx.stroke();
      } else if (n.kind === "concept") {
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha * 0.5;
        ctx.fill();
      } else {
        ctx.fillStyle = color;
        ctx.globalAlpha = alpha * 0.4;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      if (showLabels && (n.kind === "type" || isHighlighted || (n.kind === "pattern" && zoom > 0.8))) {
        ctx.font = n.kind === "type" ? "bold 11px 'Tajawal', sans-serif" : "9px 'Tajawal', sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = hasHighlight && !isHighlighted ? "rgba(150,150,150,0.2)" : "rgba(220,220,220,0.9)";
        const label = n.label.length > 16 ? n.label.slice(0, 16) + "…" : n.label;
        ctx.fillText(label, n.x, n.y + n.size + 4);
      }
    });

    ctx.restore();
    animRef.current = requestAnimationFrame(renderLoop);
  }

  function screenToGraph(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const W = rect.width, H = rect.height;
    const sx = clientX - rect.left;
    const sy = clientY - rect.top;
    const gx = (sx - pan.x - W / 2) / zoom + 450;
    const gy = (sy - pan.y - H / 2) / zoom + 350;
    return { x: gx, y: gy };
  }

  function findNodeAt(gx: number, gy: number): GraphNode | null {
    const visible = getVisibleNodes();
    for (let i = visible.length - 1; i >= 0; i--) {
      const n = nodesRef.current.find(nn => nn.id === visible[i].id);
      if (!n) continue;
      const dx = n.x - gx, dy = n.y - gy;
      if (dx * dx + dy * dy < (n.size + 5) * (n.size + 5)) return n;
    }
    return null;
  }

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingNode.current) {
      const { x, y } = screenToGraph(e.clientX, e.clientY);
      draggingNode.current.x = x;
      draggingNode.current.y = y;
      return;
    }
    if (isPanning.current) {
      setPan(p => ({ x: p.x + e.clientX - lastMouse.current.x, y: p.y + e.clientY - lastMouse.current.y }));
      lastMouse.current = { x: e.clientX, y: e.clientY };
      return;
    }
    const { x, y } = screenToGraph(e.clientX, e.clientY);
    const node = findNodeAt(x, y);
    setHoveredNode(node);
    if (canvasRef.current) canvasRef.current.style.cursor = node ? "pointer" : "grab";
  }, [zoom, pan, filterKind]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const { x, y } = screenToGraph(e.clientX, e.clientY);
    const node = findNodeAt(x, y);
    if (node) {
      draggingNode.current = node;
    } else {
      isPanning.current = true;
      lastMouse.current = { x: e.clientX, y: e.clientY };
    }
  }, [zoom, pan, filterKind]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (draggingNode.current) {
      const { x, y } = screenToGraph(e.clientX, e.clientY);
      const node = findNodeAt(x, y);
      if (node && node.id === draggingNode.current.id) {
        setSelectedNode(prev => prev?.id === node.id ? null : node);
      }
      draggingNode.current = null;
    }
    isPanning.current = false;
  }, [zoom, pan, filterKind]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.3, Math.min(3, z - e.deltaY * 0.001)));
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

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-black text-foreground">🕸️ شبكة المعرفة التفاعلية</h4>
          <span className="text-[10px] text-muted-foreground">
            {stats.types} أنواع · {stats.patterns} أنماط · {stats.exercises} تمارين · {stats.concepts} مفاهيم · {stats.edges} روابط
          </span>
        </div>
        <div className="flex items-center gap-2">
          { (["all", "type", "pattern", "exercise", "concept"] as FilterKind[]).map(k => (
            <button key={k} onClick={() => setFilterKind(k)}
              className="text-[10px] px-2.5 py-1 rounded-full font-bold transition-all"
              style={{
                background: filterKind === k ? "hsl(var(--algebra))" : "hsl(var(--muted))",
                color: filterKind === k ? "#fff" : "hsl(var(--muted-foreground))",
              }}>
              {k === "all" ? "الكل" : KIND_LABELS[k]}
            </button>
          ))}
          <div className="w-px h-4 bg-border" />
          <button onClick={() => setShowLabels(l => !l)}
            className="text-[10px] px-2 py-1 rounded border border-border text-muted-foreground hover:bg-muted transition-all">
            {showLabels ? "إخفاء" : "إظهار"} التسميات
          </button>
          <button onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}
            className="text-[10px] px-2 py-1 rounded border border-border text-muted-foreground hover:bg-muted transition-all">
            إعادة ضبط
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-4 h-4 rounded-full" style={{ background: "hsl(var(--algebra))", boxShadow: "0 0 8px hsl(243 75% 58% / 0.4)" }} />
          نوع (كبير + توهج)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm" style={{ background: "hsl(var(--geometry))" }} />
          نمط
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: "hsl(var(--statistics))" }} />
          تمرين
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full opacity-50" style={{ background: "hsl(var(--probability))" }} />
          مفهوم
        </span>
        <span className="mr-auto text-[9px]">🖱️ اسحب للتحريك · عجلة للتكبير · انقر لعرض التفاصيل</span>
      </div>

      <div className="flex gap-4">
        <div ref={containerRef} className="flex-1 rounded-xl border border-border overflow-hidden relative" style={{ background: "hsl(220 20% 8%)" }}>
          <canvas
            ref={canvasRef}
            className="w-full"
            style={{ height: 550 }}
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={() => { isPanning.current = false; draggingNode.current = null; setHoveredNode(null); }}
            onWheel={handleWheel}
          />

          <AnimatePresence>
            {hoveredNode && !draggingNode.current && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="absolute top-3 left-3 rounded-lg border border-border p-3 pointer-events-none max-w-[220px]"
                style={{ background: "hsl(220 20% 12% / 0.95)", backdropFilter: "blur(8px)" }}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: getColor(hoveredNode.type) }} />
                  <span className="text-[11px] font-bold text-white">{hoveredNode.label}</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 rounded" style={{ background: getColor(hoveredNode.type) + "22", color: getColor(hoveredNode.type) }}>
                  {KIND_LABELS[hoveredNode.kind]}
                  {hoveredNode.type && hoveredNode.kind !== "type" ? ` — ${TYPE_LABELS_AR[hoveredNode.type] || hoveredNode.type}` : ""}
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="absolute bottom-3 left-3 text-[9px] text-white/40 font-mono">
            {Math.round(zoom * 100)}%
          </div>
        </div>

        <AnimatePresence>
          {selectedDetails && (
            <motion.div
              initial={{ opacity: 0, x: -20, width: 0 }}
              animate={{ opacity: 1, x: 0, width: 280 }}
              exit={{ opacity: 0, x: -20, width: 0 }}
              className="rounded-xl border border-border bg-card p-4 overflow-hidden flex-shrink-0"
              style={{ maxHeight: 550, overflowY: "auto" }}>
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
