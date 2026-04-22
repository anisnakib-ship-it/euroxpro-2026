import { NextResponse } from "next/server";

const GIS_URL = "https://gis-api.aiesec.org/graphql";
const EXPA_TOKEN = process.env.AIESEC_GIS_TOKEN ?? "";
const EUROPE_REGION_ID = 1629;

const QUERY = `
  query($filters: ApplicationFilter, $pagination: Pagination) {
    allOpportunityApplication(filters: $filters, pagination: $pagination) {
      data {
        id
        status
        date_approved
        person {
          id
          home_lc { id name country }
          home_mc { id name country }
        }
        opportunity {
          programme { id short_name short_name_display }
        }
      }
      paging { total_items total_pages }
    }
  }
`;

interface LCOffice { id: string | null; name: string | null; country: string | null }
interface App {
  id: string;
  status: string;
  date_approved: string | null;
  person: { id: string; home_lc: LCOffice | null; home_mc: LCOffice | null };
  opportunity: { programme: { id: string; short_name: string; short_name_display: string } };
}

async function fetchAll(filters: Record<string, unknown>): Promise<App[]> {
  const PER_PAGE = 500;
  const first = await fetch(GIS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: EXPA_TOKEN },
    body: JSON.stringify({ query: QUERY, variables: { pagination: { page: 1, per_page: PER_PAGE }, filters } }),
    cache: "no-store",
  }).then(r => r.json());

  const { data, paging } = first?.data?.allOpportunityApplication ?? { data: [], paging: { total_items: 0, total_pages: 1 } };
  const page1: App[] = data ?? [];
  if (paging.total_items <= page1.length) return page1;

  const realPerPage = page1.length || PER_PAGE;
  const totalPages = Math.ceil(paging.total_items / realPerPage);
  const remaining = Math.min(totalPages - 1, 49);

  const rest = await Promise.all(
    Array.from({ length: remaining }, (_, i) =>
      fetch(GIS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: EXPA_TOKEN },
        body: JSON.stringify({ query: QUERY, variables: { pagination: { page: i + 2, per_page: PER_PAGE }, filters } }),
        cache: "no-store",
      })
        .then(r => r.json())
        .then(r => (r?.data?.allOpportunityApplication?.data ?? []) as App[])
        .catch(() => [] as App[])
    )
  );

  return [...page1, ...rest.flat()];
}

function progLabel(app: App): string {
  return app.opportunity?.programme?.short_name_display
    || ({ "7": "GV", "8": "GTa", "9": "GTe" } as Record<string, string>)[app.opportunity?.programme?.id]
    || app.opportunity?.programme?.short_name
    || "Other";
}

function countByLCId(apps: App[]): Record<string, { name: string; count: number }> {
  const byId: Record<string, { name: string; count: number }> = {};
  for (const app of apps) {
    const id   = app.person?.home_lc?.id   ?? undefined;
    const name = app.person?.home_lc?.name ?? "Unknown";
    if (name === "Unknown") continue;
    const key = id ?? `name:${name}`;
    if (!byId[key]) byId[key] = { name, count: 0 };
    byId[key].count += 1;
  }
  return byId;
}

function buildGrowthRecord(
  current: Record<string, { name: string; count: number }>,
  prior:   Record<string, { name: string; count: number }>,
): Record<string, { name: string; recent: number; older: number }> {
  const out: Record<string, { name: string; recent: number; older: number }> = {};
  const allKeys = new Set([...Object.keys(current), ...Object.keys(prior)]);
  for (const k of allKeys) {
    const name = current[k]?.name ?? prior[k]?.name ?? k;
    out[k] = { name, recent: current[k]?.count ?? 0, older: prior[k]?.count ?? 0 };
  }
  return out;
}

function top10Growth(rec: Record<string, { name: string; recent: number; older: number }>) {
  return Object.values(rec)
    .filter(v => v.older > 0)
    .map(v => ({ ...v, rate: ((v.recent - v.older) / v.older) * 100 }))
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 10);
}

export async function GET() {
  const dateFilter     = { date_approved: { from: "2025-07-01", to: "2026-06-30" } };
  const priorFilter    = { date_approved: { from: "2024-07-01", to: "2025-06-30" } };

  const [currentAll, priorAll] = await Promise.all([
    fetchAll({ ...dateFilter, person_home_region: [EUROPE_REGION_ID] }),
    fetchAll({ ...priorFilter, person_home_region: [EUROPE_REGION_ID] }),
  ]);

  // ── Phase 1: raw fetch counts ─────────────────────────────────────────────
  const phase1 = {
    label: "Phase 1 — Raw fetch",
    current_total: currentAll.length,
    prior_total: priorAll.length,
  };

  // ── Phase 2: filter GV only ───────────────────────────────────────────────
  const currentGV = currentAll.filter(a => progLabel(a) === "GV");
  const priorGV   = priorAll.filter(a => progLabel(a) === "GV");
  const phase2 = {
    label: "Phase 2 — After GV filter",
    current_gv: currentGV.length,
    prior_gv: priorGV.length,
  };

  // ── Phase 3: countByLCId (id-keyed buckets) ───────────────────────────────
  const currentBuckets = countByLCId(currentGV);
  const priorBuckets   = countByLCId(priorGV);

  // Highlight Madrid specifically
  const madridCurrentKey = Object.keys(currentBuckets).find(k =>
    currentBuckets[k].name?.toLowerCase().includes("madrid")
  );
  const madridPriorKey = Object.keys(priorBuckets).find(k =>
    priorBuckets[k].name?.toLowerCase().includes("madrid")
  );

  const phase3 = {
    label: "Phase 3 — countByLCId buckets",
    current_lc_count: Object.keys(currentBuckets).length,
    prior_lc_count: Object.keys(priorBuckets).length,
    madrid_in_current: madridCurrentKey ? { key: madridCurrentKey, ...currentBuckets[madridCurrentKey] } : null,
    madrid_in_prior:   madridPriorKey   ? { key: madridPriorKey,   ...priorBuckets[madridPriorKey]   } : null,
    // Also show all Spain-related buckets
    spain_lcs_current: Object.entries(currentBuckets)
      .filter(([, v]) => v.name?.toLowerCase().includes("spain") || v.name?.toLowerCase().includes("madrid") || v.name?.toLowerCase().includes("español") || v.name?.toLowerCase().includes("espana") || v.name?.toLowerCase().includes("española"))
      .map(([k, v]) => ({ key: k, ...v })),
    spain_lcs_prior: Object.entries(priorBuckets)
      .filter(([, v]) => v.name?.toLowerCase().includes("spain") || v.name?.toLowerCase().includes("madrid") || v.name?.toLowerCase().includes("español") || v.name?.toLowerCase().includes("espana") || v.name?.toLowerCase().includes("española"))
      .map(([k, v]) => ({ key: k, ...v })),
  };

  // ── Phase 4: raw home_lc data for Spanish EPs ─────────────────────────────
  const spanishApps = currentGV.filter(a =>
    a.person?.home_mc?.country === "Spain" ||
    a.person?.home_mc?.name?.toLowerCase().includes("spain") ||
    a.person?.home_lc?.country === "Spain"
  );
  const phase4 = {
    label: "Phase 4 — Raw home_lc for Spanish GV EPs",
    spanish_ep_count: spanishApps.length,
    records: spanishApps.map(a => ({
      app_id: a.id,
      date_approved: a.date_approved,
      home_lc_id:      a.person?.home_lc?.id      ?? null,
      home_lc_name:    a.person?.home_lc?.name     ?? null,
      home_lc_country: a.person?.home_lc?.country  ?? null,
      home_mc_name:    a.person?.home_mc?.name      ?? null,
      home_mc_country: a.person?.home_mc?.country   ?? null,
    })),
  };

  // ── Phase 5: buildGrowthRecord ────────────────────────────────────────────
  const growthRec = buildGrowthRecord(currentBuckets, priorBuckets);
  const madridGrowthKey = Object.keys(growthRec).find(k =>
    growthRec[k].name?.toLowerCase().includes("madrid")
  );
  const phase5 = {
    label: "Phase 5 — buildGrowthRecord",
    total_entries: Object.keys(growthRec).length,
    madrid_entry: madridGrowthKey ? { key: madridGrowthKey, ...growthRec[madridGrowthKey] } : null,
  };

  // ── Phase 6: top10Growth filter (older > 0) ───────────────────────────────
  const afterOlderFilter = Object.values(growthRec).filter(v => v.older > 0);
  const madridAfterFilter = afterOlderFilter.find(v => v.name?.toLowerCase().includes("madrid"));
  const phase6 = {
    label: "Phase 6 — After older > 0 filter",
    entries_remaining: afterOlderFilter.length,
    madrid_survives_filter: !!madridAfterFilter,
    madrid: madridAfterFilter ?? null,
  };

  // ── Phase 7: sort by rate ─────────────────────────────────────────────────
  const sorted = afterOlderFilter
    .map(v => ({ ...v, rate: ((v.recent - v.older) / v.older) * 100 }))
    .sort((a, b) => b.rate - a.rate);

  const madridRank = sorted.findIndex(v => v.name?.toLowerCase().includes("madrid"));
  const phase7 = {
    label: "Phase 7 — Sorted by rate (all, before slice)",
    madrid_rank: madridRank === -1 ? "not found" : madridRank + 1,
    full_sorted_list: sorted.map((v, i) => ({
      rank: i + 1,
      name: v.name,
      recent: v.recent,
      older: v.older,
      rate: Math.round(v.rate),
    })),
  };

  // ── Phase 8: slice top 10 ─────────────────────────────────────────────────
  const top10 = top10Growth(growthRec);
  const phase8 = {
    label: "Phase 8 — Final top 10",
    result: top10.map((v, i) => ({
      rank: i + 1,
      name: v.name,
      recent: v.recent,
      older: v.older,
      rate: Math.round(v.rate),
    })),
  };

  return NextResponse.json({ phase1, phase2, phase3, phase4, phase5, phase6, phase7, phase8 });
}
