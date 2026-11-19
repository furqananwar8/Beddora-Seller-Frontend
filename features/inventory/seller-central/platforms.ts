import type { ComponentType } from 'react'
import type { SellerCentralChannel } from '@/services/api/sellerCentralShipments.api'
import { AmazonPlansPanel } from './AmazonPlansPanel'
import { PanelProps } from './panel'
import { WfsShipmentsPanel } from './WfsShipmentsPanel'

/**
 * Everything the screen shows per platform. The screen asks this list instead of checking the platform,
 * so a new platform is a new entry (and its panel), not new branches in the screen.
 */
export interface SellerCentralPlatform {
  id: SellerCentralChannel
  /** Name in the picker and the tabs. */
  label: string
  Panel: ComponentType<PanelProps>
}

export const PLATFORMS: SellerCentralPlatform[] = [
  { id: 'amazon_fba', label: 'Amazon FBA', Panel: AmazonPlansPanel },
  { id: 'walmart_wfs', label: 'Walmart WFS', Panel: WfsShipmentsPanel },
]
