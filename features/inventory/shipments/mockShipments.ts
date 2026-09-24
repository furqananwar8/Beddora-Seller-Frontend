import { AmazonOption, InboundShipment, ReservedPoolItem } from './types'
import { getShipmentUnits } from './workflow'

/**
 * Mock data for the Shipments screen. Product IDs match the Planner's
 * mockProductInventory so a Planner selection pre-fills "New shipment".
 */

export const mockReservedPool: ReservedPoolItem[] = [
  { productId: '1', sku: 'HANGERS-50-BLK', fnsku: 'X004A1B2C3', asin: 'B0F4RTTQXQ', title: 'Beddora Black Velvet Hangers 50 Pack, Heavy Duty Coat Hanger', marketplace: 'Amazon.ca', reserved: 160 },
  { productId: '2', sku: 'PILLOW-PROT-K2', fnsku: 'X004D5E6F7', asin: 'B0FNBXLBWJ', title: 'Beddora 2 Pack Pillow Protectors King Size – Waterproof Zippered', marketplace: 'Amazon.ca', reserved: 48 },
  { productId: '3', sku: 'PILLOW-Q-GRY', fnsku: 'X004G8H9I0', asin: 'B0FF79YFWY', title: 'Beddora Bed Pillows Queen Size (Grey), Set of 2, Gusseted', marketplace: 'Amazon.ca', reserved: 30 },
  { productId: '4', sku: 'SHEETS-Q4-GRY', fnsku: 'X004J1K2L3', asin: 'B0FCZV4BDT', title: 'Beddora Queen Sheets Set – 4 Piece Soft & Cooling (Gray)', marketplace: 'Amazon.ca', reserved: 80 },
  { productId: '5', sku: 'INSERT-18-WHT', fnsku: 'X004M4N5O6', asin: 'B0FSN48L9M', title: 'Beddora 18x18 Pillow Inserts, Set of 2, White', marketplace: 'Amazon.ca', reserved: 50 },
  { productId: '6', sku: 'PILLOW-K-WHT', fnsku: 'X004P7Q8R9', asin: 'B0FLG3SXRC', title: 'Beddora Bed Pillows King Size (White), Set of 2, Gusseted', marketplace: 'Amazon.ca', reserved: 40 },
  { productId: '7', sku: 'THROW-FLC-GRY', fnsku: 'X004S1T2U3', asin: 'B0FSRA29D6', title: 'Beddora Fleece Blanket Throw Size, Grey, Anti-Static', marketplace: 'Amazon.ca', reserved: 64 },
  { productId: '8', sku: 'HANGERS-30-GRY', fnsku: 'X004V4W5X6', asin: 'B0FSPA429X', title: 'Beddora Velvet Hangers 30 Pack, Space Saving, Grey', marketplace: 'Amazon.ca', reserved: 25 },
  { productId: '10', sku: 'PILLOW-MF-Q2', fnsku: 'X004Y7Z8A9', asin: 'B0FRTQ8XYZ', title: 'Beddora Memory Foam Pillows, Set of 2, Adjustable Loft, Queen', marketplace: 'Amazon.ca', reserved: 36 },
]

const item = (productId: string, quantity: number, quantityReceived?: number) => {
  const p = mockReservedPool.find((x) => x.productId === productId)!
  return {
    productId,
    sku: p.sku,
    fnsku: p.fnsku,
    asin: p.asin,
    title: p.title,
    imageUrl: p.imageUrl,
    quantity,
    quantityReceived,
  }
}

export const mockShipments: InboundShipment[] = [
  {
    id: 'shp_0048',
    reference: 'SHP-0048',
    name: 'Hangers + protectors restock',
    marketplace: 'Amazon.ca',
    status: 'in_progress',
    stage: 'draft',
    items: [item('1', 40), item('2', 24)],
    legs: [],
    createdAt: '2026-09-24T15:10:00Z',
    updatedAt: '2026-09-24T15:10:00Z',
  },
  {
    id: 'shp_0047',
    reference: 'SHP-0047',
    name: 'Bedding Q4 wave 1',
    marketplace: 'Amazon.ca',
    status: 'in_progress',
    stage: 'plan_created',
    amazonInboundPlanId: 'wf1a2b3c4d-5e6f-7a8b',
    items: [item('3', 30), item('4', 20)],
    legs: [],
    createdAt: '2026-09-23T13:02:00Z',
    updatedAt: '2026-09-23T13:05:00Z',
  },
  {
    id: 'shp_0046',
    reference: 'SHP-0046',
    name: 'Pillows & sheets – split FC',
    marketplace: 'Amazon.ca',
    status: 'in_progress',
    stage: 'placement_confirmed',
    amazonInboundPlanId: 'wf9f8e7d6c-5b4a-3a2b',
    items: [item('4', 36), item('5', 50), item('6', 18)],
    legs: [
      { amazonShipmentId: 'FBA17Q2XK9LM', fulfillmentCenter: 'YYZ4', fcLocation: 'Brampton, ON', units: 68 },
      { amazonShipmentId: 'FBA17Q2XK9LN', fulfillmentCenter: 'YOW1', fcLocation: 'Ottawa, ON', units: 36 },
    ],
    createdAt: '2026-09-21T10:40:00Z',
    updatedAt: '2026-09-22T09:12:00Z',
  },
  {
    id: 'shp_0045',
    reference: 'SHP-0045',
    name: 'Hangers bulk – pallet',
    marketplace: 'Amazon.ca',
    status: 'in_progress',
    stage: 'labels_ready',
    amazonInboundPlanId: 'wf5c4b3a2f-1e0d-9c8b',
    items: [item('1', 60), item('8', 25)],
    legs: [{ amazonShipmentId: 'FBA17PZ8R3TT', fulfillmentCenter: 'YYZ4', fcLocation: 'Brampton, ON', units: 85 }],
    deliveryWindow: { start: '2026-09-29T00:00:00Z', end: '2026-10-03T00:00:00Z' },
    carrier: 'Amazon Partnered Carrier (SPD)',
    createdAt: '2026-09-18T16:20:00Z',
    updatedAt: '2026-09-24T11:48:00Z',
  },
  {
    id: 'shp_0044',
    reference: 'SHP-0044',
    name: 'Throws early Q4',
    marketplace: 'Amazon.ca',
    status: 'shipped',
    stage: 'labels_ready',
    amazonInboundPlanId: 'wf1d2c3b4a-5f6e-7d8c',
    items: [item('7', 48)],
    legs: [{ amazonShipmentId: 'FBA17NM4B2QA', fulfillmentCenter: 'YVR3', fcLocation: 'Delta, BC', units: 48 }],
    deliveryWindow: { start: '2026-09-26T00:00:00Z', end: '2026-09-30T00:00:00Z' },
    carrier: 'Amazon Partnered Carrier (SPD)',
    createdAt: '2026-09-12T09:00:00Z',
    updatedAt: '2026-09-20T17:30:00Z',
    shippedAt: '2026-09-20T17:30:00Z',
  },
  {
    id: 'shp_0043',
    reference: 'SHP-0043',
    name: 'Memory foam launch',
    marketplace: 'Amazon.ca',
    status: 'receiving',
    stage: 'labels_ready',
    amazonInboundPlanId: 'wf0a9b8c7d-6e5f-4a3b',
    items: [item('10', 40, 28), item('2', 20, 20)],
    legs: [{ amazonShipmentId: 'FBA17KX0D5WE', fulfillmentCenter: 'YYZ7', fcLocation: 'Bolton, ON', units: 60 }],
    deliveryWindow: { start: '2026-09-15T00:00:00Z', end: '2026-09-19T00:00:00Z' },
    carrier: 'UPS (non-partnered)',
    createdAt: '2026-09-05T12:00:00Z',
    updatedAt: '2026-09-23T08:02:00Z',
    shippedAt: '2026-09-12T14:00:00Z',
  },
  {
    id: 'shp_0041',
    reference: 'SHP-0041',
    name: 'August replenishment',
    marketplace: 'Amazon.ca',
    status: 'closed',
    stage: 'labels_ready',
    amazonInboundPlanId: 'wf7e6d5c4b-3a2f-1e0d',
    items: [item('1', 100, 100), item('3', 40, 39)],
    legs: [{ amazonShipmentId: 'FBA17GH2J8PL', fulfillmentCenter: 'YYZ4', fcLocation: 'Brampton, ON', units: 140 }],
    deliveryWindow: { start: '2026-08-18T00:00:00Z', end: '2026-08-22T00:00:00Z' },
    carrier: 'Amazon Partnered Carrier (LTL)',
    createdAt: '2026-08-08T10:00:00Z',
    updatedAt: '2026-08-29T19:15:00Z',
    shippedAt: '2026-08-15T13:00:00Z',
  },
  {
    id: 'shp_0040',
    reference: 'SHP-0040',
    name: 'Sheets test batch',
    marketplace: 'Amazon.ca',
    status: 'cancelled',
    stage: 'plan_created',
    amazonInboundPlanId: 'wf3b2a1f0e-9d8c-7b6a',
    items: [item('4', 12)],
    legs: [],
    createdAt: '2026-08-02T10:00:00Z',
    updatedAt: '2026-08-03T09:00:00Z',
  },
]

// ---- Mock Amazon option generators (stand-ins for generate*Options) ----

const addDays = (days: number) => {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString()
}

export const buildPlacementOptions = (s: InboundShipment): AmazonOption[] => {
  const units = getShipmentUnits(s)
  const firstLeg = Math.ceil(units * 0.6)
  return [
    {
      id: 'po_single',
      title: 'Single warehouse · YYZ4',
      description: 'Brampton, ON. All units go in one shipment.',
      fee: 0.3 * units,
      tag: 'Fewest shipments',
      legs: [{ fulfillmentCenter: 'YYZ4', fcLocation: 'Brampton, ON', units }],
    },
    {
      id: 'po_split',
      title: 'Split · YYZ4 + YOW1',
      description: 'Amazon-optimized split across 2 warehouses.',
      fee: 0,
      tag: 'No placement fee',
      legs: [
        { fulfillmentCenter: 'YYZ4', fcLocation: 'Brampton, ON', units: firstLeg },
        { fulfillmentCenter: 'YOW1', fcLocation: 'Ottawa, ON', units: units - firstLeg },
      ],
    },
    {
      id: 'po_west',
      title: 'Single warehouse · YVR3',
      description: 'Delta, BC. All units go in one shipment.',
      fee: 0.3 * units,
      legs: [{ fulfillmentCenter: 'YVR3', fcLocation: 'Delta, BC', units }],
    },
  ]
}

export const buildDeliveryWindowOptions = (): AmazonOption[] =>
  [5, 9, 14].map((offset, i) => ({
    id: `dw_${offset}`,
    title: `Window ${i + 1}`,
    window: { start: addDays(offset), end: addDays(offset + 4) },
    tag: i === 0 ? 'Earliest' : undefined,
  }))

export const buildTransportationOptions = (s: InboundShipment): AmazonOption[] => {
  const units = getShipmentUnits(s)
  return [
    {
      id: 'tr_spd',
      title: 'Amazon Partnered Carrier (SPD)',
      description: 'Small parcel delivery. Amazon books the pickup.',
      fee: Math.round(units * 0.95 * 100) / 100,
      carrier: 'Amazon Partnered Carrier (SPD)',
      tag: 'Recommended',
    },
    {
      id: 'tr_ltl',
      title: 'Amazon Partnered Carrier (LTL)',
      description: 'Palletized freight. Pallet labels required.',
      fee: 185,
      carrier: 'Amazon Partnered Carrier (LTL)',
    },
    {
      id: 'tr_own',
      title: 'Your own carrier',
      description: 'Non-partnered. You provide tracking numbers.',
      carrier: 'Own carrier (non-partnered)',
    },
  ]
}
