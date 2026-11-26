// Run with: npx tsx --test features/shipping/orders/orderUnits.test.ts
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { ChannelOrderDetail } from '../types'
import { chunkUnits, detailForUnits, freeUnitNos, unitsLabel } from './orderUnits'

const line = (lineNumber: string, sku: string, quantity: number) => ({ lineNumber, sku, quantity, productName: sku, unitPrice: 10, currency: 'CAD', product: null, unitsPerItem: 1 })
const unit = (unitNo: number, lineNumber: string, sku: string, booked = false) => ({ unitNo, lineNumber, sku, booking: booked ? { id: 1, bookingNo: 'SHP-000001', carrier: 'UniUni', serviceName: 'Standard', bookedAt: '2026-11-24T09:12:00Z' } : null })

// 3 units: 2 × BED on line A, 1 × DUV on line B; unit 1 already booked
const detail = { order: {}, shipTo: null, shipToError: null, lines: [line('A', 'BED', 2), line('B', 'DUV', 1)], units: [unit(1, 'A', 'BED', true), unit(2, 'A', 'BED'), unit(3, 'B', 'DUV')] } as unknown as ChannelOrderDetail

describe('freeUnitNos', () => {
  it('lists units no booking covers', () => assert.deepEqual(freeUnitNos(detail), [2, 3]))
})

describe('chunkUnits', () => {
  it('splits 4 units by the size given, the last group takes the rest', () => {
    assert.deepEqual(chunkUnits([1, 2, 3, 4], 1), [[1], [2], [3], [4]])
    assert.deepEqual(chunkUnits([1, 2, 3, 4], 2), [[1, 2], [3, 4]])
    assert.deepEqual(chunkUnits([1, 2, 3, 4], 3), [[1, 2, 3], [4]])
  })
  it('is one booking for 0, for the whole count, or for more than there are', () => {
    assert.deepEqual(chunkUnits([1, 2, 3], 0), [[1, 2, 3]])
    assert.deepEqual(chunkUnits([1, 2, 3], 3), [[1, 2, 3]])
    assert.deepEqual(chunkUnits([1, 2, 3], 9), [[1, 2, 3]])
  })
  it('has no bookings when no units are left', () => assert.deepEqual(chunkUnits([], 2), []))
})

describe('detailForUnits', () => {
  it('keeps only the quantity the given units make up', () => {
    const only = detailForUnits(detail, [2])
    assert.deepEqual(only.lines.map((entry) => [entry.lineNumber, entry.quantity]), [['A', 1]])
  })
  it('drops lines left with no units and keeps whole lines intact', () => {
    const rest = detailForUnits(detail, [2, 3])
    assert.deepEqual(rest.lines.map((entry) => [entry.lineNumber, entry.quantity]), [['A', 1], ['B', 1]])
  })
  it('is the order itself when every unit is given', () => assert.equal(detailForUnits(detail, [1, 2, 3]), detail))
})

describe('unitsLabel', () => {
  it('names one or several units', () => {
    assert.equal(unitsLabel([3]), 'Qty 3')
    assert.equal(unitsLabel([1, 2]), 'Qty 1, 2')
  })
})

import { defaultPlan, planGroups, unitIsMapped, unitsSummary } from './orderUnits'

// 2 x PACK50 (units 1, 2) and 1 x PACK200 (unit 3)
const skus = [{ unitNo: 1, sku: 'PACK50' }, { unitNo: 2, sku: 'PACK50' }, { unitNo: 3, sku: 'PACK200' }]

describe('planGroups', () => {
  it('combines every SKU in one booking by default', () => assert.deepEqual(planGroups(defaultPlan(), skus, [1, 2, 3]), [[1, 2, 3]]))
  it('books each SKU separately, its quantities together', () => assert.deepEqual(planGroups({ combine: false, skus: {} }, skus, [1, 2, 3]), [[1, 2], [3]]))
  it('books a SKU one booking per quantity, the other together', () => assert.deepEqual(planGroups({ combine: false, skus: { PACK50: { each: true } } }, skus, [1, 2, 3]), [[1], [2], [3]]))
  it('books only some of a SKU now and leaves the rest free', () => {
    assert.deepEqual(planGroups({ combine: false, skus: { PACK50: { take: 1 } } }, skus, [1, 2, 3]), [[1], [3]])
    assert.deepEqual(planGroups({ combine: true, skus: { PACK50: { take: 1 }, PACK200: { take: 0 } } }, skus, [1, 2, 3]), [[1]])
  })
  it('only plans the free quantities', () => assert.deepEqual(planGroups({ combine: false, skus: {} }, skus, [2, 3]), [[2], [3]]))
  it('makes no booking when nothing is free', () => assert.deepEqual(planGroups(defaultPlan(), skus, []), []))
  it('handles ten quantities of one SKU', () => {
    const ten = Array.from({ length: 10 }, (_, index) => ({ unitNo: index + 1, sku: 'A' }))
    const free = ten.map((unit) => unit.unitNo)
    assert.equal(planGroups({ combine: false, skus: { A: { each: true } } }, ten, free).length, 10)
    assert.equal(planGroups({ combine: false, skus: {} }, ten, free).length, 1)
    assert.equal(planGroups({ combine: false, skus: { A: { take: 4 } } }, ten, free)[0].length, 4)
  })
})

describe('unitsSummary', () => {
  it('names a booking by SKU', () => assert.equal(unitsSummary(skus, [1, 2, 3]), '2 × PACK50, 1 × PACK200'))
})

describe('unitIsMapped', () => {
  const product = { id: 1 }
  const detail = { lines: [{ lineNumber: 'A', product }, { lineNumber: 'B', product: null }, { lineNumber: 'C', product }, { lineNumber: 'C', product: null }], units: [{ unitNo: 1, lineNumber: 'A' }, { unitNo: 2, lineNumber: 'B' }, { unitNo: 3, lineNumber: 'C' }, { unitNo: 4, lineNumber: 'Z' }] } as unknown as ChannelOrderDetail
  it('is true when the SKU is mapped', () => assert.equal(unitIsMapped(detail, 1), true))
  it('is false when it is not', () => assert.equal(unitIsMapped(detail, 2), false))
  it('is false when a bundle has an unmapped part', () => assert.equal(unitIsMapped(detail, 3), false))
  it('is false for a quantity with no line', () => assert.equal(unitIsMapped(detail, 4), false))
})
