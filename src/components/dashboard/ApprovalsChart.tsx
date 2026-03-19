"use client";

import { motion } from "framer-motion";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ApprovalStats } from "@/lib/api";

interface Props {
  stats: ApprovalStats | null;
  loading: boolean;
  refreshing?: boolean;
}


/* ── Custom Tooltip ── */
const CustomTooltip = ({
  active, payload, label,
}: {
  active?: boolean;
  payload?: { value: number; name: string; color: string }[];
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      className="rounded-xl px-4 py-3 shadow-2xl"
      style={{
        background: "rgba(10,10,28,0.95)",
        border: "1px solid rgba(103,78,167,0.35)",
        backdropFilter: "blur(20px)",
      }}
    >
      {label && <p className="text-white/40 text-[10px] font-data uppercase tracking-wider mb-1.5">{label}</p>}
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
          <span className="text-white font-bold text-sm font-data">{p.value.toLocaleString()}</span>
          {p.name && p.name !== "count" && (
            <span className="text-white/40 text-xs ml-1">{p.name}</span>
          )}
        </div>
      ))}
    </motion.div>
  );
};

/* ── Shimmer skeleton ── */
function Skeleton({ height = 200 }: { height?: number }) {
  return (
    <div className="rounded-xl shimmer-bg" style={{ height }} />
  );
}

/* ── Chart card wrapper with hover glow ── */
function ChartCard({
  children, className = "", delay = 0, accent = "#674ea7",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  accent?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, scale: 1.008 }}
      className={`group relative rounded-2xl p-5 overflow-hidden ${className}`}
      style={{
        background: "rgba(255,255,255,0.025)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* Hover glow border */}
      <motion.div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300"
        style={{
          boxShadow: `inset 0 0 0 1px ${accent}50, 0 0 40px ${accent}22`,
        }}
      />
      {/* Top accent line */}
      <motion.div
        className="absolute top-0 left-8 right-8 h-[1.5px] opacity-0 group-hover:opacity-100 pointer-events-none rounded-full"
        style={{ background: `linear-gradient(90deg, transparent, ${accent}cc, transparent)` }}
        transition={{ duration: 0.3 }}
      />
      {/* Corner accent dot */}
      <div
        className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ backgroundColor: accent, boxShadow: `0 0 6px ${accent}` }}
      />
      {children}
    </motion.div>
  );
}

/* ── Section header ── */
function ChartHeader({ title, subtitle, accent }: { title: string; subtitle: string; accent: string }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <motion.span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: accent, boxShadow: `0 0 6px ${accent}` }}
          animate={{ scale: [1, 1.5, 1], opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <h3 className="font-bold text-sm tracking-tight" style={{ color: "white" }}>
          {title}
        </h3>
      </div>
      <p className="text-white/35 text-[11px] mt-0.5 pl-3.5">{subtitle}</p>
      <motion.div
        className="mt-2 h-px rounded-full"
        style={{ background: `linear-gradient(90deg, ${accent}, ${accent}00)` }}
        initial={{ width: 0 }}
        animate={{ width: 48 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}

export default function ApprovalsChart({ stats, loading, refreshing }: Props) {
  const timelineData = stats?.byDay ?? [];

  const contentOpacity = refreshing ? 0.4 : 1;
  const fadeTransition = { duration: refreshing ? 0.15 : 0.3 };
  const fadeProps = { animate: { opacity: contentOpacity }, transition: fadeTransition };

  return (
    <ChartCard delay={0.2} accent="#674ea7">
      <ChartHeader
        title="Approvals Over Time"
        subtitle="Daily approved count — European EPs"
        accent="#674ea7"
      />
      {loading ? <Skeleton height={260} /> : (
        <motion.div {...fadeProps}>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={timelineData}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor="#674ea7" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#674ea7" stopOpacity={0} />
                </linearGradient>
                <filter id="glow-line">
                  <feGaussianBlur stdDeviation="2" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis
                dataKey="date"
                tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10, fontFamily: "'Fira Code', monospace" }}
                tickFormatter={(v) => v.slice(5)}
                axisLine={false} tickLine={false}
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10, fontFamily: "'Fira Code', monospace" }}
                axisLine={false} tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone" dataKey="count" stroke="#8b6fcf" strokeWidth={2.5}
                fill="url(#areaGrad)" dot={false}
                activeDot={{ r: 6, fill: "#674ea7", stroke: "#a78bfa", strokeWidth: 2 }}
                filter="url(#glow-line)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </ChartCard>
  );
}
