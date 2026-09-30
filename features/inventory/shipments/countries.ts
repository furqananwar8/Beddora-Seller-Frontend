/** ISO 3166-1 alpha-2 codes. Names come from the browser, so users pick "Canada" and we send "CA". */
const CODES =
  'CA US MX GB IE DE FR IT ES PT NL BE LU AT CH SE NO DK FI IS PL CZ SK HU RO BG GR HR SI EE LV LT TR AE SA IL EG ZA NG KE IN PK BD LK CN HK TW JP KR SG MY TH VN ID PH AU NZ BR AR CL CO PE UY PA CR DO JM'.split(' ')

const names = new Intl.DisplayNames(['en'], { type: 'region' })

export const COUNTRY_NAMES: Record<string, string> = Object.fromEntries(CODES.map((c) => [c, names.of(c) ?? c]))

/** Canada, the US and Mexico first (the FBA marketplaces), then A–Z. */
export const COUNTRY_OPTIONS: { code: string; name: string }[] = [
  ...CODES.slice(0, 3),
  ...CODES.slice(3).sort((a, b) => COUNTRY_NAMES[a].localeCompare(COUNTRY_NAMES[b])),
].map((code) => ({ code, name: COUNTRY_NAMES[code] }))

export const countryName = (code: string) => COUNTRY_NAMES[code.toUpperCase()] ?? code.toUpperCase()
