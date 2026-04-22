import { NextResponse } from "next/server";

const GIS_URL = "https://gis-api.aiesec.org/graphql";
const EXPA_TOKEN = process.env.AIESEC_GIS_TOKEN ?? "";

const QUERY = `
  query($filters: ApplicationFilter, $pagination: Pagination) {
    allOpportunityApplication(filters: $filters, pagination: $pagination) {
      data {
        id
        status
        date_approved
        person {
          id
          home_lc { id name country tag }
          home_mc { id name country tag }
        }
        host_lc { id name country tag }
        home_mc  { id name country tag }
        opportunity {
          programme { id short_name short_name_display }
          home_lc   { id name country tag }
          home_mc   { id name country tag }
        }
      }
      paging { total_items total_pages }
    }
  }
`;

export async function GET() {
  // Fetch iCX hackathon data (foreign EPs hosted in Europe, Mar 23-31 2026)
  const res = await fetch(GIS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: EXPA_TOKEN },
    body: JSON.stringify({
      query: QUERY,
      variables: {
        pagination: { page: 1, per_page: 500 },
        filters: {
          opportunity_home_region: [1629],
          date_approved: { from: "2026-03-23", to: "2026-03-31" },
        },
      },
    }),
    cache: "no-store",
  });

  const json = await res.json();
  const apps = (json?.data?.allOpportunityApplication?.data ?? []) as {
    id: string;
    status: string;
    date_approved: string | null;
    person: {
      id: string;
      home_lc: { id: string | null; name: string | null; country: string | null } | null;
      home_mc: { id: string | null; name: string | null; country: string | null } | null;
    };
    host_lc: { id: string | null; name: string | null; country: string | null } | null;
    home_mc: { id: string | null; name: string | null; country: string | null } | null;
    opportunity: {
      programme: { id: string; short_name: string; short_name_display: string } | null;
      home_lc: { id: string | null; name: string | null; country: string | null } | null;
      home_mc: { id: string | null; name: string | null; country: string | null } | null;
    } | null;
  }[];

  // Non-European origin EPs (home_mc country not in EUR list — crude check)
  const eurCountries = new Set([
    "Albania","Andorra","Armenia","Austria","Azerbaijan","Belarus","Belgium",
    "Bosnia and Herzegovina","Bulgaria","Croatia","Cyprus","Czech Republic","Czechia",
    "Denmark","Estonia","Finland","France","Georgia","Germany","Greece","Hungary",
    "Iceland","Ireland","Italy","Kosovo","Latvia","Liechtenstein","Lithuania",
    "Luxembourg","Malta","Moldova","Monaco","Montenegro","Netherlands","North Macedonia",
    "Norway","Poland","Portugal","Romania","Russia","San Marino","Serbia","Slovakia",
    "Slovenia","Spain","Sweden","Switzerland","Turkey","Ukraine","United Kingdom","UK",
  ]);

  const allSummary = apps.map(a => {
    const personMCCountry  = a.person?.home_mc?.country  ?? null;
    const personMCName     = a.person?.home_mc?.name     ?? null;
    const personLCCountry  = a.person?.home_lc?.country  ?? null;
    const personLCName     = a.person?.home_lc?.name     ?? null;
    const resolvedOrigin   = personMCCountry ?? personLCCountry ?? personMCName ?? null;
    return {
      id: a.id,
      date_approved: a.date_approved,
      prog: a.opportunity?.programme?.short_name_display ?? null,
      person_home_lc_id:      a.person?.home_lc?.id      ?? null,
      person_home_lc_name:    personLCName,
      person_home_lc_country: personLCCountry,
      person_home_mc_id:      a.person?.home_mc?.id      ?? null,
      person_home_mc_name:    personMCName,
      person_home_mc_country: personMCCountry,
      host_lc_name:           a.host_lc?.name            ?? null,
      host_mc_country:        a.home_mc?.country         ?? a.opportunity?.home_mc?.country ?? null,
      resolved_origin:        resolvedOrigin,
      is_non_eur:             resolvedOrigin ? !eurCountries.has(resolvedOrigin) : true,
    };
  });

  const nonEur = allSummary.filter(a => a.is_non_eur);

  return NextResponse.json({
    total_icx: json?.data?.allOpportunityApplication?.paging?.total_items,
    fetched: apps.length,
    non_eur_origin_count: nonEur.length,
    non_eur_records: nonEur,
    all_records: allSummary,
  });
}
