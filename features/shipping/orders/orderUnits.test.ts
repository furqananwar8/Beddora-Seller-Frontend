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
    assert.equal(unitsLabel([3]), 'Unit 3')
    assert.equal(unitsLabel([1, 2]), 'Units 1, 2')
  })
})
