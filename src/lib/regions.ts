import { Application } from "@/lib/api";

export type RegionKey = "EUR" | "MEA" | "APAC" | "AMERICAS";

export const REGION_META: Record<RegionKey, {
  label: string;
  shortLabel: string;
  color: string;
}> = {
  EUR:      { label: "Europe",              shortLabel: "EUR",  color: "#674ea7" },
  MEA:      { label: "Middle East & Africa",shortLabel: "MEA",  color: "#F48924" },
  APAC:     { label: "Asia Pacific",        shortLabel: "AP", color: "#0CB9C1" },
  AMERICAS: { label: "Americas",            shortLabel: "AM",   color: "#F85A40" },
};

export const REGION_ORDER: RegionKey[] = ["EUR", "MEA", "APAC", "AMERICAS"];

// ── Country → AIESEC Region mapping ───────────────────────────────────────────

const COUNTRY_REGION: Record<string, RegionKey> = {
  // EUROPE
  Albania: "EUR", Andorra: "EUR", Armenia: "EUR", Austria: "EUR",
  Azerbaijan: "EUR", Belarus: "EUR", Belgium: "EUR",
  "Bosnia and Herzegovina": "EUR", Bosnia: "EUR", Bulgaria: "EUR",
  Croatia: "EUR", Cyprus: "EUR", "Czech Republic": "EUR", Czechia: "EUR",
  Denmark: "EUR", Estonia: "EUR", Finland: "EUR", France: "EUR",
  Georgia: "EUR", Germany: "EUR", Greece: "EUR", Hungary: "EUR",
  Iceland: "EUR", Ireland: "EUR", Italy: "EUR", Kosovo: "EUR",
  "Kosovo Republic": "EUR", Latvia: "EUR", Liechtenstein: "EUR",
  Lithuania: "EUR", Luxembourg: "EUR", Malta: "EUR", Moldova: "EUR",
  Monaco: "EUR", Montenegro: "EUR", Netherlands: "EUR", "The Netherlands": "EUR",
  "North Macedonia": "EUR", Macedonia: "EUR", Norway: "EUR",
  Poland: "EUR", Portugal: "EUR", Romania: "EUR", Russia: "EUR",
  "San Marino": "EUR", Serbia: "EUR", Slovakia: "EUR", Slovenia: "EUR",
  Spain: "EUR", Sweden: "EUR", Switzerland: "EUR", Turkey: "EUR",
  Ukraine: "EUR", "United Kingdom": "EUR", UK: "EUR", Vatican: "EUR",

  // MIDDLE EAST & AFRICA
  Algeria: "MEA", Angola: "MEA", Bahrain: "MEA", Benin: "MEA",
  Botswana: "MEA", "Burkina Faso": "MEA", Burundi: "MEA",
  Cameroon: "MEA", "Cape Verde": "MEA", "Central African Republic": "MEA",
  Chad: "MEA", Comoros: "MEA", Congo: "MEA",
  "Republic of the Congo": "MEA", "Democratic Republic of the Congo": "MEA",
  "DR Congo": "MEA", "Côte d'Ivoire": "MEA", "Cote D'Ivoire": "MEA", "Ivory Coast": "MEA",
  Djibouti: "MEA", Egypt: "MEA", "Equatorial Guinea": "MEA",
  Eritrea: "MEA", Eswatini: "MEA", Swaziland: "MEA", Ethiopia: "MEA",
  Gabon: "MEA", Gambia: "MEA", Ghana: "MEA", Guinea: "MEA",
  "Guinea-Bissau": "MEA", Iraq: "MEA", Israel: "MEA", Jordan: "MEA",
  Kenya: "MEA", Kuwait: "MEA", Lebanon: "MEA", Lesotho: "MEA",
  Liberia: "MEA", Libya: "MEA", Madagascar: "MEA", Malawi: "MEA",
  Mali: "MEA", Mauritania: "MEA", Mauritius: "MEA", Morocco: "MEA",
  Mozambique: "MEA", Namibia: "MEA", Niger: "MEA", Nigeria: "MEA",
  Oman: "MEA", Pakistan: "MEA", Palestine: "MEA",
  "Palestinian Territories": "MEA", "West Bank": "MEA", Qatar: "MEA",
  Rwanda: "MEA", "Saudi Arabia": "MEA", Senegal: "MEA",
  "Sierra Leone": "MEA", Somalia: "MEA", "South Africa": "MEA",
  "South Sudan": "MEA", Sudan: "MEA", Syria: "MEA", Tanzania: "MEA",
  Togo: "MEA", Tunisia: "MEA", Uganda: "MEA",
  "United Arab Emirates": "MEA", UAE: "MEA", Yemen: "MEA",
  Zambia: "MEA", Zimbabwe: "MEA", Iran: "MEA",
  "São Tomé and Príncipe": "MEA",

  // ASIA PACIFIC
  Afghanistan: "APAC", Australia: "APAC", Bangladesh: "APAC",
  Bhutan: "APAC", Brunei: "APAC", Cambodia: "APAC", China: "APAC",
  Fiji: "APAC", "Hong Kong": "APAC", India: "APAC", Indonesia: "APAC",
  Japan: "APAC", Kazakhstan: "APAC", Kyrgyzstan: "APAC",
  "Kyrgyzstan ": "APAC",
  Laos: "APAC", Malaysia: "APAC", Maldives: "APAC", Mongolia: "APAC",
  Myanmar: "APAC", Nepal: "APAC", "New Zealand": "APAC",
  "North Korea": "APAC", "Papua New Guinea": "APAC", Philippines: "APAC",
  Singapore: "APAC", "South Korea": "APAC", Korea: "APAC", "Sri Lanka": "APAC",
  Taiwan: "APAC", Tajikistan: "APAC", Thailand: "APAC",
  "Timor-Leste": "APAC", "East Timor": "APAC", Turkmenistan: "APAC",
  Uzbekistan: "APAC", Vietnam: "APAC", VIETNAM: "APAC", Macau: "APAC", Macao: "APAC",
  "Mainland of China": "APAC", "Mainland China": "APAC", "China, Mainland": "APAC",

  // AMERICAS
  "Antigua and Barbuda": "AMERICAS", Argentina: "AMERICAS",
  Bahamas: "AMERICAS", Barbados: "AMERICAS", Belize: "AMERICAS",
  Bolivia: "AMERICAS", Brazil: "AMERICAS", Canada: "AMERICAS",
  Chile: "AMERICAS", Colombia: "AMERICAS", "Costa Rica": "AMERICAS",
  Cuba: "AMERICAS", Dominica: "AMERICAS", "Dominican Republic": "AMERICAS",
  Ecuador: "AMERICAS", "El Salvador": "AMERICAS", Grenada: "AMERICAS",
  Guatemala: "AMERICAS", Guyana: "AMERICAS", Haiti: "AMERICAS",
  Honduras: "AMERICAS", Jamaica: "AMERICAS", Mexico: "AMERICAS",
  Nicaragua: "AMERICAS", Panama: "AMERICAS", Paraguay: "AMERICAS",
  Peru: "AMERICAS", "Puerto Rico": "AMERICAS",
  "Saint Kitts and Nevis": "AMERICAS", "Saint Lucia": "AMERICAS",
  "Saint Vincent and the Grenadines": "AMERICAS", Suriname: "AMERICAS",
  "Trinidad and Tobago": "AMERICAS", "United States": "AMERICAS",
  USA: "AMERICAS", Uruguay: "AMERICAS", Venezuela: "AMERICAS",
};

// Case-insensitive lookup index (built once)
const COUNTRY_REGION_LC: Record<string, RegionKey> = {};
for (const [k, v] of Object.entries(COUNTRY_REGION)) {
  COUNTRY_REGION_LC[k.toLowerCase()] = v;
}

export function getRegion(country: string): RegionKey | null {
  return COUNTRY_REGION[country] ?? COUNTRY_REGION_LC[country.toLowerCase()] ?? null;
}

// Sum a country→count map into region→count totals
export function aggregateByRegion(
  byCountry: Record<string, number>
): Record<RegionKey, number> {
  const result: Record<RegionKey, number> = { EUR: 0, MEA: 0, APAC: 0, AMERICAS: 0 };
  for (const [country, count] of Object.entries(byCountry)) {
    const region = COUNTRY_REGION[country] ?? COUNTRY_REGION_LC[country.toLowerCase()];
    if (region) result[region] += count;
  }
  return result;
}

// Merge multiple country→count maps into one
export function mergeCountryMaps(
  ...maps: Record<string, number>[]
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const map of maps) {
    for (const [k, v] of Object.entries(map)) out[k] = (out[k] ?? 0) + v;
  }
  return out;
}

// Build host-country map from raw oGX applications (where European EPs go)
export function computeHostCountryMap(apps: Application[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const app of apps) {
    const c =
      app.home_mc?.name ??
      app.opportunity?.home_mc?.name;
    if (c) map[c] = (map[c] ?? 0) + 1;
  }
  return map;
}

// Build origin-country map from raw iCX applications (where incoming EPs come from)
// Only use MC name — LC names are office names (e.g. "BARDO"), not countries
export function computeOriginCountryMap(apps: Application[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const app of apps) {
    const c = app.person?.home_mc?.name;
    if (c) map[c] = (map[c] ?? 0) + 1;
  }
  return map;
}
