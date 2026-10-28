import type { ShipmentChannelDefinition } from './types'

/**
 * Walmart Fulfillment Services inbound. No warehouse or delivery-window step:
 * Walmart splits the inbound order across its FCs itself and takes the
 * expected delivery date with the order.
 */
export const WFS_CHANNEL: ShipmentChannelDefinition = {
  id: 'walmart_wfs',
  label: 'Walmart WFS',
  program: 'WFS',
  partner: 'Walmart',
  portal: 'Seller Center',
  chipClassName: 'bg-[#2563EB] text-white',
  marketplaces: ['Walmart.US', 'Walmart.CA'],
  steps: [
    { key: 'draft', label: 'Items' },
    { key: 'plan_created', label: 'Inbound order' },
    { key: 'packing_set', label: 'Cartons' },
    { key: 'transport_confirmed', label: 'Carrier' },
    { key: 'labels_ready', label: 'Labels' },
    { key: 'shipped', label: 'Shipped' },
  ],
  stageOrder: ['draft', 'plan_created', 'packing_set', 'transport_confirmed', 'labels_ready'],
  firstVisibleStepAfterPlan: 2,
  nextAction: {
    draft: {
      action: 'submit_plan',
      label: 'Send to Walmart',
      hint: 'Internal draft. Nothing has been sent to Walmart yet.',
    },
    plan_created: {
      action: 'set_packing',
      label: 'Enter cartons',
      hint: 'Walmart accepted the inbound order and split it into shipments. Enter the cartons for each one.',
    },
    packing_set: {
      action: 'enter_carrier',
      label: 'Enter carrier',
      hint: 'Cartons saved. Choose a carrier for each Walmart shipment.',
    },
    transport_confirmed: {
      action: 'generate_labels',
      label: 'Generate labels',
      hint: 'Carrier saved. Generate the carton labels.',
    },
    labels_ready: {
      action: 'mark_shipped',
      label: 'Mark as shipped',
      hint: 'Labels are ready. Mark as shipped once the carrier has picked up.',
    },
  },
  stepRewindTarget: {
    packing_set: 'packing',
    transport_confirmed: 'carrier',
  },
  stepReopenAction: { labels_ready: 'mark_shipped' },
  rewindLabel: {
    packing: 'the cartons',
    carrier: 'the carrier',
  },
  // Both only change our own record; a Walmart carrier booking is cancelled on the way back to cartons
  instantRewinds: ['packing', 'carrier'],
  labels: [
    { type: 'carton', label: 'Carton labels' },
    { type: 'carrier', label: 'Carrier labels', appliesTo: (s) => s.legs.some((l) => l.quote?.booked) },
  ],
  identifier: { header: 'GTIN', value: (i) => i.gtin },
  itemSubline: (i) => [i.sku, i.walmartItemId && `Item ID ${i.walmartItemId}`].filter(Boolean).join(' · '),
  copy: {
    planLabel: 'Walmart inbound order',
    newTitle: 'New WFS shipment',
    newSubtitle: 'Book whole cases from each SKU’s WFS pool. A draft holds them. Confirming with Walmart locks them.',
    namePrefix: 'WFS',
    confirmCard: 'Creates the inbound order. Walmart splits it into shipments per fulfillment center. Stock leaves on-hand when marked shipped.',
    emptyPool: 'No WFS stock yet. Allocate units to WFS in the Planner first.',
    feesTitle: 'Walmart fees (estimate)',
    feesNote: 'Quoted when the carrier was booked. Walmart’s final charge can differ.',
    editRebuildsPlan: 'Saving changes cancels the Walmart inbound order and sends a new one with the updated products.',
    quantitiesLocked: 'Quantities are locked once cartons are entered. Cancel and re-plan to change them.',
    rebuildingPlan: 'Sending a new Walmart order…',
    rewindWarning: 'Going back keeps the Walmart inbound order. A Walmart carrier booking is cancelled, which Walmart allows within 24 hours.',
    sandboxBanner:
      'WFS steps go to Walmart’s sandbox, so no inbound order reaches your Seller Center account. Your shipments and stock are real; Walmart’s side answers with its sample data.',
  },
}
