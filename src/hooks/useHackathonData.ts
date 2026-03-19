"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchStatsApplications, EUROPE_REGION_ID, Application } from "@/lib/api";

// ── Constants ─────────────────────────────────────────────────────────────────

export const GOAL_TOTAL = 1200;
export const HACK_LABEL = "Mar 23–31, 2026";
export const COMP_LABEL = "Mar 17–25, 2025";

const HACK_FROM = "2026-03-23";
const HACK_TO   = "2026-03-31";
const COMP_FROM = "2025-03-17";
const COMP_TO   = "2025-03-25";

// All 9 days of the hackathon
const HACK_DAYS: string[] = [];
for (let d = new Date(HACK_FROM); d <= new Date(HACK_TO); d.setDate(d.getDate() + 1)) {
  HACK_DAYS.push(d.toISOString().slice(0, 10));
}

// ── Helper exports ─────────────────────────────────────────────────────────────

export function countByKey(
  apps: Application[],
  getKey: (a: Application) => string | undefined
): Record<string, number> {
  const map: Record<string, number> = {};
  for (const app of apps) {
    const k = getKey(app);
    if (k) map[k] = (map[k] ?? 0) + 1;
  }
  return map;
}

export function buildComparison(
  map26: Record<string, number>,
  map25: Record<string, number>
): { name: string; this_year: number; last_year: number; delta: number }[] {
  const keys = new Set([...Object.keys(map26), ...Object.keys(map25)]);
  const result: { name: string; this_year: number; last_year: number; delta: number }[] = [];
  for (const name of keys) {
    const this_year = map26[name] ?? 0;
    const last_year = map25[name] ?? 0;
    result.push({ name, this_year, last_year, delta: this_year - last_year });
  }
  return result;
}

// ── Sparkline builder ──────────────────────────────────────────────────────────

function buildSparkline(
  allApps2026: Application[]
): { date: string; rawDate: string; count: number; cumulative: number; goal: number }[] {
  const byDay: Record<string, number> = {};
  for (const app of allApps2026) {
    const day = (app.date_approved ?? app.created_at ?? "").slice(0, 10);
    if (day && HACK_DAYS.includes(day)) {
      byDay[day] = (byDay[day] ?? 0) + 1;
    }
  }

  const monthNames: Record<string, string> = {
    "01": "Jan", "02": "Feb", "03": "Mar", "04": "Apr",
    "05": "May", "06": "Jun", "07": "Jul", "08": "Aug",
    "09": "Sep", "10": "Oct", "11": "Nov", "12": "Dec",
  };

  let cumulative = 0;
  return HACK_DAYS.map((raw) => {
    const count = byDay[raw] ?? 0;
    cumulative += count;
    const [, mm, dd] = raw.split("-");
    const label = `${monthNames[mm]} ${parseInt(dd, 10)}`;
    return { date: label, rawDate: raw, count, cumulative, goal: GOAL_TOTAL };
  });
}

// ── Hook return type ───────────────────────────────────────────────────────────

export interface HackathonData {
  oGV26: Application[];
  oGTa26: Application[];
  oGTe26: Application[];
  iGV26: Application[];
  iGTa26: Application[];
  iGTe26: Application[];
  oGV25: Application[];
  oGTa25: Application[];
  oGTe25: Application[];
  iGV25: Application[];
  iGTa25: Application[];
  iGTe25: Application[];

  total2026: number;
  total2025: number;
  oGX2026: number;
  iCX2026: number;
  oGX2025: number;
  iCX2025: number;

  sparkline: { date: string; rawDate: string; count: number; cumulative: number; goal: number }[];
  recentApps: Application[];

  loading: boolean;
  refresh: () => void;
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useHackathonData(): HackathonData {
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);

  const [oGV26, setOGV26] = useState<Application[]>([]);
  const [oGTa26, setOGTa26] = useState<Application[]>([]);
  const [oGTe26, setOGTe26] = useState<Application[]>([]);
  const [iGV26, setIGV26] = useState<Application[]>([]);
  const [iGTa26, setIGTa26] = useState<Application[]>([]);
  const [iGTe26, setIGTe26] = useState<Application[]>([]);

  const [oGV25, setOGV25] = useState<Application[]>([]);
  const [oGTa25, setOGTa25] = useState<Application[]>([]);
  const [oGTe25, setOGTe25] = useState<Application[]>([]);
  const [iGV25, setIGV25] = useState<Application[]>([]);
  const [iGTa25, setIGTa25] = useState<Application[]>([]);
  const [iGTe25, setIGTe25] = useState<Application[]>([]);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const base26oGX = {
        person_home_region: [EUROPE_REGION_ID],
        date_approved: { from: HACK_FROM, to: HACK_TO },
      };
      const base26iCX = {
        opportunity_home_region: [EUROPE_REGION_ID],
        date_approved: { from: HACK_FROM, to: HACK_TO },
      };
      const base25oGX = {
        person_home_region: [EUROPE_REGION_ID],
        date_approved: { from: COMP_FROM, to: COMP_TO },
      };
      const base25iCX = {
        opportunity_home_region: [EUROPE_REGION_ID],
        date_approved: { from: COMP_FROM, to: COMP_TO },
      };

      const [
        _oGV26, _oGTa26, _oGTe26,
        _iGV26, _iGTa26, _iGTe26,
        _oGV25, _oGTa25, _oGTe25,
        _iGV25, _iGTa25, _iGTe25,
      ] = await Promise.all([
        fetchStatsApplications({ ...base26oGX, programmes: [7] }),
        fetchStatsApplications({ ...base26oGX, programmes: [8] }),
        fetchStatsApplications({ ...base26oGX, programmes: [9] }),
        fetchStatsApplications({ ...base26iCX, programmes: [7] }),
        fetchStatsApplications({ ...base26iCX, programmes: [8] }),
        fetchStatsApplications({ ...base26iCX, programmes: [9] }),
        fetchStatsApplications({ ...base25oGX, programmes: [7] }),
        fetchStatsApplications({ ...base25oGX, programmes: [8] }),
        fetchStatsApplications({ ...base25oGX, programmes: [9] }),
        fetchStatsApplications({ ...base25iCX, programmes: [7] }),
        fetchStatsApplications({ ...base25iCX, programmes: [8] }),
        fetchStatsApplications({ ...base25iCX, programmes: [9] }),
      ]);

      setOGV26(_oGV26);
      setOGTa26(_oGTa26);
      setOGTe26(_oGTe26);
      setIGV26(_iGV26);
      setIGTa26(_iGTa26);
      setIGTe26(_iGTe26);
      setOGV25(_oGV25);
      setOGTa25(_oGTa25);
      setOGTe25(_oGTe25);
      setIGV25(_iGV25);
      setIGTa25(_iGTa25);
      setIGTe25(_iGTe25);
    } catch {
      // silently fall back to empty arrays already set
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
    const id = setInterval(() => setRefreshKey((k) => k + 1), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [loadAll]);

  useEffect(() => {
    if (refreshKey > 0) loadAll();
  }, [refreshKey, loadAll]);

  const oGX2026 = oGV26.length + oGTa26.length + oGTe26.length;
  const iCX2026 = iGV26.length + iGTa26.length + iGTe26.length;
  const oGX2025 = oGV25.length + oGTa25.length + oGTe25.length;
  const iCX2025 = iGV25.length + iGTa25.length + iGTe25.length;
  const total2026 = oGX2026 + iCX2026;
  const total2025 = oGX2025 + iCX2025;

  const all2026 = [
    ...oGV26, ...oGTa26, ...oGTe26,
    ...iGV26, ...iGTa26, ...iGTe26,
  ];

  const sparkline = buildSparkline(all2026);

  const recentApps = [...all2026].sort((a, b) => {
    const da = (a.date_approved ?? a.created_at ?? "");
    const db = (b.date_approved ?? b.created_at ?? "");
    return db.localeCompare(da);
  });

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  return {
    oGV26, oGTa26, oGTe26,
    iGV26, iGTa26, iGTe26,
    oGV25, oGTa25, oGTe25,
    iGV25, iGTa25, iGTe25,
    total2026, total2025,
    oGX2026, iCX2026,
    oGX2025, iCX2025,
    sparkline,
    recentApps,
    loading,
    refresh,
  };
}
