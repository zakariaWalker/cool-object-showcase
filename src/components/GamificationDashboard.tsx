// ===== Gamification Dashboard — Visual progress, streaks, badges, daily challenge =====
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  loadProgress, StudentStats, BADGES, Badge,
  xpProgress, LEVEL_TITLES, getDailyChallenge, completeDailyChallenge,
} from "@/engine/gamification";
import { ExerciseRenderer } from "./ExerciseRenderer";

interface GamificationDashboardProps {
  onStartDailyChallenge?: (exerciseId: string) => void;
  compact?: boolean;
}

export function GamificationDashboard({ onStartDailyChallenge, compact = false }: GamificationDashboardProps) {
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [dailyChallenge, setDailyChallenge] = useState<any>(null);
  const [showBadges, setShowBadges] = useState(false);

  useEffect(() => {
    loadProgress().then(setStats);
    getDailyChallenge().then(setDailyChallenge);
  }, []);

  if (!stats) return null;

  const progress = xpProgress(stats.xp);
  const title = LEVEL_TITLES[Math.min(stats.level, LEVEL_TITLES.length - 1)] || "أسطورة";
  const accuracy = stats.total_exercises > 0 ? Math.round((stats.total_correct / stats.total_exercises) * 100) : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-3 px-4 py-2 bg-card/50 border-b border-border" dir="rtl">
        {/* Streak */}
        <div className="flex items-center gap-1.5">
          <span className={`text-sm ${stats.streak_days > 0 ? "animate-pulse" : ""}`}>
            {stats.streak_days > 0 ? "🔥" : "❄️"}
          </span>
          <span className="text-xs font-black text-foreground">{stats.streak_days}</span>
        </div>

        {/* Level + XP bar */}
        <div className="flex items-center gap-2 flex-1">
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
            م{stats.level}
          </span>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden max-w-[120px]">
            <motion.div
              className="h-full bg-gradient-to-l from-primary/80 to-purple-400/70 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress.percent}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground font-mono">{stats.xp} XP</span>
        </div>

        {/* Badges count */}
        <div className="flex items-center gap-1">
          <span className="text-xs">🏆</span>
          <span className="text-[10px] font-bold text-foreground">{stats.badges.length}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      {/* Hero stats card */}
      <div className="rounded-2xl border border-border bg-gradient-to-bl from-primary/5 via-card to-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Level badge */}
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/80 to-purple-400 flex items-center justify-center text-white shadow-lg">
                <span className="text-xl font-black">{stats.level}</span>
              </div>
              {stats.streak_days > 0 && (
                <motion.div
                  className="absolute -top-1 -left-1 w-6 h-6 rounded-full bg-orange-400 flex items-center justify-center text-[10px] shadow-md border-2 border-card"
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                >
                  🔥
                </motion.div>
              )}
            </div>
            <div>
              <div className="text-base font-black text-foreground">{title}</div>
              <div className="text-[10px] text-muted-foreground">المستوى {stats.level}</div>
            </div>
          </div>

          {/* Streak */}
          <div className="text-center">
            <div className={`text-2xl font-black ${stats.streak_days > 0 ? "text-orange-400" : "text-muted-foreground"}`}>
              {stats.streak_days}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {stats.streak_days > 0 ? "يوم متتالي 🔥" : "ابدأ سلسلتك!"}
            </div>
          </div>
        </div>

        {/* XP Progress */}
        <div>
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>{stats.xp} XP</span>
            <span>المستوى {stats.level + 1}: {progress.next} XP</span>
          </div>
          <div className="h-3 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-l from-primary/80 via-purple-400/70 to-pink-400/60 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress.percent}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          <QuickStat value={stats.total_exercises} label="تمرين محلول" emoji="📝" />
          <QuickStat value={`${accuracy}%`} label="نسبة الصحة" emoji="🎯" />
          <QuickStat value={stats.badges.length} label="شارة" emoji="🏆" />
        </div>
      </div>

      {/* Daily Challenge */}
      {dailyChallenge && (
        <div className="rounded-2xl border-2 border-dashed border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <motion.span
              className="text-lg"
              animate={{ rotate: [0, -10, 10, 0] }}
              transition={{ repeat: Infinity, duration: 3 }}
            >
              📅
            </motion.span>
            <span className="text-sm font-black text-foreground">تحدي اليوم</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 font-bold">
              +{50} XP
            </span>
          </div>
          <div className="text-xs text-foreground leading-relaxed mb-3 line-clamp-3">
            <ExerciseRenderer text={dailyChallenge.text} />
          </div>
          {onStartDailyChallenge && (
            <button
              onClick={() => onStartDailyChallenge(dailyChallenge.exerciseId)}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-primary-foreground bg-gradient-to-l from-amber-400 to-orange-400 hover:opacity-90 transition-all shadow-md"
            >
              🚀 ابدأ التحدي
            </button>
          )}
        </div>
      )}

      {/* Badges */}
      <div>
        <button
          onClick={() => setShowBadges(!showBadges)}
          className="flex items-center gap-2 mb-3 group"
        >
          <span className="text-sm">🏆</span>
          <span className="text-sm font-bold text-foreground">الشارات والإنجازات</span>
          <span className="text-[10px] text-muted-foreground">
            {stats.badges.length} / {BADGES.length}
          </span>
          <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
            {showBadges ? "▲" : "▼"}
          </span>
        </button>

        <AnimatePresence>
          {showBadges && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-3 gap-2">
                {BADGES.map(badge => {
                  const earned = stats.badges.includes(badge.id);
                  return (
                    <div
                      key={badge.id}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        earned
                          ? "border-primary/30 bg-primary/5"
                          : "border-border bg-muted/30 opacity-40"
                      }`}
                    >
                      <div className="text-2xl mb-1">{earned ? badge.emoji : "🔒"}</div>
                      <div className="text-[10px] font-bold text-foreground">{badge.name}</div>
                      <div className="text-[9px] text-muted-foreground mt-0.5">{badge.description}</div>
                      {earned && (
                        <div className={`text-[8px] mt-1 px-1.5 py-0.5 rounded-full inline-block font-bold ${
                          badge.tier === "diamond" ? "bg-blue-500/20 text-blue-500"
                          : badge.tier === "gold" ? "bg-amber-500/20 text-amber-600"
                          : badge.tier === "silver" ? "bg-gray-400/20 text-gray-500"
                          : "bg-orange-500/20 text-orange-600"
                        }`}>
                          {badge.tier === "diamond" ? "💎" : badge.tier === "gold" ? "🥇" : badge.tier === "silver" ? "🥈" : "🥉"}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function QuickStat({ value, label, emoji }: { value: string | number; label: string; emoji: string }) {
  return (
    <div className="text-center p-2 rounded-xl bg-muted/30">
      <div className="text-xs mb-0.5">{emoji}</div>
      <div className="text-sm font-black text-foreground">{value}</div>
      <div className="text-[9px] text-muted-foreground">{label}</div>
    </div>
  );
}

// ===== XP Popup — Shows when XP is earned =====
export function XPPopup({ events, onDone }: { events: { type: string; xp: number; label: string }[]; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  if (events.length === 0) return null;

  const totalXP = events.reduce((s, e) => s + e.xp, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed bottom-6 right-6 z-50"
      dir="rtl"
    >
      <div className="rounded-2xl bg-card border border-primary/30 shadow-2xl p-4 min-w-[200px]">
        <div className="flex items-center gap-2 mb-2">
          <motion.span
            className="text-xl"
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ repeat: 2, duration: 0.4 }}
          >
            ⭐
          </motion.span>
          <span className="text-lg font-black text-primary">+{totalXP} XP</span>
        </div>
        <div className="space-y-1">
          {events.map((e, i) => (
            <div key={i} className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <span className="text-primary font-bold">+{e.xp}</span>
              <span>{e.label}</span>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ===== Badge Unlock Animation =====
export function BadgeUnlockOverlay({ badge, onDone }: { badge: Badge; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 4000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onDone}
    >
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", damping: 12 }}
        className="bg-card rounded-3xl border-2 border-primary/40 p-8 text-center shadow-2xl max-w-xs"
        dir="rtl"
      >
        <motion.div
          className="text-6xl mb-4"
          animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
          transition={{ repeat: 2, duration: 0.6 }}
        >
          {badge.emoji}
        </motion.div>
        <div className="text-xs text-primary font-bold mb-1">🎉 شارة جديدة!</div>
        <div className="text-lg font-black text-foreground mb-1">{badge.name}</div>
        <div className="text-xs text-muted-foreground">{badge.description}</div>
        <div className={`mt-3 inline-block text-[10px] px-3 py-1 rounded-full font-bold ${
          badge.tier === "diamond" ? "bg-blue-500/20 text-blue-500"
          : badge.tier === "gold" ? "bg-amber-500/20 text-amber-600"
          : badge.tier === "silver" ? "bg-gray-400/20 text-gray-500"
          : "bg-orange-500/20 text-orange-600"
        }`}>
          {badge.tier === "diamond" ? "💎 ماسي" : badge.tier === "gold" ? "🥇 ذهبي" : badge.tier === "silver" ? "🥈 فضي" : "🥉 برونزي"}
        </div>
      </motion.div>
    </motion.div>
  );
}
