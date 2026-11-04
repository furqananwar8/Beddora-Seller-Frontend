import { siDhl, siDpd, siFedex, siUps, siUsps, type SimpleIcon } from 'simple-icons'

export interface CarrierBrand {
  /** Name of the brand's file under public/carriers/ is `file`, else `<slug>.svg`. */
  slug: string
  /** The image file in public/carriers/ when it isn't `<slug>.svg`. */
  file?: string
  /** Tested against the carrier or provider name as a service reports it ("Canada Post", "UPS", "Purolator"). */
  match: RegExp
  /** A bundled brand mark, when the simple-icons package has one. */
  icon?: SimpleIcon
}

/**
 * Carriers and providers we show a logo for. A brand with an `icon` renders from the package; any other renders
 * public/carriers/<slug>.svg when that file exists, and falls back to initials. To add a logo, drop the file in
 * public/carriers/ (or add the brand here); nothing else changes. First match wins.
 */
export const CARRIER_BRANDS: CarrierBrand[] = [
  { slug: 'ups', match: /\bups\b|united parcel/i, icon: siUps },
  { slug: 'fedex', match: /fedex|federal express/i, icon: siFedex },
  { slug: 'dhl', match: /\bdhl\b/i, icon: siDhl },
  { slug: 'usps', match: /\busps\b|postal service/i, icon: siUsps },
  { slug: 'dpd', match: /\bdpd\b/i, icon: siDpd },
  { slug: 'canada-post', file: 'canada-post.png', match: /canada\s*post/i },
  { slug: 'purolator', file: 'purolator.png', match: /purolator/i },
  { slug: 'postnl', file: 'postnl.png', match: /postnl/i },
  { slug: 'intelcom', match: /intelcom/i },
  { slug: 'fleet-optics', match: /fleet\s*optics/i },
  { slug: 'ics', match: /^ics\b/i },
  { slug: 'uniuni', file: 'uniuni.png', match: /uni\s*uni/i },
  { slug: 'shippo', file: 'shippo.png', match: /shippo/i },
  { slug: 'stallion', file: 'stallion.png', match: /stallion/i },
]

/** The public URL of a brand's image file. */
export const logoFile = (brand: CarrierBrand) => `/carriers/${brand.file ?? `${brand.slug}.svg`}`

export const brandOf = (name: string | null | undefined): CarrierBrand | undefined => (name ? CARRIER_BRANDS.find((brand) => brand.match.test(name)) : undefined)
