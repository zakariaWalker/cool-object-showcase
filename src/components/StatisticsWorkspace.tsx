// ===== Statistics Workspace =====
// Local engine → step-by-step trace → optional Gemini explanation.

import { useState, useCallback } from "react";
import { analyzeStatistics, parseDataset } from "@/engine/statistics-engine";
import { explainStatistics } from "@/engine/ai-layer";
import { StatisticsResult } from "@/engine/types";
import { EngineNav } from "./EngineNav";
import { LatexRenderer } from "./LatexRenderer";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ResponsiveContainer, Cell,
} from "recharts";

const SAMPLE_DATASETS = [
  { label: "Notes (n=15)", value: "12,15,14,10,18,20,13,16,11,17,14,15,9,19,12" },
  { label: "Entiers (n=18)", value: "5,8,3,12,4,6,9,7,11,6,5,8,10,4,7,12,3,9" },
  { label: "Salaires (n=10)", value: "18000,22000,19500,25000,17000,30000,21000,18500,24000,16000" },
  { label: "Symétrique", value: "10,12,14,16,18,20,18,16,14,12,10" },
];

export function StatisticsWorkspace() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState<StatisticsResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const solve = useCallback(async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const data = parseDataset(input);
      if (data.length < 2) throw new Error("يجب أن يحتوي الجدول على قيمتين على الأقل");
      const res = analyzeStatistics(data);
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ في التحليل");
    } finally {
      setLoading(false);
    }
  }, [input]);

  const fetchAI = useCallback(async () => {
    if (!result) return;
    setAiLoading(true);
    try {
      const explanation = await explainStatistics(result, "fr");
      setResult(prev => prev ? { ...prev, aiExplanation: explanation } : prev);
    } catch (e) {
      setResult(prev => prev ? { ...prev, aiExplanation: `Erreur: ${e instanceof Error ? e.message : "inconnu"}` } : prev);
    } finally {
      setAiLoading(false);
    }
  }, [result]);

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-mono overflow-hidden">
      <EngineNav />
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-[380px] border-r border-border flex flex-col bg-card">
          <div className="p-4 border-b border-border flex-shrink-0">
            <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
              جدول البيانات
            </div>
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") solve(); }}
              placeholder="أدخل البيانات مفصولة بفواصل: 12, 15, 14, 10, 18..."
              className="w-full bg-background border border-border rounded-sm p-3 text-[13px] resize-none h-24 focus:outline-none focus:border-accent/50 placeholder:text-muted-foreground"
              dir="auto"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {SAMPLE_DATASETS.map(d => (
                <button
                  key={d.label}
                  onClick={() => setInput(d.value)}
                  className="text-[11px] px-2 py-1 border border-border rounded-sm text-muted-foreground hover:text-foreground hover:border-accent/50 transition-colors"
                >
                  {d.label}
                </button>
              ))}
            </div>
            <button
              onClick={solve}
              disabled={loading || !input.trim()}
              className="mt-3 w-full py-2.5 bg-accent text-black text-[13px] font-semibold rounded-sm hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "تحليل..." : "حلل البيانات →"}
            </button>
            <div className="text-[10px] text-muted-foreground mt-1 text-right">Ctrl+Enter</div>
          </div>

          {/* Stats tiles */}
          <div className="flex-1 overflow-y-auto p-4">
            {error && (
              <div className="text-[12px] text-destructive border border-destructive/30 rounded-sm p-3 mb-4">
                {error}
              </div>
            )}
            {result && (
              <AnimatePresence>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {/* Summary tiles */}
                  <div className="grid grid-cols-3 gap-1.5 mb-4">
                    {[
                      ["\\bar{x}", result.mean, "الوسط"],
                      ["Me", result.median, "الوسيط"],
                      ["Mo", result.mode.length > 0 ? result.mode[0] : "∄", "المنوال"],
                      ["\\sigma", result.stdDev, "الانحراف"],
                      ["V", result.variance, "التباين"],
                      ["E", result.range, "المدى"],
                      ["Q_1", result.q1, "ربيع 1"],
                      ["Q_3", result.q3, "ربيع 3"],
                      ["IQR", result.iqr, "المدى الربيعي"],
                    ].map(([sym, val, lbl]) => (
                      <div key={String(sym)} className="bg-background border border-border rounded-sm p-2 text-center">
                        <div className="text-accent font-semibold text-[13px] mb-0.5">
                          {typeof val === "number" ? val.toFixed(2) : val}
                        </div>
                        <div className="text-[9px] text-muted-foreground uppercase tracking-wider">{lbl}</div>
                      </div>
                    ))}
                  </div>

                  {/* Step-by-step */}
                  <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-2">
                    الخطوات
                  </div>
                  {result.steps.map(step => (
                    <motion.div
                      key={step.index}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: step.index * 0.05 }}
                      className="border border-border rounded-sm p-3 mb-2"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-5 h-5 rounded-full bg-accent/20 text-accent text-[10px] flex items-center justify-content-center font-bold flex-shrink-0 flex items-center justify-center">
                          {step.index + 1}
                        </span>
                        <span className="text-[11px] text-accent font-semibold uppercase tracking-wider">
                          {step.nameAr}
                        </span>
                      </div>
                      <div className="bg-background rounded-sm p-2 mb-1.5 overflow-x-auto">
                        <LatexRenderer latex={step.formula} displayMode={true} />
                      </div>
                      <div className="text-[10px] text-muted-foreground">{step.explanation}</div>
                    </motion.div>
                  ))}

                  {/* AI explanation button */}
                  {!result.aiExplanation && (
                    <button
                      onClick={fetchAI}
                      disabled={aiLoading}
                      className="w-full mt-2 py-2 border border-dashed border-border text-[11px] text-muted-foreground hover:text-foreground hover:border-accent/50 rounded-sm transition-colors"
                    >
                      {aiLoading ? "NIM analyse..." : "✦ Explication Gemini AI →"}
                    </button>
                  )}
                  {result.aiExplanation && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="mt-2 p-3 border border-accent/30 rounded-sm bg-accent/5"
                    >
                      <div className="text-[10px] text-accent uppercase tracking-widest mb-1.5">✦ Gemini AI</div>
                      <p className="text-[12px] text-muted-foreground leading-relaxed">{result.aiExplanation}</p>
                    </motion.div>
                  )}
                </motion.div>
              </AnimatePresence>
            )}
            {!result && !error && (
              <div className="text-center text-muted-foreground text-[13px] pt-12 leading-loose">
                أدخل بيانات رقمية<br />
                <span className="text-[11px]">سيتم توليد الإحصاء الوصفي الكامل</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Chart */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground mb-4 flex-shrink-0">
            المخطط البياني — التوزيع التكراري
          </div>
          {result ? (
            <div className="flex-1 min-h-0 flex flex-col gap-4">
              {/* Histogram */}
              <div className="flex-1 min-h-0 bg-card border border-border rounded-sm p-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={result.bins} margin={{ top: 10, right: 20, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 3.7% 15.9%)" />
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "hsl(240 5% 64.9%)", fontSize: 10, fontFamily: "Geist Mono, monospace" }}
                      angle={-35} textAnchor="end"
                    />
                    <YAxis tick={{ fill: "hsl(240 5% 64.9%)", fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ background: "hsl(240 10% 5%)", border: "1px solid hsl(240 3.7% 15.9%)", borderRadius: 4, fontSize: 11 }}
                      labelStyle={{ color: "hsl(31.6 100% 50%)" }}
                    />
                    <ReferenceLine x={result.bins.findIndex(b => b.min <= result.mean && result.mean < b.max)} stroke="hsl(217.2 91.2% 59.8%)" strokeDasharray="4 2" label={{ value: "μ", fill: "hsl(217.2 91.2% 59.8%)", fontSize: 11 }} />
                    <Bar dataKey="count" name="Effectif" radius={[2, 2, 0, 0]}>
                      {result.bins.map((bin, i) => (
                        <Cell
                          key={i}
                          fill={`hsl(31.6 100% ${50 - i * (20 / result.bins.length)}%)`}
                          opacity={0.85}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Box plot representation */}
              <div className="flex-shrink-0 bg-card border border-border rounded-sm p-4">
                <div className="text-[10px] text-muted-foreground uppercase tracking-widest mb-3">مخطط الصندوق — Boîte à moustaches</div>
                <BoxPlot result={result} />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <div className="text-5xl opacity-10 mb-4">∑</div>
                <p className="text-[13px]">الرسم البياني يظهر بعد الحل</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BoxPlot({ result }: { result: StatisticsResult }) {
  const { min, max, q1, median, q3, mean } = result;
  const range = max - min || 1;
  const pct = (v: number) => `${((v - min) / range * 100).toFixed(1)}%`;

  return (
    <div className="relative h-16">
      {/* whiskers */}
      <div className="absolute top-[50%] left-0 right-0 h-px bg-border" style={{ transform: "translateY(-50%)" }} />
      {/* min whisker */}
      <div className="absolute top-[25%] bottom-[25%] w-px bg-muted-foreground" style={{ left: "0%" }} />
      {/* max whisker */}
      <div className="absolute top-[25%] bottom-[25%] w-px bg-muted-foreground" style={{ left: "100%" }} />
      {/* IQR box */}
      <div
        className="absolute top-[15%] bottom-[15%] bg-accent/20 border border-accent/60 rounded-sm"
        style={{ left: pct(q1), right: `${(100 - (q3 - min) / range * 100).toFixed(1)}%` }}
      />
      {/* median line */}
      <div
        className="absolute top-[10%] bottom-[10%] w-0.5 bg-accent"
        style={{ left: pct(median) }}
      />
      {/* mean dot */}
      <div
        className="absolute w-2 h-2 rounded-full bg-primary border border-primary"
        style={{ left: pct(mean), top: "50%", transform: "translate(-50%,-50%)" }}
      />
      {/* labels */}
      <div className="absolute -bottom-5 text-[9px] text-muted-foreground" style={{ left: "0%" }}>{min}</div>
      <div className="absolute -bottom-5 text-[9px] text-accent" style={{ left: pct(q1) }}>{q1}</div>
      <div className="absolute -bottom-5 text-[9px] text-accent font-bold" style={{ left: pct(median) }}>{median}</div>
      <div className="absolute -bottom-5 text-[9px] text-accent" style={{ left: pct(q3) }}>{q3}</div>
      <div className="absolute -bottom-5 text-[9px] text-muted-foreground" style={{ left: "100%", transform: "translateX(-100%)" }}>{max}</div>
    </div>
  );
}
