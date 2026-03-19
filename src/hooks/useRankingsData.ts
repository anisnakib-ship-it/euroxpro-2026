"use client";

import { useState, useEffect, useCallback } from "react";
import { ApprovalStats, computeStats, fetchStatsApplications, EUROPE_REGION_ID } from "@/lib/api";

export interface ProgrammeStats {
  oGV:  ApprovalStats | null;
  oGTa: ApprovalStats | null;
  oGTe: ApprovalStats | null;
  iGV:  ApprovalStats | null;
  iGTa: ApprovalStats | null;
  iGTe: ApprovalStats | null;
}

export interface RankingsData extends ProgrammeStats {
  loading: boolean;
  refresh: () => void;
}

export function useRankingsData(dateFrom: string, dateTo: string): RankingsData {
  const [data, setData] = useState<ProgrammeStats>({
    oGV: null, oGTa: null, oGTe: null,
    iGV: null, iGTa: null, iGTe: null,
  });
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  useEffect(() => {
    setLoading(true);

    const dateFilter: Record<string, unknown> = {};
    if (dateFrom || dateTo) {
      dateFilter.date_approved = {
        ...(dateFrom ? { from: dateFrom } : {}),
        ...(dateTo   ? { to:   dateTo   } : {}),
      };
    }

    const oBase = { ...dateFilter, person_home_region:      [EUROPE_REGION_ID] };
    const iBase = { ...dateFilter, opportunity_home_region: [EUROPE_REGION_ID] };

    Promise.all([
      fetchStatsApplications({ ...oBase, programmes: [7] }),
      fetchStatsApplications({ ...oBase, programmes: [8] }),
      fetchStatsApplications({ ...oBase, programmes: [9] }),
      fetchStatsApplications({ ...iBase, programmes: [7] }),
      fetchStatsApplications({ ...iBase, programmes: [8] }),
      fetchStatsApplications({ ...iBase, programmes: [9] }),
    ]).then(([oGV, oGTa, oGTe, iGV, iGTa, iGTe]) => {
      setData({
        oGV:  computeStats(oGV),
        oGTa: computeStats(oGTa),
        oGTe: computeStats(oGTe),
        iGV:  computeStats(iGV),
        iGTa: computeStats(iGTa),
        iGTe: computeStats(iGTe),
      });
      setLoading(false);
    }).catch(() => setLoading(false));

    /* Auto-refresh every 5 minutes — resets on filter change or manual refresh */
    const id = setInterval(() => setRefreshKey((k) => k + 1), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [dateFrom, dateTo, refreshKey]);

  return { ...data, loading, refresh };
}
