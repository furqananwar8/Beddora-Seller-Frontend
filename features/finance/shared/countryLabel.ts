import { COUNTRIES } from '../partners/countries'

/** Short names people actually say; everything else uses the curated country list. */
const OVERRIDES: Record<string, string> = { US: 'USA', GB: 'UK' }

/** `CA` -> `Canada`, `US` -> `USA`. Falls back to the code for countries we do not list. */
export function countryLabel(code?: string | null): string {
  if (!code) return ''
  return OVERRIDES[code] ?? COUNTRIES.find((country) => country.code === code)?.name ?? code
}
