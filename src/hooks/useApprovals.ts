"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { fetchApplications, fetchStatsApplications, computeStats, Application, ApprovalStats, ProgrammeTotals } from "@/lib/api";

export function useApprovals(filters: Record<string, unknown> = {}) {
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<ApprovalStats | null>(null);
  const [programmeTotals, setProgrammeTotals] = useState<ProgrammeTotals>({ GV: 0, GTa: 0, GTe: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const hasDataRef = useRef(false);

  const load = useCallback(
    async (p: number) => {
      if (hasDataRef.current) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      try {
        // Fetch page data and full stats dataset in parallel.
        // Table uses paginated result.data (50/page); charts use all records via statsApps.
        // Programme totals are derived from statsApps to guarantee consistency with the chart.
        const [result, statsApps] = await Promise.all([
          fetchApplications(p, filters),
          fetchStatsApplications(filters),
        ]);
        const computedStats = computeStats(statsApps);
        setApplications(result.data);
        setTotal(result.total);
        setTotalPages(result.pages);
        setStats(computedStats);
        setProgrammeTotals({
          GV:  computedStats.byProgramme["GV"]  ?? 0,
          GTa: computedStats.byProgramme["GTa"] ?? 0,
          GTe: computedStats.byProgramme["GTe"] ?? 0,
        });
        setLastUpdated(new Date());
        hasDataRef.current = true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
        const mock = generateMockData();
        const mockStats = computeStats(mock);
        setApplications(mock);
        setStats(mockStats);
        setTotal(mock.length);
        setTotalPages(1);
        setProgrammeTotals({
          GV:  mockStats.byProgramme["GV"]  ?? 0,
          GTa: mockStats.byProgramme["GTa"] ?? 0,
          GTe: mockStats.byProgramme["GTe"] ?? 0,
        });
        hasDataRef.current = true;
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(filters)]
  );

  useEffect(() => {
    load(page);
    const id = setInterval(() => load(page), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [load, page]);

  const refresh = useCallback(() => load(page), [load, page]);

  return { applications, stats, programmeTotals, loading, refreshing, error, page, setPage, totalPages, total, refresh, lastUpdated };
}

function generateMockData(): Application[] {
  const programmes = ["GV", "GTa", "GTe", "GV", "GTa", "GV"];
  const homeCountries = [
    "Germany", "France", "Spain", "Italy", "Netherlands", "Poland",
    "Portugal", "Romania", "Czech Republic", "Hungary", "Greece", "Sweden",
    "Denmark", "Belgium", "Austria", "Switzerland",
  ];
  const hostData = [
    { lc: "Cairo University", mc: "Egypt", country: "Egypt" },
    { lc: "Menofia", mc: "Egypt", country: "Egypt" },
    { lc: "Mumbai", mc: "India", country: "India" },
    { lc: "São Paulo", mc: "Brazil", country: "Brazil" },
    { lc: "Nairobi", mc: "Kenya", country: "Kenya" },
    { lc: "Jakarta", mc: "Indonesia", country: "Indonesia" },
  ];
  const now = new Date();

  return Array.from({ length: 80 }, (_, i) => {
    const homeCountry = homeCountries[i % homeCountries.length];
    const prog = programmes[i % programmes.length];
    const host = hostData[i % hostData.length];
    const dayOffset = Math.floor(Math.random() * 30);
    const d = new Date(now);
    d.setDate(d.getDate() - dayOffset);

    return {
      id: String(1000 + i),
      status: "approved",
      created_at: d.toISOString(),
      date_approved: d.toISOString(),
      opportunity: {
        id: String(2000 + i),
        title: `${prog} Opportunity ${i + 1}`,
        programme: { id: String([7, 8, 9][i % 3]), short_name: prog === "GTa" ? "GT" : prog === "GTe" ? "GT" : prog, short_name_display: prog },
        home_lc: { id: String(3000 + i), name: host.lc, country: host.country, tag: "LC" },
        home_mc: { id: String(3100 + i), name: host.mc, country: host.country, tag: "MC" },
      },
      host_lc: { id: String(3000 + i), name: host.lc, country: host.country, tag: "LC" },
      home_mc:  { id: String(3100 + i), name: host.mc, country: host.country, tag: "MC" },
      person: {
        id: String(4000 + i),
        full_name: `Member ${i + 1}`,
        home_lc: { id: String(5000 + i), name: `LC ${homeCountry}`, country: null, tag: "LC" },
        home_mc: { id: String(5100 + i), name: homeCountry, country: homeCountry, tag: "MC" },
      },
    };
  });
}
