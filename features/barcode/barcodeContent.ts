import type { BarcodeDataType } from '@/services/api/barcode.api'

export const DATA_TYPE_LABEL: Record<BarcodeDataType, string> = {
  text: 'Text',
  number: 'Number',
  json: 'JSON',
  url: 'Link',
  gs1: 'GS1',
  shipping_label: 'Shipping label',
  keyvalue: 'Key / value',
}

/** The most common GS1 application identifiers; others show their number. */
const GS1_LABEL: Record<string, string> = {
  '00': 'SSCC',
  '01': 'GTIN',
  '02': 'Contained GTIN',
  '10': 'Batch / lot',
  '11': 'Production date',
  '13': 'Packaging date',
  '15': 'Best before',
  '17': 'Expiry date',
  '20': 'Variant',
  '21': 'Serial number',
  '30': 'Count',
  '37': 'Count of items',
  '240': 'Additional product ID',
  '241': 'Customer part number',
  '400': 'Customer PO number',
  '420': 'Ship to postal code',
}

const GS1_DATE = new Set(['11', '13', '15', '17'])

export const gs1Label = (identifier: string): string =>
  GS1_LABEL[identifier] ? `${GS1_LABEL[identifier]} (${identifier})` : `(${identifier})`

/** GS1 dates are YYMMDD; a day of 00 means "end of month" and stays as is. */
export function gs1Value(identifier: string, value: string): string {
  if (!GS1_DATE.has(identifier) || !/^\d{6}$/.test(value)) return value
  return `20${value.slice(0, 2)}-${value.slice(2, 4)}-${value.slice(4, 6)}`
}

export const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Only http(s) links are made clickable. */
export const isSafeLink = (value: unknown): value is string => typeof value === 'string' && /^https?:\/\//i.test(value)
