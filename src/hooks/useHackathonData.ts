"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Application, PROGRAMME_BY_ID } from "@/lib/api";

// ── Constants ─────────────────────────────────────────────────────────────────

export const GOAL_TOTAL = 1200;
export const HACK_LABEL = "Mar 23–31, 2026";
export const COMP_LABEL = "Mar 17–25, 2025";

const HACK_FROM = "2026-03-23";
const HACK_TO   = "2026-03-31";

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

// ── Programme split ────────────────────────────────────────────────────────────

interface ProgrammeSplit { GV: Application[]; GTa: Application[]; GTe: Application[]; }

function splitByProgramme(apps: Application[]): ProgrammeSplit {
  const GV: Application[] = [], GTa: Application[] = [], GTe: Application[] = [];
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

// ── Sparkline builder ──────────────────────────────────────────────────────────

function buildSparkline(
  allApps2026: Application[]
): { date: string; rawDate: string; count: number; cumulative: number; goal: number }[] {
  const byDay: Record<string, number> = {};
  for (const app of allApps2026) {
    const day = (app.date_approved ?? "").slice(0, 10);
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

// ── SSE payload shape (mirrors stream/route.ts fetchSnapshot return) ───────────

interface StreamSnapshot {
  oAll26: Application[];
  iAll26: Application[];
  oAll25: Application[];
  iAll25: Application[];
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useHackathonData(): HackathonData {
  // esKey increment → closes current EventSource → opens a new one → gets fresh data immediately
  const [esKey, setEsKey] = useState(0);
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

  useEffect(() => {
    setLoading(true);

    const es = new EventSource("/api/gis/stream");

    es.onmessage = (event) => {
      try {
        const { oAll26, iAll26, oAll25, iAll25 } =
          JSON.parse(event.data) as StreamSnapshot;

        const o26 = splitByProgramme(oAll26);
        const i26 = splitByProgramme(iAll26);
        const o25 = splitByProgramme(oAll25);
        const i25 = splitByProgramme(iAll25);

        setOGV26(o26.GV);  setOGTa26(o26.GTa);  setOGTe26(o26.GTe);
        setIGV26(i26.GV);  setIGTa26(i26.GTa);  setIGTe26(i26.GTe);
        setOGV25(o25.GV);  setOGTa25(o25.GTa);  setOGTe25(o25.GTe);
        setIGV25(i25.GV);  setIGTa25(i25.GTa);  setIGTe25(i25.GTe);
      } catch {
        // Malformed message — ignore, wait for next tick
      } finally {
        setLoading(false);
      }
    };

    es.onerror = () => {
      // EventSource auto-reconnects on network drops.
      // On reconnect the server sends the latest snapshot immediately (no stale gap).
    };

    return () => es.close(); // cleanup on unmount or esKey change
  }, [esKey]);

  const oGX2026 = useMemo(() => oGV26.length + oGTa26.length + oGTe26.length, [oGV26, oGTa26, oGTe26]);
  const iCX2026 = useMemo(() => iGV26.length + iGTa26.length + iGTe26.length, [iGV26, iGTa26, iGTe26]);
  const oGX2025 = useMemo(() => oGV25.length + oGTa25.length + oGTe25.length, [oGV25, oGTa25, oGTe25]);
  const iCX2025 = useMemo(() => iGV25.length + iGTa25.length + iGTe25.length, [iGV25, iGTa25, iGTe25]);
  const total2026 = useMemo(() => oGX2026 + iCX2026, [oGX2026, iCX2026]);
  const total2025 = useMemo(() => oGX2025 + iCX2025, [oGX2025, iCX2025]);

  const all2026 = useMemo(() => {
    const combined = [
      ...oGV26, ...oGTa26, ...oGTe26,
      ...iGV26, ...iGTa26, ...iGTe26,
    ];
    const seen = new Set<string>();
    return combined.filter((a) => {
      if (seen.has(a.id)) return false;
      seen.add(a.id);
      return true;
    });
  }, [oGV26, oGTa26, oGTe26, iGV26, iGTa26, iGTe26]);

  const sparkline = useMemo(() => buildSparkline(all2026), [all2026]);

  const recentApps = useMemo(() =>
    [...all2026].sort((a, b) => {
      const da = (a.date_approved ?? a.created_at ?? "");
      const db = (b.date_approved ?? b.created_at ?? "");
      return db.localeCompare(da);
    }),
    [all2026]
  );

  // Force-refresh: closes current EventSource, opens a new one.
  // The server sends the latest snapshot immediately on connect — no wait for next 30 s tick.
  const refresh = useCallback(() => setEsKey((k) => k + 1), []);

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
