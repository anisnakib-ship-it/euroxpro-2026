export const runtime = "edge";

// ── Constants ─────────────────────────────────────────────────────────────────

const GIS_URL           = "https://gis-api.aiesec.org/graphql";
const EUROPE_REGION_ID  = 1629;
const HACK_FROM         = "2026-03-23";
const HACK_TO           = "2026-03-31";
const COMP_FROM         = "2025-03-17";
const COMP_TO           = "2025-03-25";
const POLL_MS           = 30_000;
const PER_PAGE          = 500;

// ── GraphQL query (mirrors api.ts APPLICATIONS_QUERY exactly) ─────────────────

const QUERY = `
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

// ── Types (minimal — we just pass raw JSON to the client) ─────────────────────

type AppRecord = Record<string, unknown>;

interface GisPage {
  allOpportunityApplication: {
    data: AppRecord[];
    paging: { total_items: number; total_pages: number };
  };
}

// ── GIS fetch helpers ─────────────────────────────────────────────────────────

async function gisPost(variables: unknown): Promise<GisPage> {
  const token = process.env.AIESEC_GIS_TOKEN ?? "";
  const res = await fetch(GIS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token },
    body: JSON.stringify({ query: QUERY, variables }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GIS ${res.status}`);
  const json = (await res.json()) as { data: GisPage };
  return json.data;
}

async function fetchAllPages(filters: Record<string, unknown>): Promise<AppRecord[]> {
  const first = await gisPost({
    pagination: { page: 1, per_page: PER_PAGE },
    filters,
  });
  const { data, paging } = first.allOpportunityApplication;
  const page1 = data ?? [];
  if (paging.total_items <= page1.length) return page1;

  // Derive real per-page from actual records (API may silently cap per_page).
  const realPerPage  = page1.length || PER_PAGE;
  const totalPages   = Math.ceil(paging.total_items / realPerPage);
  const remaining    = Math.min(totalPages - 1, 49); // cap at 25 000 records

  const pages = await Promise.all(
    Array.from({ length: remaining }, (_, i) =>
      gisPost({ pagination: { page: i + 2, per_page: PER_PAGE }, filters })
        .then((r) => r.allOpportunityApplication.data ?? [])
        .catch((): AppRecord[] => [])
    )
  );
  return [...page1, ...pages.flat()];
}

// ── Snapshot: fetch all 4 datasets in parallel ────────────────────────────────

async function fetchSnapshot() {
  const [oAll26, iAll26, oAll25, iAll25] = await Promise.all([
    fetchAllPages({
      person_home_region:      [EUROPE_REGION_ID],
      date_approved: { from: HACK_FROM, to: HACK_TO },
    }),
    fetchAllPages({
      opportunity_home_region: [EUROPE_REGION_ID],
      date_approved: { from: HACK_FROM, to: HACK_TO },
    }),
    fetchAllPages({
      person_home_region:      [EUROPE_REGION_ID],
      date_approved: { from: COMP_FROM, to: COMP_TO },
    }),
    fetchAllPages({
      opportunity_home_region: [EUROPE_REGION_ID],
      date_approved: { from: COMP_FROM, to: COMP_TO },
    }),
  ]);
  return { oAll26, iAll26, oAll25, iAll25 };
}

// ── SSE route ─────────────────────────────────────────────────────────────────

export async function GET() {
  const encoder = new TextEncoder();
  let timerId: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    async start(controller) {
      const send = async () => {
        try {
          const snapshot = await fetchSnapshot();
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(snapshot)}\n\n`)
          );
        } catch {
          // Failed tick — client keeps last known data; next tick will retry.
        }
      };

      await send();                          // send immediately on connect (fixes reconnect gap)
      timerId = setInterval(send, POLL_MS);  // then every 30 s
    },
    cancel() {
      clearInterval(timerId); // client disconnected — stop polling
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection":    "keep-alive",
      "X-Accel-Buffering": "no", // prevents Nginx/proxy from buffering the stream
    },
  });
}
