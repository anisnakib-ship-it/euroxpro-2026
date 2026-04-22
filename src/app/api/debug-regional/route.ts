import { NextResponse } from "next/server";

const GIS_URL = "https://gis-api.aiesec.org/graphql";
const TOKEN = process.env.AIESEC_GIS_TOKEN ?? "";
const EUROPE_REGION_ID = 1629;

const QUERY = `
  query($filters: ApplicationFilter, $pagination: Pagination) {
    allOpportunityApplication(filters: $filters, pagination: $pagination) {
      paging { total_items total_pages }
      data {
        id status date_approved
        person { home_mc { id name } home_lc { id name } }
        home_mc { id name }
        opportunity { home_mc { id name } programme { id short_name_display } }
        host_lc { id name }
      }
    }
  }
`;

const COUNTRY_REGION: Record<string, string> = {
  Albania:"EUR",Andorra:"EUR",Armenia:"EUR",Austria:"EUR",Azerbaijan:"EUR",Belarus:"EUR",Belgium:"EUR",
  "Bosnia and Herzegovina":"EUR",Bosnia:"EUR",Bulgaria:"EUR",Croatia:"EUR",Cyprus:"EUR",
  "Czech Republic":"EUR",Czechia:"EUR",Denmark:"EUR",Estonia:"EUR",Finland:"EUR",France:"EUR",
  Georgia:"EUR",Germany:"EUR",Greece:"EUR",Hungary:"EUR",Iceland:"EUR",Ireland:"EUR",Italy:"EUR",
  Kosovo:"EUR","Kosovo Republic":"EUR",Latvia:"EUR",Liechtenstein:"EUR",Lithuania:"EUR",
  Luxembourg:"EUR",Malta:"EUR",Moldova:"EUR",Monaco:"EUR",Montenegro:"EUR",Netherlands:"EUR",
  "The Netherlands":"EUR","North Macedonia":"EUR",Macedonia:"EUR",Norway:"EUR",Poland:"EUR",
  Portugal:"EUR",Romania:"EUR",Russia:"EUR","San Marino":"EUR",Serbia:"EUR",Slovakia:"EUR",
  Slovenia:"EUR",Spain:"EUR",Sweden:"EUR",Switzerland:"EUR",Turkey:"EUR",Ukraine:"EUR",
  "United Kingdom":"EUR",UK:"EUR",Vatican:"EUR",
  Algeria:"MEA",Angola:"MEA",Bahrain:"MEA",Benin:"MEA",Botswana:"MEA","Burkina Faso":"MEA",
  Burundi:"MEA",Cameroon:"MEA","Cape Verde":"MEA",Chad:"MEA",Congo:"MEA",
  "Democratic Republic of the Congo":"MEA","DR Congo":"MEA","Côte d'Ivoire":"MEA",
  "Ivory Coast":"MEA",Djibouti:"MEA",Egypt:"MEA","Equatorial Guinea":"MEA",Eritrea:"MEA",
  Eswatini:"MEA",Swaziland:"MEA",Ethiopia:"MEA",Gabon:"MEA",Gambia:"MEA",Ghana:"MEA",
  Guinea:"MEA","Guinea-Bissau":"MEA",Iraq:"MEA",Israel:"MEA",Jordan:"MEA",Kenya:"MEA",
  Kuwait:"MEA",Lebanon:"MEA",Lesotho:"MEA",Liberia:"MEA",Libya:"MEA",Madagascar:"MEA",
  Malawi:"MEA",Mali:"MEA",Mauritania:"MEA",Mauritius:"MEA",Morocco:"MEA",Mozambique:"MEA",
  Namibia:"MEA",Niger:"MEA",Nigeria:"MEA",Oman:"MEA",Pakistan:"MEA",Palestine:"MEA",
  "Palestinian Territories":"MEA","West Bank":"MEA",Qatar:"MEA",Rwanda:"MEA",
  "Saudi Arabia":"MEA",Senegal:"MEA","Sierra Leone":"MEA",Somalia:"MEA","South Africa":"MEA",
  "South Sudan":"MEA",Sudan:"MEA",Syria:"MEA",Tanzania:"MEA",Togo:"MEA",Tunisia:"MEA",
  Uganda:"MEA","United Arab Emirates":"MEA",UAE:"MEA",Yemen:"MEA",Zambia:"MEA",Zimbabwe:"MEA",
  Iran:"MEA","São Tomé and Príncipe":"MEA",
  Afghanistan:"APAC",Australia:"APAC",Bangladesh:"APAC",Bhutan:"APAC",Brunei:"APAC",
  Cambodia:"APAC",China:"APAC",Fiji:"APAC","Hong Kong":"APAC",India:"APAC",Indonesia:"APAC",
  Japan:"APAC",Kazakhstan:"APAC",Kyrgyzstan:"APAC",Laos:"APAC",Malaysia:"APAC",Maldives:"APAC",
  Mongolia:"APAC",Myanmar:"APAC",Nepal:"APAC","New Zealand":"APAC","North Korea":"APAC",
  "Papua New Guinea":"APAC",Philippines:"APAC",Singapore:"APAC","South Korea":"APAC",
  Korea:"APAC","Sri Lanka":"APAC",Taiwan:"APAC",Tajikistan:"APAC",Thailand:"APAC",
  "Timor-Leste":"APAC","East Timor":"APAC",Turkmenistan:"APAC",Uzbekistan:"APAC",
  Vietnam:"APAC",VIETNAM:"APAC",Macau:"APAC",Macao:"APAC",
  "Mainland of China":"APAC","Mainland China":"APAC","China, Mainland":"APAC",
  "Antigua and Barbuda":"AMERICAS",Argentina:"AMERICAS",Bahamas:"AMERICAS",Barbados:"AMERICAS",
  Belize:"AMERICAS",Bolivia:"AMERICAS",Brazil:"AMERICAS",Canada:"AMERICAS",Chile:"AMERICAS",
  Colombia:"AMERICAS","Costa Rica":"AMERICAS",Cuba:"AMERICAS",Dominica:"AMERICAS",
  "Dominican Republic":"AMERICAS",Ecuador:"AMERICAS","El Salvador":"AMERICAS",Grenada:"AMERICAS",
  Guatemala:"AMERICAS",Guyana:"AMERICAS",Haiti:"AMERICAS",Honduras:"AMERICAS",Jamaica:"AMERICAS",
  Mexico:"AMERICAS",Nicaragua:"AMERICAS",Panama:"AMERICAS",Paraguay:"AMERICAS",Peru:"AMERICAS",
  "Puerto Rico":"AMERICAS","Saint Kitts and Nevis":"AMERICAS","Saint Lucia":"AMERICAS",
  "Saint Vincent and the Grenadines":"AMERICAS",Suriname:"AMERICAS",
  "Trinidad and Tobago":"AMERICAS","United States":"AMERICAS",USA:"AMERICAS",
  Uruguay:"AMERICAS",Venezuela:"AMERICAS",
};

const CR_LC: Record<string, string> = {};
for (const [k, v] of Object.entries(COUNTRY_REGION)) CR_LC[k.toLowerCase()] = v;
function getRegion(c: string): string | null {
  return COUNTRY_REGION[c] ?? CR_LC[c.toLowerCase()] ?? null;
}

async function fetchAll(filters: Record<string, unknown>) {
  const PER_PAGE = 500;
  const res = await fetch(GIS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: TOKEN },
    body: JSON.stringify({ query: QUERY, variables: { filters, pagination: { page: 1, per_page: PER_PAGE } } }),
  });
  const json = await res.json();
  const { data, paging } = json.data.allOpportunityApplication;
  const page1 = data ?? [];
  if (paging.total_items <= page1.length) return { apps: page1, total: paging.total_items };

  const realPerPage = page1.length || PER_PAGE;
  const totalPages = Math.min(Math.ceil(paging.total_items / realPerPage), 50);
  const rest = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, i) =>
      fetch(GIS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: TOKEN },
        body: JSON.stringify({ query: QUERY, variables: { filters, pagination: { page: i + 2, per_page: PER_PAGE } } }),
      }).then(r => r.json()).then(j => j.data.allOpportunityApplication.data ?? []).catch(() => [])
    )
  );
  return { apps: [...page1, ...rest.flat()], total: paging.total_items };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function analyze(apps: any[], direction: "oGX" | "iCX") {
  const statusCounts: Record<string, number> = {};
  const regionCounts: Record<string, number> = {};
  const unmapped: Record<string, number> = {};
  const approvedRegionCounts: Record<string, number> = {};
  const approvedUnmapped: Record<string, number> = {};

  for (const app of apps) {
    // Status breakdown
    statusCounts[app.status] = (statusCounts[app.status] ?? 0) + 1;

    // Country name depending on direction
    const country = direction === "oGX"
      ? (app.home_mc?.name ?? app.opportunity?.home_mc?.name)     // host MC
      : (app.person?.home_mc?.name);                               // origin MC

    if (!country) {
      unmapped["__NULL__"] = (unmapped["__NULL__"] ?? 0) + 1;
      if (app.status === "approved") approvedUnmapped["__NULL__"] = (approvedUnmapped["__NULL__"] ?? 0) + 1;
      continue;
    }

    const region = getRegion(country);
    if (region) {
      regionCounts[region] = (regionCounts[region] ?? 0) + 1;
      if (app.status === "approved") approvedRegionCounts[region] = (approvedRegionCounts[region] ?? 0) + 1;
    } else {
      unmapped[country] = (unmapped[country] ?? 0) + 1;
      if (app.status === "approved") approvedUnmapped[country] = (approvedUnmapped[country] ?? 0) + 1;
    }
  }

  return { statusCounts, regionCounts, approvedRegionCounts, unmapped, approvedUnmapped };
}

export async function GET() {
  const dateFilter = { date_approved: { from: "2025-07-01", to: "2026-06-30" } };

  const [oGXResult, iCXResult] = await Promise.all([
    fetchAll({ ...dateFilter, person_home_region: [EUROPE_REGION_ID] }),
    fetchAll({ ...dateFilter, opportunity_home_region: [EUROPE_REGION_ID] }),
  ]);

  const oGXAnalysis = analyze(oGXResult.apps, "oGX");
  const iCXAnalysis = analyze(iCXResult.apps, "iCX");

  return NextResponse.json({
    oGX: {
      totalFromAPI: oGXResult.total,
      fetched: oGXResult.apps.length,
      ...oGXAnalysis,
    },
    iCX: {
      totalFromAPI: iCXResult.total,
      fetched: iCXResult.apps.length,
      ...iCXAnalysis,
    },
    summary: {
      "oGX_allStatuses": oGXAnalysis.regionCounts,
      "oGX_approvedOnly": oGXAnalysis.approvedRegionCounts,
      "iCX_allStatuses": iCXAnalysis.regionCounts,
      "iCX_approvedOnly": iCXAnalysis.approvedRegionCounts,
    },
  }, { headers: { "Cache-Control": "no-store" } });
}
