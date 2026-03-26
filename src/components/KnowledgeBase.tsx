// ===== Knowledge Base Visualization =====
// Shows evolving patterns, entities, relations, and schemas

import { useState, useMemo, useEffect, useRef } from "react";
import { KnowledgeBase as KBType } from "@/engine/knowledge/types";
import { exportKB, importKB, resetKB } from "@/engine/knowledge/store";
import { analyzeMultiple } from "@/engine/knowledge/analyzer";
import { parseExercise } from "@/engine/exercise-parser";
import { ImadrassaDataset } from "@/engine/dataset-types";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Brain, Zap } from "lucide-react";

interface KnowledgeBaseProps {
  kb: KBType;
  onKBChange: (kb: KBType) => void;
  highlightGapId?: string | null;
}

type Tab = "overview" | "patterns" | "entities" | "relations" | "schemas" | "gaps";

export function KnowledgeBaseView({ kb, onKBChange, highlightGapId }: KnowledgeBaseProps) {
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    if (highlightGapId) {
      setTab("gaps");
    }
  }, [highlightGapId]);

  const handleExport = () => {
    const json = exportKB(kb);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `qed-kb-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const [importStatus, setImportStatus] = useState<string | null>(null);

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.txt,.csv,.md";
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;

      let totalParsed = 0;
      let processed = 0;

      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const content = ev.target?.result as string;
          const exercises = parseFileContent(content, file.name);
          totalParsed += exercises.length;
          processed++;

          if (exercises.length > 0) {
            const parsed = exercises.map(text => parseExercise(text));
            const currentKB = kb;
            const updated = analyzeMultiple(currentKB, parsed);
            onKBChange(updated);
          }

          if (processed === files.length) {
            setImportStatus(`✓ تم استيراد ${totalParsed} تمرين من ${files.length} ملف`);
            setTimeout(() => setImportStatus(null), 4000);
          }
        };
        reader.readAsText(file);
      });
    };
    input.click();
  };

  // Parse any file format into exercise text strings
  function parseFileContent(content: string, filename: string): string[] {
    const ext = filename.split(".").pop()?.toLowerCase();

    // Try JSON first
    if (ext === "json") {
      try {
        const data = JSON.parse(content);

        // Imadrassa dataset format
        if (data.chapters && Array.isArray(data.chapters)) {
          const dataset = data as ImadrassaDataset;
          return dataset.chapters.flatMap(ch =>
            ch.exercises.map(ex => {
              const lines = [ex.statement, "", ...ex.questions.map((q, i) => `${i + 1}. ${q.replace(/\$/g, "")}`)];
              return lines.join("\n");
            })
          );
        }

        // Array of exercises with statement/questions
        if (Array.isArray(data)) {
          return data.map(item => {
            if (typeof item === "string") return item;
            if (item.statement) {
              const qs = item.questions?.map((q: string, i: number) => `${i + 1}. ${q.replace(/\$/g, "")}`) || [];
              return [item.statement, "", ...qs].join("\n");
            }
            if (item.text) return item.text;
            return JSON.stringify(item);
          }).filter((t: string) => t.length > 5);
        }

        // KB format (re-import)
        if (data.patterns && data.entities && data.schemas) {
          const imported = importKB(content);
          onKBChange(imported);
          return []; // handled directly
        }

        // Single exercise object
        if (data.statement) {
          const qs = data.questions?.map((q: string, i: number) => `${i + 1}. ${q.replace(/\$/g, "")}`) || [];
          return [[data.statement, "", ...qs].join("\n")];
        }

        return [];
      } catch {
        // Not valid JSON, treat as plain text
      }
    }

    // CSV: each row is an exercise
    if (ext === "csv") {
      const lines = content.split("\n").filter(l => l.trim().length > 5);
      // Skip header if it looks like one
      const start = /^(id|title|statement|question)/i.test(lines[0] || "") ? 1 : 0;
      return lines.slice(start).map(line => {
        // Try to extract the longest cell as the exercise text
        const cells = line.split(/[,;\t]/).map(c => c.replace(/^"|"$/g, "").trim());
        return cells.sort((a, b) => b.length - a.length)[0] || line;
      }).filter(t => t.length > 5);
    }

    // Plain text / markdown: split by double newline or numbered exercises
    const blocks = content.split(/\n{2,}|\r\n{2,}/).filter(b => b.trim().length > 5);
    if (blocks.length > 1) return blocks;

    // Single block - try splitting by exercise markers
    const byMarkers = content.split(/(?=(?:التمرين|تمرين|exercice|exercise)\s*\d)/i).filter(b => b.trim().length > 5);
    if (byMarkers.length > 1) return byMarkers;

    // Just return as single exercise
    return content.trim().length > 5 ? [content.trim()] : [];
  }

  const handleReset = () => {
    if (confirm("هل تريد مسح قاعدة المعرفة بالكامل؟")) {
      onKBChange(resetKB());
    }
  };

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: "overview", label: "نظرة عامة", count: kb.stats.totalExercisesAnalyzed },
    { key: "patterns", label: "أنماط", count: kb.patterns.length },
    { key: "entities", label: "كيانات", count: kb.entities.length },
    { key: "relations", label: "علاقات", count: kb.relations.length },
    { key: "schemas", label: "مخططات", count: kb.schemas.length },
    { key: "gaps", label: "فجوات", count: kb.learningGaps?.length || 0 },
  ];

  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* Header */}
      <div className="p-4 border-b border-border bg-card/50">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[13px] font-semibold text-foreground">🧠 قاعدة المعرفة</h2>
          <div className="flex gap-1">
            <button onClick={handleExport} className="px-2 py-1 text-[10px] border border-border rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              تصدير
            </button>
            <button onClick={handleImport} className="px-2 py-1 text-[10px] border border-border rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors">
              استيراد 📄
            </button>
            <button onClick={handleReset} className="px-2 py-1 text-[10px] border border-destructive/30 rounded-sm text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition-colors">
              مسح
            </button>
          </div>
          {importStatus && (
            <div className="mt-2 text-[10px] text-accent bg-accent/10 border border-accent/20 rounded-sm px-2 py-1">
              {importStatus}
            </div>
          )}
        </div>
        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 text-[11px] rounded-sm whitespace-nowrap transition-colors ${
                tab === t.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              {t.label}
              <span className="mr-1 opacity-60">({t.count})</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {tab === "overview" && <OverviewTab key="overview" kb={kb} />}
          {tab === "patterns" && <PatternsTab key="patterns" kb={kb} />}
          {tab === "entities" && <EntitiesTab key="entities" kb={kb} />}
          {tab === "relations" && <RelationsTab key="relations" kb={kb} />}
          {tab === "schemas" && <SchemasTab key="schemas" kb={kb} />}
          {tab === "gaps" && <GapsTab key="gaps" kb={kb} highlightId={highlightGapId} />}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ===== Overview Tab =====

function OverviewTab({ kb }: { kb: KBType }) {
  const confidence = kb.schemas.length > 0
    ? (kb.schemas.reduce((s, sc) => s + sc.confidence, 0) / kb.schemas.length * 100).toFixed(0)
    : "0";

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      
      {/* Neural Topology Map */}
      <div className="space-y-2">
        <div className="text-[11px] text-muted-foreground uppercase tracking-widest">خريطة التغطية المعرفية</div>
        <NeuralMap kb={kb} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="تمارين محللة" value={kb.stats.totalExercisesAnalyzed} color="primary" />
        <StatCard label="أنماط مكتشفة" value={kb.patterns.length} color="primary" />
        <StatCard label="كيانات" value={kb.entities.length} color="accent" />
        <StatCard label="مخططات تفكيك" value={kb.schemas.length} color="geometry" />
      </div>

      {/* Confidence meter */}
      <div className="border border-border rounded-sm p-3">
        <div className="flex justify-between text-[11px] mb-2">
          <span className="text-muted-foreground">ثقة المخطط</span>
          <span className="text-primary font-mono">{confidence}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${confidence}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <div className="text-[10px] text-muted-foreground mt-1">
          يزداد مع كل تمرين جديد يتم تحليله
        </div>
      </div>

      {/* Domain distribution */}
      {Object.keys(kb.stats.domainDistribution).length > 0 && (
        <div className="border border-border rounded-sm p-3">
          <div className="text-[11px] text-muted-foreground mb-2">توزيع المجالات</div>
          <div className="space-y-2">
            {Object.entries(kb.stats.domainDistribution).map(([domain, count]) => {
              const total = Object.values(kb.stats.domainDistribution).reduce((a, b) => a + b, 0);
              const pct = total > 0 ? (count / total * 100).toFixed(0) : "0";
              return (
                <div key={domain} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    domain === "algebra" ? "bg-primary" :
                    domain === "geometry" ? "bg-geometry" : "bg-accent"
                  }`} />
                  <span className="text-[11px] text-foreground flex-1">{domain}</span>
                  <span className="text-[11px] text-muted-foreground font-mono">{count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {kb.stats.totalExercisesAnalyzed === 0 && (
        <div className="text-center p-8 border border-dashed border-border rounded-sm">
          <div className="text-[32px] mb-2">🧠</div>
          <div className="text-[13px] text-muted-foreground">
            قاعدة المعرفة فارغة
          </div>
          <div className="text-[11px] text-muted-foreground mt-1">
            حلّ تمارين أو ارفع ملف JSON لبدء التعلم
          </div>
        </div>
      )}
    </motion.div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="border border-border rounded-sm p-3">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`text-[24px] font-mono font-bold text-${color}`}>{value}</div>
    </div>
  );
}

// ===== Patterns Tab =====

function PatternsTab({ kb }: { kb: KBType }) {
  const sorted = useMemo(() =>
    [...kb.patterns].sort((a, b) => b.frequency - a.frequency),
    [kb.patterns]
  );

  if (sorted.length === 0) return <EmptyState text="لم يتم اكتشاف أنماط بعد" />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
      {sorted.map(p => (
        <div key={p.id} className="border border-border rounded-sm p-3 hover:bg-muted/20 transition-colors">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary border border-primary/20 font-mono">
              {p.type}
            </span>
            <span className="text-[11px] font-mono text-foreground">{p.signature}</span>
            <span className="mr-auto text-[10px] text-muted-foreground font-mono">×{p.frequency}</span>
            <ConfidenceBadge value={p.confidence} />
          </div>
          <div className="text-[11px] text-muted-foreground mb-2">{p.description}</div>
          {p.examples.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {p.examples.slice(0, 3).map((ex, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 bg-muted/50 text-foreground/70 rounded-sm font-mono border border-border">
                  {ex.slice(0, 30)}
                </span>
              ))}
            </div>
          )}
          {p.decomposition.length > 0 && (
            <div className="mt-2 flex items-center gap-1 text-[10px]">
              <span className="text-muted-foreground">تفكيك:</span>
              {p.decomposition.map((d, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <span className="text-muted-foreground">→</span>}
                  <span className="text-primary/80">{d}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </motion.div>
  );
}

// ===== Entities Tab =====

function EntitiesTab({ kb }: { kb: KBType }) {
  const grouped = useMemo(() => {
    const groups: Record<string, typeof kb.entities> = {};
    for (const e of kb.entities) {
      if (!groups[e.type]) groups[e.type] = [];
      groups[e.type].push(e);
    }
    // Sort each group by frequency
    for (const key of Object.keys(groups)) {
      groups[key].sort((a, b) => b.frequency - a.frequency);
    }
    return groups;
  }, [kb.entities]);

  if (kb.entities.length === 0) return <EmptyState text="لم يتم اكتشاف كيانات بعد" />;

  const typeLabels: Record<string, string> = {
    concept: "مفاهيم",
    operation: "عمليات",
    object: "أشكال",
    property: "خصائص",
    strategy: "استراتيجيات",
    unit: "وحدات",
    constraint: "قيود",
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
      {Object.entries(grouped).map(([type, entities]) => (
        <div key={type}>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-2">
            {typeLabels[type] || type} ({entities.length})
          </div>
          <div className="flex flex-wrap gap-1.5">
            {entities.map(e => (
              <div
                key={e.id}
                className="px-2.5 py-1.5 rounded-sm border border-border bg-muted/30 hover:bg-muted/60 transition-colors group"
                title={e.aliases.join(", ")}
              >
                <span className="text-[11px] text-foreground">{e.name}</span>
                <span className="text-[9px] text-muted-foreground mr-1.5 font-mono">×{e.frequency}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </motion.div>
  );
}

// ===== Relations Tab =====

function RelationsTab({ kb }: { kb: KBType }) {
  const enriched = useMemo(() => {
    return kb.relations
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 50)
      .map(r => ({
        ...r,
        fromName: kb.entities.find(e => e.id === r.fromEntity)?.name || r.fromEntity,
        toName: kb.entities.find(e => e.id === r.toEntity)?.name || r.toEntity,
      }));
  }, [kb.relations, kb.entities]);

  if (enriched.length === 0) return <EmptyState text="لم يتم بناء علاقات بعد" />;

  const typeLabels: Record<string, string> = {
    co_occurs: "يتزامن مع",
    requires: "يتطلب",
    produces: "ينتج",
    is_a: "نوع من",
    part_of: "جزء من",
    inverse_of: "عكس",
    precedes: "يسبق",
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-1.5">
      {enriched.map(r => (
        <div key={r.id} className="flex items-center gap-2 px-3 py-2 border border-border rounded-sm text-[11px] hover:bg-muted/20 transition-colors">
          <span className="text-foreground font-mono">{r.fromName}</span>
          <span className="text-muted-foreground text-[10px] px-1.5 py-0.5 bg-muted/50 rounded-sm">
            {typeLabels[r.type] || r.type}
          </span>
          <span className="text-foreground font-mono">{r.toName}</span>
          <span className="mr-auto" />
          <ConfidenceBadge value={r.strength} />
          <span className="text-[9px] text-muted-foreground font-mono">×{r.frequency}</span>
        </div>
      ))}
    </motion.div>
  );
}

// ===== Schemas Tab =====

function SchemasTab({ kb }: { kb: KBType }) {
  const sorted = useMemo(() =>
    [...kb.schemas].sort((a, b) => b.confidence - a.confidence),
    [kb.schemas]
  );

  if (sorted.length === 0) return <EmptyState text="لم يتم بناء مخططات تفكيك بعد" />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
      {sorted.map(s => (
        <div key={s.id} className="border border-border rounded-sm p-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[12px] text-foreground font-semibold">{s.name}</span>
            <ConfidenceBadge value={s.confidence} />
            <span className="text-[9px] text-muted-foreground font-mono mr-auto">×{s.frequency}</span>
          </div>
          <div className="text-[11px] text-muted-foreground mb-2">{s.description}</div>

          {/* Steps pipeline */}
          <div className="space-y-1 border-r-2 border-primary/20 pr-3 mr-1">
            {s.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="text-[10px] font-mono text-primary mt-0.5 shrink-0">{i + 1}</span>
                <div>
                  <span className="text-[11px] text-foreground">{step.description}</span>
                  {step.ruleHint && (
                    <span className="text-[9px] text-muted-foreground mr-1 font-mono">({step.ruleHint})</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Trigger keywords */}
          {s.trigger.keywords.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {s.trigger.keywords.slice(0, 8).map((kw, i) => (
                <span key={i} className="text-[9px] px-1.5 py-0.5 bg-muted/50 text-muted-foreground rounded-sm border border-border">
                  {kw}
                </span>
              ))}
              {s.trigger.keywords.length > 8 && (
                <span className="text-[9px] text-muted-foreground">+{s.trigger.keywords.length - 8}</span>
              )}
            </div>
          )}
        </div>
      ))}
    </motion.div>
  );
}

// ===== Shared Components =====

function ConfidenceBadge({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 70 ? "text-green-400" : pct >= 40 ? "text-yellow-400" : "text-muted-foreground";
  return <span className={`text-[9px] font-mono ${color}`}>{pct}%</span>;
}

function EmptyState({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center p-8 border border-dashed border-border rounded-sm"
    >
      <div className="text-[11px] text-muted-foreground">{text}</div>
      <div className="text-[10px] text-muted-foreground mt-1">حلّ المزيد من التمارين للتعلم</div>
    </motion.div>
  );
}

// ── Neural Map Visual ─────────────────────────────────────────────────────────

function NeuralMap({ kb }: { kb: KBType }) {
  const points = useMemo(() => 
    kb.patterns.slice(0, 30).map((p, i) => ({
      id: p.id,
      x: 10 + (i * 137.5) % 80,
      y: 10 + (i * 27.3) % 80,
      size: 1 + (i % 3)
    })),
    [kb.patterns]
  );

  return (
     <div className="relative h-48 w-full bg-black/60 rounded-xl overflow-hidden border border-white/5 group shadow-inner">
        {/* Radar/Scanline Effect */}
        <motion.div 
            className="absolute inset-x-0 h-20 bg-gradient-to-b from-transparent via-primary/10 to-transparent z-0 pointer-events-none"
            animate={{ top: ['-100%', '200%'] }}
            transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
        />
        
        {/* Deep Space Background */}
        <div className="absolute inset-0 opacity-20" 
             style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #1e1e2e 0%, transparent 100%)' }} />
        <div className="absolute inset-0 opacity-5" 
             style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        
        {/* SVG Connections (Neural Pathways) */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-30">
          {points.map((p, i) => (
            i > 0 && (
              <line 
                key={`line-${i}`}
                x1={`${points[i-1].x}%`} 
                y1={`${points[i-1].y}%`} 
                x2={`${p.x}%`} 
                y2={`${p.y}%`} 
                stroke="currentColor" 
                strokeWidth="0.5"
                className="text-primary/30"
              />
            )
          ))}
        </svg>

        {/* Render Patterns as bright stars */}
        {points.map((p, i) => (
            <motion.div
                key={p.id}
                className="absolute bg-primary rounded-full shadow-[0_0_10px_rgba(var(--primary),0.8)]"
                style={{ 
                    left: `${p.x}%`, 
                    top: `${p.y}%`,
                    width: p.size,
                    height: p.size
                }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ 
                  opacity: [0.3, 0.7, 0.3],
                  scale: [1, 1.2, 1]
                }}
                transition={{ duration: 3 + i % 2, repeat: Infinity, delay: i * 0.1 }}
                whileHover={{ scale: 4, opacity: 1, zIndex: 10 }}
            />
        ))}

        {/* Render Gaps as pulsing red voids */}
        {kb.learningGaps?.slice(0, 8).map((g, i) => (
            <motion.div
                key={g.id}
                className="absolute w-4 h-4 rounded-full border border-destructive/40 flex items-center justify-center bg-destructive/5"
                style={{ 
                    left: `${20 + (i * 153.1) % 60}%`, 
                    top: `${20 + (i * 89.7) % 60}%` 
                }}
                animate={{ 
                    boxShadow: [
                      "inset 0 0 10px 2px rgba(220,38,38,0.1)", 
                      "inset 0 0 20px 5px rgba(220,38,38,0.3)", 
                      "inset 0 0 10px 2px rgba(220,38,38,0.1)"
                    ],
                    scale: [1, 1.1, 1]
                }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
            >
               <div className="w-1 h-1 bg-destructive rounded-full shadow-[0_0_8px_rgba(220,38,38,1)]" />
            </motion.div>
        ))}
        
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <span className="text-[7px] uppercase tracking-[0.3em] text-muted-foreground/40 font-bold">Neural Topology v3.0</span>
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.5)]" />
        </div>
     </div>
  );
}

// ── Gaps Tab ──────────────────────────────────────────────────────────────────

function GapsTab({ kb, highlightId }: { kb: KBType; highlightId?: string | null }) {
  const sorted = useMemo(() =>
    [...(kb.learningGaps || [])].sort((a, b) => b.frequency - a.frequency),
    [kb.learningGaps]
  );

  const highlightRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (highlightId && highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlightId]);

  if (sorted.length === 0) return <EmptyState text="لا يوجد فجوات معرفية مسجلة حالياً" />;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
      <div className="bg-destructive/5 border border-destructive/10 p-3 rounded-sm mb-4">
        <div className="flex items-center gap-2 text-destructive font-bold text-[11px] mb-1">
          <AlertCircle className="w-3.5 h-3.5" />
          <span>النقاط العمياء للمحرك</span>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          هذه الأنماط الرياضية تم اكتشافها لكن المحرك لا يملك قواعد لحلها حالياً.
        </p>
      </div>

      {sorted.map(g => {
        const isHighlighted = g.id === highlightId || g.signature === highlightId;
        return (
          <div 
            key={g.id} 
            ref={isHighlighted ? highlightRef : null}
            className={`border rounded-sm p-3 transition-all duration-500 ${
              isHighlighted 
                ? "border-destructive bg-destructive/5 shadow-[0_0_15px_rgba(220,38,38,0.2)] scale-[1.02] z-10" 
                : "border-border hover:border-destructive/30 hover:bg-muted/10"
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-sm border ${
                isHighlighted ? "bg-destructive text-white border-destructive" : "text-destructive bg-destructive/5 border-destructive/10"
              }`}>
                {g.signature}
              </span>
              <span className="text-[9px] text-muted-foreground mr-auto font-mono">×{g.frequency}</span>
            </div>
            <div className="text-[10px] text-foreground/70 bg-muted/30 p-2 rounded-sm mb-2 font-mono italic break-all">
              "{g.sourceExercise.slice(0, 60)}..."
            </div>
            <div className="flex items-center justify-between text-[9px]">
              <span className="text-muted-foreground">أول ظهور: {new Date(g.firstEncountered).toLocaleDateString()}</span>
              <span className="text-secondary-foreground font-bold uppercase tracking-tighter">{g.missingRuleType || "unknown_rule"}</span>
            </div>
          </div>
        );
      })}
    </motion.div>
  );
}
