import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { Exercise, Pattern, Deconstruction } from "./useAdminKBStore";

interface Props {
  exercises: Exercise[];
  patterns: Pattern[];
  deconstructions: Deconstruction[];
}

interface GraphNode {
  id: string;
  label: string;
  type: "grade" | "chapter" | "pattern" | "type";
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  count: number;
  fx?: number | null; // fixed position (when dragging)
  fy?: number | null;
}

interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  label?: string;
}

const TYPE_COLORS: Record<string, string> = {
  arithmetic: "#3B82F6", algebra: "#8B5CF6", fractions: "#06B6D4",
  equations: "#10B981", geometry_construction: "#F59E0B", statistics: "#EF4444",
  probability: "#EC4899", functions: "#6366F1", trigonometry: "#14B8A6",
  sequences: "#F97316", calculus: "#A855F7", systems: "#0EA5E9",
  proportionality: "#84CC16", transformations: "#D946EF", solids: "#78716C",
  triangle_circle: "#FBBF24", parallelogram: "#34D399", angles: "#FB923C",
  number_sets: "#2DD4BF", advanced_algebra: "#7C3AED", prove: "#F43F5E",
  bac_prep: "#DC2626",
};

const TYPE_ICONS: Record<string, string> = {
  arithmetic: "➕", algebra: "𝑥", fractions: "½", equations: "=",
  geometry_construction: "📐", statistics: "📊", probability: "🎲",
  functions: "ƒ", trigonometry: "△", sequences: "∑", calculus: "∫",
  systems: "⇌", proportionality: "∝", transformations: "↻",
  solids: "⬡", triangle_circle: "◯", parallelogram: "▱",
  angles: "∠", number_sets: "ℕ", advanced_algebra: "√", prove: "∴",
  bac_prep: "🎓",
};

const TYPE_LABELS_AR: Record<string, string> = {
  arithmetic: "حساب", algebra: "جبر", fractions: "كسور", equations: "معادلات",
  geometry_construction: "إنشاءات هندسية", statistics: "إحصاء", probability: "احتمالات",
  functions: "دوال", trigonometry: "مثلثات", sequences: "متتاليات", calculus: "تحليل",
  systems: "جمل معادلات", proportionality: "تناسبية", transformations: "تحويلات",
  solids: "مجسمات", triangle_circle: "مثلث ودائرة", parallelogram: "متوازي أضلاع",
  angles: "زوايا", number_sets: "مجموعات أعداد", advanced_algebra: "جبر متقدم",
  prove: "برهان", bac_prep: "تحضير BAC", unclassified: "غير مصنف",
  other: "أخرى",
};

const GRADE_COLORS: Record<string, string> = {
  middle_1: "#3B82F6", middle_2: "#06B6D4", middle_3: "#10B981", middle_4: "#F59E0B",
  secondary_1: "#8B5CF6", secondary_2: "#EC4899", secondary_3: "#EF4444",
};

const GRADE_LABELS: Record<string, string> = {
  middle_1: "1AM", middle_2: "2AM", middle_3: "3AM", middle_4: "4AM",
  secondary_1: "1AS", secondary_2: "2AS", secondary_3: "3AS",
};

const GRADE_ICONS: Record<string, string> = {
  middle_1: "①", middle_2: "②", middle_3: "③", middle_4: "④",
  secondary_1: "⑤", secondary_2: "⑥", secondary_3: "⑦",
};

// -- Controls
interface GraphControls {
  repulsion: number;
  attraction: number;
  gravity: number;
  damping: number;
  linkDistance: number;
  showLabels: boolean;
  showEdgeLabels: boolean;
  showCounts: boolean;
  maxPatterns: number;
  fontSize: number;
}

const DEFAULT_CONTROLS: GraphControls = {
  repulsion: 2000,
  attraction: 0.012,
  gravity: 0.002,
  damping: 0.82,
  linkDistance: 160,
  showLabels: true,
  showEdgeLabels: true,
  showCounts: true,
  maxPatterns: 12,
  fontSize: 11,
};

export function AdminViz({ exercises, patterns, deconstructions }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [viewMode, setViewMode] = useState<"network" | "sunburst" | "matrix">("network");
  const [controls, setControls] = useState<GraphControls>(DEFAULT_CONTROLS);
  const [showControls, setShowControls] = useState(false);

  const nodesRef = useRef<GraphNode[]>([]);
  const edgesRef = useRef<GraphEdge[]>([]);
  const animRef = useRef<number>(0);
  const frameRef = useRef(0);
  const stableRef = useRef(false);
  const dragRef = useRef<{ node: GraphNode | null }>({ node: null });
  const hoveredRef = useRef<GraphNode | null>(null);
  const selectedRef = useRef<GraphNode | null>(null);
  const controlsRef = useRef(controls);

  useEffect(() => { controlsRef.current = controls; }, [controls]);
  useEffect(() => { hoveredRef.current = hoveredNode; }, [hoveredNode]);
  useEffect(() => { selectedRef.current = selectedNode; }, [selectedNode]);

  // Build graph data
  const graphData = useMemo(() => {
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const c = controls;

    // Grade nodes
    const gradeMap = new Map<string, number>();
    exercises.forEach(e => gradeMap.set(e.grade, (gradeMap.get(e.grade) || 0) + 1));
    const gradeKeys = [...gradeMap.keys()].sort();
    gradeKeys.forEach((grade, i) => {
      const count = gradeMap.get(grade)!;
      const angle = (i / gradeKeys.length) * Math.PI * 2 - Math.PI / 2;
      nodes.push({
        id: `g_${grade}`, label: GRADE_LABELS[grade] || grade, type: "grade",
        x: 400 + Math.cos(angle) * 250, y: 300 + Math.sin(angle) * 250,
        vx: 0, vy: 0, radius: Math.max(24, Math.min(44, 18 + count / 12)),
        color: GRADE_COLORS[grade] || "#64748B", count,
      });
    });

    // Type nodes
    const typeMap = new Map<string, number>();
    exercises.forEach(e => { if (e.type && e.type !== "unclassified") typeMap.set(e.type, (typeMap.get(e.type) || 0) + 1); });
    const typeKeys = [...typeMap.keys()].sort();
    typeKeys.forEach((type, i) => {
      const count = typeMap.get(type)!;
      const angle = (i / typeKeys.length) * Math.PI * 2;
      nodes.push({
        id: `t_${type}`, label: TYPE_LABELS_AR[type] || type, type: "type",
        x: 400 + Math.cos(angle) * 140, y: 300 + Math.sin(angle) * 140,
        vx: 0, vy: 0, radius: Math.max(16, Math.min(34, 12 + count / 8)),
        color: TYPE_COLORS[type] || "#94A3B8", count,
      });
    });

    // Pattern nodes
    const patternUsage = new Map<string, number>();
    deconstructions.forEach(d => patternUsage.set(d.patternId, (patternUsage.get(d.patternId) || 0) + 1));
    const topPatterns = patterns
      .map(p => ({ ...p, usage: patternUsage.get(p.id) || 0 }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, c.maxPatterns);

    topPatterns.forEach((p, i) => {
      const angle = (i / topPatterns.length) * Math.PI * 2 + Math.PI / 4;
      nodes.push({
        id: `p_${p.id}`, label: p.name.slice(0, 22), type: "pattern",
        x: 400 + Math.cos(angle) * 350, y: 300 + Math.sin(angle) * 350,
        vx: 0, vy: 0, radius: Math.max(12, Math.min(28, p.usage * 2 + 8)),
        color: "#F59E0B", count: p.usage,
      });
    });

    // Edges: grade → type
    const gtCounts = new Map<string, number>();
    exercises.forEach(e => {
      if (!e.type || e.type === "unclassified") return;
      const key = `g_${e.grade}|t_${e.type}`;
      gtCounts.set(key, (gtCounts.get(key) || 0) + 1);
    });
    gtCounts.forEach((weight, key) => {
      const [source, target] = key.split("|");
      edges.push({ source, target, weight, label: `${weight}` });
    });

    // Edges: pattern → type
    const ptCounts = new Map<string, number>();
    deconstructions.forEach(d => {
      const ex = exercises.find(e => e.id === d.exerciseId);
      if (!ex || !ex.type || ex.type === "unclassified") return;
      if (!topPatterns.find(p => p.id === d.patternId)) return;
      const key = `p_${d.patternId}|t_${ex.type}`;
      ptCounts.set(key, (ptCounts.get(key) || 0) + 1);
    });
    ptCounts.forEach((weight, key) => {
      const [source, target] = key.split("|");
      edges.push({ source, target, weight, label: `${weight}` });
    });

    return { nodes, edges };
  }, [exercises, patterns, deconstructions, controls.maxPatterns]);

  // Stable force simulation + render loop
  useEffect(() => {
    if (viewMode !== "network") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    const w = rect.width, h = rect.height;

    // Initialize positions in a structured layout
    nodesRef.current = graphData.nodes.map(n => ({ ...n }));
    edgesRef.current = graphData.edges;
    const nodes = nodesRef.current;
    const edges = edgesRef.current;

    // Build adjacency for fast lookup
    const nodeMap = new Map<string, GraphNode>();
    nodes.forEach(n => nodeMap.set(n.id, n));

    frameRef.current = 0;
    stableRef.current = false;

    function simulate() {
      const c = controlsRef.current;
      frameRef.current++;
      const alpha = Math.max(0.005, 1 - frameRef.current / 400);

      // Repulsion (Barnes-Hut simplified — O(n²) but capped)
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const distSq = dx * dx + dy * dy || 1;
          const dist = Math.sqrt(distSq);
          const force = (c.repulsion * alpha) / distSq;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          if (!nodes[i].fx) { nodes[i].vx -= fx; nodes[i].vy -= fy; }
          if (!nodes[j].fx) { nodes[j].vx += fx; nodes[j].vy += fy; }
        }
      }

      // Attraction along edges
      for (const edge of edges) {
        const a = nodeMap.get(edge.source);
        const b = nodeMap.get(edge.target);
        if (!a || !b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = (dist - c.linkDistance) * c.attraction * alpha;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        if (!a.fx) { a.vx += fx; a.vy += fy; }
        if (!b.fx) { b.vx -= fx; b.vy -= fy; }
      }

      // Center gravity
      for (const n of nodes) {
        if (n.fx != null) { n.x = n.fx; n.y = n.fy!; n.vx = 0; n.vy = 0; continue; }
        n.vx += (w / 2 - n.x) * c.gravity * alpha;
        n.vy += (h / 2 - n.y) * c.gravity * alpha;
        n.vx *= c.damping;
        n.vy *= c.damping;
        n.x += n.vx;
        n.y += n.vy;
        n.x = Math.max(n.radius + 5, Math.min(w - n.radius - 5, n.x));
        n.y = Math.max(n.radius + 5, Math.min(h - n.radius - 5, n.y));
      }

      if (frameRef.current > 500) stableRef.current = true;
    }

    function draw() {
      if (!ctx) return;
      const c = controlsRef.current;
      const hovered = hoveredRef.current;
      const selected = selectedRef.current;

      ctx.clearRect(0, 0, w, h);

      // Background
      const bgGrad = ctx.createLinearGradient(0, 0, w, h);
      bgGrad.addColorStop(0, "#0f1219");
      bgGrad.addColorStop(1, "#151b28");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      // Subtle grid
      ctx.strokeStyle = "rgba(100, 116, 139, 0.06)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 50) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
      for (let y = 0; y < h; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

      // Highlight connected edges for hovered/selected
      const activeId = selected?.id || hovered?.id;
      const connectedIds = new Set<string>();
      if (activeId) {
        edges.forEach(e => {
          if (e.source === activeId || e.target === activeId) {
            connectedIds.add(e.source); connectedIds.add(e.target);
          }
        });
      }

      // Draw edges
      for (const edge of edges) {
        const a = nodeMap.get(edge.source);
        const b = nodeMap.get(edge.target);
        if (!a || !b) continue;

        const isActive = activeId && (edge.source === activeId || edge.target === activeId);
        const isDimmed = activeId && !isActive;

        const opacity = isDimmed ? 0.04 : isActive ? 0.6 : Math.min(0.25, edge.weight * 0.03 + 0.04);
        const lineWidth = isDimmed ? 0.5 : isActive ? Math.min(4, edge.weight * 0.4 + 1) : Math.min(2.5, edge.weight * 0.25 + 0.5);

        // Curved edges
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const cx = mx + dy * 0.1;
        const cy = my - dx * 0.1;

        ctx.strokeStyle = isActive ? a.color + "AA" : `rgba(148, 163, 184, ${opacity})`;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(cx, cy, b.x, b.y);
        ctx.stroke();

        // Arrow
        if (isActive || !isDimmed) {
          const t = 0.75;
          const ax2 = (1-t)*(1-t)*a.x + 2*(1-t)*t*cx + t*t*b.x;
          const ay2 = (1-t)*(1-t)*a.y + 2*(1-t)*t*cy + t*t*b.y;
          const tx2 = (1-t-0.01)*(1-t-0.01)*a.x + 2*(1-t-0.01)*(t+0.01)*cx + (t+0.01)*(t+0.01)*b.x;
          const ty2 = (1-t-0.01)*(1-t-0.01)*a.y + 2*(1-t-0.01)*(t+0.01)*cy + (t+0.01)*(t+0.01)*b.y;
          const angle = Math.atan2(ty2 - ay2, tx2 - ax2);
          const arrowLen = isActive ? 8 : 5;
          ctx.fillStyle = ctx.strokeStyle;
          ctx.beginPath();
          ctx.moveTo(ax2, ay2);
          ctx.lineTo(ax2 - arrowLen * Math.cos(angle - 0.4), ay2 - arrowLen * Math.sin(angle - 0.4));
          ctx.lineTo(ax2 - arrowLen * Math.cos(angle + 0.4), ay2 - arrowLen * Math.sin(angle + 0.4));
          ctx.closePath();
          ctx.fill();
        }

        // Edge label
        if (c.showEdgeLabels && (isActive || edge.weight > 5) && !isDimmed) {
          ctx.font = `bold 8px sans-serif`;
          ctx.fillStyle = isActive ? "#ffffffCC" : "#ffffff44";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(edge.label || "", cx, cy);
        }
      }

      // Draw nodes
      for (const n of nodes) {
        const isHovered = hovered?.id === n.id;
        const isSelected = selected?.id === n.id;
        const isConnected = connectedIds.has(n.id);
        const isDimmed = activeId && !isConnected && n.id !== activeId;
        const scale = isHovered ? 1.2 : isSelected ? 1.15 : 1;
        const r = n.radius * scale;
        const nodeOpacity = isDimmed ? 0.2 : 1;

        ctx.globalAlpha = nodeOpacity;

        // Outer glow
        if ((isHovered || isSelected || isConnected) && !isDimmed) {
          const glow = ctx.createRadialGradient(n.x, n.y, r, n.x, n.y, r * 3);
          glow.addColorStop(0, n.color + "30");
          glow.addColorStop(1, "transparent");
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(n.x, n.y, r * 3, 0, Math.PI * 2);
          ctx.fill();
        }

        // Shadow
        ctx.shadowColor = n.color + "60";
        ctx.shadowBlur = isHovered || isSelected ? 20 : 8;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 2;

        // Node fill - gradient
        const grad = ctx.createRadialGradient(n.x - r * 0.3, n.y - r * 0.3, 0, n.x, n.y, r);
        grad.addColorStop(0, lightenColor(n.color, 30));
        grad.addColorStop(0.7, n.color);
        grad.addColorStop(1, darkenColor(n.color, 20));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        ctx.fill();

        // Reset shadow
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;

        // Ring border
        ctx.strokeStyle = isSelected ? "#ffffff" : isHovered ? "#ffffffAA" : n.color + "60";
        ctx.lineWidth = isSelected ? 3 : isHovered ? 2 : 1.5;
        ctx.stroke();

        // Second ring for grade nodes
        if (n.type === "grade") {
          ctx.strokeStyle = n.color + "40";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(n.x, n.y, r + 4, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Icon inside node
        const icon = n.type === "grade" ? GRADE_ICONS[n.id.replace("g_", "")] || "●"
          : n.type === "pattern" ? "🧩"
          : TYPE_ICONS[n.id.replace("t_", "")] || "●";
        ctx.font = `${Math.max(10, r * 0.6)}px sans-serif`;
        ctx.fillStyle = "#fff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(icon, n.x, n.y);

        // External label
        if (c.showLabels) {
          const labelY = n.y + r + 14;
          const label = n.label.length > 18 ? n.label.slice(0, 18) + "…" : n.label;
          
          // Label background pill
          ctx.font = `bold ${c.fontSize}px sans-serif`;
          const metrics = ctx.measureText(label);
          const pw = metrics.width + 10;
          const ph = c.fontSize + 6;
          
          ctx.fillStyle = "rgba(15, 18, 25, 0.85)";
          roundRect(ctx, n.x - pw / 2, labelY - ph / 2, pw, ph, 4);
          ctx.fill();
          ctx.strokeStyle = n.color + "50";
          ctx.lineWidth = 0.5;
          roundRect(ctx, n.x - pw / 2, labelY - ph / 2, pw, ph, 4);
          ctx.stroke();

          ctx.fillStyle = "#ffffffDD";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(label, n.x, labelY);
        }

        // Count badge
        if (c.showCounts && n.count > 0) {
          const bx = n.x + r * 0.7;
          const by = n.y - r * 0.7;
          const br = Math.max(8, 6 + String(n.count).length * 3);
          ctx.fillStyle = "#1e293b";
          ctx.beginPath();
          ctx.arc(bx, by, br, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = n.color;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.fillStyle = "#fff";
          ctx.font = `bold ${Math.max(7, br * 0.75)}px sans-serif`;
          ctx.fillText(`${n.count}`, bx, by);
        }

        ctx.globalAlpha = 1;
      }

      // Legend
      const legendItems = [
        { color: GRADE_COLORS.middle_1, label: "مستوى دراسي", icon: "①" },
        { color: "#8B5CF6", label: "نوع التمرين", icon: "𝑥" },
        { color: "#F59E0B", label: "نمط الحل", icon: "🧩" },
      ];
      const lx = 16, ly = h - 80;
      ctx.fillStyle = "rgba(15, 18, 25, 0.9)";
      roundRect(ctx, lx, ly, 160, 70, 8);
      ctx.fill();
      ctx.strokeStyle = "rgba(100, 116, 139, 0.2)";
      ctx.lineWidth = 1;
      roundRect(ctx, lx, ly, 160, 70, 8);
      ctx.stroke();

      legendItems.forEach((item, i) => {
        const iy = ly + 14 + i * 20;
        ctx.fillStyle = item.color;
        ctx.beginPath();
        ctx.arc(lx + 16, iy, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#e2e8f0";
        ctx.font = "bold 10px sans-serif";
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText(item.label, lx + 28, iy);
      });

      // Title
      ctx.fillStyle = "#e2e8f0";
      ctx.font = "bold 14px sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      ctx.fillText("شبكة المعرفة", 16, 16);
      ctx.font = "10px sans-serif";
      ctx.fillStyle = "#94a3b8";
      ctx.fillText(`${nodes.length} عقدة · ${edges.length} رابط`, 16, 34);
    }

    function tick() {
      if (!stableRef.current || dragRef.current.node) simulate();
      draw();
      animRef.current = requestAnimationFrame(tick);
    }

    tick();
    return () => cancelAnimationFrame(animRef.current);
  }, [graphData, viewMode]);

  // Restart simulation when controls change
  useEffect(() => {
    if (viewMode !== "network") return;
    frameRef.current = 0;
    stableRef.current = false;
  }, [controls, viewMode]);

  // Mouse interaction
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (dragRef.current.node) {
      dragRef.current.node.fx = mx;
      dragRef.current.node.fy = my;
      dragRef.current.node.x = mx;
      dragRef.current.node.y = my;
      stableRef.current = false;
      frameRef.current = Math.max(frameRef.current, 350);
      return;
    }

    const nodes = nodesRef.current;
    let found: GraphNode | null = null;
    for (const n of nodes) {
      const dx = mx - n.x, dy = my - n.y;
      if (dx * dx + dy * dy < (n.radius + 4) * (n.radius + 4)) {
        found = n; break;
      }
    }
    if (found?.id !== hoveredRef.current?.id) setHoveredNode(found);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const hovered = hoveredRef.current;
    if (hovered) {
      dragRef.current = { node: hovered };
      hovered.fx = hovered.x;
      hovered.fy = hovered.y;
      setSelectedNode(hovered);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (dragRef.current.node) {
      dragRef.current.node.fx = null;
      dragRef.current.node.fy = null;
      dragRef.current = { node: null };
    }
  }, []);

  const handleDblClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Stats
  const vizStats = useMemo(() => {
    const typeGroups: Record<string, number> = {};
    exercises.forEach(e => { typeGroups[e.type] = (typeGroups[e.type] || 0) + 1; });
    const gradeGroups: Record<string, number> = {};
    exercises.forEach(e => { gradeGroups[e.grade] = (gradeGroups[e.grade] || 0) + 1; });
    const patternUsage: Record<string, number> = {};
    deconstructions.forEach(d => { patternUsage[d.patternId] = (patternUsage[d.patternId] || 0) + 1; });
    const topPatterns = patterns
      .map(p => ({ ...p, usage: patternUsage[p.id] || 0 }))
      .sort((a, b) => b.usage - a.usage)
      .slice(0, 10);
    return { typeGroups, gradeGroups, patternUsage, topPatterns };
  }, [exercises, patterns, deconstructions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground">شبكة المعرفة</h3>
        <div className="flex gap-2">
          {viewMode === "network" && (
            <button onClick={() => setShowControls(!showControls)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                showControls ? "bg-accent text-accent-foreground border-accent" : "bg-card text-muted-foreground border-border"
              }`}>
              ⚙️ تحكم
            </button>
          )}
          {[
            { id: "network" as const, label: "🕸️ شبكة" },
            { id: "sunburst" as const, label: "📊 توزيع" },
            { id: "matrix" as const, label: "🔢 مصفوفة" },
          ].map(m => (
            <button key={m.id} onClick={() => setViewMode(m.id)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
                viewMode === m.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border"
              }`}>
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "تمارين", count: exercises.length, color: "hsl(var(--primary))", icon: "📝" },
          { label: "أنماط", count: patterns.length, color: "#F59E0B", icon: "🧩" },
          { label: "تفكيكات", count: deconstructions.length, color: "hsl(var(--secondary))", icon: "🔗" },
          { label: "مستويات", count: Object.keys(vizStats.gradeGroups).length, color: "#10B981", icon: "🎓" },
        ].map((card, i) => (
          <div key={i} className="glass-card rounded-lg p-4 text-center">
            <div className="text-lg mb-1">{card.icon}</div>
            <div className="text-2xl font-black" style={{ color: card.color }}>{card.count}</div>
            <div className="text-[10px] text-muted-foreground font-semibold">{card.label}</div>
          </div>
        ))}
      </div>

      {/* Controls panel */}
      {viewMode === "network" && showControls && (
        <div className="glass-card rounded-xl p-4 border border-border">
          <div className="grid grid-cols-3 gap-4">
            <ControlSlider label="قوة التنافر" value={controls.repulsion} min={500} max={5000} step={100}
              onChange={v => setControls(c => ({ ...c, repulsion: v }))} />
            <ControlSlider label="قوة الجذب" value={controls.attraction} min={0.001} max={0.05} step={0.001}
              onChange={v => setControls(c => ({ ...c, attraction: v }))} />
            <ControlSlider label="الجاذبية المركزية" value={controls.gravity} min={0.0005} max={0.01} step={0.0005}
              onChange={v => setControls(c => ({ ...c, gravity: v }))} />
            <ControlSlider label="التخميد" value={controls.damping} min={0.5} max={0.95} step={0.01}
              onChange={v => setControls(c => ({ ...c, damping: v }))} />
            <ControlSlider label="مسافة الروابط" value={controls.linkDistance} min={60} max={300} step={10}
              onChange={v => setControls(c => ({ ...c, linkDistance: v }))} />
            <ControlSlider label="عدد الأنماط" value={controls.maxPatterns} min={3} max={30} step={1}
              onChange={v => setControls(c => ({ ...c, maxPatterns: v }))} />
            <ControlSlider label="حجم الخط" value={controls.fontSize} min={8} max={16} step={1}
              onChange={v => setControls(c => ({ ...c, fontSize: v }))} />
            <div className="flex items-center gap-4 col-span-2">
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={controls.showLabels} onChange={e => setControls(c => ({ ...c, showLabels: e.target.checked }))}
                  className="rounded border-border" /> أسماء العقد
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={controls.showEdgeLabels} onChange={e => setControls(c => ({ ...c, showEdgeLabels: e.target.checked }))}
                  className="rounded border-border" /> أوزان الروابط
              </label>
              <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                <input type="checkbox" checked={controls.showCounts} onChange={e => setControls(c => ({ ...c, showCounts: e.target.checked }))}
                  className="rounded border-border" /> العدادات
              </label>
              <button onClick={() => setControls(DEFAULT_CONTROLS)}
                className="mr-auto px-3 py-1 rounded bg-destructive/20 text-destructive text-[10px] font-bold hover:bg-destructive/30 transition-colors">
                إعادة تعيين
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Network View */}
      {viewMode === "network" && (
        <div className="glass-card rounded-xl overflow-hidden border border-border">
          <canvas
            ref={canvasRef}
            className="w-full cursor-grab active:cursor-grabbing"
            style={{ height: 520 }}
            onMouseMove={handleMouseMove}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={handleDblClick}
          />
          {selectedNode && (
            <div className="p-4 border-t border-border bg-card/90 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full" style={{ background: selectedNode.color }} />
                <div>
                  <div className="text-sm font-bold text-foreground">{selectedNode.label}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {selectedNode.type === "grade" && `مستوى — ${selectedNode.count} تمرين`}
                    {selectedNode.type === "type" && `نوع — ${selectedNode.count} تمرين`}
                    {selectedNode.type === "pattern" && `نمط — ${selectedNode.count} تفكيك`}
                  </div>
                </div>
                <button onClick={() => setSelectedNode(null)} className="mr-auto text-xs text-muted-foreground hover:text-foreground">✕</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sunburst / Distribution View */}
      {viewMode === "sunburst" && (
        <div className="grid grid-cols-2 gap-4">
          <div className="glass-card rounded-xl p-5">
            <h4 className="text-sm font-bold text-foreground mb-4">توزيع حسب المستوى</h4>
            <div className="space-y-2">
              {Object.entries(vizStats.gradeGroups).sort((a, b) => b[1] - a[1]).map(([grade, count]) => {
                const pct = (count / exercises.length) * 100;
                return (
                  <div key={grade} className="group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-foreground">{GRADE_LABELS[grade] || grade}</span>
                      <span className="text-[10px] text-muted-foreground">{count} ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500 group-hover:opacity-80"
                        style={{ width: `${pct}%`, background: GRADE_COLORS[grade] || "#64748B" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="glass-card rounded-xl p-5">
            <h4 className="text-sm font-bold text-foreground mb-4">توزيع حسب النوع</h4>
            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {Object.entries(vizStats.typeGroups)
                .filter(([t]) => t && t !== "unclassified")
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => {
                  const pct = (count / exercises.length) * 100;
                  return (
                    <div key={type} className="group">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-foreground">{type}</span>
                        <span className="text-[10px] text-muted-foreground">{count}</span>
                      </div>
                      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: TYPE_COLORS[type] || "#94A3B8" }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
          <div className="glass-card rounded-xl p-5 col-span-2">
            <h4 className="text-sm font-bold text-foreground mb-4">🏆 أكثر الأنماط استخداماً</h4>
            <div className="grid grid-cols-2 gap-3">
              {vizStats.topPatterns.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black text-primary-foreground"
                    style={{ background: i < 3 ? "#F59E0B" : "hsl(var(--primary))" }}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-foreground truncate">{p.name}</div>
                    <div className="text-[10px] text-muted-foreground">{p.usage} تفكيك • {p.type}</div>
                  </div>
                  <div className="text-lg font-black" style={{ color: i < 3 ? "#F59E0B" : "hsl(var(--primary))" }}>
                    {p.usage}
                  </div>
                </div>
              ))}
              {vizStats.topPatterns.length === 0 && (
                <div className="col-span-2 text-center py-8 text-muted-foreground text-sm">لا توجد تفكيكات بعد</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Matrix View */}
      {viewMode === "matrix" && (
        <div className="glass-card rounded-xl p-5 overflow-x-auto border border-border">
          <h4 className="text-sm font-bold text-foreground mb-4">مصفوفة المستوى × النوع</h4>
          <MatrixView exercises={exercises} />
        </div>
      )}
    </div>
  );
}

// -- Helper Components --

function ControlSlider({ label, value, min, max, step, onChange }: {
  label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-[10px] text-muted-foreground font-semibold">{label}</span>
        <span className="text-[10px] text-foreground font-mono">{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary" />
    </div>
  );
}

function MatrixView({ exercises }: { exercises: { grade: string; type: string }[] }) {
  const grades = [...new Set(exercises.map(e => e.grade))].sort();
  const types = [...new Set(exercises.map(e => e.type).filter(t => t && t !== "unclassified"))].sort();

  const matrix: Record<string, Record<string, number>> = {};
  grades.forEach(g => { matrix[g] = {}; types.forEach(t => { matrix[g][t] = 0; }); });
  exercises.forEach(e => {
    if (e.type && e.type !== "unclassified" && matrix[e.grade]) {
      matrix[e.grade][e.type] = (matrix[e.grade][e.type] || 0) + 1;
    }
  });
  const maxVal = Math.max(...Object.values(matrix).flatMap(r => Object.values(r)), 1);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[10px]">
        <thead>
          <tr>
            <th className="p-2 text-right text-muted-foreground font-bold sticky right-0 bg-card z-10">المستوى</th>
            {types.map(t => (
              <th key={t} className="p-2 text-center text-muted-foreground font-medium"
                style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", height: 80 }}>
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grades.map(g => (
            <tr key={g}>
              <td className="p-2 font-bold text-foreground sticky right-0 bg-card z-10 whitespace-nowrap">
                {GRADE_LABELS[g] || g}
              </td>
              {types.map(t => {
                const val = matrix[g]?.[t] || 0;
                const intensity = val / maxVal;
                return (
                  <td key={t} className="p-1 text-center">
                    <div className="w-8 h-8 rounded-md flex items-center justify-center mx-auto text-[9px] font-bold transition-all hover:scale-110"
                      style={{
                        background: val > 0 ? `rgba(59, 130, 246, ${intensity * 0.8 + 0.1})` : "rgba(148, 163, 184, 0.08)",
                        color: intensity > 0.4 ? "#fff" : "#94A3B8",
                      }}>
                      {val || ""}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// -- Utility functions --

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function lightenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.min(255, (num >> 16) + amount);
  const g = Math.min(255, ((num >> 8) & 0x00FF) + amount);
  const b = Math.min(255, (num & 0x0000FF) + amount);
  return `rgb(${r},${g},${b})`;
}

function darkenColor(hex: string, amount: number): string {
  const num = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, (num >> 16) - amount);
  const g = Math.max(0, ((num >> 8) & 0x00FF) - amount);
  const b = Math.max(0, (num & 0x0000FF) - amount);
  return `rgb(${r},${g},${b})`;
}
