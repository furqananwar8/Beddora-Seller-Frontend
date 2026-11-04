import { z } from 'zod'
import { isValidPhone } from '@/components/phone-field/PhoneField'
import type { ShippingProduct } from '../types'

/** What the lane the parcel travels needs: customs fields cross-border, a province where the country lists them. */
export interface Lane {
  crossBorder: boolean
  /** Imports into the US need the full 10-digit HTS code. */
  toUs: boolean
  needsProvince: boolean
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
/** 6–12 digits; dots allowed between them. */
const HS_CODE = /^\d[\d.]*\d$/
const hsDigits = (code: string) => code.replace(/\./g, '').length

const required = (message: string) => z.string().trim().min(1, message)
const positive = (message: string) => z.string().refine((value) => value.trim() !== '' && Number(value) > 0, message)

const customsSchema = (lane: Lane) =>
  z
    .object({
      description: required('Description is required'),
      unitValue: positive('Unit value is required'),
      currency: z.enum(['CAD', 'USD']),
      hsCode: z.string().trim(),
      originCountry: z.string(),
    })
    .superRefine((line, ctx) => {
      const issue = (path: string, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })
      if (line.hsCode && (!HS_CODE.test(line.hsCode) || hsDigits(line.hsCode) < 6 || hsDigits(line.hsCode) > 12)) issue('hsCode', '6–12 digits, dots allowed')
      if (!lane.crossBorder) return
      if (!line.hsCode) issue('hsCode', 'Pick the HS code')
      else if (lane.toUs && hsDigits(line.hsCode) !== 10) issue('hsCode', 'US shipments need the full 10-digit HTS code')
      if (!line.originCountry) issue('originCountry', 'Country of origin is required')
    })

const productLineSchema = (lane: Lane) =>
  z.object({
    product: z.custom<ShippingProduct>(),
    quantity: z.string().refine((value) => Number.isInteger(Number(value)) && Number(value) >= 1 && value.trim() !== '', 'Whole number, 1 or more'),
    customs: customsSchema(lane),
  })

const shipToSchema = (lane: Lane) =>
  z
    .object({
      name: required('Full name is required'),
      company: z.string(),
      address1: required('Address line 1 is required'),
      address2: z.string(),
      email: z.string().trim().refine((value) => !value || EMAIL.test(value), 'Not a valid email'),
      address: z.object({
        country: required('Country is required'),
        province: z.string().trim(),
        city: required('City is required'),
        postalCode: required('Postal code is required'),
      }),
      phone: z.object({ country: z.string(), number: z.string() }).superRefine((phone, ctx) => {
        if (!phone.number) ctx.addIssue({ code: 'custom', message: 'Phone is required' })
        else if (!isValidPhone(phone)) ctx.addIssue({ code: 'custom', message: 'Not a valid number for this country' })
      }),
      residential: z.boolean(),
    })
    .superRefine((shipTo, ctx) => {
      if (lane.needsProvince && !shipTo.address.province) ctx.addIssue({ code: 'custom', path: ['address', 'province'], message: 'State / province is required' })
    })

/** The whole Create shipment / Book order form; rebuilt when the lane changes. */
export const shipmentSchema = (lane: Lane) =>
  z.object({
    shipFromId: z.string().min(1, 'Pick the address to ship from'),
    shipTo: shipToSchema(lane),
    products: z.array(productLineSchema(lane)).min(1, 'Add at least one product'),
    units: z.enum(['METRIC', 'IMPERIAL']),
    pkg: z.object({ length: positive('Length is required'), width: positive('Width is required'), height: positive('Height is required'), weight: positive('Weight is required') }),
    incoterm: z.enum(['DDP', 'DAP', 'DDU']),
    pickupDate: z.string().min(1, 'Pick the pickup date'),
    signature: z.boolean(),
    insurance: z.string().refine((value) => value.trim() === '' || Number(value) > 0, 'Enter an amount above 0, or leave it blank'),
    reference: z.string().max(50, '50 characters at most'),
  })

export type ShipmentFormValues = z.infer<ReturnType<typeof shipmentSchema>>

/** Field groups of the Address step, for validating just them before moving on. */
export const ADDRESS_FIELDS = ['shipFromId', 'shipTo'] as const
