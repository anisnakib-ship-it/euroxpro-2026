"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, MapPin, TrendingUp, TrendingDown, Star } from "lucide-react";
import { ProgrammeStats } from "@/hooks/useRankingsData";
import { ExchangeMode } from "./Filters";

interface Props extends ProgrammeStats {
  loading: boolean;
  mode: ExchangeMode;
  programme: string;  // "all" | "GV" | "GTa" | "GTe"
}

function getDefaultTab(mode: ExchangeMode, programme: string): TabKey {
  const prefix = mode === "oGX" ? "o" : "i";
  if (programme === "GTa") return `${prefix}GTa` as TabKey;
  if (programme === "GTe") return `${prefix}GTe` as TabKey;
  return `${prefix}GV` as TabKey;
}

type TabKey = "oGV" | "oGTa" | "oGTe" | "iGV" | "iGTa" | "iGTe" | "combined";

const TAB_META: Record<TabKey, { label: string; color: string; prog: string }> = {
  oGV:      { label: "oGV",  color: "#F85A40", prog: "GV"  },
  oGTa:     { label: "oGTa", color: "#0CB9C1", prog: "GTa" },
  oGTe:     { label: "oGTe", color: "#F48924", prog: "GTe" },
  iGV:      { label: "iGV",  color: "#F85A40", prog: "GV"  },
  iGTa:     { label: "iGTa", color: "#0CB9C1", prog: "GTa" },
  iGTe:     { label: "iGTe", color: "#F48924", prog: "GTe" },
  combined: { label: "All",  color: "#10b981", prog: ""    },
};

const O_TABS: TabKey[] = ["oGV", "oGTa", "oGTe"];
const I_TABS: TabKey[] = ["iGV", "iGTa", "iGTe"];

const MEDAL = ["#F4B942", "#9CA3AF", "#CD7F32"];

// ── Helper functions ──────────────────────────────────────────────────────────

function mergeRec(
  a: Record<string, number>,
  b: Record<string, number>
): Record<string, number> {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = (out[k] ?? 0) + v;
  return out;
}

function mergeGrowthRec(
  a: Record<string, { recent: number; older: number }>,
  b: Record<string, { recent: number; older: number }>
): Record<string, { recent: number; older: number }> {
  const out: Record<string, { recent: number; older: number }> = {};
  for (const [k, v] of Object.entries(a)) out[k] = { ...v };
  for (const [k, v] of Object.entries(b)) {
    if (out[k]) { out[k].recent += v.recent; out[k].older += v.older; }
    else         out[k] = { ...v };
  }
  return out;
}

function top10(rec: Record<string, number>): { name: string; count: number }[] {
  return Object.entries(rec)
    .sort(([, a], [, b]) => b - a).slice(0, 10)
    .map(([name, count]) => ({ name, count }));
}

function top10Growth(rec: Record<string, { recent: number; older: number }>): {
  name: string; recent: number; older: number; rate: number;
}[] {
  return Object.entries(rec)
    .filter(([, v]) => v.recent > 0 || v.older > 0)
    .map(([name, v]) => ({
      name, ...v,
      rate: ((v.recent - v.older) / Math.max(v.older, 1)) * 100,
    }))
    .filter(e => e.older > 0)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 10);
}

function zeroToHero(rec: Record<string, { recent: number; older: number }>): {
  name: string; recent: number;
}[] {
  return Object.entries(rec)
    .filter(([, v]) => v.older === 0 && v.recent > 0)
    .map(([name, v]) => ({ name, recent: v.recent }))
    .sort((a, b) => b.recent - a.recent)
    .slice(0, 10);
}

// ── Data resolution per tab ───────────────────────────────────────────────────

function entityRec(tab: TabKey, p: ProgrammeStats): Record<string, number> {
  if (tab === "combined") {
    const parts: Record<string, number>[] = [
      p.oGV?.byHomeCountry, p.oGTa?.byHomeCountry, p.oGTe?.byHomeCountry,
      p.iGV?.byHostCountry, p.iGTa?.byHostCountry, p.iGTe?.byHostCountry,
    ].filter((x): x is Record<string, number> => x != null);
    return parts.reduce((acc, r) => mergeRec(acc, r), {} as Record<string, number>);
  }
  const isO = tab.startsWith("o");
  const s = p[tab as keyof ProgrammeStats];
  return isO ? (s?.byHomeCountry ?? {}) : (s?.byHostCountry ?? {});
}

function lcRec(tab: TabKey, p: ProgrammeStats): Record<string, number> {
  if (tab === "combined") {
    const parts: Record<string, number>[] = [
      p.oGV?.byHomeLC, p.oGTa?.byHomeLC, p.oGTe?.byHomeLC,
      p.iGV?.byHostLC, p.iGTa?.byHostLC, p.iGTe?.byHostLC,
    ].filter((x): x is Record<string, number> => x != null);
    return parts.reduce((acc, r) => mergeRec(acc, r), {} as Record<string, number>);
  }
  const isO = tab.startsWith("o");
  const s = p[tab as keyof ProgrammeStats];
  return isO ? (s?.byHomeLC ?? {}) : (s?.byHostLC ?? {});
}

type GrowthRec = Record<string, { recent: number; older: number }>;

function entityGrowthRec(tab: TabKey, p: ProgrammeStats): GrowthRec {
  if (tab === "combined") {
    const parts: GrowthRec[] = [
      p.oGV?.growthByHomeEntity, p.oGTa?.growthByHomeEntity, p.oGTe?.growthByHomeEntity,
      p.iGV?.growthByHostEntity, p.iGTa?.growthByHostEntity, p.iGTe?.growthByHostEntity,
    ].filter((x): x is GrowthRec => x != null);
    return parts.reduce((acc, r) => mergeGrowthRec(acc, r), {} as GrowthRec);
  }
  const isO = tab.startsWith("o");
  const s = p[tab as keyof ProgrammeStats];
  return isO ? (s?.growthByHomeEntity ?? {}) : (s?.growthByHostEntity ?? {});
}

function lcGrowthRec(tab: TabKey, p: ProgrammeStats): GrowthRec {
  if (tab === "combined") {
    const parts: GrowthRec[] = [
      p.oGV?.growthByHomeLC, p.oGTa?.growthByHomeLC, p.oGTe?.growthByHomeLC,
      p.iGV?.growthByHostLC, p.iGTa?.growthByHostLC, p.iGTe?.growthByHostLC,
    ].filter((x): x is GrowthRec => x != null);
    return parts.reduce((acc, r) => mergeGrowthRec(acc, r), {} as GrowthRec);
  }
  const isO = tab.startsWith("o");
  const s = p[tab as keyof ProgrammeStats];
  return isO ? (s?.growthByHomeLC ?? {}) : (s?.growthByHostLC ?? {});
}

// ── UI sub-components ─────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  const c = MEDAL[rank - 1];
  return (
    <div
      className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 text-[10px] font-black"
      style={
        c
          ? { background: `${c}22`, color: c, border: `1px solid ${c}55` }
          : { color: "rgba(255,255,255,0.2)" }
      }
    >
      {rank}
    </div>
  );
}

function RankRow({
  rank, name, count, maxCount, accent, delay,
}: {
  rank: number; name: string; count: number; maxCount: number; accent: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay }}
      className="flex items-center gap-2.5 py-1.5 group hover:bg-white/[0.03] rounded-lg px-1.5 -mx-1.5 transition-colors"
    >
      <RankBadge rank={rank} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold truncate" style={{ color: "rgba(255,255,255,0.75)" }}>
            {name}
          </span>
          <span className="text-[11px] font-bold font-data ml-2 flex-shrink-0" style={{ color: "rgba(255,255,255,0.6)" }}>
            {count.toLocaleString()}
          </span>
        </div>
        <div className="h-[3px] rounded-full overflow-hidden" style={{ background: `${accent}18` }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${accent}70, ${accent})` }}
            initial={{ width: 0 }}
            animate={{ width: `${(count / maxCount) * 100}%` }}
            transition={{ duration: 0.8, delay: delay + 0.1, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function GrowthRow({
  rank, name, recent, older, rate, delay,
}: {
  rank: number; name: string; recent: number; older: number; rate: number; delay: number;
}) {
  const isPositive = rate >= 0;
  const badge = `${isPositive ? "+" : ""}${Math.round(rate)}%`;
  const badgeColor = isPositive ? "#34d399" : "#F85A40";

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay }}
      className="flex items-center gap-2.5 py-1.5 hover:bg-white/[0.03] rounded-lg px-1.5 -mx-1.5 transition-colors"
    >
      <RankBadge rank={rank} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold truncate" style={{ color: "rgba(255,255,255,0.75)" }}>
            {name}
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="font-data text-[10px] font-bold" style={{ color: "rgba(255,255,255,0.4)" }}>
              {recent}/{older}
            </span>
            <motion.span
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: delay + 0.2, type: "spring", stiffness: 400 }}
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-md"
              style={{ background: `${badgeColor}20`, color: badgeColor, border: `1px solid ${badgeColor}40` }}
            >
              {isPositive
                ? <TrendingUp className="w-2.5 h-2.5 inline mr-0.5" />
                : <TrendingDown className="w-2.5 h-2.5 inline mr-0.5" />
              }
              {badge}
            </motion.span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ZeroHeroRow({
  rank, name, count, maxCount, accent, delay,
}: {
  rank: number; name: string; count: number; maxCount: number; accent: string; delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay }}
      className="flex items-center gap-2.5 py-1.5 hover:bg-white/[0.03] rounded-lg px-1.5 -mx-1.5 transition-colors"
    >
      <RankBadge rank={rank} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold truncate" style={{ color: "rgba(255,255,255,0.75)" }}>
            {name}
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
            <span className="text-[11px] font-bold font-data" style={{ color: "rgba(255,255,255,0.6)" }}>
              {count}
            </span>
            <motion.span
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: delay + 0.2, type: "spring", stiffness: 400 }}
              className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
              style={{ background: "rgba(16,185,129,0.15)", color: "#10b981", border: "1px solid rgba(16,185,129,0.35)" }}
            >
              NEW
            </motion.span>
          </div>
        </div>
        <div className="h-[3px] rounded-full overflow-hidden" style={{ background: `${accent}18` }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: `linear-gradient(90deg, ${accent}70, ${accent})` }}
            initial={{ width: 0 }}
            animate={{ width: `${(count / maxCount) * 100}%` }}
            transition={{ duration: 0.8, delay: delay + 0.1, ease: [0.16, 1, 0.3, 1] }}
          />
        </div>
      </div>
    </motion.div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-2 mt-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5 py-1.5">
          <div className="w-5 h-5 rounded-md shimmer-bg" />
          <div className="flex-1 space-y-1">
            <div className="h-2.5 rounded shimmer-bg" style={{ width: `${65 - i * 4}%` }} />
            <div className="h-[3px] rounded-full shimmer-bg" style={{ width: `${55 - i * 4}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Tab bar (two-row layout) ──────────────────────────────────────────────────

function TabBar({
  active, onChange, cardId,
}: {
  active: TabKey; onChange: (k: TabKey) => void; cardId: string;
}) {
  return (
    <div className="mt-3 mb-4 space-y-1">
      {/* oGX row */}
      <div className="flex items-center gap-1">
        <span className="text-[8px] text-white/20 font-bold uppercase tracking-widest w-4 flex-shrink-0">o</span>
        <div
          className="flex gap-0.5 flex-1 p-0.5 rounded-lg"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          {O_TABS.map(k => {
            const m = TAB_META[k];
            return (
              <button
                key={k}
                onClick={() => onChange(k)}
                className="relative flex-1 py-1 rounded-md text-[9px] font-bold uppercase tracking-wide transition-colors cursor-pointer"
                style={{ color: active === k ? "white" : "rgba(255,255,255,0.3)" }}
              >
                {active === k && (
                  <motion.div
                    layoutId={`tab-${cardId}`}
                    className="absolute inset-0 rounded-md"
                    style={{ background: `${m.color}25`, border: `1px solid ${m.color}45` }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{m.label}</span>
              </button>
            );
          })}
        </div>
      </div>
      {/* iCX row + All */}
      <div className="flex items-center gap-1">
        <span className="text-[8px] text-white/20 font-bold uppercase tracking-widest w-4 flex-shrink-0">i</span>
        <div
          className="flex gap-0.5 flex-1 p-0.5 rounded-lg"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.05)" }}
        >
          {I_TABS.map(k => {
            const m = TAB_META[k];
            return (
              <button
                key={k}
                onClick={() => onChange(k)}
                className="relative flex-1 py-1 rounded-md text-[9px] font-bold uppercase tracking-wide transition-colors cursor-pointer"
                style={{ color: active === k ? "white" : "rgba(255,255,255,0.3)" }}
              >
                {active === k && (
                  <motion.div
                    layoutId={`tab-${cardId}`}
                    className="absolute inset-0 rounded-md"
                    style={{ background: `${m.color}25`, border: `1px solid ${m.color}45` }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">{m.label}</span>
              </button>
            );
          })}
          {/* All button */}
          <button
            onClick={() => onChange("combined")}
            className="relative flex-1 py-1 rounded-md text-[9px] font-bold uppercase tracking-wide transition-colors cursor-pointer"
            style={{ color: active === "combined" ? "white" : "rgba(255,255,255,0.3)" }}
          >
            {active === "combined" && (
              <motion.div
                layoutId={`tab-${cardId}`}
                className="absolute inset-0 rounded-md"
                style={{ background: "rgba(16,185,129,0.25)", border: "1px solid rgba(16,185,129,0.45)" }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <span className="relative z-10">All</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Ranking card wrapper ──────────────────────────────────────────────────────

function RankingCard({
  title, subtitle, icon: Icon, accent, delay, tab, onTabChange, cardId, children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  accent: string;
  delay: number;
  tab: TabKey;
  onTabChange: (k: TabKey) => void;
  cardId: string;
  children: React.ReactNode;
}) {
  const activeColor = TAB_META[tab].color;

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className="group relative rounded-2xl p-5 overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.025)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
      whileHover={{ y: -3 }}
    >
      {/* Hover glow */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{ boxShadow: `inset 0 0 0 1px ${activeColor}40, 0 0 32px ${activeColor}14` }}
      />
      {/* Top accent line */}
      <div
        className="absolute top-0 left-8 right-8 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: `linear-gradient(90deg, transparent, ${activeColor}aa, transparent)` }}
      />

      {/* Header */}
      <div className="flex items-center gap-2">
        <motion.div
          className="p-1.5 rounded-lg"
          style={{ background: `${accent}20` }}
          whileHover={{ scale: 1.12, rotate: 6 }}
          transition={{ type: "spring", stiffness: 400 }}
        >
          <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
        </motion.div>
        <div>
          <h3 className="text-white text-sm font-bold tracking-tight">{title}</h3>
          {subtitle && (
            <p className="text-[10px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{subtitle}</p>
          )}
        </div>
      </div>

      <TabBar active={tab} onChange={onTabChange} cardId={cardId} />

      {children}
    </motion.div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function RankingsCards(props: Props) {
  const { loading, oGV, oGTa, oGTe, iGV, iGTa, iGTe, mode, programme } = props;
  const data: ProgrammeStats = { oGV, oGTa, oGTe, iGV, iGTa, iGTe };

  const [tab1, setTab1] = useState<TabKey>(() => getDefaultTab(mode, programme));
  const [tab2, setTab2] = useState<TabKey>(() => getDefaultTab(mode, programme));
  const [tab3, setTab3] = useState<TabKey>(() => getDefaultTab(mode, programme));
  const [tab4, setTab4] = useState<TabKey>(() => getDefaultTab(mode, programme));
  const [tab5, setTab5] = useState<TabKey>(() => getDefaultTab(mode, programme));
  const [tab6, setTab6] = useState<TabKey>(() => getDefaultTab(mode, programme));

  // Sync all card tabs when dashboard mode or programme filter changes
  useEffect(() => {
    const t = getDefaultTab(mode, programme);
    setTab1(t); setTab2(t); setTab3(t); setTab4(t); setTab5(t); setTab6(t);
  }, [mode, programme]);

  const entities         = useMemo(() => top10(entityRec(tab1, data)),             [tab1, oGV, oGTa, oGTe, iGV, iGTa, iGTe]); // eslint-disable-line react-hooks/exhaustive-deps
  const lcs              = useMemo(() => top10(lcRec(tab2, data)),                 [tab2, oGV, oGTa, oGTe, iGV, iGTa, iGTe]); // eslint-disable-line react-hooks/exhaustive-deps
  const growingEntities  = useMemo(() => top10Growth(entityGrowthRec(tab3, data)), [tab3, oGV, oGTa, oGTe, iGV, iGTa, iGTe]); // eslint-disable-line react-hooks/exhaustive-deps
  const growingLCs       = useMemo(() => top10Growth(lcGrowthRec(tab4, data)),     [tab4, oGV, oGTa, oGTe, iGV, iGTa, iGTe]); // eslint-disable-line react-hooks/exhaustive-deps
  const zeroHeroEntities = useMemo(() => zeroToHero(entityGrowthRec(tab5, data)),  [tab5, oGV, oGTa, oGTe, iGV, iGTa, iGTe]); // eslint-disable-line react-hooks/exhaustive-deps
  const zeroHeroLCs      = useMemo(() => zeroToHero(lcGrowthRec(tab6, data)),      [tab6, oGV, oGTa, oGTe, iGV, iGTa, iGTe]); // eslint-disable-line react-hooks/exhaustive-deps

  const accent1 = TAB_META[tab1].color;
  const accent2 = TAB_META[tab2].color;
  const accent3 = TAB_META[tab3].color;
  const accent4 = TAB_META[tab4].color;
  const accent5 = TAB_META[tab5].color;
  const accent6 = TAB_META[tab6].color;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

      {/* ── Card 1: Top European Entities ── */}
      <RankingCard
        title="Top European Entities"
        icon={Building2}
        accent="#674ea7"
        delay={0.2}
        tab={tab1}
        onTabChange={setTab1}
        cardId="entities"
      >
        {loading ? <Skeleton /> : (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab1}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-0.5"
            >
              {entities.length === 0
                ? <p className="text-white/25 text-xs text-center py-8">No data yet</p>
                : entities.map((item, i) => (
                    <RankRow
                      key={item.name}
                      rank={i + 1}
                      name={item.name}
                      count={item.count}
                      maxCount={entities[0]?.count ?? 1}
                      accent={accent1}
                      delay={i * 0.03}
                    />
                  ))
              }
            </motion.div>
          </AnimatePresence>
        )}
      </RankingCard>

      {/* ── Card 2: Top European LCs ── */}
      <RankingCard
        title="Top European LCs"
        icon={MapPin}
        accent="#0CB9C1"
        delay={0.3}
        tab={tab2}
        onTabChange={setTab2}
        cardId="lcs"
      >
        {loading ? <Skeleton /> : (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab2}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-0.5"
            >
              {lcs.length === 0
                ? <p className="text-white/25 text-xs text-center py-8">No data yet</p>
                : lcs.map((item, i) => (
                    <RankRow
                      key={item.name}
                      rank={i + 1}
                      name={item.name}
                      count={item.count}
                      maxCount={lcs[0]?.count ?? 1}
                      accent={accent2}
                      delay={i * 0.03}
                    />
                  ))
              }
            </motion.div>
          </AnimatePresence>
        )}
      </RankingCard>

      {/* ── Card 3: Top Growing Entities ── */}
      <RankingCard
        title="Top Growing Entities"
        icon={TrendingUp}
        accent="#F48924"
        delay={0.4}
        tab={tab3}
        onTabChange={setTab3}
        cardId="growing-entities"
      >
        {loading ? <Skeleton /> : (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab3}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-0.5"
            >
              {growingEntities.length === 0
                ? <p className="text-white/25 text-xs text-center py-8">No data yet</p>
                : growingEntities.map((item, i) => (
                    <GrowthRow
                      key={item.name}
                      rank={i + 1}
                      name={item.name}
                      recent={item.recent}
                      older={item.older}
                      rate={item.rate}
                      delay={i * 0.03}
                    />
                  ))
              }
              {growingEntities.length > 0 && (
                <p className="text-white/20 text-[9px] mt-3 font-data">
                  Recent ÷ Older · split at timeline midpoint
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </RankingCard>

      {/* ── Card 4: Top Growing LCs ── */}
      <RankingCard
        title="Top Growing LCs"
        icon={TrendingUp}
        accent="#F85A40"
        delay={0.5}
        tab={tab4}
        onTabChange={setTab4}
        cardId="growing-lcs"
      >
        {loading ? <Skeleton /> : (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab4}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-0.5"
            >
              {growingLCs.length === 0
                ? <p className="text-white/25 text-xs text-center py-8">No data yet</p>
                : growingLCs.map((item, i) => (
                    <GrowthRow
                      key={item.name}
                      rank={i + 1}
                      name={item.name}
                      recent={item.recent}
                      older={item.older}
                      rate={item.rate}
                      delay={i * 0.03}
                    />
                  ))
              }
              {growingLCs.length > 0 && (
                <p className="text-white/20 text-[9px] mt-3 font-data">
                  Recent ÷ Older · split at timeline midpoint
                </p>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </RankingCard>

      {/* ── Card 5: Zero to Hero Entities ── */}
      <RankingCard
        title="Zero to Hero Entities"
        subtitle="0 → ≥1 approvals this period"
        icon={Star}
        accent="#10b981"
        delay={0.6}
        tab={tab5}
        onTabChange={setTab5}
        cardId="zero-hero-entities"
      >
        {loading ? <Skeleton /> : (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab5}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-0.5"
            >
              {zeroHeroEntities.length === 0
                ? <p className="text-white/25 text-xs text-center py-8">No data yet</p>
                : zeroHeroEntities.map((item, i) => (
                    <ZeroHeroRow
                      key={item.name}
                      rank={i + 1}
                      name={item.name}
                      count={item.recent}
                      maxCount={zeroHeroEntities[0]?.recent ?? 1}
                      accent={accent5}
                      delay={i * 0.03}
                    />
                  ))
              }
            </motion.div>
          </AnimatePresence>
        )}
      </RankingCard>

      {/* ── Card 6: Zero to Hero LCs ── */}
      <RankingCard
        title="Zero to Hero LCs"
        subtitle="0 → ≥1 approvals this period"
        icon={Star}
        accent="#a78bfa"
        delay={0.7}
        tab={tab6}
        onTabChange={setTab6}
        cardId="zero-hero-lcs"
      >
        {loading ? <Skeleton /> : (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab6}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
              className="space-y-0.5"
            >
              {zeroHeroLCs.length === 0
                ? <p className="text-white/25 text-xs text-center py-8">No data yet</p>
                : zeroHeroLCs.map((item, i) => (
                    <ZeroHeroRow
                      key={item.name}
                      rank={i + 1}
                      name={item.name}
                      count={item.recent}
                      maxCount={zeroHeroLCs[0]?.recent ?? 1}
                      accent={accent6}
                      delay={i * 0.03}
                    />
                  ))
              }
            </motion.div>
          </AnimatePresence>
        )}
      </RankingCard>

    </div>
  );
}
