export const MARKETPLACES = [
  { id: 'Amazon.ca', name: 'Canada', code: 'CA', domain: 'amazon.ca' },
  { id: 'Amazon.com', name: 'USA', code: 'US', domain: 'amazon.com' },
  { id: 'Amazon.mx', name: 'Mexico', code: 'MX', domain: 'amazon.com.mx' },
]

/**
 * The product's page on Amazon: the ASIN on its marketplace's site. The marketplace may be given by id, name, code or
 * domain (e.g. `Amazon.ca`, `CA`); an unknown one falls back to amazon.com.
 */
export function amazonProductUrl(asin: string, marketplace?: string | null): string {
  const key = String(marketplace ?? '').trim().toLowerCase()
  const match = MARKETPLACES.find((item) => [item.id, item.name, item.code, item.domain].some((value) => value.toLowerCase() === key))
  return `https://www.${match?.domain ?? 'amazon.com'}/dp/${encodeURIComponent(asin)}`
}

/** The country code (CA, US...) when exactly one marketplace is picked; undefined for none or several. */
export const singleMarketplaceCode = (marketplaceIds: string[]): string | undefined =>
  marketplaceIds.length === 1 ? MARKETPLACES.find((marketplace) => marketplace.id === marketplaceIds[0])?.code : undefined
