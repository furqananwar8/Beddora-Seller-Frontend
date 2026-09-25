import { InventorySummary } from '@/services/api/inventoryPlanner.api'

/**
 * Mock Inventory Summary Data
 */
export const mockInventorySummary: InventorySummary[] = [
  {
    location: 'fba',
    units: 6387,
    costOfGoods: 16853.41,
    potentialSales: 181407.54,
    potentialProfit: 237536.89,
  },
  {
    location: 'prep',
    units: 9410,
    costOfGoods: 11119.20,
    potentialSales: 0,
    potentialProfit: 0,
  },
  {
    location: 'ordered',
    units: 0,
    costOfGoods: 0,
    potentialSales: 0,
    potentialProfit: 0,
  },
]
