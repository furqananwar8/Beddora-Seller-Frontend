import { baseApi } from './baseApi'

/** Values a single trailer may print differently from the shipment (carrier, appointment, dates, receiver…). */
export interface BolOverrides {
  carrier?: string
  appointmentNo?: string
  pickupDate?: string
  deliveryDate?: string
  receiverName?: string
  receiverAddress?: string
  shipmentConfirmationId?: string
  amazonReferenceId?: string
  shipperName?: string
  shipperAddress?: string
}

export type BolStatus = 'draft' | 'ready' | 'over'
export type BolWeightUnit = 'LB' | 'KG'

/** The trailer fields a person types (or accepts the defaults of). */
export interface TrailerFields {
  pallets: number
  boxes: number
  units: number
  weight: number
  weightUnit: BolWeightUnit
  pickupNo: string | null
  pickupTime: string | null
  deliveryTime: string | null
  proNo: string | null
  truckNo: string | null
  trailerNo: string | null
  sealNo: string | null
  contact: string | null
  commodity: string | null
  notes: string | null
  overrides: BolOverrides
}

export interface Bol extends TrailerFields {
  id: number
  bolNo: number
  /** BOL-0013 */
  reference: string
  position: number
  status: BolStatus
  generatedAt: string | null
  updatedAt: string
}

export interface BolCarrierStep {
  done: boolean
  /** The BOLs may record the carrier for the whole FC (false only for an app-made Amazon shipment before its carrier step). */
  editable: boolean
  carrier: string | null
  carrierPartnerId: number | null
  pickupDate: string | null
  deliveryDate: string | null
  appointmentNo: string | null
}

export interface BolLeg {
  /** The partner's id of the FC shipment (Walmart's shipmentId for WFS). */
  amazonShipmentId: string
  fulfillmentCenter: string
  /** "Amazon.com · YYZ5" / "Walmart · Calgary Fulfillment Center" */
  receiverName: string
  fcLocation: string | null
  shipmentConfirmationId: string | null
  amazonReferenceId: string | null
  receiverAddress: string
  totals: { boxes: number; units: number }
  /** False for a synced shipment nobody counted the boxes of: `totals.boxes` is then its units. */
  boxesCounted: boolean
  suggested: { pallets: number; weight: number; weightUnit: 'LB' }
  carrierStep: BolCarrierStep
  deliveryTime: string | null
  bols: Bol[]
}

export interface BolView {
  shipmentId: number
  reference: string
  name: string
  shippingMode: 'SPD' | 'LTL_FTL' | null
  labels: { partner: string; shipmentId: string; referenceId: string }
  editable: boolean
  shipper: { name: string; address: string; contact: string | null; phone: string | null }
  defaults: { contact: string | null; commodity: string; pickupTime: string | null }
  legs: BolLeg[]
}

/** A trailer as saved: an id for one saved before. */
export type TrailerInput = TrailerFields & { id?: number }

export interface BolCarrierDetailsInput {
  carrierPartnerId: number
  pickupDate: string
  deliveryDate: string
  appointmentNo: string | null
}

export const shipmentBolsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getShipmentBols: builder.query<BolView, string>({
      query: (shipmentId) => ({ url: `/inventory/shipments/${shipmentId}/bols` }),
      providesTags: (_result, _error, shipmentId) => [{ type: 'ShipmentBols', id: shipmentId }],
    }),

    /** Saves one FC's trailers as a set; the server refuses totals over the FC's boxes or units. */
    saveShipmentBolTrailers: builder.mutation<BolView, { shipmentId: string; amazonShipmentId: string; trailers: TrailerInput[] }>({
      query: ({ shipmentId, amazonShipmentId, trailers }) => ({
        url: `/inventory/shipments/${shipmentId}/bols/${encodeURIComponent(amazonShipmentId)}`,
        method: 'PUT',
        body: { trailers },
      }),
      async onQueryStarted({ shipmentId }, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled
        dispatch(shipmentBolsApi.util.upsertQueryData('getShipmentBols', shipmentId, data))
      },
    }),

    /** Corrects the carrier-step record of one FC (our own record; Amazon isn't asked, the step doesn't change). */
    updateBolCarrierDetails: builder.mutation<BolView, { shipmentId: string; amazonShipmentId: string } & BolCarrierDetailsInput>({
      query: ({ shipmentId, amazonShipmentId, ...body }) => ({
        url: `/inventory/shipments/${shipmentId}/bols/${encodeURIComponent(amazonShipmentId)}/carrier-details`,
        method: 'PATCH',
        body,
      }),
      async onQueryStarted({ shipmentId }, { dispatch, queryFulfilled }) {
        const { data } = await queryFulfilled
        dispatch(shipmentBolsApi.util.upsertQueryData('getShipmentBols', shipmentId, data))
      },
      // The shipment's carrier and dates show on its row too
      invalidatesTags: ['InboundShipments'],
    }),
  }),
})

export const { useGetShipmentBolsQuery, useLazyGetShipmentBolsQuery, useSaveShipmentBolTrailersMutation, useUpdateBolCarrierDetailsMutation } = shipmentBolsApi
