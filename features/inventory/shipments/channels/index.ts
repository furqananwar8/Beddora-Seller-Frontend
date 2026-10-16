import type { InboundShipment, Marketplace, ShipmentChannel } from '../types'
import { FBA_CHANNEL } from './fba'
import { WFS_CHANNEL } from './wfs'
import type { ShipmentChannelDefinition } from './types'

export * from './types'
export { FBA_CHANNEL, WFS_CHANNEL }

/** Every channel the screen knows, in display order. */
export const SHIPMENT_CHANNELS: Record<ShipmentChannel, ShipmentChannelDefinition> = {
  amazon_fba: FBA_CHANNEL,
  walmart_wfs: WFS_CHANNEL,
}

export const CHANNEL_ORDER: ShipmentChannel[] = ['amazon_fba', 'walmart_wfs']

/** The channel of a shipment; servers that predate channels only had FBA. */
export const channelIdOf = (s: Pick<InboundShipment, 'channel'>): ShipmentChannel => s.channel ?? 'amazon_fba'

export const channelOf = (s: Pick<InboundShipment, 'channel'>): ShipmentChannelDefinition => SHIPMENT_CHANNELS[channelIdOf(s)]

export const channelOfMarketplace = (marketplace: Marketplace): ShipmentChannelDefinition =>
  CHANNEL_ORDER.map((id) => SHIPMENT_CHANNELS[id]).find((c) => c.marketplaces.includes(marketplace)) ?? FBA_CHANNEL

export const isShipmentChannel = (value: string | null | undefined): value is ShipmentChannel =>
  !!value && value in SHIPMENT_CHANNELS
