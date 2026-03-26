// ═══════════════════════════════════════════════════════════════════════
//  Landing.tsx  —  QED · وين راحت نقاطك؟
//  Vertical-scroll cinematic story · 10 scenes · auto-play + sound
// ═══════════════════════════════════════════════════════════════════════
import { Link } from "react-router-dom";
import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Fonts ─────────────────────────────────────────────────────────────
function useFonts() {
  useEffect(() => {
    const id = "qed-fonts-v2";
    if (document.getElementById(id)) return;
    const l = document.createElement("link");
    l.id = id; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&family=Amiri:wght@400;700&family=Caveat:wght@400;700&family=IBM+Plex+Mono:wght@400;700&display=swap";
    document.head.appendChild(l);
  }, []);
}

// ─── Web Audio ─────────────────────────────────────────────────────────
let _ac: AudioContext | null = null;
const ac = () => { if (!_ac) _ac = new ((window as any).AudioContext || (window as any).webkitAudioContext)(); return _ac; };
const tone = (f: number, type: OscillatorType, dur: number, vol: number, d = 0) => {
  try {
    const c = ac()!, o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination); o.type = type; o.frequency.value = f;
    g.gain.setValueAtTime(0, c.currentTime + d);
    g.gain.linearRampToValueAtTime(vol, c.currentTime + d + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d + dur);
    o.start(c.currentTime + d); o.stop(c.currentTime + d + dur + 0.02);
  } catch (_) { }
};
const noise = (dur: number, vol: number) => {
  try {
    const c = ac()!, buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
    const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * vol;
    const s = c.createBufferSource(), g = c.createGain();
    s.buffer = buf; s.connect(g); g.connect(c.destination);
    g.gain.setValueAtTime(vol, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    s.start(); s.stop(c.currentTime + dur + 0.01);
  } catch (_) { }
};
const sndPaper = () => { noise(0.18, 0.06); tone(220, "triangle", 0.25, 0.04, 0.08); };
const sndStamp = () => { tone(140, "sawtooth", 0.12, 0.09); noise(0.06, 0.08); };
const sndPeel = () => { tone(480, "triangle", 0.07, 0.05); tone(600, "sine", 0.12, 0.04, 0.06); };
const sndScan = () => tone(920, "sine", 0.04, 0.015);
const sndWhoosh = () => {
  try {
    const c = ac()!, o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination); o.type = "sawtooth";
    o.frequency.setValueAtTime(900, c.currentTime); o.frequency.exponentialRampToValueAtTime(160, c.currentTime + 0.38);
    g.gain.setValueAtTime(0.05, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.38);
    o.start(); o.stop(c.currentTime + 0.4);
  } catch (_) { }
};
const sndHeal = () => { tone(440, "sine", 0.18, 0.06); tone(554, "sine", 0.18, 0.05, 0.11); tone(659, "sine", 0.22, 0.06, 0.22); };
const sndFanfare = () => [523, 659, 784, 1047].forEach((f, i) => tone(f, "sine", 0.35, 0.07, i * 0.13));
const sndAdvance = () => { tone(540, "sine", 0.09, 0.05); tone(680, "sine", 0.11, 0.04, 0.08); };
const sndAmbient = () => [130, 165, 196].forEach((f, i) => {
  try {
    const c = ac()!, o = c.createOscillator(), g = c.createGain();
    o.connect(g); g.connect(c.destination); o.type = "sine"; o.frequency.value = f;
    g.gain.setValueAtTime(0, c.currentTime + i * 0.05); g.gain.linearRampToValueAtTime(0.018, c.currentTime + i * 0.05 + 0.3); g.gain.linearRampToValueAtTime(0, c.currentTime + 2.5);
    o.start(c.currentTime + i * 0.05); o.stop(c.currentTime + 2.6);
  } catch (_) { }
});

// ─── Constants ─────────────────────────────────────────────────────────
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`;
const MATH_SYMS = ["x²", "∑", "∫", "π", "√", "≤", "f(x)", "Δ", "∞", "θ", "α", "sin", "cos", "log", "≠", "∈", "lim", "→", "∀", "∃"];

// Scene data — 10 scenes matching the provided content
const SCENES = [
  {
    num: "01", title: "ورقة الامتحان",
    ar: "وزارة التربية الوطنية · امتحان بكالوريا تجريبي · الشعبة: علوم تجريبية. اختبار في مادة الرياضيات.",
  },
  {
    num: "02", title: "الخطأ النمطي",
    ar: "lim (ln x)/x = ∞/∞ = 1 ؟\nخطأ! هذه النهاية الشهيرة = 0\nتشخيص QED: خطأ نمطي «التزايد المقارن» [-1.5 نقطة]",
  },
  {
    num: "03", title: "الواقع لي ما يحكيوش عليه",
    ar: "97% من التلاميذ الجزائريين يحسوا بالصمت أو «والو» بعد 12 سنة دراسة. النظام يعطيك نقطة بصح ما يقولكش علاش خسرتها.",
  },
  {
    num: "04", title: "المشكلة ماشي فيك",
    ar: "النظام يعطيك نقطة بصح ما يقولكش علاش خسرتها. الأستاذ ما عندوش وقت، والدروس الخصوصية تعطيك حلول بلا ما تكشف السبب.",
  },
  {
    num: "05", title: "الحافز يرجع بالنتائج",
    ar: "QED يرى ما لا يراه أحد. إذا عرفت وين تخسر، ترجع النقاط… ويرجع الحافز.",
  },
  {
    num: "06", title: "تحليل الثغرات الذكي",
    ar: "٧.٥ نقطة ضايعة في نمطين فقط. تصحيحهم يرجع الرغبة في الدراسة.",
  },
  {
    num: "07", title: "كيفاش تتبدل حياتك؟",
    ar: "قبل QED: تقرا بلا ما تعرف لماذا، تخسر بلا ما تعرف أين.\nبعد QED: تعرف وين تخسر بالضبط، وتربح نقاط كل أسبوع.",
  },
  {
    num: "08", title: "المشكلة الحقيقية",
    ar: "المشكلة ماشي في البرنامج. المشكلة أن لا أحد يرى أين يضيع الحافز.",
  },
  {
    num: "09", title: "مسار الشغف",
    ar: "QED يرى الاثنين: يرى نقاطك، ويرى طريقك لاسترجاع شغفك.",
  },
  {
    num: "10", title: "ابدأ التشخيص",
    ar: "٥ دقائق تكشف لك خريطة ثغراتك. بدون حساب · بدون بطاقة بنكية · نتائج فورية.",
  },
];

const CARD_DATA = [
  { ded: "-1.5", title: "نمط التزايد المقارن", pts: "(-1.5 ن)", sub: "lim (ln x) / x", math: "مقارنة الحدود عند +∞" },
  { ded: "-3.5", title: "نمط التمثيل البياني", pts: "(-3.5 ن)", sub: "f(x) = x³ − 3x + 2", math: "جدول التغيّرات + الاشتقاق" },
  { ded: "-2.5", title: "نمط المتتاليات", pts: "(-2.5 ن)", sub: "U₀=3، r=−2", math: "الحد العام + المجموع" },
];

const DIAG_ROWS = [
  { color: "#C4281A", name: "نمط التمثيل البياني", pts: "−3.5", sub: "جدول التغيّرات + الاشتقاق" },
  { color: "#D05A20", name: "نمط المتتاليات", pts: "−2.5", sub: "الحد العام + المجموع" },
  { color: "#F5A623", name: "نمط التزايد المقارن", pts: "−1.5", sub: "مقارنة الأسس بالتساوي" },
];

interface Particle { id: number; sym: string; sz: number; left: string; dur: number; delay: number; }
interface ConfItem { id: number; left: string; color: string; w: number; h: number; dur: number; round: boolean; }

// ─── ExamPaper ──────────────────────────────────────────────────────────
function ExamPaper({ active, scores, stampShow, stampBurst, dimmed }: {
  active: boolean; scores: boolean[]; stampShow: boolean; stampBurst: boolean; dimmed: boolean;
}) {
  return (
    <motion.div
      animate={{ opacity: active ? (dimmed ? 0.22 : 1) : 0, x: active ? 0 : -24, rotate: -1.5, scale: dimmed ? 0.96 : 1 }}
      transition={{ duration: 0.85, ease: [0.2, 0.8, 0.2, 1] }}
      style={{ width: 164, flexShrink: 0, background: "#F5F0E6", border: "1px solid #C0B8A8", boxShadow: "3px 3px 0 #D8D0C0,0 24px 64px rgba(0,0,0,.7)", position: "relative", overflow: "visible" }}
    >
      <div style={{ position: "absolute", inset: 0, zIndex: 20, pointerEvents: "none", backgroundImage: GRAIN, opacity: .04, mixBlendMode: "multiply" as any }} />
      <div style={{ background: "#EDE8DA", borderBottom: "1.5px solid #1A1714", padding: "4px 6px 3px", textAlign: "center" }}>
        <div style={{ fontSize: 4.5, fontWeight: 700, color: "#1A1714", fontFamily: "'Amiri',serif", lineHeight: 1.6 }}>وزارة التربية الوطنية</div>
        <div style={{ fontSize: 4, color: "#1A1714", fontFamily: "'Amiri',serif" }}>امتحان بكالوريا تجريبي — الشعبة: علوم تجريبية — المدة: 3 ساعات ونصف</div>
        <div style={{ fontSize: 5.5, fontWeight: 700, color: "#1A1714", fontFamily: "'Amiri',serif", border: "0.5px solid #1A1714", padding: "1px 3px", marginTop: 2 }}>اختبار في مادة الرياضيات</div>
      </div>
      <div style={{ padding: "5px 6px", position: "relative", backgroundImage: "repeating-linear-gradient(to bottom,transparent 0,transparent 10px,rgba(100,80,60,.1) 10px,rgba(100,80,60,.1) 11px)" }}>
        <div style={{ position: "absolute", right: 16, top: 0, bottom: 0, width: 1, background: "rgba(196,40,26,.18)" }} />
        {[
          { sc: "-1.5", t: "التمرين الأول:", p: "(04 ن)", b: "احسب النهاية التالية مبيناً مراحل الحساب:", m: "lim (ln x)/x عند +∞" },
          { sc: "-3.5", t: "التمرين الثاني:", p: "(06 ن)", b: "f(x) = x³ − 3x + 2", m: "ادرس التغيّرات وارسم المنحنى" },
          { sc: "-2.5", t: "التمرين الثالث:", p: "(03 ن)", b: "متتالية U₀=3، r=−2", m: "S = U₀+…+U₁₀" },
        ].map((ex, i) => (
          <div key={i} style={{ position: "relative", padding: "2px 4px 3px 18px", borderBottom: i < 2 ? "0.5px solid rgba(100,80,60,.2)" : "none", marginBottom: 2 }}>
            <motion.div
              animate={scores[i] ? { opacity: 1, scale: 1 } : { opacity: 0, scale: .4 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              style={{ position: "absolute", top: 3, left: 2, width: 14, height: 14, borderRadius: "50%", border: "1px solid #C4281A", background: "rgba(255,255,255,.9)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Caveat',cursive", fontSize: 5.5, fontWeight: 700, color: "#C4281A", zIndex: 2 }}
            >{ex.sc}</motion.div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 1 }}>
              <span style={{ fontSize: 5, fontWeight: 700, color: "#1A1714", fontFamily: "'Amiri',serif" }}>{ex.t}</span>
              <span style={{ fontSize: 4, color: "#5A5248", fontFamily: "'Amiri',serif" }}>{ex.p}</span>
            </div>
            <div style={{ fontSize: 4, color: "#444", lineHeight: 1.5, fontFamily: "'Amiri',serif" }}>{ex.b}</div>
            <div style={{ display: "block", textAlign: "center", fontSize: 5, fontWeight: 700, color: "#1A1714", fontFamily: "'Amiri',serif", direction: "ltr", margin: "1.5px 0" }}>{ex.m}</div>
          </div>
        ))}
      </div>
      <AnimatePresence>
        {stampShow && (
          <motion.div
            initial={{ scale: 0, rotate: -15 }} animate={{ scale: 1, rotate: -15 }}
            transition={{ type: "spring", stiffness: 260, damping: 14 }}
            className={stampBurst ? "qed-stamp-burst" : ""}
            style={{ position: "absolute", top: 14, left: 8, width: 32, height: 32, borderRadius: "50%", background: "rgba(196,40,26,.88)", border: "2px solid rgba(196,40,26,.5)", boxShadow: "0 4px 16px rgba(196,40,26,.4)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff", zIndex: 25 }}
          >
            <span style={{ fontFamily: "'Caveat',cursive", fontSize: 14, fontWeight: 700, lineHeight: 1 }}>11</span>
            <span style={{ fontFamily: "'Caveat',cursive", fontSize: 7, opacity: .85 }}>/20</span>
          </motion.div>
        )}
      </AnimatePresence>
      <div style={{ borderTop: "0.5px solid #C0B8A8", padding: "2px 5px", display: "flex", justifyContent: "space-between", fontSize: 3.5, color: "#5A5248", fontFamily: "'Amiri',serif", background: "rgba(200,190,170,.1)" }}>
        <span>اسم التلميذ: ___________</span><span>المدة: 3 ساعات ونصف</span>
      </div>
    </motion.div>
  );
}

// ─── QED Diagnosis Card (scene 2 visual) ───────────────────────────────
function DiagnosisCard({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0, y: 20, scale: .9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: .6, ease: [.2, .8, .2, 1] }}
          style={{ width: 280, background: "rgba(8,7,6,.97)", border: "1px solid rgba(196,40,26,.4)", boxShadow: "0 0 40px rgba(196,40,26,.2),0 20px 60px rgba(0,0,0,.8)", padding: 16, borderRadius: 4, fontFamily: "'IBM Plex Mono',monospace" }}
        >
          <div style={{ fontSize: 7, letterSpacing: "0.2em", color: "rgba(245,166,35,.45)", marginBottom: 10 }}>QED_DIAGNOSTIC.exe</div>

          <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(100,80,60,.25)", padding: "10px 12px", marginBottom: 10, borderRadius: 2 }}>
            <div style={{ fontSize: 7, color: "rgba(240,235,220,.4)", marginBottom: 4, direction: "rtl", fontFamily: "'Amiri',serif" }}>إجابة التلميذ:</div>
            <div style={{ fontSize: 9, color: "rgba(240,235,220,.7)", direction: "ltr", marginBottom: 6 }}>lim (ln x)/x = ∞/∞ = <span style={{ color: "#F5A623", fontWeight: 700 }}>1</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#C4281A", boxShadow: "0 0 6px #C4281A", flexShrink: 0 }} />
              <div style={{ fontSize: 7, color: "rgba(240,235,220,.5)", direction: "rtl", fontFamily: "'Amiri',serif" }}>ح.ع.ت! هذه النهاية = 0</div>
            </div>
          </div>

          <div style={{ background: "rgba(196,40,26,.06)", border: "1px solid rgba(196,40,26,.3)", padding: "10px 12px", borderRadius: 2 }}>
            <div style={{ fontSize: 7, letterSpacing: "0.15em", color: "rgba(196,40,26,.7)", marginBottom: 6 }}>PATTERN_ERROR_DETECTED</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(240,235,220,.9)", direction: "rtl", fontFamily: "'Cairo',sans-serif", marginBottom: 4 }}>خطأ نمطي: «التزايد المقارن»</div>
            <div style={{ fontSize: 7.5, color: "rgba(240,235,220,.55)", direction: "rtl", fontFamily: "'Amiri',serif", lineHeight: 1.6 }}>عاملت الأسس بالتساوي بدل مقارنة معدلات التزايد</div>
            <div style={{ marginTop: 8, padding: "4px 8px", background: "rgba(196,40,26,.15)", borderRadius: 2, display: "inline-block" }}>
              <span style={{ fontFamily: "'Caveat',cursive", fontSize: 14, fontWeight: 700, color: "#C4281A" }}>-1.5 pt</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Stats Visual (scene 3) ────────────────────────────────────────────
function StatsVisual({ show }: { show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0, scale: .85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: .7 }}
          style={{ textAlign: "center" }}
        >
          <motion.div
            initial={{ scale: .5 }} animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 180, damping: 12, delay: .2 }}
            style={{ fontSize: "clamp(80px,20vw,160px)", fontWeight: 900, color: "#C4281A", lineHeight: .85, textShadow: "0 0 40px rgba(196,40,26,.45)", fontFamily: "'Cairo',sans-serif" }}
          >97%</motion.div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .6 }}
            style={{ fontSize: "clamp(14px,3vw,20px)", fontWeight: 700, color: "#F5F0E6", marginTop: 16, fontFamily: "'Cairo',sans-serif", direction: "rtl" }}
          >نسبة فقدان الحافز</motion.div>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .9 }}
            style={{ fontSize: "clamp(11px,2vw,14px)", color: "rgba(240,235,220,.4)", marginTop: 8, maxWidth: 260, margin: "8px auto 0", direction: "rtl", fontFamily: "'Amiri',serif", lineHeight: 1.6 }}
          >بسبب غياب النتائج الملموسة وغياب التشخيص</motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Mistake Card ──────────────────────────────────────────────────────
function MistakeCard({ show, data, rot }: { show: boolean; data: typeof CARD_DATA[0]; rot: number }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ scale: .5, opacity: 0, rotate: rot - 8 }} animate={{ scale: 1, opacity: 1, rotate: rot }}
          exit={{ scale: .3, opacity: 0 }} transition={{ duration: .55, ease: [.2, .8, .2, 1] }}
          style={{ width: 128, background: "#F5F0E6", border: "1px solid #C0B8A8", boxShadow: "0 6px 24px rgba(0,0,0,.45),2px 2px 0 #EDE8DA", padding: "6px 8px 5px 22px", position: "relative", overflow: "hidden", backgroundImage: "repeating-linear-gradient(to bottom,transparent 0,transparent 10px,rgba(100,80,60,.08) 10px,rgba(100,80,60,.08) 11px)", flexShrink: 0 }}
        >
          <span style={{ position: "absolute", top: 6, left: 5, fontFamily: "'Caveat',cursive", fontSize: 13, fontWeight: 700, color: "#C4281A", lineHeight: 1, zIndex: 2 }}>{data.ded}</span>
          <div style={{ fontSize: 7.5, fontWeight: 700, color: "#1A1714", fontFamily: "'Amiri',serif", borderBottom: "0.5px solid rgba(100,80,60,.25)", paddingBottom: 2, marginBottom: 3 }}>{data.title}</div>
          <div style={{ fontSize: 5.5, color: "#5A5248", fontFamily: "'Amiri',serif", marginBottom: 2 }}>{data.sub}</div>
          <div style={{ fontSize: 6, fontWeight: 700, color: "#1A1714", fontFamily: "'Amiri',serif", direction: "ltr", textAlign: "center" }}>{data.math}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Diag Panel ────────────────────────────────────────────────────────
function DiagPanel({ show, rows }: { show: boolean; rows: boolean[] }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .55 }}
          style={{ width: "100%", maxWidth: 320, background: "rgba(10,8,6,.97)", border: "1px solid rgba(245,166,35,.2)", boxShadow: "0 0 40px rgba(0,0,0,.8)", padding: 16, position: "relative", overflow: "hidden", borderRadius: 2 }}
        >
          <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 7.5, letterSpacing: "0.2em", color: "rgba(245,166,35,.45)", marginBottom: 10 }}>DIAGNOSTIC_SCAN.exe</div>
          <div style={{ position: "absolute", left: 0, right: 0, height: 1, background: "rgba(0,200,83,.5)", boxShadow: "0 0 8px rgba(0,200,83,.7)", animation: "qed-scan 2.8s linear", top: 0 }} />
          {DIAG_ROWS.map((row, i) => (
            <AnimatePresence key={i}>
              {rows[i] && (
                <motion.div initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: .35 }}
                  style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}
                >
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: row.color, boxShadow: `0 0 8px ${row.color}`, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(240,235,220,.9)", fontFamily: "'Cairo',sans-serif" }}>{row.name}</div>
                    <div style={{ fontSize: 7, color: "rgba(240,235,220,.4)", fontFamily: "'IBM Plex Mono',monospace" }}>{row.sub}</div>
                  </div>
                  <span style={{ fontFamily: "'Caveat',cursive", fontSize: 13, fontWeight: 700, color: "#C4281A" }}>{row.pts}</span>
                  <div style={{ height: 4, width: 54, background: "rgba(255,255,255,.07)", borderRadius: 2, overflow: "hidden" }}>
                    <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: .8, delay: .2 }}
                      style={{ height: "100%", background: `linear-gradient(90deg,${row.color},rgba(255,255,255,.4))`, borderRadius: 2 }} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          ))}
          {rows[2] && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .8 }}
              style={{ borderTop: "1px solid rgba(245,166,35,.12)", paddingTop: 10, marginTop: 4 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontFamily: "'Amiri',serif", fontSize: 10, color: "rgba(240,235,220,.6)", direction: "rtl" }}>المجموع الضائع:</div>
                <div style={{ fontFamily: "'Caveat',cursive", fontSize: 22, fontWeight: 700, color: "#C4281A" }}>−7.5</div>
              </div>
              <div style={{ fontFamily: "'Amiri',serif", fontSize: 8, color: "rgba(240,235,220,.35)", direction: "rtl", marginTop: 4 }}>نمطين فقط تسرقان 7.5 نقطة</div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Comparison Display (scene 7) ──────────────────────────────────────
function ComparisonDisplay({ show }: { show: boolean }) {
  const before = ["تقرا بلا ما تعرف لماذا", "تراجع بلا ما تعرف ماذا", "تخسر بلا ما تعرف أين", "النتيجة: كره القراية وفقدان الأمل."];
  const after = ["تعرف أين تخسر بالضبط", "تعرف ماذا تتعلم (خطة محددة)", "تعرف كم نقطة تربح كل أسبوع", "النتيجة: ترجع تحب تقرا لأنك راك تنجح."];
  return (
    <AnimatePresence>
      {show && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%", maxWidth: 340 }}>
          {[
            { label: "❌ قبل QED", items: before, color: "#C4281A", bg: "rgba(196,40,26,.06)" },
            { label: "✅ بعد QED", items: after, color: "#00C853", bg: "rgba(0,200,83,.06)" },
          ].map((col, ci) => (
            <motion.div key={ci} initial={{ x: ci === 0 ? -20 : 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: ci * 0.25 }}
              style={{ background: col.bg, border: `1px solid ${col.color}33`, borderRadius: 10, padding: "12px 14px" }}
            >
              <div style={{ fontFamily: "'Cairo',sans-serif", fontSize: 14, fontWeight: 900, color: col.color, marginBottom: 10, direction: "rtl" }}>{col.label}</div>
              <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
                {col.items.map((it, j) => (
                  <motion.li key={j} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: ci * 0.25 + j * 0.1 }}
                    style={{ color: "rgba(240,235,220,.65)", fontSize: 12, marginBottom: 5, direction: "rtl", fontFamily: "'Amiri',serif", lineHeight: 1.5 }}
                  >
                    · {it}
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Journey Path (scene 9) ────────────────────────────────────────────
function JourneyPath({ show }: { show: boolean }) {
  const steps = ["تشخيص", "خطة", "تعلّم", "نتائج", "شغف"];
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: "100%", maxWidth: 360 }}>
          <svg viewBox="0 0 360 120" style={{ width: "100%", overflow: "visible" }}>
            <motion.path
              d="M30,60 C70,20 110,100 150,60 C190,20 230,100 270,60 C300,30 330,75 340,60"
              stroke="rgba(245,166,35,.5)" strokeWidth="2" fill="none" strokeDasharray="520"
              initial={{ strokeDashoffset: 520 }} animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 2.4, ease: "easeInOut" }}
            />
            {[30, 110, 190, 270, 340].map((x, i) => (
              <motion.g key={i} initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: .5 + i * .3, type: "spring", stiffness: 280 }}
                style={{ transformOrigin: `${x}px 60px` }}
              >
                <circle cx={x} cy={60} r={8} fill="#080706" stroke="#F5A623" strokeWidth={1.5} />
                <circle cx={x} cy={60} r={3} fill="#F5A623" />
              </motion.g>
            ))}
          </svg>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
            {steps.map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .7 + i * .3 }}
                style={{ fontFamily: "'Cairo',sans-serif", fontSize: 10, color: "rgba(245,166,35,.6)", fontWeight: 700, textAlign: "center", direction: "rtl" }}
              >{s}</motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Score Counter (scene 10) ──────────────────────────────────────────
function ScoreCounter({ val, show }: { val: number; show: boolean }) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ scale: .5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 180, damping: 14 }}
          style={{ textAlign: "center", fontFamily: "'Caveat',cursive" }}
        >
          <div style={{ fontSize: "clamp(64px,16vw,128px)", fontWeight: 700, color: "#F5A623", lineHeight: .9, textShadow: "0 0 60px rgba(245,166,35,.6),0 0 120px rgba(245,166,35,.3)" }}>
            {val}
          </div>
          <div style={{ fontSize: "clamp(20px,4.5vw,38px)", color: "rgba(245,166,35,.45)" }}>/20</div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .9 }}
            style={{ fontSize: "clamp(12px,2vw,16px)", color: "rgba(0,200,83,.85)", marginTop: 12, fontFamily: "'Cairo',sans-serif", direction: "rtl", fontWeight: 700 }}
          >
            ٧.٥ نقطة استُرجعت ✓
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ═══════════════════════════════════════════════════════════════════════
//  Main VerticalStory component
// ═══════════════════════════════════════════════════════════════════════
function VerticalStory() {
  const [cs, setCs] = useState(-1); // current scene
  const [scores, setScores] = useState([false, false, false]);
  const [stampShow, setStampShow] = useState(false);
  const [stampBurst, setStampBurst] = useState(false);
  const [paperDimmed, setPaperDimmed] = useState(false);
  const [cards, setCards] = useState([false, false, false]);
  const [diagShow, setDiagShow] = useState(false);
  const [diagRows, setDiagRows] = useState([false, false, false]);
  const [scoreVal, setScoreVal] = useState(11);
  const [scoreFX, setScoreFX] = useState(false);
  const [confetti, setConfetti] = useState<ConfItem[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const sceneRefs = useRef<(HTMLDivElement | null)[]>([]);
  const triggered = useRef<Set<number>>(new Set());

  useEffect(() => {
    setParticles(Array.from({ length: 24 }, (_, id) => ({
      id, sym: MATH_SYMS[Math.floor(Math.random() * MATH_SYMS.length)],
      sz: 11 + Math.random() * 30, left: Math.random() * 100 + "%",
      dur: 14 + Math.random() * 18, delay: -(Math.random() * 22),
    })));
  }, []);

  useEffect(() => {
    const unlock = () => { try { ac()?.resume(); setAudioUnlocked(true); } catch (_) { } };
    ["click", "touchstart", "scroll"].forEach(ev => window.addEventListener(ev, unlock, { once: true }));
  }, []);

  const triggerScene = useCallback((idx: number) => {
    if (triggered.current.has(idx)) return;
    triggered.current.add(idx);
    setCs(idx);
    sndAdvance();

    // Scene 0: exam paper appears
    if (idx === 0) setTimeout(sndPaper, 600);

    // Scene 1: stamp + score marks
    if (idx === 1) {
      setTimeout(() => { sndStamp(); setStampShow(true); setTimeout(() => setStampBurst(true), 320); }, 500);
      setTimeout(() => { [0, 1, 2].forEach(i => setTimeout(() => { sndScan(); setScores(s => { const n = [...s]; n[i] = true; return n; }); }, i * 290)); }, 950);
    }

    // Scene 4: diag panel
    if (idx === 4) {
      setTimeout(sndAmbient, 200);
    }

    // Scene 5: diagnostic scan
    if (idx === 5) {
      setDiagShow(true);
      [0, 1, 2].forEach(i => setTimeout(() => { sndScan(); setDiagRows(s => { const n = [...s]; n[i] = true; return n; }); }, 700 + i * 450));
    }

    // Scene 6: cards peel
    if (idx === 6) {
      [0, 1, 2].forEach(i => setTimeout(() => { sndPeel(); setCards(s => { const n = [...s]; n[i] = true; return n; }); }, i * 300));
      setTimeout(() => setPaperDimmed(true), 900);
    }

    // Scene 7: whoosh
    if (idx === 7) { [0, 1, 2, 3].forEach(i => setTimeout(sndWhoosh, i * 200)); }

    // Scene 9: score animation + confetti
    if (idx === 9) {
      setScoreFX(true);
      const t0 = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - t0) / 1500);
        const e = t < .5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
        setScoreVal(Math.round(11 + 5 * e));
        if (t < 1) requestAnimationFrame(tick);
      };
      setTimeout(() => { sndHeal(); requestAnimationFrame(tick); }, 600);
      setTimeout(() => {
        sndFanfare();
        const cols = ["#F5A623", "#FF8C00", "#00C853", "#FF5252", "#F5F0E6", "#FFD700"];
        setConfetti(Array.from({ length: 90 }, (_, id) => ({
          id, left: (4 + Math.random() * 92) + "%", color: cols[Math.floor(Math.random() * cols.length)],
          w: 5 + Math.random() * 9, h: 4 + Math.random() * 6, dur: 1.6 + Math.random() * 2.4, round: Math.random() > .5,
        })));
      }, 2400);
    }
  }, []);

  // Intersection observer
  useEffect(() => {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting && e.intersectionRatio > 0.38) {
          const idx = Number((e.target as HTMLElement).dataset.idx);
          if (!isNaN(idx)) triggerScene(idx);
        }
      });
    }, { threshold: 0.38 });
    sceneRefs.current.forEach(el => { if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [triggerScene]);

  const getVisual = (idx: number): React.ReactNode => {
    // 0: blank exam paper
    if (idx === 0) return <ExamPaper active={cs >= 0} scores={[false, false, false]} stampShow={false} stampBurst={false} dimmed={false} />;
    // 1: exam paper with stamp + red marks
    if (idx === 1) return <ExamPaper active={cs >= 1} scores={scores} stampShow={stampShow} stampBurst={stampBurst} dimmed={false} />;
    // 2: QED diagnosis card
    if (idx === 2) return <DiagnosisCard show={cs >= 2} />;
    // 3: 97% stat
    if (idx === 3) return <StatsVisual show={cs >= 3} />;
    // 4: SVG checkmark / insight circle
    if (idx === 4) return (
      <svg width="140" height="140" viewBox="0 0 100 100">
        <motion.circle cx="50" cy="50" r="40" stroke="#F5A623" strokeWidth="1.5" fill="none"
          strokeDasharray="251" initial={{ strokeDashoffset: 251 }}
          animate={cs >= 4 ? { strokeDashoffset: 0 } : {}} transition={{ duration: 2, ease: "easeInOut" }} />
        <motion.path d="M28 50 L44 66 L72 34" stroke="#00C853" strokeWidth="4" fill="none" strokeLinecap="round"
          initial={{ pathLength: 0 }} animate={cs >= 4 ? { pathLength: 1 } : {}} transition={{ delay: 1.2, duration: .8 }} />
        <motion.text x="50" y="85" textAnchor="middle" fill="rgba(245,166,35,.6)" fontSize="7"
          fontFamily="'IBM Plex Mono',monospace" letterSpacing="1"
          initial={{ opacity: 0 }} animate={cs >= 4 ? { opacity: 1 } : {}} transition={{ delay: 2 }}
        >QED_SEES_YOU</motion.text>
      </svg>
    );
    // 5: Diagnostic panel
    if (idx === 5) return <DiagPanel show={diagShow} rows={diagRows} />;
    // 6: Mistake cards
    if (idx === 6) return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 320 }}>
        {CARD_DATA.map((d, i) => <MistakeCard key={i} show={cards[i]} data={d} rot={(i % 2 === 0 ? -4 : 3)} />)}
      </div>
    );
    // 7: Comparison
    if (idx === 7) return <ComparisonDisplay show={cs >= 7} />;
    // 8: Journey path
    if (idx === 8) return <JourneyPath show={cs >= 8} />;
    // 9: Score counter
    if (idx === 9) return <ScoreCounter val={scoreVal} show={scoreFX} />;
    return null;
  };

  return (
    <div dir="rtl" style={{ position: "relative", background: "radial-gradient(ellipse 100% 120% at 20% 30%,#1A1008 0%,#080706 100%)", fontFamily: "'Cairo',sans-serif", minHeight: "100vh" }}>
      <style>{`
        @keyframes qed-grain{0%{transform:translate(0,0)}20%{transform:translate(-2px,3px)}40%{transform:translate(3px,-1px)}60%{transform:translate(-1px,-3px)}80%{transform:translate(4px,2px)}100%{transform:translate(-3px,1px)}}
        @keyframes qed-float{0%{transform:translateY(0) rotate(0deg);opacity:0;}10%{opacity:1;}90%{opacity:.4;}100%{transform:translateY(-110vh) rotate(360deg);opacity:0;}}
        @keyframes qed-scan{from{top:0}to{top:100%}}
        @keyframes qed-conf-fall{0%{transform:translateY(0) rotateZ(0deg);opacity:1;}100%{transform:translateY(115vh) rotateZ(720deg);opacity:.1;}}
        @keyframes qed-stamp-burst{0%{box-shadow:0 0 0 0 rgba(196,40,26,.9),0 4px 16px rgba(196,40,26,.4);}50%{box-shadow:0 0 0 14px rgba(196,40,26,0),0 4px 40px rgba(196,40,26,.7);}100%{box-shadow:0 0 0 0 rgba(196,40,26,0),0 4px 16px rgba(196,40,26,.4);}}
        @keyframes qed-pulse{0%,100%{opacity:.5}50%{opacity:1}}
        .qed-stamp-burst{animation:qed-stamp-burst .5s ease-out;}
      `}</style>

      {/* Film grain */}
      <div style={{ position: "fixed", inset: 0, zIndex: 200, pointerEvents: "none", opacity: .028, backgroundImage: GRAIN, animation: "qed-grain .12s steps(1) infinite" }} />
      {/* Subgrid */}
      <div style={{ position: "fixed", inset: 0, zIndex: 1, pointerEvents: "none", backgroundImage: "repeating-linear-gradient(89deg,transparent 0,transparent 55px,rgba(255,255,255,.004) 55px,rgba(255,255,255,.004) 56px),repeating-linear-gradient(91deg,transparent 0,transparent 38px,rgba(0,0,0,.01) 38px,rgba(0,0,0,.01) 39px)" }} />
      {/* Vignette */}
      <div style={{ position: "fixed", inset: 0, zIndex: 2, pointerEvents: "none", background: "radial-gradient(ellipse 100% 100% at 50% 50%,transparent 35%,rgba(0,0,0,.82) 100%)" }} />

      {/* Math particles */}
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 3 }}>
        {particles.map(p => <div key={p.id} style={{ position: "absolute", fontFamily: "'Amiri',serif", color: "rgba(245,166,35,.055)", fontSize: p.sz, left: p.left, bottom: -p.sz, animation: `qed-float ${p.dur}s ${p.delay}s linear infinite` }}>{p.sym}</div>)}
      </div>

      {/* Confetti */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 160, overflow: "hidden" }}>
        {confetti.map(c => <div key={c.id} style={{ position: "absolute", top: -12, left: c.left, background: c.color, width: c.w, height: c.h, borderRadius: c.round ? "50%" : 1, animation: `qed-conf-fall ${c.dur}s linear forwards` }} />)}
      </div>

      {/* Progress pills */}
      <div style={{ position: "fixed", left: 20, top: "50%", transform: "translateY(-50%)", display: "flex", flexDirection: "column", gap: 5, zIndex: 100 }}>
        {SCENES.map((_, i) => <div key={i} style={{ width: i === cs ? 18 : 5, height: 5, borderRadius: 3, background: i <= cs ? "#F5A623" : "rgba(255,255,255,.1)", transition: "all .4s cubic-bezier(.2,.8,.2,1)", boxShadow: i === cs ? "0 0 8px rgba(245,166,35,.7)" : "none" }} />)}
      </div>

      {/* Audio hint */}
      <AnimatePresence>
        {!audioUnlocked && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 120, fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, letterSpacing: "0.18em", color: "rgba(245,166,35,.5)", background: "rgba(8,7,6,.85)", padding: "6px 18px", borderRadius: 20, border: "1px solid rgba(245,166,35,.15)", animation: "qed-pulse 2s ease-in-out infinite", whiteSpace: "nowrap" }}
          >↓ مرّر لتفعيل الصوت</motion.div>
        )}
      </AnimatePresence>

      {/* ── Layout ── */}
      <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 64px 0 48px", position: "relative", zIndex: 10 }}>

        {/* ── Hero ── */}
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-end", paddingTop: 40, paddingRight: 20 }}>
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1.1, delay: .35 }}
            style={{ maxWidth: 680, textAlign: "right" }}
          >
            {/* Badge */}
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <div style={{ height: 1, width: 40, background: "rgba(245,166,35,.3)" }} />
              <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, letterSpacing: "0.3em", color: "rgba(245,166,35,.45)" }}>BAC 2025 · ALGERIA · DIAGNOSTIC SYSTEM</span>
            </div>

            <h1 style={{ fontFamily: "'Cairo',sans-serif", fontSize: "clamp(42px,9vw,82px)", fontWeight: 900, color: "#F5F0E6", lineHeight: 1.0, marginBottom: 16, direction: "rtl" }}>
              وين راحت{" "}
              <span style={{ color: "#C4281A", textShadow: "0 0 30px rgba(196,40,26,.55),0 0 60px rgba(196,40,26,.2)" }}>نقاطك؟</span>
              <br />
              <span style={{ fontSize: "0.62em", color: "rgba(240,235,220,.55)", fontWeight: 700 }}>صحّح النمط المفقود.</span>
            </h1>

            <p style={{ fontFamily: "'Amiri',serif", fontSize: "clamp(14px,2.5vw,20px)", color: "rgba(240,235,220,.5)", direction: "rtl", maxWidth: 560, lineHeight: 1.75, marginBottom: 32 }}>
              المشكلة ماشي في الذكاء تاعك. QED يقرأ ورقتك، يحدد الأنماط المتكررة لي تسرق لك نقاطك وحافزك في كل امتحان، ويرسم لك مساراً لاسترجاعها.
            </p>

            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: .96 }}>
              <Link to="/home" style={{ display: "inline-block", padding: "17px 42px", borderRadius: 10, background: "linear-gradient(135deg,#F5A623,#FF8C00)", color: "#080706", fontFamily: "'Cairo',sans-serif", fontWeight: 900, textDecoration: "none", fontSize: "clamp(15px,2.5vw,19px)", boxShadow: "0 10px 32px rgba(245,166,35,.35)", letterSpacing: ".01em", direction: "rtl" }}>
                اكتشف ثغراتك — ٥ دقائق ←
              </Link>
            </motion.div>
          </motion.div>

          {/* Scroll cue */}
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 2 }}
            style={{ position: "absolute", bottom: 44, left: "50%", transform: "translateX(-50%)", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}
          >
            <div style={{ width: 18, height: 30, borderRadius: 9, border: "2px solid rgba(245,166,35,.22)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: 3 }}>
              <motion.div animate={{ y: [0, 9, 0] }} transition={{ repeat: Infinity, duration: 2 }} style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(245,166,35,.35)" }} />
            </div>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 7, letterSpacing: "0.22em", color: "rgba(245,166,35,.25)" }}>SCROLL</div>
          </motion.div>
        </div>

        {/* ── 10 Scene Panels ── */}
        {SCENES.map((sc, idx) => {
          const isActive = cs === idx;
          const isPassed = cs > idx;
          const flip = idx % 2 !== 0;

          return (
            <div key={idx} ref={el => { sceneRefs.current[idx] = el; }} data-idx={idx}
              style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px 0" }}
            >
              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={isActive || isPassed ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
                transition={{ duration: .7, ease: [.2, .8, .2, 1] }}
                style={{
                  display: "flex", flexDirection: flip ? "row-reverse" : "row",
                  gap: 48, alignItems: "center",
                  background: isActive ? "rgba(245,166,35,.025)" : "transparent",
                  borderRadius: 20, padding: "28px 20px",
                  border: isActive ? "1px solid rgba(245,166,35,.08)" : "1px solid transparent",
                  transition: "background .6s,border-color .6s",
                }}
              >
                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9.5, letterSpacing: "0.28em", color: isActive ? "rgba(245,166,35,.65)" : "rgba(245,166,35,.2)", marginBottom: 8, transition: "color .5s" }}>
                    — {sc.num} —
                  </div>
                  <div style={{ fontFamily: "'Cairo',sans-serif", fontSize: "clamp(20px,4.5vw,38px)", fontWeight: 900, color: isActive ? "rgba(245,166,35,.92)" : "rgba(245,166,35,.22)", lineHeight: 1.15, marginBottom: 12, transition: "color .5s", direction: "rtl" }}>
                    {sc.title}
                  </div>
                  <div style={{ fontFamily: "'Amiri',serif", fontSize: "clamp(13px,2.2vw,18px)", color: isActive ? "rgba(240,235,220,.75)" : "rgba(240,235,220,.12)", lineHeight: 1.8, transition: "color .6s", direction: "rtl", whiteSpace: "pre-line" }}>
                    {sc.ar}
                  </div>
                  {isActive && (
                    <motion.div initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: .8, delay: .3 }}
                      style={{ height: 1, background: "linear-gradient(90deg,rgba(245,166,35,.5),transparent)", marginTop: 20, transformOrigin: "right" }}
                    />
                  )}
                </div>

                {/* Visual */}
                <div style={{ flexShrink: 0, display: "flex", justifyContent: "center", alignItems: "center", minWidth: 200, maxWidth: 380 }}>
                  {getVisual(idx)}
                </div>
              </motion.div>

              {idx < 9 && (
                <div style={{ height: 1, background: "linear-gradient(90deg,transparent,rgba(245,166,35,.1),transparent)", marginTop: 32 }} />
              )}
            </div>
          );
        })}

        {/* ── Final CTA ── */}
        <div style={{ minHeight: "85vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", padding: "80px 0" }}>
          <motion.div initial={{ opacity: 0, scale: .95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }}>
            <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, letterSpacing: "0.3em", color: "rgba(245,166,35,.3)", marginBottom: 16 }}>READY TO RESTORE YOUR MOTIVATION?</div>
            <h2 style={{ fontFamily: "'Cairo',sans-serif", fontSize: "clamp(28px,6.5vw,56px)", fontWeight: 900, color: "#F5F0E6", lineHeight: 1.15, marginBottom: 20, direction: "rtl" }}>
              المشكلة الحقيقية ماشي في البرنامج،
              <br />
              <span style={{ color: "rgba(240,235,220,.45)", fontWeight: 700, fontSize: "0.7em" }}>المشكلة أن لا أحد يرى أين يضيع الحافز.</span>
            </h2>
            <p style={{ fontFamily: "'Amiri',serif", fontSize: "clamp(14px,2.4vw,19px)", color: "rgba(240,235,220,.42)", marginBottom: 40, maxWidth: 520, direction: "rtl", lineHeight: 1.75 }}>
              QED يرى الاثنين: يرى نقاطك، ويرى طريقك لاسترجاع شغفك. ابدأ التشخيص المجاني الآن (5 دقائق).
            </p>
            <Link to="/home"
              style={{ display: "inline-block", padding: "20px 56px", borderRadius: 12, fontFamily: "'Cairo',sans-serif", fontSize: "clamp(16px,2.8vw,22px)", fontWeight: 900, color: "#080706", background: "linear-gradient(135deg,#F5A623,#FF8C00)", boxShadow: "0 0 40px rgba(245,166,35,.4),0 14px 44px rgba(0,0,0,.55)", textDecoration: "none", direction: "rtl", transition: "transform .2s,box-shadow .2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1.05)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 60px rgba(245,166,35,.65),0 18px 52px rgba(0,0,0,.65)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 40px rgba(245,166,35,.4),0 14px 44px rgba(0,0,0,.55)"; }}
            >
              اكتشف ثغراتك الآن — مجاني ←
            </Link>
            <div style={{ marginTop: 18, fontSize: 10, color: "rgba(240,235,220,.28)", fontFamily: "'IBM Plex Mono',monospace", letterSpacing: "0.1em" }}>
              بدون حساب · بدون بطاقة بنكية · نتائج فورية
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: "center", padding: "28px 24px", borderTop: "1px solid rgba(245,166,35,.07)", fontFamily: "'IBM Plex Mono',monospace", fontSize: 8.5, letterSpacing: "0.16em", color: "rgba(245,166,35,.2)" }}>
        © 2025 QED ALGERIA · DATA-DRIVEN EDUCATION · مبني بحب للطالب الجزائري 🇩🇿
      </div>
    </div>
  );
}

export default function Landing() {
  useFonts();
  return <VerticalStory />;
}
