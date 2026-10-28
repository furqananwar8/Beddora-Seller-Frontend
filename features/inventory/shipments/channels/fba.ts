import type { ShipmentChannelDefinition } from './types'

/** Amazon FBA: SP-API Fulfillment Inbound v2024-03-20, as the screen has always run it. */
export const FBA_CHANNEL: ShipmentChannelDefinition = {
  id: 'amazon_fba',
  label: 'Amazon FBA',
  program: 'FBA',
  partner: 'Amazon',
  portal: 'Seller Central',
  chipClassName: 'bg-[#232F3E] text-white',
  marketplaces: ['Amazon.com', 'Amazon.ca', 'Amazon.mx'],
  steps: [
    { key: 'draft', label: 'Items' },
    { key: 'plan_created', label: 'Inbound plan' },
    { key: 'packing_set', label: 'Packing' },
    { key: 'placement_confirmed', label: 'Warehouse' },
    { key: 'window_confirmed', label: 'Delivery window' },
    { key: 'transport_confirmed', label: 'Carrier' },
    { key: 'labels_ready', label: 'Labels' },
    { key: 'shipped', label: 'Shipped' },
  ],
  stageOrder: ['draft', 'plan_created', 'packing_set', 'placement_confirmed', 'window_confirmed', 'transport_confirmed', 'labels_ready'],
  // Items and Inbound plan need no input once the plan exists
  firstVisibleStepAfterPlan: 2,
  nextAction: {
    draft: {
      action: 'submit_plan',
      label: 'Send to Amazon',
      hint: 'Internal draft. Nothing has been sent to Amazon yet.',
    },
    plan_created: {
      action: 'set_packing',
      label: 'Enter box contents',
      hint: 'Amazon accepted the inbound plan. Tell Amazon how the units are packed into boxes.',
    },
    packing_set: {
      action: 'choose_placement',
      label: 'Choose placement',
      hint: 'Box contents sent. Pick one of Amazon’s placement options; Amazon assigns the warehouses.',
    },
    placement_confirmed: {
      action: 'choose_window',
      label: 'Choose delivery window',
      hint: 'Warehouse confirmed. Request a ship date / delivery window.',
    },
    window_confirmed: {
      action: 'enter_carrier',
      label: 'Enter carrier',
      hint: 'Delivery window booked. Enter the carrier you booked; Amazon is told you ship with your own carrier.',
    },
    transport_confirmed: {
      action: 'generate_labels',
      label: 'Generate labels',
      hint: 'Carrier saved. Generate pallet, box and FNSKU unit labels.',
    },
    labels_ready: {
      action: 'mark_shipped',
      label: 'Mark as shipped',
      hint: 'Labels are ready. Mark as shipped once the truck has left.',
    },
  },
  stepRewindTarget: {
    packing_set: 'packing',
    placement_confirmed: 'placement',
    window_confirmed: 'window',
    transport_confirmed: 'carrier',
  },
  stepReopenAction: { labels_ready: 'mark_shipped' },
  rewindLabel: {
    packing: 'box contents',
    placement: 'the destination warehouse',
    window: 'the delivery window',
    carrier: 'the carrier',
  },
  instantRewinds: ['carrier'],
  labels: [
    { type: 'box', label: 'Box labels' },
    { type: 'pallet', label: 'Pallet labels', appliesTo: (s) => s.legs.some((l) => l.shippingMode?.startsWith('FREIGHT')) },
    { type: 'unit', label: 'FNSKU unit labels' },
  ],
  identifier: { header: 'FNSKU', value: (i) => i.fnsku },
  itemSubline: (i) => [i.sku, i.asin].filter(Boolean).join(' · '),
  copy: {
    planLabel: 'Inbound plan',
    newTitle: 'New FBA shipment',
    newSubtitle: 'Book units from each SKU’s FBA pool. A draft holds them. Confirming with Amazon locks them.',
    namePrefix: 'FBA',
    confirmCard: 'Creates the inbound plan. Quantities lock and the allocation drawer can’t take these units back. Stock leaves on-hand when marked shipped.',
    emptyPool: 'No FBA stock yet. Allocate units to FBA in the Planner first.',
    feesTitle: 'Amazon fees (estimate)',
    feesNote: 'Quoted when each option was confirmed. Amazon’s final charge can differ.',
    editRebuildsPlan: 'Saving changes recreates the Amazon plan from the updated products.',
    quantitiesLocked: 'Quantities are locked once box contents are sent. Cancel and re-plan to change them.',
    rebuildingPlan: 'Recreating Amazon plan…',
    rewindWarning:
      'Amazon locks each step once it is confirmed, so going back cancels the inbound plan and creates a new one. Your earlier choices are re-applied automatically where Amazon offers the same options; anything it can’t match, you choose again.',
    sandboxBanner:
      'Inbound steps go to the SP-API sandbox with sandbox credentials, so nothing reaches your Seller Central account. Your shipments and stock are real; Amazon’s side answers with its sample data (plan wf1234…, SKU "msku", FC YYZ5).',
  },
}
