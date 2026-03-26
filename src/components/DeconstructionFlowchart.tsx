// ===== Deconstruction Flowchart — Beautiful SVG Visualization =====
// Renders exercise deconstruction steps as a connected flowchart

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import katex from "katex";
import "katex/dist/katex.min.css";

interface FlowchartProps {
  patternName: string;
  patternType: string;
  patternDescription?: string;
  steps: string[];
  needs: string[];
  concepts: string[];
  notes?: string;
  aiGenerated?: boolean;
  exerciseSteps?: string[]; // corresponding exercise step text for each deconstruction step
}

// Colors for different node types
const NODE_COLORS = {
  start: { fill: "#4F46E5", text: "#fff", border: "#3730A3", glow: "rgba(79,70,229,0.3)" },
  step: { fill: "#F0F9FF", text: "#0C4A6E", border: "#7DD3FC", glow: "rgba(56,189,248,0.15)" },
  end: { fill: "#059669", text: "#fff", border: "#047857", glow: "rgba(5,150,105,0.3)" },
  need: { fill: "#FEF3C7", text: "#92400E", border: "#FCD34D", glow: "rgba(252,211,77,0.2)" },
  concept: { fill: "#F3E8FF", text: "#6B21A8", border: "#C084FC", glow: "rgba(192,132,252,0.2)" },
};

const NODE_WIDTH = 260;
const NODE_HEIGHT = 52;
const NODE_GAP = 28;
const SIDE_NODE_WIDTH = 140;
const SIDE_NODE_HEIGHT = 32;
const CONNECTOR_RADIUS = 10;
const PADDING_X = 60;
const PADDING_TOP = 30;

export function DeconstructionFlowchart({
  patternName, patternType, patternDescription,
  steps, needs, concepts, notes, aiGenerated, exerciseSteps,
}: FlowchartProps) {
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);

  if (steps.length === 0) return null;

  const totalSteps = steps.length;
  const mainChainHeight = PADDING_TOP + NODE_HEIGHT + (totalSteps * (NODE_HEIGHT + NODE_GAP)) + NODE_HEIGHT + 40;
  const sideNodesMaxCount = Math.max(needs.length, concepts.length);
  const sideAreaHeight = sideNodesMaxCount * (SIDE_NODE_HEIGHT + 8);
  const svgHeight = Math.max(mainChainHeight, sideAreaHeight + 120) + 60;
  const hasExSteps = exerciseSteps && exerciseSteps.length > 0;
  const EX_STEP_WIDTH = 180;
  const svgWidth = NODE_WIDTH + PADDING_X * 2 + (needs.length > 0 ? SIDE_NODE_WIDTH + 60 : 0) + (concepts.length > 0 ? SIDE_NODE_WIDTH + 60 : 0) + (hasExSteps ? EX_STEP_WIDTH + 50 : 0);
  const centerX = (needs.length > 0 ? SIDE_NODE_WIDTH + 60 : 0) + PADDING_X + NODE_WIDTH / 2;

  // Y positions for main chain
  const startY = PADDING_TOP;
  const stepYs = steps.map((_, i) => startY + NODE_HEIGHT + NODE_GAP + i * (NODE_HEIGHT + NODE_GAP));
  const endY = stepYs.length > 0 ? stepYs[stepYs.length - 1] + NODE_HEIGHT + NODE_GAP : startY + NODE_HEIGHT + NODE_GAP;

  // Wrap text helper
  const wrapText = (text: string, maxChars: number): string[] => {
    if (text.length <= maxChars) return [text];
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
      if ((current + " " + word).trim().length > maxChars && current) {
        lines.push(current.trim());
        current = word;
      } else {
        current = current ? current + " " + word : word;
      }
    }
    if (current.trim()) lines.push(current.trim());
    return lines.slice(0, 2); // max 2 lines
  };

  return (
    <div dir="rtl" style={{ 
      borderTop: "1px solid hsl(var(--border))",
      background: "linear-gradient(180deg, hsl(var(--card)), hsl(var(--background)))",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px 12px",
        display: "flex", alignItems: "center", gap: 10,
        borderBottom: "1px solid hsl(var(--border) / 0.5)",
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: 18,
        }}>
          🧩
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 14, fontWeight: 800,
            color: "hsl(var(--foreground))",
            fontFamily: "'Tajawal', sans-serif",
          }}>
            {patternName}
          </div>
          <div style={{ fontSize: 10, color: "hsl(var(--muted-foreground))" }}>
            {patternType}
            {aiGenerated && " • 🤖 تفكيك آلي"}
          </div>
        </div>
        {patternDescription && (
          <div style={{
            maxWidth: 300, fontSize: 10,
            color: "hsl(var(--muted-foreground))",
            lineHeight: 1.6, textAlign: "right",
          }}>
            {patternDescription}
          </div>
        )}
      </div>

      {/* SVG Flowchart */}
      <div style={{ overflowX: "auto", padding: "8px 12px 16px" }}>
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ display: "block", margin: "0 auto", direction: "ltr" }}
        >
          <defs>
            {/* Gradient for connectors */}
            <linearGradient id="connGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#059669" stopOpacity="0.6" />
            </linearGradient>
            {/* Drop shadow filter */}
            <filter id="nodeShadow" x="-10%" y="-10%" width="120%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="rgba(0,0,0,0.08)" />
            </filter>
            <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Arrow marker */}
            <marker id="arrowHead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
              <polygon points="0 0, 8 3, 0 6" fill="#94A3B8" />
            </marker>
          </defs>

          {/* ── Connection lines ── */}
          {/* Start → first step */}
          <line
            x1={centerX} y1={startY + NODE_HEIGHT}
            x2={centerX} y2={stepYs[0]}
            stroke="#94A3B8" strokeWidth="2" strokeDasharray="6 3"
            markerEnd="url(#arrowHead)"
          />
          {/* Between steps */}
          {stepYs.map((y, i) => i < stepYs.length - 1 ? (
            <line key={`conn-${i}`}
              x1={centerX} y1={y + NODE_HEIGHT}
              x2={centerX} y2={stepYs[i + 1]}
              stroke="#94A3B8" strokeWidth="2" strokeDasharray="6 3"
              markerEnd="url(#arrowHead)"
            />
          ) : null)}
          {/* Last step → end */}
          <line
            x1={centerX} y1={stepYs[stepYs.length - 1] + NODE_HEIGHT}
            x2={centerX} y2={endY}
            stroke="#94A3B8" strokeWidth="2" strokeDasharray="6 3"
            markerEnd="url(#arrowHead)"
          />

          {/* ── Needs (left side) ── */}
          {needs.length > 0 && needs.map((need, i) => {
            const ny = PADDING_TOP + 40 + i * (SIDE_NODE_HEIGHT + 10);
            const nx = centerX - NODE_WIDTH / 2 - 40 - SIDE_NODE_WIDTH;
            // Connection to main chain
            return (
              <g key={`need-${i}`}>
                <line
                  x1={nx + SIDE_NODE_WIDTH} y1={ny + SIDE_NODE_HEIGHT / 2}
                  x2={centerX - NODE_WIDTH / 2} y2={Math.min(stepYs[0] + NODE_HEIGHT / 2, ny + SIDE_NODE_HEIGHT / 2)}
                  stroke={NODE_COLORS.need.border} strokeWidth="1.5" strokeDasharray="4 2" opacity="0.5"
                />
                <rect
                  x={nx} y={ny}
                  width={SIDE_NODE_WIDTH} height={SIDE_NODE_HEIGHT}
                  rx={8} ry={8}
                  fill={NODE_COLORS.need.fill}
                  stroke={NODE_COLORS.need.border}
                  strokeWidth="1.5"
                  filter="url(#nodeShadow)"
                />
                <text
                  x={nx + SIDE_NODE_WIDTH / 2} y={ny + SIDE_NODE_HEIGHT / 2 + 1}
                  textAnchor="middle" dominantBaseline="central"
                  fill={NODE_COLORS.need.text}
                  fontSize="10" fontWeight="700"
                  fontFamily="'Tajawal', sans-serif"
                >
                  ⚡ {need.length > 18 ? need.slice(0, 16) + "…" : need}
                </text>
              </g>
            );
          })}

          {/* ── Concepts (right side) ── */}
          {concepts.length > 0 && concepts.map((concept, i) => {
            const cy = PADDING_TOP + 40 + i * (SIDE_NODE_HEIGHT + 10);
            const cx = centerX + NODE_WIDTH / 2 + 40;
            return (
              <g key={`concept-${i}`}>
                <line
                  x1={centerX + NODE_WIDTH / 2} y1={Math.min(stepYs[0] + NODE_HEIGHT / 2, cy + SIDE_NODE_HEIGHT / 2)}
                  x2={cx} y2={cy + SIDE_NODE_HEIGHT / 2}
                  stroke={NODE_COLORS.concept.border} strokeWidth="1.5" strokeDasharray="4 2" opacity="0.5"
                />
                <rect
                  x={cx} y={cy}
                  width={SIDE_NODE_WIDTH} height={SIDE_NODE_HEIGHT}
                  rx={8} ry={8}
                  fill={NODE_COLORS.concept.fill}
                  stroke={NODE_COLORS.concept.border}
                  strokeWidth="1.5"
                  filter="url(#nodeShadow)"
                />
                <text
                  x={cx + SIDE_NODE_WIDTH / 2} y={cy + SIDE_NODE_HEIGHT / 2 + 1}
                  textAnchor="middle" dominantBaseline="central"
                  fill={NODE_COLORS.concept.text}
                  fontSize="10" fontWeight="700"
                  fontFamily="'Tajawal', sans-serif"
                >
                  🧠 {concept.length > 18 ? concept.slice(0, 16) + "…" : concept}
                </text>
              </g>
            );
          })}

          {/* ── START node (pattern name) ── */}
          <g>
            <rect
              x={centerX - NODE_WIDTH / 2} y={startY}
              width={NODE_WIDTH} height={NODE_HEIGHT}
              rx={CONNECTOR_RADIUS + 2} ry={CONNECTOR_RADIUS + 2}
              fill={NODE_COLORS.start.fill}
              stroke={NODE_COLORS.start.border}
              strokeWidth="2"
              filter="url(#nodeShadow)"
            />
            <text
              x={centerX} y={startY + NODE_HEIGHT / 2 + 1}
              textAnchor="middle" dominantBaseline="central"
              fill={NODE_COLORS.start.text}
              fontSize="13" fontWeight="800"
              fontFamily="'Tajawal', sans-serif"
            >
              📌 {patternName.length > 28 ? patternName.slice(0, 26) + "…" : patternName}
            </text>
          </g>

          {/* ── STEP nodes ── */}
          {steps.map((step, i) => {
            const y = stepYs[i];
            const isHovered = hoveredNode === i;
            const lines = wrapText(step, 34);
            const nodeH = lines.length > 1 ? NODE_HEIGHT + 14 : NODE_HEIGHT;
            return (
              <g key={`step-${i}`}
                onMouseEnter={() => setHoveredNode(i)}
                onMouseLeave={() => setHoveredNode(null)}
                style={{ cursor: "default" }}
              >
                {/* Glow on hover */}
                {isHovered && (
                  <rect
                    x={centerX - NODE_WIDTH / 2 - 4} y={y - 4}
                    width={NODE_WIDTH + 8} height={nodeH + 8}
                    rx={14} ry={14}
                    fill="none" stroke={NODE_COLORS.step.border}
                    strokeWidth="2" opacity="0.4"
                    filter="url(#glowFilter)"
                  />
                )}
                <rect
                  x={centerX - NODE_WIDTH / 2} y={y}
                  width={NODE_WIDTH} height={nodeH}
                  rx={12} ry={12}
                  fill={isHovered ? "#E0F2FE" : NODE_COLORS.step.fill}
                  stroke={NODE_COLORS.step.border}
                  strokeWidth={isHovered ? "2" : "1.5"}
                  filter="url(#nodeShadow)"
                />
                {/* Step number circle */}
                <circle
                  cx={centerX - NODE_WIDTH / 2 + 22}
                  cy={y + nodeH / 2}
                  r={12}
                  fill={NODE_COLORS.start.fill}
                />
                <text
                  x={centerX - NODE_WIDTH / 2 + 22}
                  y={y + nodeH / 2 + 1}
                  textAnchor="middle" dominantBaseline="central"
                  fill="#fff" fontSize="10" fontWeight="800"
                >
                  {i + 1}
                </text>
                {/* Step text */}
                {lines.map((line, li) => (
                  <text key={li}
                    x={centerX - NODE_WIDTH / 2 + 42}
                    y={y + (lines.length > 1 ? 18 + li * 16 : nodeH / 2 + 1)}
                    textAnchor="start" dominantBaseline={lines.length > 1 ? "auto" : "central"}
                    fill={NODE_COLORS.step.text}
                    fontSize="11" fontWeight="600"
                    fontFamily="'Tajawal', sans-serif"
                  >
                    {line}
                  </text>
                ))}
              </g>
            );
          })}

          {/* ── Exercise step annotations (left of main steps) ── */}
          {hasExSteps && steps.map((_, i) => {
            const y = stepYs[i];
            const exText = exerciseSteps![i] || "";
            if (!exText) return null;
            const exX = centerX - NODE_WIDTH / 2 - 30 - EX_STEP_WIDTH - (needs.length > 0 ? SIDE_NODE_WIDTH + 60 : 0);
            const exLines = wrapText(exText, 28);
            const exH = Math.max(38, exLines.length * 16 + 12);
            return (
              <g key={`ex-step-${i}`}>
                <line
                  x1={exX + EX_STEP_WIDTH} y1={y + NODE_HEIGHT / 2}
                  x2={centerX - NODE_WIDTH / 2} y2={y + NODE_HEIGHT / 2}
                  stroke="#10B981" strokeWidth="1.5" strokeDasharray="4 2" opacity="0.5"
                />
                <rect
                  x={exX} y={y + (NODE_HEIGHT - exH) / 2}
                  width={EX_STEP_WIDTH} height={exH}
                  rx={8} ry={8}
                  fill="#ECFDF5"
                  stroke="#6EE7B7"
                  strokeWidth="1.5"
                  filter="url(#nodeShadow)"
                />
                {exLines.map((line, li) => (
                  <text key={li}
                    x={exX + EX_STEP_WIDTH / 2}
                    y={y + (NODE_HEIGHT - exH) / 2 + 14 + li * 16}
                    textAnchor="middle" dominantBaseline="auto"
                    fill="#065F46"
                    fontSize="10" fontWeight="600"
                    fontFamily="'Tajawal', sans-serif"
                  >
                    {li === 0 ? `📖 ${line}` : line}
                  </text>
                ))}
              </g>
            );
          })}

          <g>
            <rect
              x={centerX - NODE_WIDTH / 2} y={endY}
              width={NODE_WIDTH} height={NODE_HEIGHT}
              rx={CONNECTOR_RADIUS + 2} ry={CONNECTOR_RADIUS + 2}
              fill={NODE_COLORS.end.fill}
              stroke={NODE_COLORS.end.border}
              strokeWidth="2"
              filter="url(#nodeShadow)"
            />
            <text
              x={centerX} y={endY + NODE_HEIGHT / 2 + 1}
              textAnchor="middle" dominantBaseline="central"
              fill={NODE_COLORS.end.text}
              fontSize="13" fontWeight="800"
              fontFamily="'Tajawal', sans-serif"
            >
              ✅ النتيجة النهائية
            </text>
          </g>

          {/* ── Notes at bottom ── */}
          {notes && (
            <g>
              <rect
                x={centerX - NODE_WIDTH / 2 - 10} y={endY + NODE_HEIGHT + 16}
                width={NODE_WIDTH + 20} height={30}
                rx={6} ry={6}
                fill="hsl(var(--muted) / 0.3)"
                stroke="hsl(var(--border))"
                strokeWidth="1"
              />
              <text
                x={centerX} y={endY + NODE_HEIGHT + 32}
                textAnchor="middle" dominantBaseline="central"
                fill="hsl(var(--muted-foreground))"
                fontSize="10" fontWeight="600"
                fontFamily="'Tajawal', sans-serif"
              >
                💬 {notes.length > 50 ? notes.slice(0, 48) + "…" : notes}
              </text>
            </g>
          )}

          {/* ── Legend ── */}
          <g transform={`translate(${svgWidth - 160}, ${svgHeight - 80})`}>
            <rect x={0} y={0} width={150} height={70} rx={8} fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="1" opacity="0.9" />
            <circle cx={14} cy={14} r={5} fill={NODE_COLORS.start.fill} />
            <text x={26} y={17} fontSize="9" fill="hsl(var(--muted-foreground))" fontFamily="'Tajawal', sans-serif">النمط</text>
            <circle cx={14} cy={30} r={5} fill={NODE_COLORS.step.border} />
            <text x={26} y={33} fontSize="9" fill="hsl(var(--muted-foreground))" fontFamily="'Tajawal', sans-serif">خطوة حل</text>
            <circle cx={14} cy={46} r={5} fill={NODE_COLORS.need.border} />
            <text x={26} y={49} fontSize="9" fill="hsl(var(--muted-foreground))" fontFamily="'Tajawal', sans-serif">متطلب مسبق</text>
            <circle cx={14} cy={62} r={5} fill={NODE_COLORS.concept.border} />
            <text x={26} y={65} fontSize="9" fill="hsl(var(--muted-foreground))" fontFamily="'Tajawal', sans-serif">مفهوم مرتبط</text>
          </g>
        </svg>
      </div>
    </div>
  );
}
