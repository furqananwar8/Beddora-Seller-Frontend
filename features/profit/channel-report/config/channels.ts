import type { ChannelId } from '../channelReport.types'

/**
 * Presentation config per sales channel. Adding a channel = one entry here (plus its backend adapter).
 * Colour is always shown together with the channel name, never on its own.
 */
export interface ChannelDefinition {
  id: ChannelId
  name: string
  color: string
  /** What the channel calls a listing's item id. */
  itemIdLabel: string
  /** Shown as a warning when the channel settles with a delay. */
  settlementNote?: string
}

const CHANNELS: ChannelDefinition[] = [
  { id: 'amazon', name: 'Amazon', color: '#232F3E', itemIdLabel: 'ASIN' },
  { id: 'walmart', name: 'Walmart', color: '#2563EB', itemIdLabel: 'Item ID' },
  { id: 'shopify', name: 'Shopify', color: '#5E8E3E', itemIdLabel: 'Variant' },
  {
    id: 'temu',
    name: 'Temu',
    color: '#F97316',
    itemIdLabel: 'Goods ID',
    settlementNote: 'Temu settles weekly, so its last few days may be incomplete.',
  },
]

const CHANNEL_MAP = new Map(CHANNELS.map((channel) => [channel.id, channel]))

const FALLBACK_COLOR = '#6B7280'

/** Definition of a channel. Unknown ids (a channel the backend added first) still render with a neutral colour. */
export const getChannel = (id: ChannelId): ChannelDefinition =>
  CHANNEL_MAP.get(id) ?? { id, name: id, color: FALLBACK_COLOR, itemIdLabel: 'Item ID' }

export const getChannelName = (id: ChannelId) => getChannel(id).name

/** "Amazon + Walmart + Shopify" */
export const joinChannelNames = (ids: ChannelId[]) => ids.map(getChannelName).join(' + ')
