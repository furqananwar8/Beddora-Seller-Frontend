import { ResellerWorkflowBatch } from '@/services/api/resellerWorkflow.api'

/**
 * Mock Reseller Workflow Batches
 */
export const mockWorkflowBatches: ResellerWorkflowBatch[] = []

// Empty array by default to show the empty state
// Uncomment below to test with data:

/*
export const mockWorkflowBatches: ResellerWorkflowBatch[] = [
  {
    id: '1',
    batchNumber: 'WF-2026-001',
    name: 'January Books Batch',
    status: 'in_progress',
    fulfillmentType: 'FBA',
    products: [
      {
        id: 'p1',
        asin: 'B08N5WRWNW',
        sku: 'BOOK-001',
        fnsku: 'X001ABC123',
        title: 'The Great Novel - Hardcover',
        imageUrl: 'https://via.placeholder.com/50',
        condition: 'new',
        quantity: 10,
        costOfGoods: 8.50,
        expectedPrice: 19.99,
        barcode: '9781234567890',
        createdAt: '2026-01-20T10:00:00Z',
      },
      {
        id: 'p2',
        asin: 'B07XYZ5678',
        sku: 'BOOK-002',
        title: 'Mystery Thriller Paperback',
        condition: 'new',
        quantity: 15,
        costOfGoods: 6.25,
        expectedPrice: 14.99,
        createdAt: '2026-01-20T10:15:00Z',
      },
    ],
    totalProducts: 2,
    totalUnits: 25,
    totalCOGS: 178.75,
    expectedRevenue: 424.73,
    expectedProfit: 245.98,
    notes: 'Q1 inventory replenishment',
    createdAt: '2026-01-20T09:30:00Z',
    updatedAt: '2026-01-20T10:15:00Z',
  },
  {
    id: '2',
    batchNumber: 'WF-2026-002',
    name: 'Electronics Resale Batch',
    status: 'draft',
    fulfillmentType: 'FBM',
    products: [],
    totalProducts: 0,
    totalUnits: 0,
    totalCOGS: 0,
    notes: 'Testing FBM workflow',
    createdAt: '2026-01-22T14:00:00Z',
    updatedAt: '2026-01-22T14:00:00Z',
  },
]
*/
