import { StockBucket } from '@/services/api/inventoryPlanner.api'

export const BUCKET_ROWS: { bucket: StockBucket; label: string }[] = [
  { bucket: 'UNALLOCATED', label: 'Unallocated' },
  { bucket: 'FBM', label: 'FBM' },
  { bucket: 'FBA_POOL', label: 'FBA (not on a shipment)' },
  { bucket: 'FBA_RESERVED', label: 'Amazon allocated (on shipments)' },
  { bucket: 'BUFFER', label: 'Safety buffer' },
]
