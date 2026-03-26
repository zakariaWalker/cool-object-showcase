// ===== Concept Map — Phase 26 =====
// D3 force-directed graph of KB concepts and their prerequisites.
// Nodes = concepts (colored by type), edges = prereq relationships.

import { useEffect, useRef, useState } from "react";

interface ConceptNode {
  id: string; label: string; type: string;
  frequency?: number; pattern_count?: number;
}
interface ConceptEdge {
  source: string; target: string; type: "prereq" | "co_occurs";
}
interface ConceptMapData {
  nodes: ConceptNode[]; edges: ConceptEdge[];
}

const TYPE_COLOR: Record<string, string> = {
  arithmetic: "#0F6E56", algebra: "#534AB7", geometry: "#D85A30",
  functions: "#185FA5", statistics: "#854F0B", sequences: "#993556",
  probability: "#A32D2D", other: "#5F5E5A",
};

function classifyNode(id: string): string {
  const a = id.toLowerCase();
  if (["جمع","طرح","ضرب","قسمة","كسر","gcd","lcm","تقريب"].some(k=>a.includes(k))) return "arithmetic";
  if (["مجهول","معادلة","تحليل","توزيع","هوية","جبر","تربيع","أقواس"].some(k=>a.includes(k))) return "algebra";
  if (["مساحة","محيط","حجم","زاوية","مثلث","هندسة","فيثاغورس","طالس"].some(k=>a.includes(k))) return "geometry";
  if (["دالة","مشتقة","تكامل","نهاية","مجال"].some(k=>a.includes(k))) return "functions";
  if (["إحصاء","وسط","وسيط","منوال","تكرار"].some(k=>a.includes(k))) return "statistics";
  if (["متتالية","حسابي","هندسي","مجموع_حدود"].some(k=>a.includes(k))) return "sequences";
  if (["احتمال","فضاء"].some(k=>a.includes(k))) return "probability";
  return "other";
}

// Build graph data from CONCEPT_PREREQS (mirrored client-side)
const PREREQS: Record<string, string[]> = {
  "ضرب":["جمع","طرح"], "قسمة":["ضرب"], "كسر":["قسمة","ضرب"],
  "اختصار":["كسر","gcd"], "توحيد_مقامات":["كسر","lcm"],
  "جمع_كسور":["توحيد_مقامات"],
  "نقل_حدود":["جمع","طرح"], "عزل_مجهول":["نقل_حدود","قسمة"],
  "معادلة_خطية":["عزل_مجهول"],
  "معادلة_تربيعية":["تربيع","تحليل"],
  "تحليل":["عامل_مشترك","هوية_جبرية"],
  "هوية_جبرية":["تربيع","توزيع"], "توزيع":["ضرب","أقواس"],
  "عامل_مشترك":["توزيع"], "تربيع":["ضرب"],
  "مجال_تعريف":["كسر","جذر_تربيعي"],
  "جدول_تغيرات":["مشتقة","دراسة_إشارة"],
  "مشتقة":["تربيع","دالة"], "تكامل":["مشتقة"],
  "مساحة":["ضرب"], "محيط":["جمع"],
  "نظرية_فيثاغورس":["جذر_تربيعي","تربيع"],
  "نسب_مثلثية":["نظرية_فيثاغورس","قسمة"],
  "خاصية_طالس":["نسب_مثلثية"],
  "إحداثيات":["مساحة","جمع"],
  "معادلة_مستقيم":["إحداثيات"],
  "وسط_حسابي":["جمع","قسمة"],
  "وسيط":["ترتيب"],
  "احتمال":["كسر","قسمة"],
  "متتالية_حسابية":["جمع","ضرب"],
  "متتالية_هندسية":["ضرب","قسمة"],
  "مجموع_حدود":["متتالية_حسابية"],
};

function buildGraphData(): ConceptMapData {
  const nodeSet = new Set<string>();
  const edges: ConceptEdge[] = [];
  Object.entries(PREREQS).forEach(([target, sources]) => {
    nodeSet.add(target);
    sources.forEach(src => {
      nodeSet.add(src);
      edges.push({ source: src, target, type: "prereq" });
    });
  });
  const nodes: ConceptNode[] = Array.from(nodeSet).map(id => ({
    id, label: id.replace(/_/g, " "), type: classifyNode(id),
  }));
  return { nodes, edges };
}

export function ConceptMap({ highlightConcepts = [] }: { highlightConcepts?: string[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [data] = useState<ConceptMapData>(buildGraphData);

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const W = svgRef.current.clientWidth || 680;
    const H = 500;

    // Simple force layout (no D3 dependency — manual Fruchterman-Reingold)
    const pos: Record<string, { x: number; y: number; vx: number; vy: number }> = {};

    // Topological depth for initial positioning
    const depth: Record<string, number> = {};
    const getDepth = (id: string, visited = new Set<string>()): number => {
      if (depth[id] !== undefined) return depth[id];
      if (visited.has(id)) return 0;
      visited.add(id);
      const prereqs = PREREQS[id] || [];
      const d = prereqs.length === 0 ? 0 : 1 + Math.max(...prereqs.map(p => getDepth(p, visited)));
      depth[id] = d;
      return d;
    };
    data.nodes.forEach(n => getDepth(n.id));
    const maxDepth = Math.max(...Object.values(depth), 1);

    // Initial positions by depth
    const byDepth: Record<number, string[]> = {};
    data.nodes.forEach(n => {
      const d = depth[n.id] || 0;
      if (!byDepth[d]) byDepth[d] = [];
      byDepth[d].push(n.id);
    });

    data.nodes.forEach(n => {
      const d = depth[n.id] || 0;
      const siblings = byDepth[d] || [n.id];
      const idx = siblings.indexOf(n.id);
      const x = 60 + (W - 120) * (d / maxDepth);
      const y = 40 + (H - 80) * ((idx + 1) / (siblings.length + 1));
      pos[n.id] = { x, y, vx: 0, vy: 0 };
    });

    // Run simulation
    const edgeSet = data.edges.map(e => ({ s: e.source, t: e.target }));
    for (let iter = 0; iter < 80; iter++) {
      // Repulsion
      data.nodes.forEach(a => data.nodes.forEach(b => {
        if (a.id === b.id) return;
        const dx = pos[a.id].x - pos[b.id].x;
        const dy = pos[a.id].y - pos[b.id].y;
        const dist = Math.sqrt(dx*dx + dy*dy) || 1;
        const f = 2000 / (dist * dist);
        pos[a.id].vx += f * dx / dist;
        pos[a.id].vy += f * dy / dist;
      }));
      // Attraction along edges
      edgeSet.forEach(({ s, t }) => {
        if (!pos[s] || !pos[t]) return;
        const dx = pos[t].x - pos[s].x;
        const dy = pos[t].y - pos[s].y;
        const dist = Math.sqrt(dx*dx + dy*dy) || 1;
        const f = (dist - 90) * 0.03;
        pos[s].vx += f * dx / dist;
        pos[s].vy += f * dy / dist;
        pos[t].vx -= f * dx / dist;
        pos[t].vy -= f * dy / dist;
      });
      // Apply + dampen + clamp
      data.nodes.forEach(n => {
        const p = pos[n.id];
        p.x = Math.max(40, Math.min(W - 40, p.x + p.vx * 0.5));
        p.y = Math.max(30, Math.min(H - 30, p.y + p.vy * 0.5));
        p.vx *= 0.6; p.vy *= 0.6;
      });
    }

    // Render SVG
    const svg = svgRef.current;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.innerHTML = "";

    // Defs (arrowhead)
    const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
    defs.innerHTML = `<marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="#9ca3af" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker>`;
    svg.appendChild(defs);

    // Edges
    data.edges.forEach(e => {
      const s = pos[e.source], t = pos[e.target];
      if (!s || !t) return;
      const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
      line.setAttribute("x1", String(s.x)); line.setAttribute("y1", String(s.y));
      line.setAttribute("x2", String(t.x)); line.setAttribute("y2", String(t.y));
      line.setAttribute("stroke", "#d1d5db"); line.setAttribute("stroke-width", "1");
      line.setAttribute("marker-end", "url(#arr)");
      svg.appendChild(line);
    });

    // Nodes
    data.nodes.forEach(n => {
      const p = pos[n.id];
      if (!p) return;
      const isHighlighted = highlightConcepts.includes(n.id);
      const isHovered = hovered === n.id;
      const color = TYPE_COLOR[n.type] || "#888";
      const r = isHighlighted ? 14 : 10;

      const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.style.cursor = "pointer";
      g.addEventListener("mouseenter", () => setHovered(n.id));
      g.addEventListener("mouseleave", () => setHovered(null));

      const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", String(p.x)); circle.setAttribute("cy", String(p.y));
      circle.setAttribute("r", String(r));
      circle.setAttribute("fill", isHighlighted ? "#dc2626" : color);
      circle.setAttribute("stroke", isHovered ? "#fff" : "rgba(255,255,255,0.4)");
      circle.setAttribute("stroke-width", isHovered ? "2.5" : "1.5");
      circle.setAttribute("opacity", isHighlighted || isHovered ? "1" : "0.82");

      const text = document.createElementNS("http://www.w3.org/2000/svg", "text");
      text.setAttribute("x", String(p.x));
      text.setAttribute("y", String(p.y + r + 11));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("font-size", isHighlighted ? "11" : "9");
      text.setAttribute("font-weight", isHighlighted ? "700" : "400");
      text.setAttribute("fill", "var(--color-text-secondary)");
      text.setAttribute("font-family", "'Tajawal',sans-serif");
      text.textContent = n.label.length > 10 ? n.label.slice(0,10)+"…" : n.label;

      g.appendChild(circle); g.appendChild(text);
      svg.appendChild(g);
    });
  }, [data, hovered, highlightConcepts]);

  return (
    <div style={{ fontFamily: "'Tajawal',sans-serif", direction: "rtl" }}>
      <div style={{ marginBottom: 10, display: "flex", flexWrap: "wrap", gap: 6 }}>
        {Object.entries(TYPE_COLOR).map(([type, color]) => (
          <span key={type} style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4, color: "var(--color-text-secondary)" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: color, display: "inline-block" }}/>
            {type}
          </span>
        ))}
        {highlightConcepts.length > 0 && (
          <span style={{ fontSize: 11, display: "flex", alignItems: "center", gap: 4, color: "#dc2626", fontWeight: 600 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#dc2626", display: "inline-block" }}/>
            ثغرات التلميذ
          </span>
        )}
      </div>
      <svg ref={svgRef} width="100%" style={{ height: 500, background: "var(--color-background-secondary)", borderRadius: 12 }}/>
      {hovered && (
        <div style={{ marginTop: 8, fontSize: 12, color: "var(--color-text-secondary)", textAlign: "center" }}>
          📍 {hovered.replace(/_/g," ")} — {
            (PREREQS[hovered] || []).length > 0
              ? `يتطلب: ${(PREREQS[hovered]||[]).map(p=>p.replace(/_/g," ")).join("، ")}`
              : "لا متطلبات"
          }
        </div>
      )}
    </div>
  );
}
