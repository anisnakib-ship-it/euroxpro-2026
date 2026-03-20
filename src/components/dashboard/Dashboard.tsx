"use client";

import { useState, useMemo } from "react";
import { useApprovals } from "@/hooks/useApprovals";
import { useRankingsData } from "@/hooks/useRankingsData";
import Header from "./Header";
import StatsCards from "./StatsCards";
import ApprovalsChart from "./ApprovalsChart";
import ApprovalsTable from "./ApprovalsTable";
import RankingsCards from "./RankingsCards";
import Filters, { ActiveFilters, PROGRAMME_ID, EUROPE_REGION_ID } from "./Filters";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";

/* Ambient floating orbs behind all content */
function FloatingOrbs() {
  const orbs = [
    { color: "#674ea7", size: 600, x: "5%",  y: "10%",  blur: 120, opacity: 0.12, duration: 18, delay: 0 },
    { color: "#037EF3", size: 450, x: "70%", y: "5%",   blur: 100, opacity: 0.09, duration: 22, delay: 3 },
    { color: "#F85A40", size: 300, x: "85%", y: "55%",  blur: 90,  opacity: 0.07, duration: 16, delay: 6 },
    { color: "#0CB9C1", size: 350, x: "15%", y: "65%",  blur: 110, opacity: 0.07, duration: 20, delay: 9 },
    { color: "#F48924", size: 250, x: "50%", y: "80%",  blur: 80,  opacity: 0.06, duration: 14, delay: 4 },
  ];

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {orbs.map((orb, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: orb.color,
            opacity: orb.opacity,
            filter: `blur(${orb.blur}px)`,
            willChange: "transform",
          }}
          animate={{
            x: [0, 40, -20, 0],
            y: [0, -30, 20, 0],
            scale: [1, 1.08, 0.96, 1],
          }}
          transition={{
            duration: orb.duration,
            delay: orb.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

/* Section that reveals on scroll */
function RevealSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40, scale: 0.98 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

export default function Dashboard({ onHackathon }: { onHackathon?: () => void } = {}) {
  const [filters, setFilters] = useState<ActiveFilters>({
    mode: "oGX",
    programme: "all",
    dateFrom: "2025-07-01",
    dateTo: "2026-06-30",
  });

  const apiFilters = useMemo(() => {
    const f: Record<string, unknown> = {};

    // Region filter depends on mode
    if (filters.mode === "oGX") {
      f.person_home_region = [EUROPE_REGION_ID];       // European EPs going abroad
    } else {
      f.opportunity_home_region = [EUROPE_REGION_ID];  // Foreign EPs hosted in Europe
    }

    if (filters.programme !== "all") {
      f.programmes = [PROGRAMME_ID[filters.programme]];
    }
    if (filters.dateFrom || filters.dateTo) {
      f.date_approved = {
        ...(filters.dateFrom ? { from: filters.dateFrom } : {}),
        ...(filters.dateTo   ? { to:   filters.dateTo   } : {}),
      };
    }
    return f;
  }, [filters]);

  const { applications, stats, programmeTotals, loading, refreshing, error, page, setPage, totalPages, total, refresh, lastUpdated } =
    useApprovals(apiFilters);

  const rankings = useRankingsData(filters.dateFrom, filters.dateTo);

  const refreshAll = () => { refresh(); rankings.refresh(); };

  return (
    <div className="relative min-h-screen" style={{ background: "#050810" }}>
      {/* Ambient background orbs */}
      <FloatingOrbs />

      {/* Content layer */}
      <div className="relative z-10">
        <Header />

        <main className="max-w-7xl mx-auto px-4 md:px-6 py-8 space-y-6">

          {/* Error banner */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-start gap-3 rounded-xl px-4 py-3 text-amber-400 text-sm"
                style={{
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.2)",
                }}
              >
                <motion.div
                  animate={{ rotate: [0, -5, 5, -5, 0] }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                </motion.div>
                <div>
                  <strong>API Notice:</strong> Could not reach live data ({error}). Displaying demo data.
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Filters */}
          <RevealSection delay={0}>
            <Filters
              filters={filters}
              onChange={(f) => { setFilters(f); setPage(1); }}
              onRefresh={refreshAll}
              loading={loading}
              refreshing={refreshing}
              lastUpdated={lastUpdated}
              onHackathon={onHackathon}
            />
          </RevealSection>

          {/* KPI cards */}
          <RevealSection delay={0.05}>
            <StatsCards stats={stats} total={total} programmeTotals={programmeTotals} mode={filters.mode} loading={loading} refreshing={refreshing} />
          </RevealSection>

          {/* Charts */}
          <RevealSection delay={0.1}>
            <ApprovalsChart stats={stats} loading={loading} refreshing={refreshing} />
          </RevealSection>

          {/* Rankings */}
          <RevealSection delay={0.15}>
            <RankingsCards
              oGV={rankings.oGV}
              oGTa={rankings.oGTa}
              oGTe={rankings.oGTe}
              iGV={rankings.iGV}
              iGTa={rankings.iGTa}
              iGTe={rankings.iGTe}
              loading={rankings.loading}
              mode={filters.mode}
              programme={filters.programme}
            />
          </RevealSection>

          {/* Table */}
          <RevealSection delay={0.2}>
            <ApprovalsTable
              applications={applications}
              loading={loading}
              refreshing={refreshing}
              page={page}
              totalPages={totalPages}
              total={total}
              onPageChange={setPage}
            />
          </RevealSection>

          {/* Footer */}
          <motion.footer
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="py-10"
          >
            {/* Divider */}
            <div className="h-px mb-8 mx-auto max-w-lg"
              style={{ background: "linear-gradient(90deg, transparent, rgba(103,78,167,0.35), rgba(3,126,243,0.25), transparent)" }}
            />

            <div className="flex flex-col items-center gap-5">

              {/* Logo row */}
              <div className="flex items-center gap-6">
                <motion.div
                  className="relative h-6 w-24 opacity-30"
                  whileHover={{ opacity: 0.65, scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  <Image src="/logos/aiesec-white.png" alt="AIESEC" fill sizes="96px" className="object-contain" />
                </motion.div>

                <div className="h-6 w-px" style={{ background: "rgba(255,255,255,0.1)" }} />

                <motion.div
                  className="relative h-5 w-36 opacity-30"
                  whileHover={{ opacity: 0.65, scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  <Image src="/logos/europe-white.png" alt="AIESEC in Europe" fill sizes="144px" className="object-contain" />
                </motion.div>
              </div>

              {/* Attribution */}
              <div className="flex flex-col items-center gap-1.5">
                <p className="text-white/40 text-sm font-semibold tracking-wide">
                  Created For AIESEC In Europe
                </p>
                <p className="text-white/25 text-xs font-data">
                  By{" "}
                  <span className="text-[#a78bfa] font-bold">Anis Nakib</span>
                  {" "}·{" "}
                  IM Specialist RST
                </p>
              </div>

              {/* Metadata line */}
              <div className="flex items-center gap-2 text-white/15 text-[11px] font-data">
                <motion.span
                  className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{ backgroundColor: "#674ea7" }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                Approvals Tracker · Hackathon March 25–29, 2026
                <motion.span
                  className="w-1.5 h-1.5 rounded-full inline-block"
                  style={{ backgroundColor: "#037EF3" }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 0.7 }}
                />
              </div>
            </div>
          </motion.footer>
        </main>
      </div>
    </div>
  );
}
