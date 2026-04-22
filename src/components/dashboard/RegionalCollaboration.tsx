"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Globe } from "lucide-react";
import { aggregateByRegion, REGION_META, REGION_ORDER, RegionKey } from "@/lib/regions";

interface Props {
  /** oGX: host-country distribution (where European EPs go) */
  oGXByHostCountry: Record<string, number>;
  /** iCX: origin-country distribution (where incoming EPs come from) */
  iCXByHomeCountry: Record<string, number>;
  loading: boolean;
}

// Animated fill bar — relative to the global max across all regions & directions
function FlowBar({
  count, max, color, delay,
}: {
  count: number; max: number; color: string; delay: number;
}) {
  const pct = max > 0 ? Math.min((count / max) * 100, 100) : 0;
  return (
    <div className="h-[3px] rounded-full overflow-hidden" style={{ background: `${color}18` }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: `linear-gradient(90deg, ${color}70, ${color})` }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.9, delay, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}

// One flow row (oGX or iCX)
function FlowRow({
  label, from, to, count, max, color, badgeColor, badgeText, delay,
}: {
  label: string; from: string; to: string;
  count: number; max: number;
  color: string; badgeColor: string; badgeText: string;
  delay: number;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className="text-[9px] font-bold px-1.5 py-0.5 rounded"
            style={{ background: `${badgeColor}20`, color: badgeColor, border: `1px solid ${badgeColor}35` }}
          >
            {label}
          </span>
          <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
            {from}
          </span>
          <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.2)" }}>→</span>
          <span className="text-[10px] font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>
            {to}
          </span>
        </div>
        <span className="text-xs font-bold tabular-nums font-data" style={{ color: "rgba(255,255,255,0.65)" }}>
          {count.toLocaleString()}
        </span>
      </div>
      <FlowBar count={count} max={max} color={color} delay={delay} />
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-2xl p-5 space-y-4"
      style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <div className="flex justify-between items-start">
        <div className="space-y-1.5">
          <div className="h-2.5 w-16 rounded shimmer-bg" />
          <div className="h-3.5 w-28 rounded shimmer-bg" />
        </div>
        <div className="h-6 w-12 rounded shimmer-bg" />
      </div>
      <div className="space-y-3 pt-1">
        <div className="space-y-1.5">
          <div className="h-3 w-full rounded shimmer-bg" />
          <div className="h-[3px] w-3/4 rounded shimmer-bg" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3 w-full rounded shimmer-bg" />
          <div className="h-[3px] w-1/2 rounded shimmer-bg" />
        </div>
      </div>
    </div>
  );
}

export default function RegionalCollaboration({ oGXByHostCountry, iCXByHomeCountry, loading }: Props) {
  const oGXByRegion = useMemo(() => aggregateByRegion(oGXByHostCountry), [oGXByHostCountry]);
  const iCXByRegion = useMemo(() => aggregateByRegion(iCXByHomeCountry), [iCXByHomeCountry]);

  // Global max — bars are relative to the most active corridor in either direction
  const maxAll = useMemo(() => {
    const values = REGION_ORDER.flatMap(r => [oGXByRegion[r], iCXByRegion[r]]);
    return Math.max(...values, 1);
  }, [oGXByRegion, iCXByRegion]);

  return (
    <div className="space-y-3">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <motion.div
          animate={{ rotate: [0, 15, -10, 15, 0] }}
          transition={{ duration: 4, repeat: Infinity, repeatDelay: 6 }}
        >
          <Globe className="w-4 h-4" style={{ color: "#a78bfa" }} />
        </motion.div>
        <h2 className="text-sm font-bold uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.4)" }}>
          Regional Collaboration
        </h2>
        <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
        <span className="text-[10px] font-data" style={{ color: "rgba(255,255,255,0.2)" }}>
          MC Term · both directions
        </span>
      </div>

      {/* 4 flow cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {loading
          ? REGION_ORDER.map(r => <CardSkeleton key={r} />)
          : REGION_ORDER.map((region, i) => {
              const meta = REGION_META[region];
              const isIntraEUR = region === "EUR";
              // For EUR↔EUR, oGX and iCX are the same exchanges from two perspectives.
              // Use the higher count for both (some iCX apps have null person.home_mc).
              const oGX = isIntraEUR
                ? Math.max(oGXByRegion[region], iCXByRegion[region])
                : oGXByRegion[region];
              const iCX = isIntraEUR
                ? Math.max(oGXByRegion[region], iCXByRegion[region])
                : iCXByRegion[region];
              const total = oGX + iCX;
              const balance = oGX - iCX;

              return (
                <motion.div
                  key={region}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
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
                    style={{ boxShadow: `inset 0 0 0 1px ${meta.color}45, 0 0 32px ${meta.color}14` }}
                  />
                  {/* Top accent line on hover */}
                  <div
                    className="absolute top-0 left-8 right-8 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                    style={{ background: `linear-gradient(90deg, transparent, ${meta.color}cc, transparent)` }}
                  />
                  {/* Subtle region color tint on top-right corner */}
                  <div
                    className="absolute top-0 right-0 w-20 h-20 rounded-bl-[60px] opacity-[0.04] pointer-events-none"
                    style={{ background: meta.color }}
                  />

                  {/* Card header */}
                  <div className="flex items-start justify-between mb-4 relative">
                    <div>
                      {/* EUR ↔ REGION label */}
                      <div className="flex items-center gap-1 mb-1">
                        <motion.span
                          className="text-[9px] font-black tracking-widest"
                          style={{ color: meta.color }}
                        >
                          EUR
                        </motion.span>
                        <span className="text-[9px]" style={{ color: "rgba(255,255,255,0.25)" }}>↔</span>
                        <span className="text-[9px] font-black tracking-widest" style={{ color: meta.color }}>
                          {meta.shortLabel}
                        </span>
                      </div>
                      <h3 className="text-white font-bold text-sm leading-tight">{meta.label}</h3>
                    </div>

                    {/* Total count */}
                    <div className="text-right">
                      <motion.div
                        className="text-xl font-black tabular-nums leading-none"
                        style={{ color: meta.color }}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: i * 0.08 + 0.2 }}
                      >
                        {total.toLocaleString()}
                      </motion.div>
                      <div className="text-[9px] mt-0.5 font-data" style={{ color: "rgba(255,255,255,0.2)" }}>
bilateral
                      </div>
                    </div>
                  </div>

                  {/* Flow rows */}
                  <div className="space-y-3 relative">
                    <FlowRow
                      label="oGX"
                      from="EUR"
                      to={isIntraEUR ? "EUR" : meta.shortLabel}
                      count={oGX}
                      max={maxAll}
                      color={meta.color}
                      badgeColor={meta.color}
                      badgeText="oGX"
                      delay={i * 0.08 + 0.15}
                    />
                    <FlowRow
                      label="iCX"
                      from={isIntraEUR ? "EUR" : meta.shortLabel}
                      to="EUR"
                      count={iCX}
                      max={maxAll}
                      color="#037EF3"
                      badgeColor="#60a5fa"
                      badgeText="iCX"
                      delay={i * 0.08 + 0.25}
                    />
                  </div>

                  {/* Balance footer */}
                  {total > 0 && (
                    <div
                      className="mt-3 pt-2.5 flex items-center justify-between"
                      style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                    >
                      <span className="text-[9px] font-data" style={{ color: "rgba(255,255,255,0.2)" }}>
                        balance
                      </span>
                      <motion.span
                        className="text-[10px] font-bold font-data px-1.5 py-0.5 rounded"
                        style={{
                          background: balance > 0
                            ? `${meta.color}15`
                            : balance < 0
                            ? "rgba(3,126,243,0.15)"
                            : "rgba(255,255,255,0.06)",
                          color: balance > 0
                            ? meta.color
                            : balance < 0
                            ? "#60a5fa"
                            : "rgba(255,255,255,0.3)",
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.08 + 0.4 }}
                      >
                        {balance === 0
                          ? "balanced"
                          : balance > 0
                          ? `+${balance.toLocaleString()} oGX`
                          : `+${Math.abs(balance).toLocaleString()} iCX`}
                      </motion.span>
                    </div>
                  )}
                </motion.div>
              );
            })}
      </div>
    </div>
  );
}
