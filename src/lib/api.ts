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
  country?: string | null; // plain String scalar on the API
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
          home_lc { id name country tag }
          home_mc { id name country tag }
        }
        host_lc { id name country tag }
        home_mc  { id name country tag }
        opportunity {
          id
          title
          programme { id short_name short_name_display }
          home_lc   { id name country tag }
          home_mc   { id name country tag }
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
      status: "approved",
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
    status: "approved",
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

export function computeStats(applications: Application[]): ApprovalStats {
  // Loop 1: build byDayMap only (needed to compute midDate first)
  const byDayMap: Record<string, number> = {};
  for (const app of applications) {
    const dateStr = app.date_approved ?? app.created_at;
    if (dateStr) {
      const day = dateStr.slice(0, 10);
      byDayMap[day] = (byDayMap[day] ?? 0) + 1;
    }
  }

  // Compute midDate as the true temporal midpoint between first and last approval date.
  // Using the calendar midpoint (not median array index) ensures "older" = first half of
  // the time range and "recent" = second half — regardless of where activity is clustered.
  const allDates = Object.keys(byDayMap).sort();
  const midDate =
    allDates.length > 1
      ? new Date(
          (new Date(allDates[0]).getTime() + new Date(allDates[allDates.length - 1]).getTime()) / 2
        )
          .toISOString()
          .slice(0, 10)
      : "";

  // Loop 2: build everything else including all growth fields
  const byProgramme: Record<string, number> = {};
  const byHomeCountry: Record<string, number> = {};
  const byHostCountry: Record<string, number> = {};
  const byHomeLC: Record<string, number> = {};
  const byHostLC: Record<string, number> = {};
  const growthByHomeEntity: Record<string, { recent: number; older: number }> = {};
  const growthByHostEntity: Record<string, { recent: number; older: number }> = {};
  const growthByHomeLC: Record<string, { recent: number; older: number }> = {};
  const growthByHostLC: Record<string, { recent: number; older: number }> = {};

  for (const app of applications) {
    // Use short_name_display (GV / GTa / GTe) as key
    const prog =
      app.opportunity?.programme?.short_name_display ||
      PROGRAMME_BY_ID[app.opportunity?.programme?.id] ||
      app.opportunity?.programme?.short_name ||
      "Other";
    byProgramme[prog] = (byProgramme[prog] ?? 0) + 1;

    // By home country (EP's country) — prefer home_mc.country (MC-level, always populated)
    // over home_lc.country (LC-level, often null) to avoid Turkey 84-vs-1018 style splits
    const homeCountry =
      app.person?.home_mc?.country ??
      app.person?.home_lc?.country ??
      app.person?.home_mc?.name ??
      app.person?.home_lc?.name ??
      "Unknown";
    if (homeCountry) byHomeCountry[homeCountry] = (byHomeCountry[homeCountry] ?? 0) + 1;

    // By host country (where EP is going)
    const hostCountry = app.host_lc?.country ?? app.home_mc?.country ?? app.home_mc?.name ?? "Unknown";
    if (hostCountry) byHostCountry[hostCountry] = (byHostCountry[hostCountry] ?? 0) + 1;

    // By home LC name (oGX: EP's home LC)
    const homeLCName = app.person?.home_lc?.name ?? "Unknown";
    if (homeLCName !== "Unknown") {
      byHomeLC[homeLCName] = (byHomeLC[homeLCName] ?? 0) + 1;
    }

    // By host LC name (iCX: European LC hosting the EP)
    const hostLCName = app.host_lc?.name ?? "Unknown";
    if (hostLCName !== "Unknown") {
      byHostLC[hostLCName] = (byHostLC[hostLCName] ?? 0) + 1;
    }

    // Growth fields
    const dateStr = (app.date_approved ?? app.created_at ?? "").slice(0, 10);
    const bucket = dateStr >= midDate ? "recent" : "older";

    const homeEntity =
      app.person?.home_mc?.country ??
      app.person?.home_lc?.country ??
      app.person?.home_mc?.name ??
      "Unknown";
    const hostEntity = app.home_mc?.country ?? app.home_mc?.name ?? "Unknown";
    const homeLCKey = app.person?.home_lc?.name ?? "Unknown";
    const hostLCKey = app.host_lc?.name ?? "Unknown";

    if (homeEntity !== "Unknown") {
      if (!growthByHomeEntity[homeEntity]) growthByHomeEntity[homeEntity] = { recent: 0, older: 0 };
      growthByHomeEntity[homeEntity][bucket] += 1;
    }

    if (hostEntity !== "Unknown") {
      if (!growthByHostEntity[hostEntity]) growthByHostEntity[hostEntity] = { recent: 0, older: 0 };
      growthByHostEntity[hostEntity][bucket] += 1;
    }

    if (homeLCKey !== "Unknown") {
      if (!growthByHomeLC[homeLCKey]) growthByHomeLC[homeLCKey] = { recent: 0, older: 0 };
      growthByHomeLC[homeLCKey][bucket] += 1;
    }

    if (hostLCKey !== "Unknown") {
      if (!growthByHostLC[hostLCKey]) growthByHostLC[hostLCKey] = { recent: 0, older: 0 };
      growthByHostLC[hostLCKey][bucket] += 1;
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
        filters: { status: "approved", ...extraFilters },
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
            filters: { status: "approved", ...extraFilters },
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
