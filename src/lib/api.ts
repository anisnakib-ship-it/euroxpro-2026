// All GraphQL requests go through the Next.js proxy route (/api/gis).
// This avoids browser CORS restrictions — the server makes the outbound call.
const GRAPHQL_URL = "/api/gis";

// Europe region Office ID (confirmed via committee query: id 1629 = "Europe Region")
export const EUROPE_REGION_ID = 1629;

// ID → display label (confirmed from API: short_name_display field)
export const PROGRAMME_BY_ID: Record<string, string> = {
  "7": "GV",
  "8": "GTa",
  "9": "GTe",
};

export const PROGRAMME_FULL_NAMES: Record<string, string> = {
  GV:  "Global Volunteer",
  GTa: "Global Talent",
  GTe: "Global Teacher",
};

async function gqlFetch<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();

  // Only throw if there is NO data at all (total failure).
  // Partial errors like "record_not_found" on nullable fields are expected.
  const hasData = json.data != null && Object.values(json.data as object).some((v) => v != null);
  if (!hasData && json.errors?.length) {
    throw new Error(json.errors[0]?.message ?? "GraphQL error");
  }

  return json.data as T;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Programme {
  id: string;
  short_name: string;          // raw: "GV" | "GT" | "GT"
  short_name_display: string;  // display: "GV" | "GTa" | "GTe"
}

export interface Office {
  id: string;
  name: string;
  tag?: string;            // "LC" | "MC" | "Region" | "Global"
}

export interface Opportunity {
  id: string;
  title: string;
  programme: Programme;
  home_lc: Office;
  home_mc: Office;
}

export interface Application {
  id: string;
  status: string;
  created_at: string;
  updated_at?: string;
  date_approved?: string | null;
  // Confirmed via introspection & live test:
  host_lc: Office;   // LC hosting the EP (same as opportunity.home_lc)
  home_mc: Office;   // MC of the host entity (Host MC)
  opportunity: Opportunity;
  person: {
    id: string;
    full_name: string;
    home_lc: Office;   // EP's own LC (Home LC)
    home_mc?: Office;  // EP's own MC — more reliable country source than home_lc.country
  };
}

export interface Paging {
  total_items: number;
  total_pages: number;
  current_page?: number;
}

export interface ApplicationsResult {
  data: Application[];
  paging: Paging;
}

export interface ApprovalStats {
  total: number;
  byProgramme: Record<string, number>;
  byHomeCountry: Record<string, number>;
  byHostCountry: Record<string, number>;
  byDay: { date: string; count: number }[];
  byHomeLC: Record<string, number>;
  byHostLC: Record<string, number>;
  growthByHomeEntity: Record<string, { recent: number; older: number }>;
  growthByHostEntity: Record<string, { recent: number; older: number }>;
  growthByHomeLC: Record<string, { recent: number; older: number }>;
  growthByHostLC: Record<string, { recent: number; older: number }>;
}

// ── Query ─────────────────────────────────────────────────────────────────────

const APPLICATIONS_QUERY = `
  query GetApplications($filters: ApplicationFilter, $pagination: Pagination) {
    allOpportunityApplication(filters: $filters, pagination: $pagination) {
      data {
        id
        status
        created_at
        updated_at
        date_approved
        person {
          id
          full_name
          home_lc { id name tag }
          home_mc { id name tag }
        }
        host_lc { id name tag }
        home_mc  { id name tag }
        opportunity {
          id
          title
          programme { id short_name short_name_display }
          home_lc   { id name tag }
          home_mc   { id name tag }
        }
      }
      paging { total_items total_pages current_page }
    }
  }
`;

const EUROPE_MCS_QUERY = `
  query {
    committee(id: ${EUROPE_REGION_ID}) {
      id name
      suboffices { id name tag }
    }
  }
`;

// ── Public API ────────────────────────────────────────────────────────────────

export async function fetchApplications(
  page = 1,
  extraFilters: Record<string, unknown> = {}
): Promise<{ data: Application[]; total: number; pages: number }> {
  const result = await gqlFetch<{
    allOpportunityApplication: ApplicationsResult;
  }>(APPLICATIONS_QUERY, {
    pagination: { page, per_page: 50 },
    filters: {
      ...extraFilters,   // region filter (person_home_region or opportunity_home_region) injected by caller
    },
  });

  const { data, paging } = result.allOpportunityApplication;
  return { data, total: paging.total_items, pages: paging.total_pages };
}

// Fetch real total counts for each programme via 3 parallel API calls (per_page: 1)
const COUNT_QUERY = `
  query CountApplications($filters: ApplicationFilter) {
    allOpportunityApplication(filters: $filters, pagination: { page: 1, per_page: 1 }) {
      paging { total_items }
    }
  }
`;

export interface ProgrammeTotals {
  GV: number;
  GTa: number;
  GTe: number;
}

export async function fetchProgrammeTotals(
  extraFilters: Record<string, unknown> = {}
): Promise<ProgrammeTotals> {
  const base = {
    ...extraFilters,   // region filter injected by caller
  };

  const [gv, gta, gte] = await Promise.all([
    gqlFetch<{ allOpportunityApplication: { paging: { total_items: number } } }>(
      COUNT_QUERY, { filters: { ...base, programmes: [7] } }
    ).catch(() => ({ allOpportunityApplication: { paging: { total_items: 0 } } })),
    gqlFetch<{ allOpportunityApplication: { paging: { total_items: number } } }>(
      COUNT_QUERY, { filters: { ...base, programmes: [8] } }
    ).catch(() => ({ allOpportunityApplication: { paging: { total_items: 0 } } })),
    gqlFetch<{ allOpportunityApplication: { paging: { total_items: number } } }>(
      COUNT_QUERY, { filters: { ...base, programmes: [9] } }
    ).catch(() => ({ allOpportunityApplication: { paging: { total_items: 0 } } })),
  ]);

  return {
    GV:  gv.allOpportunityApplication.paging.total_items,
    GTa: gta.allOpportunityApplication.paging.total_items,
    GTe: gte.allOpportunityApplication.paging.total_items,
  };
}

export async function fetchEuropeMCs(): Promise<Office[]> {
  try {
    const result = await gqlFetch<{
      committee: { id: string; name: string; suboffices: Office[] };
    }>(EUROPE_MCS_QUERY);
    return result.committee.suboffices ?? [];
  } catch {
    return [];
  }
}

// Helper: count home-entity occurrences by MC id (deduplicates name variants).
function countByHomeEntity(apps: Application[]): Record<string, number> {
  const byId: Record<string, { name: string; count: number }> = {};
  for (const app of apps) {
    const id = app.person?.home_mc?.id;
    const name = app.person?.home_mc?.name ?? app.person?.home_lc?.name ?? "Unknown";
    if (name === "Unknown") continue;
    const key = id ?? `name:${name}`;
    if (!byId[key]) byId[key] = { name, count: 0 };
    if (app.person?.home_mc?.name) byId[key].name = app.person.home_mc.name;
    byId[key].count += 1;
  }
  return Object.fromEntries(Object.values(byId).map(({ name, count }) => [name, count]));
}

// Helper: count host-entity occurrences by MC id (deduplicates name variants).
function countByHostEntity(apps: Application[]): Record<string, number> {
  const byId: Record<string, { name: string; count: number }> = {};
  for (const app of apps) {
    const id = app.home_mc?.id ?? app.opportunity?.home_mc?.id;
    const name = app.home_mc?.name ?? app.opportunity?.home_mc?.name ?? "Unknown";
    if (name === "Unknown") continue;
    const key = id ?? `name:${name}`;
    if (!byId[key]) byId[key] = { name, count: 0 };
    if (app.home_mc?.name) byId[key].name = app.home_mc.name;
    else if (app.opportunity?.home_mc?.name) byId[key].name = app.opportunity.home_mc.name;
    byId[key].count += 1;
  }
  return Object.fromEntries(Object.values(byId).map(({ name, count }) => [name, count]));
}

// Helper: count LC occurrences by id (deduplicates name variants), returns name-keyed map.
// Falls back to name-keyed bucket when id is null so LCs with missing IDs are still counted.
function countByLCId(
  apps: Application[],
  getLCId: (a: Application) => string | undefined,
  getLCName: (a: Application) => string | undefined,
): Record<string, number> {
  const byId: Record<string, { name: string; count: number }> = {};
  for (const app of apps) {
    const id = getLCId(app);
    const name = getLCName(app) ?? "Unknown";
    if (name === "Unknown") continue;
    const key = id ?? `name:${name}`;
    if (!byId[key]) byId[key] = { name, count: 0 };
    byId[key].count += 1;
  }
  return Object.fromEntries(Object.values(byId).map(({ name, count }) => [name, count]));
}

// Helper: build growth record — recent = current period, older = prior year period
function buildGrowthRecord(
  current: Record<string, number>,
  prior: Record<string, number>,
): Record<string, { recent: number; older: number }> {
  const out: Record<string, { recent: number; older: number }> = {};
  const all = new Set([...Object.keys(current), ...Object.keys(prior)]);
  for (const k of all) {
    out[k] = { recent: current[k] ?? 0, older: prior[k] ?? 0 };
  }
  return out;
}

export function computeStats(
  applications: Application[],
  priorApplications?: Application[],
): ApprovalStats {
  // Loop 1: byDayMap for chart
  const byDayMap: Record<string, number> = {};
  for (const app of applications) {
    const dateStr = app.date_approved ?? app.created_at;
    if (dateStr) {
      const day = dateStr.slice(0, 10);
      byDayMap[day] = (byDayMap[day] ?? 0) + 1;
    }
  }

  // Loop 2: current-period stats (programme, country, LC breakdowns)
  // MC-level maps are id-keyed to deduplicate name variants (e.g. "Polska" vs "Poland")
  const byProgramme: Record<string, number> = {};
  const homeMCById: Record<string, { name: string; count: number }> = {};
  const hostMCById: Record<string, { name: string; count: number }> = {};
  const homeLCById: Record<string, { name: string; count: number }> = {};
  const hostLCById: Record<string, { name: string; count: number }> = {};

  for (const app of applications) {
    const prog =
      app.opportunity?.programme?.short_name_display ||
      PROGRAMME_BY_ID[app.opportunity?.programme?.id] ||
      app.opportunity?.programme?.short_name ||
      "Other";
    byProgramme[prog] = (byProgramme[prog] ?? 0) + 1;

    // Home entity (id-keyed dedup)
    const homeMCId = app.person?.home_mc?.id;
    const homeName = app.person?.home_mc?.name ?? app.person?.home_lc?.name ?? "Unknown";
    if (homeName !== "Unknown") {
      const hKey = homeMCId ?? `name:${homeName}`;
      if (!homeMCById[hKey]) homeMCById[hKey] = { name: homeName, count: 0 };
      if (app.person?.home_mc?.name) homeMCById[hKey].name = app.person.home_mc.name;
      homeMCById[hKey].count += 1;
    }

    // Host entity (id-keyed dedup)
    const hostMCId = app.home_mc?.id ?? app.opportunity?.home_mc?.id;
    const hostName = app.home_mc?.name ?? app.opportunity?.home_mc?.name ?? app.host_lc?.name ?? "Unknown";
    if (hostName !== "Unknown") {
      const tKey = hostMCId ?? `name:${hostName}`;
      if (!hostMCById[tKey]) hostMCById[tKey] = { name: hostName, count: 0 };
      if (app.home_mc?.name) hostMCById[tKey].name = app.home_mc.name;
      else if (app.opportunity?.home_mc?.name) hostMCById[tKey].name = app.opportunity.home_mc.name;
      hostMCById[tKey].count += 1;
    }

    const homeLCId = app.person?.home_lc?.id;
    const homeLCName = app.person?.home_lc?.name ?? "Unknown";
    if (homeLCName !== "Unknown") {
      const homeLCKey = homeLCId ?? `name:${homeLCName}`;
      if (!homeLCById[homeLCKey]) homeLCById[homeLCKey] = { name: homeLCName, count: 0 };
      homeLCById[homeLCKey].count += 1;
    }

    const hostLCId = app.host_lc?.id;
    const hostLCName = app.host_lc?.name ?? "Unknown";
    if (hostLCName !== "Unknown") {
      const hostLCKey = hostLCId ?? `name:${hostLCName}`;
      if (!hostLCById[hostLCKey]) hostLCById[hostLCKey] = { name: hostLCName, count: 0 };
      hostLCById[hostLCKey].count += 1;
    }
  }

  const byHomeCountry = Object.fromEntries(Object.values(homeMCById).map(({ name, count }) => [name, count]));
  const byHostCountry = Object.fromEntries(Object.values(hostMCById).map(({ name, count }) => [name, count]));
  const byHomeLC = Object.fromEntries(Object.values(homeLCById).map(({ name, count }) => [name, count]));
  const byHostLC = Object.fromEntries(Object.values(hostLCById).map(({ name, count }) => [name, count]));

  // Growth: year-on-year comparison — current period vs same period one year prior.
  // If no priorApplications provided, growth records are empty (not displayed).
  const prior = priorApplications ?? [];
  const growthByHomeEntity = buildGrowthRecord(countByHomeEntity(applications), countByHomeEntity(prior));
  const growthByHostEntity = buildGrowthRecord(countByHostEntity(applications), countByHostEntity(prior));
  const growthByHomeLC = buildGrowthRecord(
    countByLCId(applications, a => a.person?.home_lc?.id, a => a.person?.home_lc?.name),
    countByLCId(prior,        a => a.person?.home_lc?.id, a => a.person?.home_lc?.name),
  );
  const growthByHostLC = buildGrowthRecord(
    countByLCId(applications, a => a.host_lc?.id, a => a.host_lc?.name),
    countByLCId(prior,        a => a.host_lc?.id, a => a.host_lc?.name),
  );

  // Fill gaps so the chart line is continuous (days with no approvals = 0)
  if (Object.keys(byDayMap).length > 1) {
    const sorted = Object.keys(byDayMap).sort();
    const end = new Date(sorted[sorted.length - 1]);
    for (let d = new Date(sorted[0]); d <= end; d.setDate(d.getDate() + 1)) {
      const k = d.toISOString().slice(0, 10);
      if (!(k in byDayMap)) byDayMap[k] = 0;
    }
  }

  const byDay = Object.entries(byDayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));

  return {
    total: applications.length,
    byProgramme,
    byHomeCountry,
    byHostCountry,
    byDay,
    byHomeLC,
    byHostLC,
    growthByHomeEntity,
    growthByHostEntity,
    growthByHomeLC,
    growthByHostLC,
  };
}

export async function fetchStatsApplications(
  extraFilters: Record<string, unknown> = {}
): Promise<Application[]> {
  const PER_PAGE = 500;
  try {
    const first = await gqlFetch<{ allOpportunityApplication: ApplicationsResult }>(
      APPLICATIONS_QUERY,
      {
        pagination: { page: 1, per_page: PER_PAGE },
        filters: { ...extraFilters },
      }
    );
    const { data, paging } = first.allOpportunityApplication;
    const page1 = data ?? [];
    if (paging.total_items <= page1.length) return page1;

    // Derive real per-page from actual records returned (API may silently cap per_page).
    // Then compute true total pages from total_items so we never under-fetch.
    const realPerPage = page1.length || PER_PAGE;
    const realTotalPages = Math.ceil(paging.total_items / realPerPage);
    const remaining = Math.min(realTotalPages - 1, 49); // cap at 50 pages = 25 000 records max
    const pages = await Promise.all(
      Array.from({ length: remaining }, (_, i) =>
        gqlFetch<{ allOpportunityApplication: ApplicationsResult }>(
          APPLICATIONS_QUERY,
          {
            pagination: { page: i + 2, per_page: PER_PAGE },
            filters: { ...extraFilters },
          }
        )
          .then(r => r.allOpportunityApplication.data ?? [])
          .catch((): Application[] => [])
      )
    );
    return [...page1, ...pages.flat()];
  } catch {
    return [];
  }
}
