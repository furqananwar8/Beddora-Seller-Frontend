import type {
  ChannelBucket,
  ChannelBuckets,
  ChannelId,
  ChannelListing,
  ChannelListingsResult,
  ChannelPeriodMetrics,
  ChannelPeriodSummary,
  ListingAmounts,
  ListingBuckets,
  MasterProduct,
} from '../channelReport.types'
import { countsInProfit } from '../channelReport.types'
import { LISTING_BUCKET_IDS } from '../config/buckets'
import { getChannel } from '../config/channels'
import { combinePeriod, marginOf, sumNullable, type CombinedPeriod } from './aggregate'

/** A row of the Channel Report products table: a parent product, a master product (grouped listings) or one listing. */
export interface ProductRow {
  key: string
  kind: 'parent' | 'group' | 'listing'
  title: string
  subtitle: string
  channels: ChannelId[]
  /** Set on listing rows. */
  listing?: ChannelListing
  /** Every listing the row is made of (one for a listing row). */
  listings: ChannelListing[]
  /** Listing with no master product: COGS unknown, needs a match. */
  unlinked: boolean
  units: number
  refunds: number
  amounts: ListingAmounts
  netProfit: number
  margin: number | null
  children?: ProductRow[]
}

export interface ProductRowFilter {
  channels: ChannelId[]
  onlyUnlinked: boolean
  search: string
  /** Group rows: products under their parent and, with `groupListings`, listings under their master product. */
  group: boolean
  /** Group listings of the same master product under one expandable row. */
  groupListings?: boolean
}

const amountsOf = (buckets: ListingBuckets): ListingAmounts =>
  Object.fromEntries(LISTING_BUCKET_IDS.map((id) => [id, buckets[id]?.amount ?? null])) as ListingAmounts

/** Net profit of a listing: every bucket the channel deducts (informational buckets are left out). */
const netOf = (buckets: ListingBuckets) =>
  LISTING_BUCKET_IDS.reduce((total, id) => {
    const bucket = buckets[id]
    return total + (countsInProfit(bucket) ? bucket.amount : 0)
  }, 0)

const sumAmounts = (rows: { amounts: ListingAmounts }[]): ListingAmounts =>
  Object.fromEntries(
    LISTING_BUCKET_IDS.map((id) => [id, sumNullable(rows.map((row) => row.amounts[id]))]),
  ) as ListingAmounts

const itemLine = (listing: ChannelListing) =>
  `${getChannel(listing.channel).itemIdLabel} ${listing.channelItemId}`

const listingRow = (
  listing: ChannelListing,
  product: MasterProduct | undefined,
  asChild: boolean,
): ProductRow => {
  const amounts = amountsOf(listing.buckets)
  const netProfit = netOf(listing.buckets)
  return {
    key: `listing:${listing.listingId}`,
    kind: 'listing',
    title: asChild
      ? `${getChannel(listing.channel).name} · ${listing.channelSku}`
      : product?.title ?? listing.title,
    subtitle: asChild ? itemLine(listing) : `${listing.channelSku} · ${itemLine(listing)}`,
    channels: [listing.channel],
    listing,
    listings: [listing],
    unlinked: !listing.productId,
    units: listing.units,
    refunds: listing.refunds,
    amounts,
    netProfit,
    margin: marginOf(netProfit, amounts.sales),
  }
}

const groupRow = (product: MasterProduct, listings: ChannelListing[]): ProductRow => {
  const children = listings.map((listing) => listingRow(listing, product, true))
  const amounts = sumAmounts(children)
  const netProfit = children.reduce((total, row) => total + row.netProfit, 0)
  return {
    key: `product:${product.productId}`,
    kind: 'group',
    title: product.title,
    subtitle: `${product.sku} · ${listings.length} linked listings`,
    channels: Array.from(new Set(listings.map((listing) => listing.channel))),
    listings,
    unlinked: false,
    units: children.reduce((total, row) => total + row.units, 0),
    refunds: children.reduce((total, row) => total + row.refunds, 0),
    amounts,
    netProfit,
    margin: marginOf(netProfit, amounts.sales),
    children,
  }
}

/** An SKU or item ID (ASIN) must match exactly, so a partial one does not pull in other products; a title may match partly. */
const matchesSearch = (listing: ChannelListing, product: MasterProduct | undefined, term: string) =>
  !term ||
  [listing.channelSku, listing.channelItemId, product?.sku, product?.asin].some((value) => value?.toLowerCase() === term) ||
  [listing.title, product?.title].some((value) => value?.toLowerCase().includes(term))

/** The parent SKU (else ASIN) of the one master product a row stands for; `null` when it has none. */
const parentOf = (row: ProductRow, productById: Map<string, MasterProduct>): string | null => {
  const productIds = new Set(row.listings.map((listing) => listing.productId))
  if (productIds.size !== 1) return null
  const product = productById.get(Array.from(productIds)[0] ?? '')
  return product?.parentSku?.trim() || product?.parentAsin?.trim() || null
}

const parentRow = (parent: string, children: ProductRow[]): ProductRow => {
  const amounts = sumAmounts(children)
  const netProfit = children.reduce((total, row) => total + row.netProfit, 0)
  return {
    key: `parent:${parent.toLowerCase()}`,
    kind: 'parent',
    title: children[0].title,
    subtitle: `Parent ${parent} · ${children.length} ${children.length === 1 ? 'product' : 'products'}`,
    channels: Array.from(new Set(children.flatMap((row) => row.channels))),
    listings: children.flatMap((row) => row.listings),
    unlinked: false,
    units: children.reduce((total, row) => total + row.units, 0),
    refunds: children.reduce((total, row) => total + row.refunds, 0),
    amounts,
    netProfit,
    margin: marginOf(netProfit, amounts.sales),
    children,
  }
}

/** Rows of products that share a parent go under one expandable parent row, as on the Settlement Report. */
const groupByParent = (rows: ProductRow[], productById: Map<string, MasterProduct>): ProductRow[] => {
  const byParent = new Map<string, ProductRow[]>()
  const result: ProductRow[] = []
  rows.forEach((row) => {
    const parent = parentOf(row, productById)
    if (!parent) {
      result.push(row)
      return
    }
    if (!byParent.has(parent)) byParent.set(parent, [])
    byParent.get(parent)!.push(row)
  })
  byParent.forEach((children, parent) => result.unshift(parentRow(parent, children)))
  return result
}

/**
 * Filters listings and shapes them into table rows. Linked listings are grouped only when a product has 2+; with
 * `group`, products that share a parent also group under a parent row.
 */
export const buildProductRows = (
  { products, listings }: ChannelListingsResult,
  filter: ProductRowFilter,
): ProductRow[] => {
  const productById = new Map(products.map((product) => [product.productId, product]))
  const term = filter.search.trim().toLowerCase()

  const visible = listings.filter((listing) => {
    const product = listing.productId ? productById.get(listing.productId) : undefined
    return (
      filter.channels.includes(listing.channel) &&
      (!filter.onlyUnlinked || !listing.productId) &&
      matchesSearch(listing, product, term)
    )
  })

  if (!filter.group) {
    return visible.map((listing) =>
      listingRow(listing, listing.productId ? productById.get(listing.productId) : undefined, false),
    )
  }
  if (!filter.groupListings) {
    return groupByParent(
      visible.map((listing) => listingRow(listing, listing.productId ? productById.get(listing.productId) : undefined, false)),
      productById,
    )
  }

  const byProduct = new Map<string, ChannelListing[]>()
  const rows: ProductRow[] = []

  visible.forEach((listing) => {
    if (!listing.productId) return
    byProduct.set(listing.productId, [...(byProduct.get(listing.productId) ?? []), listing])
  })

  byProduct.forEach((group, productId) => {
    const product = productById.get(productId)
    if (product && group.length > 1) {
      rows.push(groupRow(product, group))
    } else {
      group.forEach((listing) => rows.push(listingRow(listing, product, false)))
    }
  })

  visible
    .filter((listing) => !listing.productId)
    .forEach((listing) => rows.push(listingRow(listing, undefined, false)))

  return groupByParent(rows, productById)
}

export const countUnlinked = (rows: ProductRow[]) => rows.filter((row) => row.unlinked).length

// ──────────────────────────────
// Row breakdown (same model as the tiles)
// ──────────────────────────────

/** Two reports of the same bucket on one channel: amounts add up, lines with the same label merge. */
const mergeBucket = (a: ChannelBucket | null, b: ChannelBucket | null): ChannelBucket | null => {
  if (!a || !b) return a ?? b
  const lines = [...a.lines]
  b.lines.forEach((line) => {
    const match = lines.findIndex((item) => item.label === line.label)
    if (match >= 0) lines[match] = { ...lines[match], amount: lines[match].amount + line.amount }
    else lines.push(line)
  })
  return { ...a, amount: a.amount + b.amount, lines }
}

const channelMetrics = (channel: ChannelId, listings: ChannelListing[]): ChannelPeriodMetrics => {
  const buckets = Object.fromEntries(
    LISTING_BUCKET_IDS.map((id) => [id, listings.reduce<ChannelBucket | null>((acc, l) => mergeBucket(acc, l.buckets[id]), null)]),
  )
  return {
    channel,
    orders: listings.reduce((total, listing) => total + listing.orders, 0),
    units: listings.reduce((total, listing) => total + listing.units, 0),
    refunds: listings.reduce((total, listing) => total + listing.refunds, 0),
    // Tax and account-level expenses are not reported per listing
    buckets: { ...buckets, tax: null, other: null } as ChannelBuckets,
  }
}

/** A row as a CombinedPeriod, so the products table opens the same breakdown modal as the tiles. */
export const rowBreakdown = (row: ProductRow, period: ChannelPeriodSummary['period']): CombinedPeriod => {
  const summary: ChannelPeriodSummary = {
    period,
    salesChangePct: null,
    channels: row.channels.map((channel) =>
      channelMetrics(channel, row.listings.filter((listing) => listing.channel === channel)),
    ),
  }
  return combinePeriod(summary, row.channels)
}
