/**
 * The Amazon tab's price and profit working, one function per column of the "Price & Profit Analysis" sheet (the
 * letters in the comments are that sheet's columns, A to AU). Pure: a row's inputs in, every worked-out column out, so
 * a change to any input shows at once and the formulas can be checked against the sheet.
 *
 * Percentages are fractions here (0.15 for 15%); the screen converts at its edge.
 */

export type Fulfillment = 'FBA' | 'FBM'
export type SessionMode = 'Off-Peak' | 'On-Peak' | 'Weighted Average'
export type SizeTier = 'Standard-Size' | 'Oversize'

/** Per cubic metre and month, by size tier, for the two storage seasons. */
export interface StorageRateTable {
  standard: { offPeak: number | null; onPeak: number | null }
  oversize: { offPeak: number | null; onPeak: number | null }
}

export interface PricingInputs {
  fulfillment: Fulfillment
  /** Package dimensions and weight as Amazon reports them (K, L, M, N, O, P); null when it reports none. */
  dimensions: { longest: number; median: number; shortest: number; unit: string } | null
  weight: { value: number; unit: string } | null
  sessionMode: SessionMode
  /** U */
  daysInStock: number
  /** X: current landed cost per unit; null or 0 means not known. */
  landedCost: number | null
  /** W: the Beddora selling price. */
  sellingPrice: number | null
  /** Y */
  overheadRate: number
  /** Z */
  commissionRate: number | null
  /** AB */
  fbaFee: number | null
  /** AD */
  marketingRate: number
  /** AK */
  promoRate: number
  /** AM */
  returnRate: number
  /** AO: FBM only. */
  shippingCost: number | null
  /** AS: when set, the recommended price earns exactly this much per unit and the target margin is ignored. */
  netTakeHome: number | null
  /** AT */
  targetMargin: number
}

export interface PricingResult {
  /** Q */
  sizeTier: SizeTier | null
  /** R */
  cubicMeters: number | null
  /** T: per unit and month; null for FBM or without a volume. */
  monthlyStorageFee: number | null
  /** AC */
  storagePerUnitSold: number | null
  /** AA */
  commission: number | null
  /** AE */
  marketingCost: number | null
  /** AF */
  totalAmazonFee: number | null
  /** AG */
  totalCost: number | null
  /** AH */
  netProfit: number | null
  /** AI */
  netMargin: number | null
  /** AJ */
  breakEvenPrice: number | null
  /** AL */
  promoImpact: number | null
  /** AN */
  returnCost: number | null
  /** AP */
  realizedNetProfit: number | null
  /** AQ */
  realizedNetMargin: number | null
  /** AR */
  adjustedBreakEvenPrice: number | null
  /** AU: a price, or why there is none. */
  recommendedPrice: number | { reason: string } | null
}

/** What a returned unit costs, as a share of its price (the sheet's fixed 20%). */
export const RETURN_LOSS_SHARE = 0.2
/** Standard-size limits in centimetres and grams (Amazon's 45 x 35 x 20 cm and 9 kg). */
const STANDARD_LIMITS = { longest: 45, median: 35, shortest: 20, grams: 9000 }

const num = (value: number | null | undefined) => (typeof value === 'number' && Number.isFinite(value) ? value : 0)
const isNum = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

/** Centimetres per unit of length; null when the unit is not one the sheet knows. */
function centimetresPer(unit: string): number | null {
  const text = unit.toLowerCase()
  if (!text.trim()) return null
  if (text.includes('inch')) return 2.54
  if (text.includes('millimet')) return 0.1
  if (text.includes('centimet')) return 1
  if (text.includes('met')) return 100
  return null
}

function gramsPer(unit: string): number {
  const text = unit.toLowerCase()
  if (text.includes('pound') || text === 'lb' || text === 'lbs') return 453.592
  if (text.includes('ounce') || text === 'oz') return 28.3495
  if (text.includes('kilo') || text === 'kg') return 1000
  return 1
}

/** Q: Standard-Size within 45 x 35 x 20 cm and 9 kg, else Oversize; none without dimensions. */
function sizeTierOf(inputs: PricingInputs): SizeTier | null {
  const { dimensions, weight } = inputs
  if (!dimensions || !dimensions.longest) return null
  const scale = centimetresPer(dimensions.unit) ?? 1
  const grams = weight ? weight.value * gramsPer(weight.unit) : 0
  const standard =
    dimensions.longest * scale <= STANDARD_LIMITS.longest &&
    dimensions.median * scale <= STANDARD_LIMITS.median &&
    dimensions.shortest * scale <= STANDARD_LIMITS.shortest &&
    grams <= STANDARD_LIMITS.grams
  return standard ? 'Standard-Size' : 'Oversize'
}

/** R: the package's volume in cubic metres; null without dimensions or with a unit the sheet cannot read. */
function cubicMetersOf(inputs: PricingInputs): number | null {
  const { dimensions } = inputs
  if (!dimensions || !dimensions.longest) return null
  const scale = centimetresPer(dimensions.unit)
  if (scale === null) return null
  return (dimensions.longest * scale * dimensions.median * scale * dimensions.shortest * scale) / 1_000_000
}

/** The month's rate for a tier: Off-Peak, On-Peak, or the sheet's weighted average (9 months off-peak, 3 on-peak). */
function storageRateOf(tier: SizeTier, mode: SessionMode, rates: StorageRateTable): number | null {
  const { offPeak, onPeak } = tier === 'Standard-Size' ? rates.standard : rates.oversize
  if (mode === 'Off-Peak') return offPeak
  if (mode === 'On-Peak') return onPeak
  return offPeak === null || onPeak === null ? null : (9 * offPeak + 3 * onPeak) / 12
}

export function calculatePricing(inputs: PricingInputs, rates: StorageRateTable): PricingResult {
  const price = inputs.sellingPrice
  const hasPrice = isNum(price) && price > 0
  const landed = inputs.landedCost
  const hasLanded = isNum(landed) && landed !== 0
  const commissionRate = inputs.commissionRate
  const promo = num(inputs.promoRate)
  const fba = inputs.fulfillment === 'FBA'

  const sizeTier = sizeTierOf(inputs)
  const cubicMeters = cubicMetersOf(inputs)

  // T: FBM pays no Amazon storage
  const rate = sizeTier ? storageRateOf(sizeTier, inputs.sessionMode, rates) : null
  const monthlyStorageFee = !fba || cubicMeters === null || rate === null ? null : cubicMeters * rate
  // AC
  const storagePerUnitSold = monthlyStorageFee === null ? null : fba ? monthlyStorageFee * (inputs.daysInStock / 30) : 0

  const discounted = hasPrice ? price * (1 - promo) : null
  // AA, AE
  const commission = hasPrice && isNum(commissionRate) ? discounted! * commissionRate : null
  const marketingCost = hasPrice ? price * num(inputs.marketingRate) : null
  // AF: the commission is on the promo price, marketing on the list price
  const totalAmazonFee = commission === null ? null : commission + num(marketingCost) + num(inputs.fbaFee) + num(storagePerUnitSold)
  // AG
  const totalCost = !hasLanded || totalAmazonFee === null ? null : landed! + totalAmazonFee + (hasPrice ? price * num(inputs.overheadRate) : 0)
  // AH, AI
  const netProfit = !hasPrice || totalCost === null ? null : discounted! - totalCost
  const netMargin = netProfit === null || !discounted ? null : netProfit / discounted

  // AJ: price at which the fixed costs are covered with nothing over
  const shareOfPrice = num(commissionRate) + num(inputs.marketingRate) + num(inputs.overheadRate)
  const breakEvenPrice = !hasLanded || !isNum(commissionRate) || shareOfPrice >= 1 ? null : (landed! + num(inputs.fbaFee) + num(storagePerUnitSold)) / (1 - shareOfPrice)
  // AL, AN
  const promoImpact = breakEvenPrice === null ? null : promo === 0 ? 0 : price! * promo
  const returnCost = breakEvenPrice === null ? null : (price ?? 0) * inputs.returnRate * RETURN_LOSS_SHARE
  // AP, AQ
  const realizedNetProfit = netProfit === null ? null : netProfit - num(returnCost) - (fba ? 0 : num(inputs.shippingCost))
  const realizedNetMargin = realizedNetProfit === null || !hasPrice ? null : realizedNetProfit / price!

  // The share of the price left once promo, commission, overhead, marketing and returns are paid
  const keep = hasPrice ? (1 - promo) * (1 - num(commissionRate)) - num(inputs.overheadRate) - num(inputs.marketingRate) - num(returnCost) / price! : null
  // AR
  const adjustedBreakEvenPrice =
    !hasLanded || !isNum(commissionRate) || !hasPrice || keep === null || keep <= 0
      ? null
      : (landed! + num(inputs.fbaFee) + num(storagePerUnitSold) + (fba ? 0 : num(inputs.shippingCost))) / keep

  // AU
  let recommendedPrice: PricingResult['recommendedPrice'] = null
  if (!hasLanded) recommendedPrice = { reason: 'Landed cost required' }
  else if (adjustedBreakEvenPrice !== null && keep !== null) {
    if (isNum(inputs.netTakeHome)) recommendedPrice = adjustedBreakEvenPrice + inputs.netTakeHome / keep
    else if (inputs.targetMargin >= keep) recommendedPrice = { reason: 'Margin too high' }
    else recommendedPrice = adjustedBreakEvenPrice / (1 - inputs.targetMargin / keep)
  }

  return {
    sizeTier,
    cubicMeters,
    monthlyStorageFee,
    storagePerUnitSold,
    commission,
    marketingCost,
    totalAmazonFee,
    totalCost,
    netProfit,
    netMargin,
    breakEvenPrice,
    promoImpact,
    returnCost,
    realizedNetProfit,
    realizedNetMargin,
    adjustedBreakEvenPrice,
    recommendedPrice,
  }
}
