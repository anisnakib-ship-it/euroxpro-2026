"use client";

import { useState, useEffect, useCallback } from "react";
import { Application, ApprovalStats, computeStats, fetchStatsApplications, EUROPE_REGION_ID, PROGRAMME_BY_ID } from "@/lib/api";

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
  error: string | null;
  refresh: () => void;
}

interface ProgrammeSplit {
  GV: Application[];
  GTa: Application[];
  GTe: Application[];
}

function splitByProgramme(apps: Application[]): ProgrammeSplit {
  const GV: Application[] = [];
  const GTa: Application[] = [];
  const GTe: Application[] = [];
  for (const app of apps) {
    const prog =
      app.opportunity?.programme?.short_name_display ||
      PROGRAMME_BY_ID[app.opportunity?.programme?.id] ||
      app.opportunity?.programme?.short_name;
    if (prog === "GV") GV.push(app);
    else if (prog === "GTa") GTa.push(app);
    else if (prog === "GTe") GTe.push(app);
  }
  return { GV, GTa, GTe };
}

function shiftOneYearBack(dateStr: string): string {
  if (!dateStr) return dateStr;
  const d = new Date(dateStr);
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

export function useRankingsData(dateFrom: string, dateTo: string): RankingsData {
  const [data, setData] = useState<ProgrammeStats>({
    oGV: null, oGTa: null, oGTe: null,
    iGV: null, iGTa: null, iGTe: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

    // Prior year: same date range shifted back 12 months (for year-on-year growth)
    const priorFilter: Record<string, unknown> = {};
    if (dateFrom || dateTo) {
      priorFilter.date_approved = {
        ...(dateFrom ? { from: shiftOneYearBack(dateFrom) } : {}),
        ...(dateTo   ? { to:   shiftOneYearBack(dateTo)   } : {}),
      };
    }

    const oBase      = { ...dateFilter,  person_home_region:      [EUROPE_REGION_ID] };
    const iBase      = { ...dateFilter,  opportunity_home_region: [EUROPE_REGION_ID] };
    const oBasePrior = { ...priorFilter, person_home_region:      [EUROPE_REGION_ID] };
    const iBasePrior = { ...priorFilter, opportunity_home_region: [EUROPE_REGION_ID] };

    Promise.allSettled([
      fetchStatsApplications(oBase),      // oGX current — all programmes
      fetchStatsApplications(iBase),      // iCX current — all programmes
      fetchStatsApplications(oBasePrior), // oGX prior year
      fetchStatsApplications(iBasePrior), // iCX prior year
    ]).then(([oRes, iRes, oPriorRes, iPriorRes]) => {
      const oAll      = oRes.status      === "fulfilled" ? oRes.value      : [];
      const iAll      = iRes.status      === "fulfilled" ? iRes.value      : [];
      const oAllPrior = oPriorRes.status === "fulfilled" ? oPriorRes.value : [];
      const iAllPrior = iPriorRes.status === "fulfilled" ? iPriorRes.value : [];

      const anyFailed = [oRes, iRes, oPriorRes, iPriorRes].some(r => r.status === "rejected");

      const o = splitByProgramme(oAll);
      const i = splitByProgramme(iAll);
      const op = splitByProgramme(oAllPrior);
      const ip = splitByProgramme(iAllPrior);
      setData({
        oGV:  computeStats(o.GV,  op.GV),
        oGTa: computeStats(o.GTa, op.GTa),
        oGTe: computeStats(o.GTe, op.GTe),
        iGV:  computeStats(i.GV,  ip.GV),
        iGTa: computeStats(i.GTa, ip.GTa),
        iGTe: computeStats(i.GTe, ip.GTe),
      });
      setError(anyFailed ? "Some rankings data could not be loaded" : null);
      setLoading(false);
    });

    // No auto-refresh — use the manual refresh button instead
  }, [dateFrom, dateTo, refreshKey]);

  return { ...data, loading, error, refresh };
}
