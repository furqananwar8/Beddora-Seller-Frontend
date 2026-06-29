import type { PurchaseOrderStatus } from '@/services/api/purchaseOrders.api'

export interface PurchaseOrderFilters {
  accountId: string
  supplierId?: string
  marketplaceId?: string
  status?: PurchaseOrderStatus
  sku?: string
}

export interface PurchaseOrderItem {
  id: string
  sku: string
  quantity: number
  unitCost: number
  totalCost: number
}

export interface PurchaseOrder {
  id: string
  accountId: string
  supplierId: string
  marketplaceId?: string | null
  poNumber: string
  status: string
  estimatedDeliveryDate?: string | null
  totalQuantity: number
  totalCost: number
  orderDate: string
  receivedDate?: string | null
  supplier?: {
    id: string
    name: string
    leadTimeDays: number
  }
  marketplace?: {
    id: string
    name: string
    code: string
  } | null
  items?: PurchaseOrderItem[]
}

export interface PurchaseOrderListResponse {
  data: PurchaseOrder[]
  total: number
}

export interface PurchaseOrderCreateRequest {
  accountId: string
  supplierId: string
  marketplaceId?: string
  poNumber: string
  estimatedDeliveryDate?: string
  items: Array<{
    sku: string
    quantity: number
    unitCost: number
    productId?: string
  }>
}

export interface PurchaseOrderUpdateRequest {
  accountId: string
  supplierId?: string
  marketplaceId?: string
  status?: string
  estimatedDeliveryDate?: string
}

export interface PurchaseOrderDuplicateRequest {
  accountId: string
  poNumber: string
}

export interface InboundShipmentFilters {
  accountId: string
  purchaseOrderId?: string
  sku?: string
  status?: string
}

export interface InboundShipment {
  id: string
  purchaseOrderId: string
  sku: string
  quantityShipped: number
  quantityReceived: number
  shipmentDate: string
  receivedDate?: string | null
  status: string
  purchaseOrder?: {
    id: string
    poNumber: string
    marketplaceId?: string | null
  }
}

export interface InboundShipmentResponse {
  data: InboundShipment[]
  total: number
}

export interface InboundShipmentUpdateRequest {
  accountId: string
  quantityReceived: number
  status?: string
  receivedDate?: string
}

export interface POAlertsResponse {
  delayed: PurchaseOrder[]
  upcoming: PurchaseOrder[]
}

