"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  ArrowLeft, Flame, RefreshCw, TrendingUp, Trophy, Star, Activity, Globe,
} from "lucide-react";
import {
  useHackathonData, countByKey,
  GOAL_TOTAL, HACK_LABEL, COMP_LABEL,
} from "@/hooks/useHackathonData";
import { Application } from "@/lib/api";
import { computeHostCountryMap, computeOriginCountryMap } from "@/lib/regions";
import RegionalCollaboration from "./dashboard/RegionalCollaboration";

// ── Olympic medal colours ──────────────────────────────────────────────────────

const MEDALS = [
  { color: "#FFD700", bg: "rgba(255,215,0,0.16)",   border: "rgba(255,215,0,0.38)"   },
  { color: "#C0C0C0", bg: "rgba(192,192,192,0.13)", border: "rgba(192,192,192,0.3)"  },
  { color: "#CD7F32", bg: "rgba(205,127,50,0.16)",  border: "rgba(205,127,50,0.33)"  },
] as const;

// ── Programme tabs ─────────────────────────────────────────────────────────────

type TabKey = "all" | "oGV" | "oGTa" | "oGTe" | "iGV" | "iGTa" | "iGTe";
const PROG_TABS: { key: TabKey; label: string; color: string }[] = [
  { key: "all",  label: "All",  color: "#a78bfa" },
  { key: "oGV",  label: "oGV",  color: "#F85A40" },
  { key: "oGTa", label: "oGTa", color: "#0CB9C1" },
  { key: "oGTe", label: "oGTe", color: "#F48924" },
  { key: "iGV",  label: "iGV",  color: "#F85A40" },
  { key: "iGTa", label: "iGTa", color: "#0CB9C1" },
  { key: "iGTe", label: "iGTe", color: "#F48924" },
];

// ── Partner entities (non-European MCs to spotlight) ──────────────────────────

const PARTNER_ENTITIES = [
  { id: "1559", name: "Tunisia",   flag: "\u{1F1F9}\u{1F1F3}" },
  { id: "1625", name: "UAE",       flag: "\u{1F1E6}\u{1F1EA}" },
  { id: "1613", name: "MoC",       flag: "\u{1F1E8}\u{1F1F3}" },
  { id: "530",  name: "Jordan",    flag: "\u{1F1EF}\u{1F1F4}" },
  { id: "1609", name: "Egypt",     flag: "\u{1F1EA}\u{1F1EC}" },
] as const;

type ProgKey = "oGV" | "oGTa" | "oGTe" | "iGV" | "iGTa" | "iGTe";
const PARTNER_PROGS: { key: ProgKey; label: string; color: string }[] = [
  { key: "oGV",  label: "oGV",  color: "#F85A40" },
  { key: "oGTa", label: "oGTa", color: "#0CB9C1" },
  { key: "oGTe", label: "oGTe", color: "#F48924" },
  { key: "iGV",  label: "iGV",  color: "#F85A40" },
  { key: "iGTa", label: "iGTa", color: "#0CB9C1" },
  { key: "iGTe", label: "iGTe", color: "#F48924" },
];

type ProgCounts = Record<ProgKey, number>;
const ZERO_PROGS: ProgCounts = { oGV: 0, oGTa: 0, oGTe: 0, iGV: 0, iGTa: 0, iGTe: 0 };

interface LCRow extends ProgCounts {
  name: string;
  total: number;
}

interface PartnerStats extends ProgCounts {
  id: string;
  name: string;
  flag: string;
  total: number;
  lcs: LCRow[];
}

function computePartnerStats(
  oGV: Application[], oGTa: Application[], oGTe: Application[],
  iGV: Application[], iGTa: Application[], iGTe: Application[],
): PartnerStats[] {
  const hostId = (a: Application) => a.home_mc?.id ?? a.opportunity?.home_mc?.id;
  const homeId = (a: Application) => a.person?.home_mc?.id;

  return PARTNER_ENTITIES.map(({ id, name, flag }) => {
    // Labels are from the PARTNER ENTITY's perspective:
    // - Europe's oGX (EUR EP → partner) = partner's iCX (incoming)
    // - Europe's iCX (partner EP → EUR) = partner's oGX (outgoing)
    const matched: Record<ProgKey, Application[]> = {
      iGV:  oGV.filter((a) => hostId(a) === id),
      iGTa: oGTa.filter((a) => hostId(a) === id),
      iGTe: oGTe.filter((a) => hostId(a) === id),
      oGV:  iGV.filter((a) => homeId(a) === id),
      oGTa: iGTa.filter((a) => homeId(a) === id),
      oGTe: iGTe.filter((a) => homeId(a) === id),
    };

    // LC breakdown per programme — aggregate by LC id
    const lcMap: Record<string, { name: string } & ProgCounts> = {};
    const addLC = (prog: ProgKey, apps: Application[], getIdFn: (a: Application) => string | undefined, getNameFn: (a: Application) => string | undefined) => {
      for (const a of apps) {
        const lcId = getIdFn(a);
        const lcName = getNameFn(a) ?? "Unknown";
        if (lcName === "Unknown") continue;
        const key = lcId ?? `name:${lcName}`;
        if (!lcMap[key]) lcMap[key] = { name: lcName, ...ZERO_PROGS };
        lcMap[key][prog] += 1;
      }
    };
    // Partner's iCX (EUR EPs hosted in partner): host LC in partner entity
    const hostLCId   = (a: Application) => a.host_lc?.id ?? a.opportunity?.home_lc?.id;
    const hostLCName = (a: Application) => a.host_lc?.name ?? a.opportunity?.home_lc?.name;
    addLC("iGV",  matched.iGV,  hostLCId, hostLCName);
    addLC("iGTa", matched.iGTa, hostLCId, hostLCName);
    addLC("iGTe", matched.iGTe, hostLCId, hostLCName);
    // Partner's oGX (partner EPs going to EUR): person's home LC in partner entity
    const homeLCId   = (a: Application) => a.person?.home_lc?.id;
    const homeLCName = (a: Application) => a.person?.home_lc?.name;
    addLC("oGV",  matched.oGV,  homeLCId, homeLCName);
    addLC("oGTa", matched.oGTa, homeLCId, homeLCName);
    addLC("oGTe", matched.oGTe, homeLCId, homeLCName);

    const lcs: LCRow[] = Object.values(lcMap)
      .map((lc) => ({
        ...lc,
        total: lc.oGV + lc.oGTa + lc.oGTe + lc.iGV + lc.iGTa + lc.iGTe,
      }))
      .sort((a, b) => b.total - a.total);

    const entityProgs: ProgCounts = { ...ZERO_PROGS };
    for (const pk of Object.keys(matched) as ProgKey[]) {
      entityProgs[pk] = matched[pk].length;
    }
    const total = Object.values(entityProgs).reduce((s, v) => s + v, 0);

    return { id, name, flag, ...entityProgs, total, lcs };
  });
}

// ── Rank item type ─────────────────────────────────────────────────────────────

interface RankItem {
  name: string;
  this_year: number;
  last_year: number;
  delta: number;
}

// ── Build rank data helper ─────────────────────────────────────────────────────

function buildRankData(
  apps26: Application[],
  apps25: Application[],
  getKey: (a: Application) => string | undefined,
): RankItem[] {
  const map26 = countByKey(apps26, getKey);
  const map25 = countByKey(apps25, getKey);
  const keys = new Set([...Object.keys(map26), ...Object.keys(map25)]);
  return Array.from(keys).map((name) => ({
    name,
    this_year: map26[name] ?? 0,
    last_year: map25[name] ?? 0,
    delta: (map26[name] ?? 0) - (map25[name] ?? 0),
  }));
}

// ── Direction-aware key functions ──────────────────────────────────────────────
// oGX: EP is European → rank by EP's home entity/LC
// iCX: Opportunity is in Europe → rank by HOST entity/LC

function oGXEntityKey(app: Application): string | undefined {
  return app.person?.home_mc?.name ?? app.person?.home_lc?.name;
}
function iCXEntityKey(app: Application): string | undefined {
  return app.home_mc?.name ?? app.opportunity?.home_mc?.name;
}
function oGXLCKey(app: Application): string | undefined {
  return app.person?.home_lc?.name;
}
function iCXLCKey(app: Application): string | undefined {
  return app.host_lc?.name;
}

// Builds rank items merging oGX and iCX with their respective key functions
function buildMergedRankData(
  oGXApps26: Application[], iCXApps26: Application[],
  oGXApps25: Application[], iCXApps25: Application[],
  oGXKey: (a: Application) => string | undefined,
  iCXKey: (a: Application) => string | undefined,
): RankItem[] {
  const map26: Record<string, number> = {};
  const map25: Record<string, number> = {};
  for (const app of oGXApps26) { const k = oGXKey(app); if (k) map26[k] = (map26[k] ?? 0) + 1; }
  for (const app of iCXApps26) { const k = iCXKey(app); if (k) map26[k] = (map26[k] ?? 0) + 1; }
  for (const app of oGXApps25) { const k = oGXKey(app); if (k) map25[k] = (map25[k] ?? 0) + 1; }
  for (const app of iCXApps25) { const k = iCXKey(app); if (k) map25[k] = (map25[k] ?? 0) + 1; }
  const keys = new Set([...Object.keys(map26), ...Object.keys(map25)]);
  return Array.from(keys).map((name) => ({
    name,
    this_year: map26[name] ?? 0,
    last_year: map25[name] ?? 0,
    delta: (map26[name] ?? 0) - (map25[name] ?? 0),
  }));
}

// ── Olympic rings SVG ──────────────────────────────────────────────────────────

function OlympicRings({ opacity = 0.75 }: { opacity?: number }) {
  const rings = [
    { cx: 10, cy: 9,  color: "#037EF3" },
    { cx: 27, cy: 18, color: "#FFD700" },
    { cx: 44, cy: 9,  color: "rgba(255,255,255,0.6)" },
    { cx: 61, cy: 18, color: "#22c55e" },
    { cx: 78, cy: 9,  color: "#F85A40" },
  ];
  return (
    <svg width="88" height="28" viewBox="0 0 88 28" fill="none" style={{ opacity }}>
      {rings.map((r, i) => (
        <circle key={i} cx={r.cx} cy={r.cy} r={8} stroke={r.color} strokeWidth="2.4" fill="none" />
      ))}
    </svg>
  );
}

// ── Floating orbs ─────────────────────────────────────────────────────────────

const ORBS = [
  { color: "#674ea7", size: 900, x: "6%",   y: "8%",   blur: 160, opacity: 0.22, dur: 20, delay: 0 },
  { color: "#037EF3", size: 700, x: "60%",  y: "-8%",  blur: 140, opacity: 0.14, dur: 26, delay: 2 },
  { color: "#F85A40", size: 450, x: "82%",  y: "58%",  blur: 110, opacity: 0.09, dur: 17, delay: 6 },
  { color: "#0CB9C1", size: 520, x: "2%",   y: "65%",  blur: 130, opacity: 0.11, dur: 22, delay: 9 },
  { color: "#F48924", size: 360, x: "40%",  y: "80%",  blur: 100, opacity: 0.08, dur: 15, delay: 4 },
  { color: "#674ea7", size: 650, x: "46%",  y: "-12%", blur: 150, opacity: 0.13, dur: 24, delay: 7 },
  { color: "#037EF3", size: 300, x: "22%",  y: "40%",  blur: 90,  opacity: 0.06, dur: 18, delay: 11 },
  { color: "#FFD700", size: 300, x: "90%",  y: "15%",  blur: 120, opacity: 0.04, dur: 19, delay: 5 },
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

    let rafId: number;
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(from + diff * eased));
      if (progress < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return count;
}

// ── Days remaining ─────────────────────────────────────────────────────────────

function daysRemaining(): number {
  const start = new Date("2026-03-25T00:00:00Z");
  const now = new Date();
  return Math.max(0, Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
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
        border: "1px solid rgba(255,215,0,0.3)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="font-bold text-white/80">{label}</div>
      <div className="text-white/50">Daily new: <span className="text-[#a78bfa] font-bold">{count}</span></div>
      <div className="text-white/50">Cumulative: <span className="text-white font-bold">{cumulative.toLocaleString()}</span></div>
      <div className="text-white/50">% of goal: <span className="font-bold" style={{ color: "#FFD700" }}>{pct}%</span></div>
    </div>
  );
}

// ── Rankings card ──────────────────────────────────────────────────────────────

type CardVariant = "top" | "growth" | "zero";

function RankingCard({
  title,
  icon: Icon,
  byTab,
  loading,
  variant,
}: {
  title: string;
  icon: React.ElementType;
  byTab: Record<TabKey, RankItem[]>;
  loading: boolean;
  variant: CardVariant;
}) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  const items = useMemo(() => {
    const raw = byTab[activeTab];
    switch (variant) {
      case "top":
        return [...raw].filter((x) => x.this_year > 0).sort((a, b) => b.this_year - a.this_year);
      case "growth":
        return [...raw].filter((x) => x.delta > 0 && x.last_year > 0).sort((a, b) => b.delta - a.delta);
      case "zero":
        return [...raw].filter((x) => x.last_year === 0 && x.this_year > 0).sort((a, b) => b.this_year - a.this_year);
    }
  }, [byTab, activeTab, variant]);

  const maxCount = items.length > 0 ? Math.max(...items.map((i) => i.this_year)) : 1;
  const activeTabMeta = PROG_TABS.find((t) => t.key === activeTab)!;

  return (
    <GlassCard className="p-4 flex flex-col gap-3">
      {/* Header row */}
      <div className="flex items-center gap-2.5">
        <div
          className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0"
          style={{
            background: variant === "growth" ? "rgba(103,78,167,0.2)" : "rgba(255,215,0,0.12)",
            border: `1px solid ${variant === "growth" ? "rgba(103,78,167,0.35)" : "rgba(255,215,0,0.3)"}`,
          }}
        >
          <Icon
            className="w-3.5 h-3.5"
            style={{ color: variant === "growth" ? "#a78bfa" : "#FFD700" }}
          />
        </div>
        <span className="text-xs font-bold text-white/70 tracking-wide flex-1">{title}</span>
      </div>

      {/* Programme tabs */}
      <div className="flex gap-1 rounded-lg p-0.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
        {PROG_TABS.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 py-1 rounded-md text-[10px] font-bold transition-all duration-150 cursor-pointer focus-visible:outline-none"
              style={active ? {
                background: `${tab.color}20`,
                color: tab.color,
                border: `1px solid ${tab.color}40`,
              } : { color: "rgba(255,255,255,0.3)", border: "1px solid transparent" }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="space-y-1.5">
        {loading
          ? Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-full" />
            ))
          : items.length === 0
          ? <p className="text-white/25 text-xs text-center py-4">No data yet</p>
          : items.slice(0, 10).map((item, idx) => {
              const medal = idx < 3 ? MEDALS[idx] : null;
              const barWidth = maxCount > 0 ? (item.this_year / maxCount) * 100 : 0;
              return (
                <div key={item.name} className="relative">
                  <motion.div
                    className="absolute inset-0 rounded-md"
                    initial={{ width: 0 }}
                    animate={{ width: `${barWidth}%` }}
                    transition={{ duration: 0.7, delay: idx * 0.03, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      background: medal
                        ? `${medal.color}18`
                        : activeTabMeta.color === "#a78bfa"
                        ? "rgba(103,78,167,0.14)"
                        : `${activeTabMeta.color}12`,
                    }}
                  />
                  {medal && (
                    <div
                      className="absolute left-0 top-0 bottom-0 w-0.5 rounded-l-md"
                      style={{ background: medal.color, opacity: 0.7 }}
                    />
                  )}
                  <div className="relative flex items-center gap-2 px-2 py-1.5">
                    {medal ? (
                      <span
                        className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full text-[9px] font-black"
                        style={{ background: medal.bg, border: `1px solid ${medal.border}`, color: medal.color }}
                      >
                        {idx + 1}
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-white/25 w-5 flex-shrink-0 text-center tabular-nums">
                        {idx + 1}
                      </span>
                    )}
                    <span
                      className="text-xs flex-1 truncate"
                      style={{ color: medal ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.72)" }}
                    >
                      {item.name}
                    </span>
                    <span
                      className="text-xs font-bold tabular-nums flex-shrink-0"
                      style={{ color: medal ? medal.color : "white" }}
                    >
                      {item.this_year}
                    </span>
                    {variant === "top" && item.last_year > 0 && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{ background: "rgba(255,215,0,0.1)", color: "rgba(255,215,0,0.6)" }}
                      >
                        {item.last_year > 0 ? `vs ${item.last_year}` : ""}
                      </span>
                    )}
                    {variant === "growth" && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{ background: "rgba(52,211,153,0.15)", color: "#34d399" }}
                      >
                        +{item.delta}
                      </span>
                    )}
                    {variant === "zero" && (
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0"
                        style={{ background: "rgba(255,215,0,0.12)", color: "#FFD700" }}
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

// ── Partner Entity Spotlight (expandable) ─────────────────────────────────────

type PartnerFilter = "all" | ProgKey;
const PARTNER_FILTERS: { key: PartnerFilter; label: string; color: string }[] = [
  { key: "all",  label: "All",  color: "#a78bfa" },
  ...PARTNER_PROGS,
];

function PartnerSpotlight({ stats, loading }: { stats: PartnerStats[]; loading: boolean }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<PartnerFilter>("all");

  const filteredLCs = useCallback(
    (lcs: LCRow[]): LCRow[] => {
      if (filter === "all") return lcs;
      return lcs
        .map((lc) => ({ ...lc, total: lc[filter] }))
        .filter((lc) => lc.total > 0)
        .sort((a, b) => b.total - a.total);
    },
    [filter],
  );

  const filteredTotal = useCallback(
    (p: PartnerStats): number => {
      if (filter === "all") return p.total;
      return p[filter];
    },
    [filter],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.24 }}
    >
      <GlassCard className="p-4">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div
            className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0"
            style={{ background: "rgba(3,126,243,0.15)", border: "1px solid rgba(3,126,243,0.3)" }}
          >
            <Globe className="w-3.5 h-3.5" style={{ color: "#037EF3" }} />
          </div>
          <span className="text-xs font-bold text-white/60 uppercase tracking-widest">
            Partner Entity Spotlight — Exchanges with Europe
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="shimmer-bg rounded-xl h-40" />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Entity summary row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {stats.map((p) => {
                const isOpen = expanded === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => { setExpanded(isOpen ? null : p.id); setFilter("all"); }}
                    className="rounded-xl p-3 flex flex-col gap-2 text-left transition-all"
                    style={{
                      background: isOpen ? "rgba(103,78,167,0.12)" : "rgba(255,255,255,0.025)",
                      border: `1px solid ${isOpen ? "rgba(103,78,167,0.4)" : "rgba(255,255,255,0.06)"}`,
                    }}
                  >
                    {/* Entity header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{p.flag}</span>
                        <span className="text-sm font-bold text-white/90">{p.name}</span>
                      </div>
                      <span className="text-lg font-black tabular-nums" style={{ color: "#a78bfa" }}>
                        {p.total}
                      </span>
                    </div>

                    {/* 6 programme badges */}
                    <div className="flex flex-wrap gap-1 text-[9px] font-bold">
                      {PARTNER_PROGS.map((b) => {
                        const val = p[b.key];
                        return (
                          <span
                            key={b.key}
                            className="px-1.5 py-0.5 rounded"
                            style={{
                              background: `${b.color}18`,
                              color: val > 0 ? b.color : "rgba(255,255,255,0.15)",
                              border: `1px solid ${val > 0 ? b.color + "30" : "transparent"}`,
                            }}
                          >
                            {b.label} {val}
                          </span>
                        );
                      })}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Expanded detail panel */}
            <AnimatePresence>
              {expanded && (() => {
                const p = stats.find((s) => s.id === expanded);
                if (!p) return null;
                const lcs = filteredLCs(p.lcs);
                const dispTotal = filteredTotal(p);
                const maxLC = lcs.length > 0 ? lcs[0].total : 1;

                return (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="rounded-xl p-4"
                      style={{
                        background: "rgba(103,78,167,0.06)",
                        border: "1px solid rgba(103,78,167,0.2)",
                      }}
                    >
                      {/* Entity detail header */}
                      <div className="flex flex-wrap items-center gap-3 mb-3">
                        <span className="text-xl">{p.flag}</span>
                        <span className="text-base font-bold text-white/90">{p.name}</span>
                        <span className="text-sm font-black tabular-nums" style={{ color: "#a78bfa" }}>
                          {dispTotal} approval{dispTotal !== 1 ? "s" : ""}
                        </span>
                      </div>

                      {/* Filter pills */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {PARTNER_FILTERS.map((f) => {
                          const active = filter === f.key;
                          return (
                            <button
                              key={f.key}
                              onClick={() => setFilter(f.key)}
                              className="px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all"
                              style={{
                                background: active ? `${f.color}25` : "rgba(255,255,255,0.04)",
                                color: active ? f.color : "rgba(255,255,255,0.35)",
                                border: `1px solid ${active ? f.color + "50" : "rgba(255,255,255,0.06)"}`,
                              }}
                            >
                              {f.label}
                            </button>
                          );
                        })}
                      </div>

                      {/* LC table */}
                      {lcs.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead>
                              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                                <th className="text-left py-2 pr-3 font-bold text-white/30 whitespace-nowrap">LC</th>
                                <th className="text-right py-2 px-2 font-bold text-white/30 whitespace-nowrap">Total</th>
                                {filter === "all" && PARTNER_PROGS.map((b) => (
                                  <th key={b.key} className="text-right py-2 px-2 font-bold whitespace-nowrap" style={{ color: b.color + "60" }}>
                                    {b.label}
                                  </th>
                                ))}
                                <th className="py-2 pl-3 w-24"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {lcs.map((lc, i) => (
                                <tr
                                  key={lc.name}
                                  style={{
                                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                                    background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                                  }}
                                >
                                  <td className="py-1.5 pr-3 text-white/60 whitespace-nowrap">{lc.name}</td>
                                  <td className="py-1.5 px-2 text-right font-bold tabular-nums text-white/80">{lc.total}</td>
                                  {filter === "all" && PARTNER_PROGS.map((b) => {
                                    const v = lc[b.key];
                                    return (
                                      <td key={b.key} className="py-1.5 px-2 text-right tabular-nums" style={{ color: v > 0 ? b.color : "rgba(255,255,255,0.1)" }}>
                                        {v}
                                      </td>
                                    );
                                  })}
                                  <td className="py-1.5 pl-3">
                                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                                      <div
                                        className="h-full rounded-full"
                                        style={{
                                          width: `${(lc.total / maxLC) * 100}%`,
                                          background: "linear-gradient(90deg, #674ea7, #a78bfa)",
                                        }}
                                      />
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <span className="text-[11px] text-white/25">No LC data for this filter</span>
                      )}
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          </div>
        )}
      </GlassCard>
    </motion.div>
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

  // Animated counts
  const animTotal = useCountUp(total2026);
  const animOGX   = useCountUp(oGX2026);
  const animICX   = useCountUp(iCX2026);

  // Progress
  const progressPct = GOAL_TOTAL > 0 ? Math.min((total2026 / GOAL_TOTAL) * 100, 100) : 0;
  const isGolden = progressPct >= 80;

  const daysLeft = daysRemaining();

  const totalDelta    = total2026 - total2025;
  const totalDeltaPct = total2025 > 0 ? ((totalDelta / total2025) * 100) : 0;
  const oGXDelta      = oGX2026 - oGX2025;
  const iCXDelta      = iCX2026 - iCX2025;

  // ── Build tab data for each card ──────────────────────────────────────────
  const entityTabData = useMemo((): Record<TabKey, RankItem[]> => ({
    all:  buildMergedRankData(
      [...oGV26, ...oGTa26, ...oGTe26], [...iGV26, ...iGTa26, ...iGTe26],
      [...oGV25, ...oGTa25, ...oGTe25], [...iGV25, ...iGTa25, ...iGTe25],
      oGXEntityKey, iCXEntityKey,
    ),
    oGV:  buildRankData(oGV26,  oGV25,  oGXEntityKey),
    oGTa: buildRankData(oGTa26, oGTa25, oGXEntityKey),
    oGTe: buildRankData(oGTe26, oGTe25, oGXEntityKey),
    iGV:  buildRankData(iGV26,  iGV25,  iCXEntityKey),
    iGTa: buildRankData(iGTa26, iGTa25, iCXEntityKey),
    iGTe: buildRankData(iGTe26, iGTe25, iCXEntityKey),
  }), [oGV26, oGV25, oGTa26, oGTa25, oGTe26, oGTe25, iGV26, iGV25, iGTa26, iGTa25, iGTe26, iGTe25]);

  const lcTabData = useMemo((): Record<TabKey, RankItem[]> => ({
    all:  buildMergedRankData(
      [...oGV26, ...oGTa26, ...oGTe26], [...iGV26, ...iGTa26, ...iGTe26],
      [...oGV25, ...oGTa25, ...oGTe25], [...iGV25, ...iGTa25, ...iGTe25],
      oGXLCKey, iCXLCKey,
    ),
    oGV:  buildRankData(oGV26,  oGV25,  oGXLCKey),
    oGTa: buildRankData(oGTa26, oGTa25, oGXLCKey),
    oGTe: buildRankData(oGTe26, oGTe25, oGXLCKey),
    iGV:  buildRankData(iGV26,  iGV25,  iCXLCKey),
    iGTa: buildRankData(iGTa26, iGTa25, iCXLCKey),
    iGTe: buildRankData(iGTe26, iGTe25, iCXLCKey),
  }), [oGV26, oGV25, oGTa26, oGTa25, oGTe26, oGTe25, iGV26, iGV25, iGTa26, iGTa25, iGTe26, iGTe25]);

  // Regional collaboration
  const hackOGXByHost = useMemo(
    () => computeHostCountryMap([...oGV26, ...oGTa26, ...oGTe26]),
    [oGV26, oGTa26, oGTe26]
  );
  const hackICXByHome = useMemo(
    () => computeOriginCountryMap([...iGV26, ...iGTa26, ...iGTe26]),
    [iGV26, iGTa26, iGTe26]
  );

  // Partner entity spotlight
  const partnerStats = useMemo(
    () => computePartnerStats(oGV26, oGTa26, oGTe26, iGV26, iGTa26, iGTe26),
    [oGV26, oGTa26, oGTe26, iGV26, iGTa26, iGTe26],
  );

  // Search for approvals log
  const [search, setSearch] = useState("");
  const filteredApps = useMemo(() =>
    recentApps.filter((app) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        (app.person?.home_lc?.name ?? "").toLowerCase().includes(q) ||
        (app.person?.home_lc?.name ?? "").toLowerCase().includes(q) ||
        (app.home_mc?.name ?? "").toLowerCase().includes(q) ||
        (app.opportunity?.programme?.short_name_display ?? "").toLowerCase().includes(q) ||
        (app.host_lc?.name ?? "").toLowerCase().includes(q) ||
        (app.opportunity?.title ?? "").toLowerCase().includes(q)
      );
    }),
    [recentApps, search]
  );

  const handleRefresh = useCallback(() => refresh(), [refresh]);

  return (
    <div className="relative min-h-screen" style={{ background: "#050810" }}>
      <FloatingOrbs />
      <GridOverlay />
      <ScanSweep />

      <div className="relative z-10 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-6">

          {/* ── A. Top Nav Bar ── */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-between gap-4"
          >
            <motion.button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer focus-visible:outline-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
              whileHover={{ scale: 1.04, color: "rgba(255,255,255,0.85)" } as never}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.18 }}
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Dashboard</span>
            </motion.button>

            <div className="flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-2.5">
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Flame className="w-5 h-5" style={{ color: "#FFD700" }} />
                </motion.div>
                <h1
                  className="text-lg md:text-xl font-black tracking-tight"
                  style={{
                    background: "linear-gradient(135deg, #ffffff 0%, #FFD700 55%, #a78bfa 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  EuroXpro Games 2026
                </h1>
                <motion.div
                  animate={{ scale: [1, 1.15, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, delay: 0.5 }}
                >
                  <Flame className="w-5 h-5" style={{ color: "#FFD700" }} />
                </motion.div>
              </div>
              <OlympicRings opacity={0.65} />
            </div>

            <div className="flex items-center gap-2">
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
            <GlassCard style={{ border: "1px solid rgba(255,215,0,0.15)", background: "rgba(255,215,0,0.03)" }}>
              <div className="px-5 py-3 flex flex-wrap items-center justify-center gap-3 md:gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4" style={{ color: "#FFD700" }} />
                  <span className="font-bold text-white/80">EuroXpro Games 2026</span>
                </div>
                <div className="h-4 w-px bg-white/10 hidden md:block" />
                <div
                  className="font-data text-xs px-3 py-1 rounded-lg"
                  style={{ background: "rgba(255,215,0,0.12)", border: "1px solid rgba(255,215,0,0.28)", color: "#FFD700" }}
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
                {loading && <span className="text-[10px] text-white/30 font-data animate-pulse">fetching…</span>}
              </div>
            </GlassCard>
          </motion.div>

          {/* ── C. Goal Card ── */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <GlassCard
              style={{
                background: isGolden ? "rgba(255,215,0,0.04)" : "rgba(103,78,167,0.06)",
                border: isGolden ? "1px solid rgba(255,215,0,0.22)" : "1px solid rgba(103,78,167,0.25)",
                boxShadow: isGolden
                  ? "0 0 60px rgba(255,215,0,0.08), inset 0 1px 0 rgba(255,255,255,0.05)"
                  : "0 0 60px rgba(103,78,167,0.12), inset 0 1px 0 rgba(255,255,255,0.05)",
              }}
            >
              <div className="p-6 flex flex-col md:flex-row gap-6 items-start md:items-center">
                <div className="flex-1 space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-6xl md:text-7xl font-black tabular-nums" style={{ color: isGolden ? "#FFD700" : "#a78bfa" }}>
                      {loading ? "—" : animTotal.toLocaleString()}
                    </span>
                    <span className="text-2xl font-bold text-white/25">/ {GOAL_TOTAL.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs text-white/40">
                      oGX: <span className="font-bold" style={{ color: isGolden ? "#FFD700" : "#a78bfa" }}>{loading ? "—" : animOGX.toLocaleString()}</span>
                    </span>
                    <span className="text-white/15">·</span>
                    <span className="text-xs text-white/40">
                      iCX: <span className="text-[#60a5fa] font-bold">{loading ? "—" : animICX.toLocaleString()}</span>
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-start md:items-end gap-3">
                  <div
                    className="text-4xl font-black tabular-nums px-5 py-2 rounded-2xl"
                    style={isGolden ? {
                      background: "linear-gradient(135deg, rgba(255,215,0,0.2), rgba(205,127,50,0.12))",
                      border: "1px solid rgba(255,215,0,0.35)",
                      color: "#FFD700",
                    } : {
                      background: "linear-gradient(135deg, rgba(103,78,167,0.25), rgba(3,126,243,0.15))",
                      border: "1px solid rgba(103,78,167,0.35)",
                      color: "#a78bfa",
                    }}
                  >
                    {loading ? "—" : `${progressPct.toFixed(1)}%`}
                  </div>
                  {!loading && <DeltaBadge delta={totalDelta} pct={totalDeltaPct} />}
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3 h-3 text-white/25" />
                    <span className="text-xs text-white/35 font-data">
                      {daysLeft === 0 ? "EuroXpro Games 2026 has started!" : `${daysLeft} day${daysLeft === 1 ? "" : "s"} until kickoff`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-6 pb-6">
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                      background: isGolden
                        ? "linear-gradient(90deg, #CD7F32, #FFD700, #fffbe6)"
                        : "linear-gradient(90deg, #674ea7, #037EF3)",
                      boxShadow: isGolden ? "0 0 14px rgba(255,215,0,0.55)" : "0 0 12px rgba(103,78,167,0.6)",
                    }}
                  />
                </div>
              </div>
            </GlassCard>
          </motion.div>

          {/* ── D. Nations Medal Board ── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.15 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3">
              <Trophy className="w-4 h-4" style={{ color: "#FFD700" }} />
              <h2 className="text-sm font-bold text-white/60 uppercase tracking-widest">
                Nations Medal Board
              </h2>
              <OlympicRings opacity={0.45} />
            </div>

            {/* Top rankings — 2 wide cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <RankingCard
                title="Top Entities"
                icon={Trophy}
                byTab={entityTabData}
                loading={loading}
                variant="top"
              />
              <RankingCard
                title="Top LCs"
                icon={Star}
                byTab={lcTabData}
                loading={loading}
                variant="top"
              />
            </div>

            {/* Growth + Zero to Hero — 4 cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <RankingCard
                title="Growing Entities"
                icon={TrendingUp}
                byTab={entityTabData}
                loading={loading}
                variant="growth"
              />
              <RankingCard
                title="Growing LCs"
                icon={TrendingUp}
                byTab={lcTabData}
                loading={loading}
                variant="growth"
              />
              <RankingCard
                title="Zero to Hero — Entities"
                icon={Star}
                byTab={entityTabData}
                loading={loading}
                variant="zero"
              />
              <RankingCard
                title="Zero to Hero — LCs"
                icon={Star}
                byTab={lcTabData}
                loading={loading}
                variant="zero"
              />
            </div>
          </motion.div>

          {/* ── E. Sparkline Chart ── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.18 }}
          >
            <GlassCard
              style={{
                background: isGolden ? "rgba(255,215,0,0.03)" : "rgba(103,78,167,0.04)",
                border: isGolden ? "1px solid rgba(255,215,0,0.15)" : "1px solid rgba(103,78,167,0.18)",
              }}
            >
              <div className="px-5 pt-4 pb-1 flex items-center gap-2">
                <Activity className="w-3.5 h-3.5" style={{ color: isGolden ? "#FFD700" : "#a78bfa" }} />
                <span className="text-xs font-bold text-white/50 uppercase tracking-widest">Daily Approvals — EuroXpro Games 2026</span>
              </div>
              <div className="px-4 pb-6 relative" style={{ height: 300 }}>
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparkline} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor={isGolden ? "#FFD700" : "#674ea7"} stopOpacity={0.5} />
                          <stop offset="95%" stopColor={isGolden ? "#FFD700" : "#674ea7"} stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 1300]} tick={{ fill: "rgba(255,255,255,0.2)", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine y={GOAL_TOTAL} stroke="rgba(255,215,0,0.5)" strokeDasharray="5 5"
                        label={{ value: "Goal 1,200", position: "right", fill: "rgba(255,215,0,0.6)", fontSize: 10 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="cumulative"
                        stroke={isGolden ? "#FFD700" : "#a78bfa"}
                        strokeWidth={2}
                        fill="url(#chartGrad)"
                        dot={false}
                        activeDot={{ r: 4, fill: isGolden ? "#FFD700" : "#a78bfa", stroke: isGolden ? "rgba(255,215,0,0.4)" : "rgba(103,78,167,0.5)", strokeWidth: 6 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
                <AnimatePresence>
                  {total2026 === 0 && !loading && (
                    <motion.div
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center gap-2"
                      style={{ background: "rgba(5,8,16,0.5)", backdropFilter: "blur(4px)" }}
                    >
                      <motion.div animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                        <Flame className="w-8 h-8" style={{ color: "rgba(255,215,0,0.5)" }} />
                      </motion.div>
                      <p className="text-white/30 text-sm font-semibold">Awaiting data</p>
                      <p className="text-white/20 text-xs font-data">EuroXpro Games 2026 starts March 23, 2026</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </GlassCard>
          </motion.div>

          {/* ── F. Stats Row ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              { label: "Combined 2026", anim: animTotal, vs: total2025, delta: totalDelta, color: isGolden ? "#FFD700" : "#a78bfa" },
              { label: "oGX 2026",      anim: animOGX,   vs: oGX2025,   delta: oGXDelta,   color: "#674ea7" },
              { label: "iCX 2026",      anim: animICX,   vs: iCX2025,   delta: iCXDelta,   color: "#037EF3" },
              { label: "Days to Kickoff", anim: daysLeft,  vs: null,      delta: null,       color: "#34d399" },
            ].map((stat, i) => (
              <GlassCard key={stat.label} className="p-4 flex flex-col gap-2">
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.3)" }}>
                  {stat.label}
                </span>
                <span className="text-3xl font-black tabular-nums" style={{ color: stat.color }}>
                  {loading && i < 3 ? "—" : stat.anim.toLocaleString()}
                </span>
                {stat.vs !== null && stat.delta !== null && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-white/25">vs {stat.vs.toLocaleString()}</span>
                    {!loading && <DeltaBadge delta={stat.delta} />}
                  </div>
                )}
                {stat.label === "Days to Kickoff" && (
                  <span className="text-[10px] text-white/25">{daysLeft === 0 ? "EuroXpro has started!" : "until Mar 25"}</span>
                )}
              </GlassCard>
            ))}
          </motion.div>

          {/* ── F. Regional Collaboration ── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.22 }}
          >
            <RegionalCollaboration
              oGXByHostCountry={hackOGXByHost}
              iCXByHomeCountry={hackICXByHome}
              loading={loading}
            />
          </motion.div>

          {/* ── G. Partner Entity Spotlight ── */}
          <PartnerSpotlight stats={partnerStats} loading={loading} />

          {/* ── H. Approvals Log ── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.25 }}
          >
            <GlassCard className="overflow-hidden">
              <div
                className="flex flex-wrap items-center gap-3 px-4 py-3"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <Activity className="w-3.5 h-3.5" style={{ color: "#FFD700" }} />
                <span className="text-xs font-bold text-white/60 uppercase tracking-widest flex-1">
                  Approvals Log — EuroXpro Games 2026
                </span>
                <input
                  type="text"
                  placeholder="Search…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="text-xs rounded-lg px-3 py-1.5 text-white placeholder-white/20 focus:outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", width: 160 }}
                />
              </div>

              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 z-10" style={{ background: "rgba(8,10,20,0.95)", backdropFilter: "blur(12px)" }}>
                    <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      {["Home LC", "Home MC", "Programme", "Host LC", "Host MC", "Opportunity", "Approved On"].map((col) => (
                        <th key={col} className="text-left py-2 px-3 font-bold whitespace-nowrap" style={{ color: "rgba(255,255,255,0.3)" }}>
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 7 }).map((_, j) => (
                            <td key={j} className="py-2 px-3"><Skeleton className="h-3 w-full" /></td>
                          ))}
                        </tr>
                      ))
                    ) : filteredApps.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-white/25">
                          {recentApps.length === 0
                            ? "No approvals yet for the EuroXpro Games 2026 period."
                            : "No results match your search."}
                        </td>
                      </tr>
                    ) : (
                      filteredApps.map((app, i) => {
                        const prog = app.opportunity?.programme?.short_name_display ?? "—";
                        const progColor = prog === "GV" ? "#F85A40" : prog === "GTa" ? "#0CB9C1" : "#F48924";
                        return (
                          <tr
                            key={app.id}
                            style={{
                              borderBottom: "1px solid rgba(255,255,255,0.03)",
                              background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                            }}
                          >
                            <td className="py-2 px-3 text-white/60 whitespace-nowrap">{app.person?.home_lc?.name ?? "—"}</td>
                            <td className="py-2 px-3 text-white/50 whitespace-nowrap">{app.person?.home_mc?.name ?? "—"}</td>
                            <td className="py-2 px-3 whitespace-nowrap">
                              <span className="px-1.5 py-0.5 rounded font-bold text-[10px]"
                                style={{ background: `${progColor}18`, color: progColor, border: `1px solid ${progColor}30` }}>
                                {prog}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-white/50 whitespace-nowrap">{app.host_lc?.name ?? "—"}</td>
                            <td className="py-2 px-3 text-white/40 whitespace-nowrap">{app.home_mc?.name ?? "—"}</td>
                            <td className="py-2 px-3 text-white/40 max-w-[180px] truncate">{app.opportunity?.title ?? "—"}</td>
                            <td className="py-2 px-3 text-white/30 whitespace-nowrap font-data">
                              {app.date_approved ? app.date_approved.slice(0, 10) : "—"}
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
