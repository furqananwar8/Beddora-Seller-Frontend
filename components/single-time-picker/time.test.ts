// Run with: npx tsx --test components/single-time-picker/time.test.ts (tsx from the backend's node_modules)
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { formatTime, parseTime, timeLabel, timeOptions } from './time'

describe('time-of-day values', () => {
  it('reads and writes "HH:MM ZONE"', () => {
    assert.deepEqual(parseTime('13:00 edt'), { time: '13:00', zone: 'EDT' })
    assert.deepEqual(parseTime('09:30'), { time: '09:30', zone: '' })
    assert.deepEqual(parseTime('9:30'), { time: '', zone: '' })
    assert.equal(formatTime('13:00', 'EDT'), '13:00 EDT')
    assert.equal(formatTime('13:00', ''), '13:00')
    assert.equal(formatTime('', 'EDT'), '')
  })

  it('labels in 12-hour time and keeps an off-grid time among the options', () => {
    assert.equal(timeLabel('00:15'), '12:15 AM')
    assert.equal(timeLabel('12:00'), '12:00 PM')
    assert.equal(timeOptions('').length, 96)
    const options = timeOptions('12:07')
    assert.equal(options.length, 97)
    assert.equal(options[options.indexOf('12:07') - 1], '12:00')
  })
})
