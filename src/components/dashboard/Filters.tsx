"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Filter, RefreshCw, Calendar, X, ArrowUpRight, ArrowDownLeft, Zap } from "lucide-react";

const INTERVAL_MS = 5 * 60 * 1000;

function AutoRefreshCountdown({ lastUpdated }: { lastUpdated: Date | null }) {
  const [, tick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  if (!lastUpdated) return null;

  const secsLeft = Math.max(
    0,
    Math.ceil((lastUpdated.getTime() + INTERVAL_MS - Date.now()) / 1000)
  );
  const mins = Math.floor(secsLeft / 60);
  const secs = secsLeft % 60;

  return (
    <span className="text-white/20 text-[10px] font-data tabular-nums">
      {mins}:{secs.toString().padStart(2, "0")}
    </span>
  );
}

export const PROGRAMME_ID: Record<string, number> = { GV: 7, GTa: 8, GTe: 9 };
export const EUROPE_REGION_ID = 1629;

export type ExchangeMode = "oGX" | "iCX";

export interface ActiveFilters {
  mode: ExchangeMode;
  programme: string;   // "all" | "GV" | "GTa" | "GTe"
  dateFrom: string;
  dateTo: string;
}

interface Props {
  filters: ActiveFilters;
  onChange: (f: ActiveFilters) => void;
  onRefresh: () => void;
  loading: boolean;
  refreshing?: boolean;
  lastUpdated?: Date | null;
  onHackathon?: () => void;
}

const PROGRAMMES = [
  { key: "all",  logo: null,                   color: "#674ea7" },
  { key: "GV",   logo: "/logos/gv-white.png",  color: "#F85A40" },
  { key: "GTa",  logo: "/logos/gta-white.png", color: "#0CB9C1" },
  { key: "GTe",  logo: "/logos/gte-white.png", color: "#F48924" },
];

const MODES: { key: ExchangeMode; label: string; sub: string; icon: React.ElementType; color: string }[] = [
  { key: "oGX", label: "oGX",  sub: "European EPs going abroad",    icon: ArrowUpRight,   color: "#674ea7" },
  { key: "iCX", label: "iCX",  sub: "Foreign EPs hosted in Europe", icon: ArrowDownLeft,  color: "#037EF3" },
];

export default function Filters({ filters, onChange, onRefresh, loading, refreshing, lastUpdated, onHackathon }: Props) {
  const setProg = (p: string) => onChange({ ...filters, programme: p });
  const setFrom = (v: string) => onChange({ ...filters, dateFrom: v });
  const setTo   = (v: string) => onChange({ ...filters, dateTo: v });
  const setMode = (m: ExchangeMode) => onChange({ ...filters, mode: m, programme: "all" });
  const clearDates = () => onChange({ ...filters, dateFrom: "", dateTo: "" });
  const hasDateFilter = filters.dateFrom || filters.dateTo;
  const isBusy = loading || refreshing;
  const activeMode = MODES.find((m) => m.key === filters.mode)!;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* ── Mode toggle — full-width top bar ── */}
      <div className="grid grid-cols-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        {MODES.map((mode) => {
          const active = filters.mode === mode.key;
          const Icon = mode.icon;
          return (
            <motion.button
              key={mode.key}
              onClick={() => setMode(mode.key)}
              className="relative flex items-center justify-center gap-3 py-3.5 px-6 cursor-pointer transition-colors duration-200 focus-visible:outline-none"
              style={{
                background: active
                  ? `linear-gradient(135deg, ${mode.color}22, ${mode.color}0a)`
                  : "rgba(255,255,255,0.015)",
                borderRight: mode.key === "oGX" ? "1px solid rgba(255,255,255,0.07)" : undefined,
              }}
              whileHover={{ backgroundColor: `${mode.color}10` } as never}
            >
              {/* Active indicator line */}
              {active && (
                <motion.div
                  layoutId="mode-indicator"
                  className="absolute bottom-0 left-4 right-4 h-[2px] rounded-t-full"
                  style={{ background: `linear-gradient(90deg, transparent, ${mode.color}, transparent)` }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}

              <div
                className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0"
                style={{
                  background: active ? `${mode.color}25` : "rgba(255,255,255,0.06)",
                  border: `1px solid ${active ? mode.color + "40" : "rgba(255,255,255,0.08)"}`,
                }}
              >
                <Icon className="w-3.5 h-3.5" style={{ color: active ? mode.color : "rgba(255,255,255,0.3)" }} />
              </div>

              <div className="text-left">
                <div
                  className="font-black text-sm tracking-tight"
                  style={{ color: active ? "white" : "rgba(255,255,255,0.35)" }}
                >
                  {mode.label}
                  {active && (
                    <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded-md"
                      style={{ background: `${mode.color}22`, color: mode.color }}>
                      Active
                    </span>
                  )}
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: active ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.2)" }}>
                  {mode.sub}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* ── Filters row ── */}
      <div
        className="p-4 flex flex-wrap items-center gap-3"
        style={{ background: "rgba(255,255,255,0.02)" }}
      >
        {/* Label */}
        <div className="flex items-center gap-2" style={{ color: "rgba(255,255,255,0.25)" }}>
          <Filter className="w-3.5 h-3.5" />
          <span className="text-[10px] font-bold uppercase tracking-widest">Filters</span>
        </div>

        <div className="h-5 w-px bg-white/10" />

        {/* Programme pills */}
        <div className="flex gap-1 rounded-xl p-1" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
          {PROGRAMMES.map((p) => {
            const active = filters.programme === p.key;
            const accent = active ? p.color : undefined;
            return (
              <button
                key={p.key}
                onClick={() => setProg(p.key)}
                className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer focus-visible:outline-none"
                style={active ? {
                  background: `${activeMode.color}20`,
                  boxShadow: `inset 0 0 0 1px ${activeMode.color}45`,
                  color: "white",
                } : { color: "rgba(255,255,255,0.3)" }}
              >
                {active && (
                  <motion.div
                    layoutId="prog-pill"
                    className="absolute inset-0 rounded-lg"
                    style={{ background: `${activeMode.color}14`, border: `1px solid ${activeMode.color}35` }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  {p.logo ? (
                    <>
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: active ? p.color : "rgba(255,255,255,0.2)" }}
                      />
                      <div className="relative h-3 w-[72px]">
                        <Image src={p.logo} alt={p.key} fill sizes="72px" className="object-contain object-left" style={{ opacity: active ? 1 : 0.4 }} />
                      </div>
                      {/* Prefix badge */}
                      <span className="text-[9px] font-bold px-1 py-0.5 rounded" style={{ background: active ? `${activeMode.color}25` : "transparent", color: active ? activeMode.color : "transparent" }}>
                        {filters.mode === "oGX" ? "o" : "i"}
                      </span>
                    </>
                  ) : (
                    <span>All</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div className="h-5 w-px bg-white/10" />

        {/* Date range */}
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.25)" }} />
          <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.25)" }}>Approved</span>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none transition-colors [color-scheme:dark] cursor-pointer"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          />
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>→</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none transition-colors [color-scheme:dark] cursor-pointer"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          />
          {hasDateFilter && (
            <button
              onClick={clearDates}
              className="p-1.5 rounded-lg transition-all duration-200 cursor-pointer"
              style={{ color: "rgba(255,255,255,0.3)" }}
              title="Clear dates"
              aria-label="Clear date filter"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Refresh + Hackathon nav */}
        <div className="ml-auto flex items-center gap-2">
          {onHackathon && (
            <motion.button
              onClick={onHackathon}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer transition-all duration-200"
              style={{
                background: "rgba(248,90,64,0.1)",
                borderColor: "rgba(248,90,64,0.35)",
                color: "#F85A40",
              }}
              aria-label="Go to Hackathon Tracker"
            >
              <Zap className="w-3 h-3" />
              Hackathon
            </motion.button>
          )}
          {lastUpdated && (
            <div className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-emerald-400/50 inline-block" />
              <AutoRefreshCountdown lastUpdated={lastUpdated} />
            </div>
          )}
          <motion.button
            onClick={onRefresh}
            disabled={isBusy}
            whileHover={!isBusy ? { scale: 1.05 } : {}}
            whileTap={!isBusy ? { scale: 0.95 } : {}}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold border border-white/10 transition-all duration-200 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            style={{ color: "rgba(255,255,255,0.4)" }}
            aria-label="Refresh data"
          >
            <RefreshCw className={`w-3 h-3 ${isBusy ? "animate-spin" : ""}`} />
            {refreshing ? "Loading…" : "Refresh"}
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
