"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronLeft, ChevronRight, CheckCircle, X, SlidersHorizontal } from "lucide-react";
import { Application, PROGRAMME_BY_ID } from "@/lib/api";

interface Props {
  applications: Application[];
  loading: boolean;
  refreshing?: boolean;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (p: number) => void;
}

const COLUMNS = [
  "Home LC", "Home MC", "Programme",
  "Host LC", "Host MC", "Opportunity", "Approved On",
];

const PROG_META: Record<string, { color: string; bg: string; glow: string }> = {
  GV:  { color: "#F85A40", bg: "rgba(248,90,64,0.12)",  glow: "rgba(248,90,64,0.35)"  },
  GTa: { color: "#0CB9C1", bg: "rgba(12,185,193,0.12)", glow: "rgba(12,185,193,0.35)" },
  GTe: { color: "#F48924", bg: "rgba(244,137,36,0.12)", glow: "rgba(244,137,36,0.35)" },
};

const PROG_FILTERS = ["All", "GV", "GTa", "GTe"] as const;
type ProgFilter = typeof PROG_FILTERS[number];

const STATUS_FILTERS = [
  { key: "all",      label: "All statuses" },
  { key: "approved", label: "Approved" },
  { key: "other",    label: "Other" },
] as const;
type StatusFilter = typeof STATUS_FILTERS[number]["key"];

const rowVariants = {
  hidden: { opacity: 0, x: -12 },
  show: (i: number) => ({
    opacity: 1, x: 0,
    transition: { duration: 0.22, delay: i * 0.018, ease: "easeOut" as const },
  }),
  exit: { opacity: 0, x: 12, transition: { duration: 0.15, ease: "easeIn" as const } },
};

export default function ApprovalsTable({
  applications, loading, refreshing, page, totalPages, total, onPageChange,
}: Props) {
  const [search, setSearch]           = useState("");
  const [focused, setFocused]         = useState(false);
  const [progFilter, setProgFilter]   = useState<ProgFilter>("All");
  const [statusFilter, setStatus]     = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    let result = applications;

    if (progFilter !== "All") {
      result = result.filter((app) => {
        const prog =
          app.opportunity?.programme?.short_name_display ||
          PROGRAMME_BY_ID[app.opportunity?.programme?.id] ||
          app.opportunity?.programme?.short_name || "";
        return prog === progFilter;
      });
    }

    if (statusFilter === "approved") {
      result = result.filter((app) => app.status?.toLowerCase() === "approved");
    } else if (statusFilter === "other") {
      result = result.filter((app) => app.status?.toLowerCase() !== "approved");
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((app) => {
        const homeCountry = app.person?.home_lc?.name ?? "";
        const hostCountry = app.host_lc?.name ?? app.home_mc?.name ?? "";
        return (
          app.person?.full_name?.toLowerCase().includes(q) ||
          app.person?.home_lc?.name?.toLowerCase().includes(q) ||
          homeCountry.toLowerCase().includes(q) ||
          app.host_lc?.name?.toLowerCase().includes(q) ||
          app.home_mc?.name?.toLowerCase().includes(q) ||
          hostCountry.toLowerCase().includes(q) ||
          app.opportunity?.title?.toLowerCase().includes(q) ||
          (app.opportunity?.programme?.short_name_display ?? "").toLowerCase().includes(q)
        );
      });
    }

    return result;
  }, [applications, search, progFilter, statusFilter]);

  const hasActiveFilter = progFilter !== "All" || statusFilter !== "all" || search;
  const clearAll = () => { setSearch(""); setProgFilter("All"); setStatus("all"); };

  // When local filters change, go back to page 1 so the user sees filtered results from the start
  useEffect(() => {
    if (page !== 1) onPageChange(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progFilter, statusFilter, search]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.025)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.07)",
      }}
    >
      {/* ── Header ── */}
      <div className="p-4 border-b border-white/[0.07] flex flex-col gap-3">

        {/* Top row: title + search */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div>
            <h3 className="text-white font-bold tracking-tight">Approvals Log</h3>
            <p className="text-white/30 text-xs mt-0.5 font-data">
              <span className="text-white/55 font-semibold">{total.toLocaleString()}</span>
              {" "}total ·{" "}
              <span className="text-[#674ea7] font-semibold">{filtered.length}</span>
              {" "}on page
            </p>
          </div>

          <div className="sm:ml-auto flex items-center gap-2">
            {/* Search */}
            <motion.div
              animate={focused ? {
                boxShadow: "0 0 0 2px rgba(103,78,167,0.5), 0 0 20px rgba(103,78,167,0.2)",
              } : { boxShadow: "none" }}
              transition={{ duration: 0.2 }}
              className="rounded-xl overflow-hidden"
            >
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  placeholder="Search LC, MC, opportunity…"
                  className="bg-white/[0.05] border border-white/[0.08] rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-white/25 focus:outline-none w-full sm:w-52 transition-colors"
                />
                <AnimatePresence>
                  {search && (
                    <motion.button
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      onClick={() => setSearch("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white transition-colors cursor-pointer"
                      aria-label="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>

            {/* Clear all filters */}
            <AnimatePresence>
              {hasActiveFilter && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  onClick={clearAll}
                  className="flex items-center gap-1 px-2.5 py-2 rounded-xl text-[11px] font-medium cursor-pointer transition-colors"
                  style={{ color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
                  aria-label="Clear all filters"
                >
                  <X className="w-3 h-3" />
                  Clear
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-white/25">
            <SlidersHorizontal className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-widest">Filter</span>
          </div>

          <div className="w-px h-4 bg-white/10" />

          {/* Programme pills */}
          <div className="flex gap-1 rounded-lg p-0.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {PROG_FILTERS.map((p) => {
              const active = progFilter === p;
              const meta = p !== "All" ? PROG_META[p] : null;
              return (
                <button
                  key={p}
                  onClick={() => setProgFilter(p)}
                  className="relative px-2.5 py-1 rounded-md text-[11px] font-bold transition-all duration-150 cursor-pointer focus-visible:outline-none"
                  style={active ? {
                    background: meta ? `${meta.color}20` : "rgba(103,78,167,0.2)",
                    color: meta ? meta.color : "#a78bfa",
                    border: `1px solid ${meta ? meta.color + "40" : "rgba(103,78,167,0.45)"}`,
                  } : { color: "rgba(255,255,255,0.3)", border: "1px solid transparent" }}
                >
                  {active && meta && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full mr-1" style={{ backgroundColor: meta.color }} />
                  )}
                  {p}
                </button>
              );
            })}
          </div>

          <div className="w-px h-4 bg-white/10" />

          {/* Status pills */}
          <div className="flex gap-1 rounded-lg p-0.5" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
            {STATUS_FILTERS.map((s) => {
              const active = statusFilter === s.key;
              return (
                <button
                  key={s.key}
                  onClick={() => setStatus(s.key)}
                  className="px-2.5 py-1 rounded-md text-[11px] font-bold transition-all duration-150 cursor-pointer focus-visible:outline-none"
                  style={active ? {
                    background: "rgba(52,211,153,0.15)",
                    color: "#34d399",
                    border: "1px solid rgba(52,211,153,0.35)",
                  } : { color: "rgba(255,255,255,0.3)", border: "1px solid transparent" }}
                >
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="overflow-x-auto relative">
        {/* Refresh shimmer overlay */}
        <AnimatePresence>
          {refreshing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 z-20 pointer-events-none"
              style={{ background: "rgba(5,8,16,0.55)", backdropFilter: "blur(2px)" }}
            />
          )}
        </AnimatePresence>

        {/* Fixed-height scrollable body */}
        <div className="overflow-y-auto" style={{ maxHeight: "380px" }}>
          <table className="w-full text-sm min-w-[760px]">
            <thead className="sticky top-0 z-10" style={{ background: "rgba(8,10,20,0.95)", backdropFilter: "blur(12px)" }}>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                {COLUMNS.map((h) => (
                  <th key={h}
                    className="text-left text-[10px] font-bold uppercase tracking-widest px-4 py-2.5 whitespace-nowrap"
                    style={{ color: "rgba(255,255,255,0.28)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* Initial load skeleton */}
              {loading && Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  {COLUMNS.map((_, j) => (
                    <td key={j} className="px-4 py-2.5">
                      <div
                        className="h-3 rounded shimmer-bg"
                        style={{ width: `${42 + j * 7}%`, opacity: 1 - i * 0.08 }}
                      />
                    </td>
                  ))}
                </tr>
              ))}

              <AnimatePresence mode="popLayout">
                {!loading && filtered.map((app, i) => {
                  const prog =
                    app.opportunity?.programme?.short_name_display ||
                    app.opportunity?.programme?.short_name || "—";
                  const meta = PROG_META[prog];

                  return (
                    <motion.tr
                      key={app.id}
                      custom={i}
                      variants={rowVariants}
                      initial="hidden"
                      animate="show"
                      exit="exit"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
                      whileHover={{
                        backgroundColor: "rgba(103,78,167,0.06)",
                        boxShadow: meta ? `inset 3px 0 0 ${meta.color}` : "none",
                      }}
                      transition={{ duration: 0.15 }}
                    >
                      {/* Home LC */}
                      <td className="px-4 py-2.5 whitespace-nowrap"
                        style={{ color: "rgba(255,255,255,0.55)" }}>
                        {app.person?.home_lc?.name ?? "—"}
                      </td>

                      {/* Home MC */}
                      <td className="px-4 py-2.5 whitespace-nowrap"
                        style={{ color: "rgba(255,255,255,0.38)" }}>
                        {app.person?.home_mc?.name ?? "—"}
                      </td>

                      {/* Programme badge */}
                      <td className="px-4 py-2.5">
                        {meta ? (
                          <motion.span
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wide"
                            style={{
                              color: meta.color,
                              background: meta.bg,
                              border: `1px solid ${meta.color}30`,
                            }}
                            whileHover={{
                              boxShadow: `0 0 10px ${meta.glow}`,
                              scale: 1.06,
                            }}
                            transition={{ duration: 0.15 }}
                          >
                            <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ backgroundColor: meta.color }} />
                            {prog}
                          </motion.span>
                        ) : (
                          <span className="text-white/30 text-xs">{prog}</span>
                        )}
                      </td>

                      {/* Host LC */}
                      <td className="px-4 py-2.5 whitespace-nowrap"
                        style={{ color: "rgba(255,255,255,0.55)" }}>
                        {app.host_lc?.name ?? app.opportunity?.home_lc?.name ?? "—"}
                      </td>

                      {/* Host MC */}
                      <td className="px-4 py-2.5 whitespace-nowrap"
                        style={{ color: "rgba(255,255,255,0.38)" }}>
                        {app.home_mc?.name ?? app.opportunity?.home_mc?.name ?? "—"}
                      </td>

                      {/* Opportunity */}
                      <td className="px-4 py-2.5 max-w-[160px] truncate"
                        style={{ color: "rgba(255,255,255,0.45)" }}
                        title={app.opportunity?.title ?? undefined}>
                        {app.opportunity?.title ?? "—"}
                      </td>

                      {/* Approved On */}
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 font-data text-[11px]"
                          style={{ color: "rgba(255,255,255,0.38)" }}>
                          <CheckCircle className="w-3 h-3 flex-shrink-0" style={{ color: "#34d399" }} />
                          {app.date_approved
                            ? new Date(app.date_approved).toLocaleDateString("en-GB", {
                                day: "2-digit", month: "short", year: "numeric",
                              })
                            : "—"}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>

              {/* Empty state */}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={COLUMNS.length}>
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center justify-center py-12 gap-3"
                    >
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                        style={{ background: "rgba(103,78,167,0.12)", border: "1px solid rgba(103,78,167,0.25)" }}>
                        <Search className="w-4 h-4" style={{ color: "#674ea7" }} />
                      </div>
                      <p className="text-white/30 text-sm font-medium">No records match your filters</p>
                      <button
                        onClick={clearAll}
                        className="text-[#674ea7] text-xs hover:text-[#a78bfa] transition-colors cursor-pointer underline underline-offset-2"
                      >
                        Clear all filters
                      </button>
                    </motion.div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ── */}
      <div className="px-5 py-3.5 border-t border-white/[0.07] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white/25 text-xs font-data">
            Page <span className="text-white/50 font-semibold">{page}</span> of{" "}
            <span className="text-white/50 font-semibold">{totalPages || 1}</span>
          </span>

          {/* Dot indicators */}
          {totalPages > 1 && totalPages <= 10 && (
            <div className="flex gap-1 ml-2">
              {Array.from({ length: totalPages }).map((_, i) => (
                <motion.button
                  key={i}
                  onClick={() => onPageChange(i + 1)}
                  animate={{
                    scale: page === i + 1 ? 1 : 0.7,
                    opacity: page === i + 1 ? 1 : 0.35,
                  }}
                  className="rounded-full cursor-pointer transition-colors"
                  style={{
                    width: page === i + 1 ? 16 : 6,
                    height: 6,
                    background: page === i + 1 ? "#674ea7" : "rgba(255,255,255,0.3)",
                    transitionProperty: "width, background",
                    transitionDuration: "0.2s",
                  }}
                  aria-label={`Go to page ${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <motion.button
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            whileTap={{ scale: 0.9 }}
            aria-label="Previous page"
            className="p-1.5 rounded-lg border text-white/40 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
            style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
            whileHover={page > 1 ? {
              background: "rgba(103,78,167,0.2)",
              borderColor: "rgba(103,78,167,0.45)",
            } : {}}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </motion.button>
          <motion.button
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
            whileTap={{ scale: 0.9 }}
            aria-label="Next page"
            className="p-1.5 rounded-lg border text-white/40 hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200 cursor-pointer"
            style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.08)" }}
            whileHover={page < totalPages ? {
              background: "rgba(103,78,167,0.2)",
              borderColor: "rgba(103,78,167,0.45)",
            } : {}}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
