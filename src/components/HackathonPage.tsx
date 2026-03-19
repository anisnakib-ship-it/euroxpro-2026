"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  ArrowLeft, Zap, RefreshCw, TrendingUp, Trophy, Star, Activity,
} from "lucide-react";
import {
  useHackathonData, countByKey, buildComparison,
  GOAL_TOTAL, HACK_LABEL, COMP_LABEL,
} from "@/hooks/useHackathonData";
import { Application } from "@/lib/api";

// ── Floating orbs (same as EntrancePage) ──────────────────────────────────────

const ORBS = [
  { color: "#674ea7", size: 900, x: "6%",   y: "8%",   blur: 160, opacity: 0.22, dur: 20, delay: 0 },
  { color: "#037EF3", size: 700, x: "60%",  y: "-8%",  blur: 140, opacity: 0.14, dur: 26, delay: 2 },
  { color: "#F85A40", size: 450, x: "82%",  y: "58%",  blur: 110, opacity: 0.09, dur: 17, delay: 6 },
  { color: "#0CB9C1", size: 520, x: "2%",   y: "65%",  blur: 130, opacity: 0.11, dur: 22, delay: 9 },
  { color: "#F48924", size: 360, x: "40%",  y: "80%",  blur: 100, opacity: 0.08, dur: 15, delay: 4 },
  { color: "#674ea7", size: 650, x: "46%",  y: "-12%", blur: 150, opacity: 0.13, dur: 24, delay: 7 },
  { color: "#037EF3", size: 300, x: "22%",  y: "40%",  blur: 90,  opacity: 0.06, dur: 18, delay: 11 },
];

function FloatingOrbs() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {ORBS.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: orb.size, height: orb.size,
            left: orb.x, top: orb.y,
            background: orb.color,
            opacity: orb.opacity,
            filter: `blur(${orb.blur}px)`,
            willChange: "transform",
          }}
          animate={{ x: [0, 50, -30, 0], y: [0, -40, 25, 0], scale: [1, 1.12, 0.93, 1] }}
          transition={{ duration: orb.dur, delay: orb.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function GridOverlay() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        opacity: 0.028,
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.35) 1px, transparent 1px)",
        backgroundSize: "52px 52px",
      }}
    />
  );
}

function ScanSweep() {
  return (
    <motion.div
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        background:
          "linear-gradient(108deg, transparent 38%, rgba(103,78,167,0.055) 50%, transparent 62%)",
      }}
      animate={{ x: ["-100%", "230%"] }}
      transition={{ duration: 8, repeat: Infinity, ease: "linear", repeatDelay: 7 }}
    />
  );
}

// ── Count-up hook ──────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1200): number {
  const [count, setCount] = useState(0);
  const prevTarget = useRef(0);

  useEffect(() => {
    if (target === prevTarget.current) return;
    prevTarget.current = target;
    const start = Date.now();
    const from = count;
    const diff = target - from;
    if (diff === 0) return;

    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(from + diff * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return count;
}

// ── Auto-refresh countdown ─────────────────────────────────────────────────────

const INTERVAL_MS = 5 * 60 * 1000;

function AutoRefreshCountdown({ since }: { since: Date | null }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!since) return null;
  const secsLeft = Math.max(0, Math.ceil((since.getTime() + INTERVAL_MS - Date.now()) / 1000));
  const mins = Math.floor(secsLeft / 60);
  const secs = secsLeft % 60;
  return (
    <span className="text-white/20 text-[10px] font-data tabular-nums">
      {mins}:{secs.toString().padStart(2, "0")}
    </span>
  );
}

// ── Days remaining ─────────────────────────────────────────────────────────────

function daysRemaining(): number {
  const end = new Date("2026-03-31T23:59:59Z");
  const now = new Date();
  return Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

// ── Glassmorphism card ─────────────────────────────────────────────────────────

function GlassCard({
  children,
  className = "",
  style = {},
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-2xl ${className}`}
      style={{
        background: "rgba(255,255,255,0.025)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.07)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ── Delta badge ────────────────────────────────────────────────────────────────

function DeltaBadge({ delta, pct }: { delta: number; pct?: number }) {
  const positive = delta >= 0;
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{
        background: positive ? "rgba(52,211,153,0.15)" : "rgba(248,90,64,0.15)",
        color: positive ? "#34d399" : "#F85A40",
        border: `1px solid ${positive ? "rgba(52,211,153,0.25)" : "rgba(248,90,64,0.25)"}`,
      }}
    >
      {positive ? "+" : ""}
      {delta}
      {pct !== undefined && ` (${positive ? "+" : ""}${pct.toFixed(1)}%)`}
    </span>
  );
}

// ── Skeleton ───────────────────────────────────────────────────────────────────

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-lg shimmer-bg ${className}`}
      style={{ background: "rgba(255,255,255,0.06)" }}
    />
  );
}

// ── Custom recharts tooltip ────────────────────────────────────────────────────

interface TooltipEntry {
  payload?: { cumulative?: number; count?: number };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const { cumulative = 0, count = 0 } = payload[0]?.payload ?? {};
  const pct = ((cumulative / GOAL_TOTAL) * 100).toFixed(1);
  return (
    <div
      className="rounded-xl px-3 py-2.5 text-xs space-y-1"
      style={{
        background: "rgba(5,8,16,0.92)",
        border: "1px solid rgba(103,78,167,0.4)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="font-bold text-white/80">{label}</div>
      <div className="text-white/50">Daily new: <span className="text-[#a78bfa] font-bold">{count}</span></div>
      <div className="text-white/50">Cumulative: <span className="text-white font-bold">{cumulative.toLocaleString()}</span></div>
      <div className="text-white/50">% of goal: <span className="text-[#34d399] font-bold">{pct}%</span></div>
    </div>
  );
}

// ── Rankings card ──────────────────────────────────────────────────────────────

interface RankItem {
  name: string;
  this_year: number;
  last_year: number;
  delta: number;
}

function RankingCard({
  title,
  icon: Icon,
  items,
  loading,
  variant,
}: {
  title: string;
  icon: React.ElementType;
  items: RankItem[];
  loading: boolean;
  variant: "growth" | "zero";
}) {
  const maxCount = items.length > 0 ? Math.max(...items.map((i) => i.this_year)) : 1;

  return (
    <GlassCard className="p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <div
          className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0"
          style={{
            background: variant === "growth" ? "rgba(103,78,167,0.2)" : "rgba(52,211,153,0.15)",
            border: `1px solid ${variant === "growth" ? "rgba(103,78,167,0.35)" : "rgba(52,211,153,0.25)"}`,
          }}
        >
          <Icon
            className="w-3.5 h-3.5"
            style={{ color: variant === "growth" ? "#a78bfa" : "#34d399" }}
          />
        </div>
        <span className="text-xs font-bold text-white/70 tracking-wide">{title}</span>
      </div>

      {/* List */}
      <div className="space-y-2">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))
          : items.length === 0
          ? (
            <p className="text-white/25 text-xs text-center py-4">No data yet</p>
          )
          : items.slice(0, 10).map((item, idx) => {
              const barWidth = maxCount > 0 ? (item.this_year / maxCount) * 100 : 0;
              return (
                <div key={item.name} className="relative">
                  {/* Bar */}
                  <motion.div
                    className="absolute inset-0 rounded-md"
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ duration: 0.8, delay: idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      background:
                        variant === "growth"
                          ? "rgba(103,78,167,0.14)"
                          : "rgba(52,211,153,0.12)",
                    }}
                  />
                  {/* Content */}
                  <div className="relative flex items-center gap-2 px-2 py-1.5">
                    <span className="text-[10px] font-bold text-white/25 w-4 flex-shrink-0 tabular-nums">
                      {idx + 1}
                    </span>
                    <span className="text-xs text-white/75 flex-1 truncate">{item.name}</span>
                    <span className="text-xs font-bold text-white tabular-nums flex-shrink-0">
                      {item.this_year}
                    </span>
                    {variant === "growth" ? (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{
                          background: "rgba(52,211,153,0.15)",
                          color: "#34d399",
                        }}
                      >
                        +{item.delta}
                      </span>
                    ) : (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{
                          background: "rgba(52,211,153,0.15)",
                          color: "#34d399",
                        }}
                      >
                        NEW
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
      </div>
    </GlassCard>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function HackathonPage({ onBack }: { onBack: () => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const data = useHackathonData();
  const {
    oGV26, oGTa26, oGTe26,
    iGV26, iGTa26, iGTe26,
    oGV25, oGTa25, oGTe25,
    iGV25, iGTa25, iGTe25,
    total2026, total2025,
    oGX2026, iCX2026,
    oGX2025, iCX2025,
    sparkline, recentApps, loading, refresh,
  } = data;

  // For the auto-refresh countdown we track the last refresh time
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (!loading) {
      setLastRefreshTime(new Date());
      isFirstLoad.current = false;
    }
  }, [loading]);

  // Animated counts
  const animTotal = useCountUp(total2026);
  const animOGX   = useCountUp(oGX2026);
  const animICX   = useCountUp(iCX2026);

  // Progress bar animation
  const progressPct = GOAL_TOTAL > 0 ? Math.min((total2026 / GOAL_TOTAL) * 100, 100) : 0;

  // Days remaining
  const daysLeft = daysRemaining();

  // Deltas
  const totalDelta = total2026 - total2025;
  const totalDeltaPct = total2025 > 0 ? ((totalDelta / total2025) * 100) : 0;
  const oGXDelta = oGX2026 - oGX2025;
  const iCXDelta = iCX2026 - iCX2025;

  // Rankings derivation
  const allOGX26 = [...oGV26, ...oGTa26, ...oGTe26];
  const allICX26 = [...iGV26, ...iGTa26, ...iGTe26];
  const allOGX25 = [...oGV25, ...oGTa25, ...oGTe25];
  const allICX25 = [...iGV25, ...iGTa25, ...iGTe25];
  const all26 = [...allOGX26, ...allICX26];
  const all25 = [...allOGX25, ...allICX25];

  const entityKey26 = (app: Application) =>
    app.person?.home_lc?.country ?? app.home_mc?.country ?? app.home_mc?.name;
  const entityKey25 = entityKey26;
  const lcKeyOGX = (app: Application) => app.person?.home_lc?.name;
  const lcKeyICX = (app: Application) => app.host_lc?.name;
  const lcKey = (app: Application) => lcKeyOGX(app) ?? lcKeyICX(app);

  const entMap26 = countByKey(all26, entityKey26);
  const entMap25 = countByKey(all25, entityKey25);
  const lcMap26  = countByKey(all26, lcKey);
  const lcMap25  = countByKey(all25, lcKey);

  const entComparison = buildComparison(entMap26, entMap25);
  const lcComparison  = buildComparison(lcMap26, lcMap25);

  const growthEntities  = entComparison.filter((x) => x.delta > 0 && x.last_year > 0).sort((a, b) => b.delta - a.delta);
  const growthLCs       = lcComparison.filter((x) => x.delta > 0 && x.last_year > 0).sort((a, b) => b.delta - a.delta);
  const zeroHeroEntities = entComparison.filter((x) => x.last_year === 0 && x.this_year > 0).sort((a, b) => b.this_year - a.this_year);
  const zeroHeroLCs      = lcComparison.filter((x) => x.last_year === 0 && x.this_year > 0).sort((a, b) => b.this_year - a.this_year);

  // Search for approvals log
  const [search, setSearch] = useState("");
  const filteredApps = recentApps.filter((app) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (app.person?.home_lc?.name ?? "").toLowerCase().includes(q) ||
      (app.person?.home_lc?.country ?? "").toLowerCase().includes(q) ||
      (app.home_mc?.name ?? "").toLowerCase().includes(q) ||
      (app.opportunity?.programme?.short_name_display ?? "").toLowerCase().includes(q) ||
      (app.host_lc?.name ?? "").toLowerCase().includes(q) ||
      (app.opportunity?.title ?? "").toLowerCase().includes(q)
    );
  });

  const handleRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="relative min-h-screen" style={{ background: "#050810" }}>
      {/* Background layers */}
      <FloatingOrbs />
      <GridOverlay />
      <ScanSweep />

      {/* Scrollable content */}
      <div className="relative z-10 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">

          {/* ── A. Top Nav Bar ── */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between gap-4"
          >
            {/* Back */}
            <motion.button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer focus-visible:outline-none"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "rgba(255,255,255,0.5)",
              }}
              whileHover={{ scale: 1.04, color: "rgba(255,255,255,0.85)" } as never}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.18 }}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Dashboard</span>
            </motion.button>

            {/* Title */}
            <div className="flex items-center gap-2.5">
              <motion.div
                animate={{ rotate: [0, 18, -12, 18, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 5 }}
              >
                <Zap className="w-5 h-5 text-[#a78bfa]" />
              </motion.div>
              <h1
                className="text-lg md:text-xl font-black tracking-tight"
                style={{
                  background: "linear-gradient(135deg, #ffffff 0%, #c4b5fd 50%, #a78bfa 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Hackathon Tracker
              </h1>
            </div>

            {/* Refresh */}
            <div className="flex items-center gap-2">
              {lastRefreshTime && (
                <div className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-emerald-400/50 inline-block" />
                  <AutoRefreshCountdown since={lastRefreshTime} />
                </div>
              )}
              <motion.button
                onClick={handleRefresh}
                disabled={loading}
                whileHover={!loading ? { scale: 1.05 } : {}}
                whileTap={!loading ? { scale: 0.95 } : {}}
                className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border border-white/10 transition-all duration-200 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
                {loading ? "Loading…" : "Refresh"}
              </motion.button>
            </div>
          </motion.div>

          {/* ── B. Date Comparison Banner ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
          >
            <GlassCard className="px-5 py-3">
              <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#a78bfa]" />
                  <span className="font-bold text-white/80">Hackathon 2026</span>
                </div>
                <div className="h-4 w-px bg-white/10 hidden md:block" />
                <div
                  className="font-data text-xs px-3 py-1 rounded-lg"
                  style={{ background: "rgba(103,78,167,0.18)", border: "1px solid rgba(103,78,167,0.3)", color: "#a78bfa" }}
                >
                  {HACK_LABEL}
                </div>
                <span className="text-white/30 text-xs font-bold">vs</span>
                <div
                  className="font-data text-xs px-3 py-1 rounded-lg"
                  style={{ background: "rgba(3,126,243,0.12)", border: "1px solid rgba(3,126,243,0.25)", color: "#60a5fa" }}
                >
                  {COMP_LABEL}
                </div>
                <div className="h-4 w-px bg-white/10 hidden md:block" />
                <span className="font-bold text-white/50">Xpro 2025</span>
                {loading && (
                  <span className="text-[10px] text-white/30 font-data animate-pulse">fetching…</span>
                )}
              </div>
            </GlassCard>
          </motion.div>

          {/* ── C. GOAL CARD ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <GlassCard
              style={{
                background: "rgba(103,78,167,0.06)",
                border: "1px solid rgba(103,78,167,0.25)",
                boxShadow: "0 0 60px rgba(103,78,167,0.12), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              {/* Top stats section */}
              <div className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
                {/* Left: big number */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span
                      className="text-6xl md:text-7xl font-black tabular-nums"
                      style={{ color: "#a78bfa" }}
                    >
                      {loading ? "—" : animTotal.toLocaleString()}
                    </span>
                    <span className="text-2xl font-bold text-white/25">
                      / {GOAL_TOTAL.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs text-white/40">
                      oGX:{" "}
                      <span className="text-[#a78bfa] font-bold">
                        {loading ? "—" : animOGX.toLocaleString()}
                      </span>
                    </span>
                    <span className="text-white/15">·</span>
                    <span className="text-xs text-white/40">
                      iCX:{" "}
                      <span className="text-[#60a5fa] font-bold">
                        {loading ? "—" : animICX.toLocaleString()}
                      </span>
                    </span>
                  </div>
                </div>

                {/* Right: percentage + meta */}
                <div className="flex flex-col items-start md:items-end gap-3">
                  {/* Big pct badge */}
                  <div
                    className="text-4xl font-black tabular-nums px-5 py-2 rounded-2xl"
                    style={{
                      background: "linear-gradient(135deg, rgba(103,78,167,0.25), rgba(3,126,243,0.15))",
                      border: "1px solid rgba(103,78,167,0.35)",
                      color: "#a78bfa",
                    }}
                  >
                    {loading ? "—" : `${progressPct.toFixed(1)}%`}
                  </div>

                  {/* vs 2025 delta */}
                  {!loading && (
                    <DeltaBadge delta={totalDelta} pct={totalDeltaPct} />
                  )}

                  {/* Days remaining */}
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3 h-3 text-white/25" />
                    <span className="text-xs text-white/35 font-data">
                      {daysLeft === 0 ? "Hackathon ended" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} remaining`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="px-6 pb-4">
                <div
                  className="h-2 rounded-full overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                >
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      background: "linear-gradient(90deg, #674ea7, #037EF3)",
                      boxShadow: "0 0 12px rgba(103,78,167,0.6)",
                    }}
                  />
                </div>
              </div>

              {/* Chart section */}
              <div className="px-4 pb-6 relative" style={{ height: 300 }}>
                {mounted && <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparkline} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#674ea7" stopOpacity={0.5} />
                        <stop offset="95%" stopColor="#674ea7" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      domain={[0, 1300]}
                      tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <ReferenceLine
                      y={GOAL_TOTAL}
                      stroke="rgba(248,90,64,0.6)"
                      strokeDasharray="5 5"
                      label={{
                        value: "Goal 1,200",
                        position: "right",
                        fill: "rgba(248,90,64,0.65)",
                        fontSize: 10,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="cumulative"
                      stroke="#a78bfa"
                      strokeWidth={2}
                      fill="url(#purpleGrad)"
                      dot={false}
                      activeDot={{ r: 4, fill: "#a78bfa", stroke: "rgba(103,78,167,0.5)", strokeWidth: 6 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>}

                {/* No-data overlay */}
                <AnimatePresence>
                  {total2026 === 0 && !loading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                      style={{ background: "rgba(5,8,16,0.5)", backdropFilter: "blur(4px)" }}
                    >
                      <motion.div
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      >
                        <Zap className="w-8 h-8 text-[#a78bfa]/40" />
                      </motion.div>
                      <p className="text-white/30 text-sm font-semibold">Awaiting data</p>
                      <p className="text-white/20 text-xs font-data">Hackathon starts March 23, 2026</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </GlassCard>
          </motion.div>

          {/* ── D. Stats Row ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              {
                label: "Combined 2026",
                value: total2026,
                anim: animTotal,
                vs: total2025,
                delta: totalDelta,
                color: "#a78bfa",
              },
              {
                label: "oGX 2026",
                value: oGX2026,
                anim: animOGX,
                vs: oGX2025,
                delta: oGXDelta,
                color: "#674ea7",
              },
              {
                label: "iCX 2026",
                value: iCX2026,
                anim: animICX,
                vs: iCX2025,
                delta: iCXDelta,
                color: "#037EF3",
              },
              {
                label: "Days Remaining",
                value: daysLeft,
                anim: daysLeft,
                vs: null,
                delta: null,
                color: "#34d399",
              },
            ].map((stat, i) => (
              <GlassCard key={stat.label} className="p-4 flex flex-col gap-2">
                <span
                  className="text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                >
                  {stat.label}
                </span>
                <span
                  className="text-3xl font-black tabular-nums"
                  style={{ color: stat.color }}
                >
                  {loading && i < 3 ? "—" : stat.anim.toLocaleString()}
                </span>
                {stat.vs !== null && stat.delta !== null && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-white/25">vs {stat.vs.toLocaleString()}</span>
                    {!loading && <DeltaBadge delta={stat.delta} />}
                  </div>
                )}
                {stat.label === "Days Remaining" && (
                  <span className="text-[10px] text-white/25">until Mar 31</span>
                )}
              </GlassCard>
            ))}
          </motion.div>

          {/* ── E. Rankings Section ── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.2 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#a78bfa]" />
              <h2 className="text-sm font-bold text-white/60 uppercase tracking-widest">
                Growth &amp; Zero to Hero
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <RankingCard
                title="Growing Entities"
                icon={TrendingUp}
                items={growthEntities}
                loading={loading}
                variant="growth"
              />
              <RankingCard
                title="Growing LCs"
                icon={TrendingUp}
                items={growthLCs}
                loading={loading}
                variant="growth"
              />
              <RankingCard
                title="Zero to Hero — Entities"
                icon={Star}
                items={zeroHeroEntities}
                loading={loading}
                variant="zero"
              />
              <RankingCard
                title="Zero to Hero — LCs"
                icon={Star}
                items={zeroHeroLCs}
                loading={loading}
                variant="zero"
              />
            </div>
          </motion.div>

          {/* ── F. Approvals Log ── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.25 }}
          >
            <GlassCard className="overflow-hidden">
              {/* Header */}
              <div
                className="flex flex-wrap items-center gap-3 px-4 py-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <Activity className="w-3.5 h-3.5 text-[#a78bfa]" />
                <span className="text-xs font-bold text-white/60 uppercase tracking-widest flex-1">
                  Approvals Log — Hackathon 2026
                </span>
                {/* Search */}
                <input
                  type="text"
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="text-xs rounded-lg px-3 py-1.5 text-white placeholder-white/20 focus:outline-none"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    width: 160,
                  }}
                />
              </div>

              {/* Table */}
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      {["Home LC", "Home MC", "Programme", "Host LC", "Host MC", "Opportunity", "Approved On"].map(
                        (col) => (
                          <th
                            key={col}
                            className="text-left py-2 px-3 font-bold whitespace-nowrap"
                            style={{ color: "rgba(255,255,255,0.3)" }}
                          >
                            {col}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 7 }).map((_, j) => (
                            <td key={j} className="py-2 px-3">
                              <Skeleton className="h-3 w-full" />
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : filteredApps.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-white/25">
                          {recentApps.length === 0
                            ? "No approvals yet for the Hackathon 2026 period."
                            : "No results match your search."}
                        </td>
                      </tr>
                    ) : (
                      filteredApps.map((app, i) => {
                        const prog = app.opportunity?.programme?.short_name_display ?? "—";
                        const progColor =
                          prog === "GV" ? "#F85A40" : prog === "GTa" ? "#0CB9C1" : "#F48924";
                        return (
                          <tr
                            key={app.id}
                            style={{
                              borderBottom: "1px solid rgba(255,255,255,0.03)",
                              background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                            }}
                          >
                            <td className="py-2 px-3 text-white/60 whitespace-nowrap">
                              {app.person?.home_lc?.name ?? "—"}
                            </td>
                            <td className="py-2 px-3 text-white/50 whitespace-nowrap">
                              {app.person?.home_lc?.country ?? "—"}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              <span
                                className="px-1.5 py-0.5 rounded font-bold text-[10px]"
                                style={{
                                  background: `${progColor}18`,
                                  color: progColor,
                                  border: `1px solid ${progColor}30`,
                                }}
                              >
                                {prog}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-white/50 whitespace-nowrap">
                              {app.host_lc?.name ?? "—"}
                            </td>
                            <td className="py-2 px-3 text-white/40 whitespace-nowrap">
                              {app.home_mc?.country ?? app.home_mc?.name ?? "—"}
                            </td>
                            <td className="py-2 px-3 text-white/40 max-w-[180px] truncate">
                              {app.opportunity?.title ?? "—"}
                            </td>
                            <td className="py-2 px-3 text-white/30 whitespace-nowrap font-data">
                              {app.date_approved
                                ? app.date_approved.slice(0, 10)
                                : "—"}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
