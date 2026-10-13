export type ReportCurrency = 'CAD' | 'USD' | 'MXN'

export const REPORT_CURRENCY_OPTIONS: { value: ReportCurrency; label: string }[] = [
  { value: 'CAD', label: 'CAD' },
  { value: 'USD', label: 'USD' },
  { value: 'MXN', label: 'MXN' },
]

const MARKETPLACE_CURRENCY: Record<string, ReportCurrency> = {
  'amazon.ca': 'CAD',
  canada: 'CAD',
  ca: 'CAD',

  'amazon.com': 'USD',
  usa: 'USD',
  us: 'USD',

  'amazon.com.mx': 'MXN',
  'amazon.mx': 'MXN',
  mexico: 'MXN',
  mx: 'MXN',
}

/**
 * Currency a marketplace selection reports in by default: that of the first selected
 * marketplace (so switching marketplace switches currency, as on the profit screens).
 */
export function getDefaultCurrencyForMarketplaces(
  marketplaces: string[],
  fallback: ReportCurrency = 'CAD'
): ReportCurrency {
  if (!marketplaces?.length) return fallback
  const primary = marketplaces[0].trim().toLowerCase()
  if (MARKETPLACE_CURRENCY[primary]) return MARKETPLACE_CURRENCY[primary]
  const key = Object.keys(MARKETPLACE_CURRENCY).find((k) => primary.includes(k))
  return key ? MARKETPLACE_CURRENCY[key] : fallback
}
