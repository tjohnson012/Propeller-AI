/**
 * World regions and countries for target-market selection.
 *
 * Regions group countries the way US exporters actually think about them
 * — lined up with USTR trade-agreement blocks, not pure geography.
 */

export interface Country {
  name: string;
  /** ISO 3166-1 alpha-2 */
  iso2: string;
  /** True when a US Free Trade Agreement exists with this market. */
  fta?: boolean;
  /** Short FTA label for display. */
  ftaLabel?: string;
  /** Flags that this market is subject to comprehensive US sanctions or heavy controls. */
  sanctionsRisk?: "comprehensive" | "sectoral" | "targeted";
}

export interface Region {
  name: string;
  description: string;
  countries: Country[];
}

export const REGIONS: Region[] = [
  {
    name: "North America",
    description: "USMCA partners",
    countries: [
      { name: "Canada", iso2: "CA", fta: true, ftaLabel: "USMCA" },
      { name: "Mexico", iso2: "MX", fta: true, ftaLabel: "USMCA" },
    ],
  },
  {
    name: "Europe (EU)",
    description: "European Union member states",
    countries: [
      { name: "Germany", iso2: "DE" },
      { name: "France", iso2: "FR" },
      { name: "Netherlands", iso2: "NL" },
      { name: "Italy", iso2: "IT" },
      { name: "Spain", iso2: "ES" },
      { name: "Belgium", iso2: "BE" },
      { name: "Poland", iso2: "PL" },
      { name: "Sweden", iso2: "SE" },
      { name: "Denmark", iso2: "DK" },
      { name: "Finland", iso2: "FI" },
      { name: "Ireland", iso2: "IE" },
      { name: "Austria", iso2: "AT" },
      { name: "Czech Republic", iso2: "CZ" },
      { name: "Portugal", iso2: "PT" },
      { name: "Greece", iso2: "GR" },
      { name: "Hungary", iso2: "HU" },
      { name: "Romania", iso2: "RO" },
      { name: "Slovakia", iso2: "SK" },
      { name: "Slovenia", iso2: "SI" },
      { name: "Bulgaria", iso2: "BG" },
      { name: "Croatia", iso2: "HR" },
      { name: "Estonia", iso2: "EE" },
      { name: "Latvia", iso2: "LV" },
      { name: "Lithuania", iso2: "LT" },
      { name: "Luxembourg", iso2: "LU" },
      { name: "Cyprus", iso2: "CY" },
      { name: "Malta", iso2: "MT" },
    ],
  },
  {
    name: "Europe (non-EU)",
    description: "UK, EFTA, Türkiye, Balkans",
    countries: [
      { name: "United Kingdom", iso2: "GB" },
      { name: "Switzerland", iso2: "CH" },
      { name: "Norway", iso2: "NO" },
      { name: "Iceland", iso2: "IS" },
      { name: "Türkiye", iso2: "TR" },
      { name: "Serbia", iso2: "RS" },
      { name: "Ukraine", iso2: "UA" },
      { name: "Bosnia and Herzegovina", iso2: "BA" },
      { name: "Albania", iso2: "AL" },
      { name: "North Macedonia", iso2: "MK" },
      { name: "Montenegro", iso2: "ME" },
      { name: "Moldova", iso2: "MD" },
      { name: "Georgia", iso2: "GE" },
    ],
  },
  {
    name: "Asia Pacific",
    description: "East, South, and Southeast Asia + Oceania",
    countries: [
      { name: "Japan", iso2: "JP" },
      { name: "South Korea", iso2: "KR", fta: true, ftaLabel: "KORUS" },
      { name: "China", iso2: "CN", sanctionsRisk: "sectoral" },
      { name: "Taiwan", iso2: "TW" },
      { name: "Hong Kong", iso2: "HK" },
      { name: "Singapore", iso2: "SG", fta: true, ftaLabel: "US-Singapore FTA" },
      { name: "Malaysia", iso2: "MY" },
      { name: "Thailand", iso2: "TH" },
      { name: "Vietnam", iso2: "VN" },
      { name: "Indonesia", iso2: "ID" },
      { name: "Philippines", iso2: "PH" },
      { name: "India", iso2: "IN" },
      { name: "Bangladesh", iso2: "BD" },
      { name: "Pakistan", iso2: "PK" },
      { name: "Sri Lanka", iso2: "LK" },
      { name: "Nepal", iso2: "NP" },
      { name: "Cambodia", iso2: "KH" },
      { name: "Mongolia", iso2: "MN" },
      { name: "Australia", iso2: "AU", fta: true, ftaLabel: "US-Australia FTA" },
      { name: "New Zealand", iso2: "NZ" },
      { name: "Papua New Guinea", iso2: "PG" },
      { name: "Fiji", iso2: "FJ" },
    ],
  },
  {
    name: "Latin America & Caribbean",
    description: "CAFTA-DR, TPAs, and Mercosur",
    countries: [
      { name: "Brazil", iso2: "BR" },
      { name: "Argentina", iso2: "AR" },
      { name: "Chile", iso2: "CL", fta: true, ftaLabel: "US-Chile FTA" },
      { name: "Colombia", iso2: "CO", fta: true, ftaLabel: "US-Colombia TPA" },
      { name: "Peru", iso2: "PE", fta: true, ftaLabel: "US-Peru TPA" },
      { name: "Ecuador", iso2: "EC" },
      { name: "Uruguay", iso2: "UY" },
      { name: "Paraguay", iso2: "PY" },
      { name: "Bolivia", iso2: "BO" },
      { name: "Venezuela", iso2: "VE", sanctionsRisk: "targeted" },
      { name: "Panama", iso2: "PA", fta: true, ftaLabel: "US-Panama TPA" },
      { name: "Costa Rica", iso2: "CR", fta: true, ftaLabel: "CAFTA-DR" },
      { name: "Dominican Republic", iso2: "DO", fta: true, ftaLabel: "CAFTA-DR" },
      { name: "El Salvador", iso2: "SV", fta: true, ftaLabel: "CAFTA-DR" },
      { name: "Guatemala", iso2: "GT", fta: true, ftaLabel: "CAFTA-DR" },
      { name: "Honduras", iso2: "HN", fta: true, ftaLabel: "CAFTA-DR" },
      { name: "Nicaragua", iso2: "NI", fta: true, ftaLabel: "CAFTA-DR" },
      { name: "Jamaica", iso2: "JM" },
      { name: "Trinidad and Tobago", iso2: "TT" },
      { name: "Bahamas", iso2: "BS" },
      { name: "Barbados", iso2: "BB" },
      { name: "Haiti", iso2: "HT" },
      { name: "Guyana", iso2: "GY" },
      { name: "Suriname", iso2: "SR" },
    ],
  },
  {
    name: "Middle East & North Africa",
    description: "GCC, Levant, North Africa",
    countries: [
      { name: "United Arab Emirates", iso2: "AE" },
      { name: "Saudi Arabia", iso2: "SA" },
      { name: "Israel", iso2: "IL", fta: true, ftaLabel: "US-Israel FTA" },
      { name: "Qatar", iso2: "QA" },
      { name: "Kuwait", iso2: "KW" },
      { name: "Bahrain", iso2: "BH", fta: true, ftaLabel: "US-Bahrain FTA" },
      { name: "Oman", iso2: "OM", fta: true, ftaLabel: "US-Oman FTA" },
      { name: "Jordan", iso2: "JO", fta: true, ftaLabel: "US-Jordan FTA" },
      { name: "Lebanon", iso2: "LB" },
      { name: "Egypt", iso2: "EG" },
      { name: "Morocco", iso2: "MA", fta: true, ftaLabel: "US-Morocco FTA" },
      { name: "Tunisia", iso2: "TN" },
      { name: "Algeria", iso2: "DZ" },
      { name: "Iraq", iso2: "IQ" },
    ],
  },
  {
    name: "Sub-Saharan Africa",
    description: "AGOA-eligible markets and major economies",
    countries: [
      { name: "South Africa", iso2: "ZA" },
      { name: "Nigeria", iso2: "NG" },
      { name: "Kenya", iso2: "KE" },
      { name: "Ghana", iso2: "GH" },
      { name: "Ethiopia", iso2: "ET" },
      { name: "Tanzania", iso2: "TZ" },
      { name: "Uganda", iso2: "UG" },
      { name: "Rwanda", iso2: "RW" },
      { name: "Senegal", iso2: "SN" },
      { name: "Ivory Coast", iso2: "CI" },
      { name: "Cameroon", iso2: "CM" },
      { name: "Zambia", iso2: "ZM" },
      { name: "Botswana", iso2: "BW" },
      { name: "Namibia", iso2: "NA" },
      { name: "Mozambique", iso2: "MZ" },
      { name: "Angola", iso2: "AO" },
      { name: "Mauritius", iso2: "MU" },
      { name: "Zimbabwe", iso2: "ZW" },
    ],
  },
];

export const ALL_COUNTRIES: Country[] = REGIONS.flatMap((r) => r.countries);

export function findCountry(nameOrIso: string): Country | undefined {
  const n = nameOrIso.toLowerCase().trim();
  return ALL_COUNTRIES.find(
    (c) => c.name.toLowerCase() === n || c.iso2.toLowerCase() === n,
  );
}
