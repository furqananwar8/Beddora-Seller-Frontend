/** "13:00 EDT" ⇄ { time: "13:00", zone: "EDT" }: the time-of-day value the BOLs store (HH:MM, an optional zone label). */

export const TIME_ZONES = ['EST', 'EDT', 'CST', 'CDT', 'MST', 'MDT', 'PST', 'PDT', 'UTC'] as const

const TIME = /^([01]\d|2[0-3]):([0-5]\d)(?: ([A-Za-z]{2,5}))?$/

export function parseTime(value: string): { time: string; zone: string } {
  const match = value.trim().match(TIME)
  return match ? { time: `${match[1]}:${match[2]}`, zone: match[3]?.toUpperCase() ?? '' } : { time: '', zone: '' }
}

/** No time means no value at all: a zone alone is never stored. */
export const formatTime = (time: string, zone: string) => (time ? (zone ? `${time} ${zone}` : time) : '')

/** "13:00" → "1:00 PM" */
export function timeLabel(time: string): string {
  const [h, m] = time.split(':').map(Number)
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`
}

/** Every 15 minutes of the day, plus `current` when it is off that grid (a time Amazon gave, say), in order. */
export function timeOptions(current: string): string[] {
  const slots = Array.from({ length: 96 }, (_, i) => `${String(Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`)
  return current && !slots.includes(current) ? [...slots, current].sort() : slots
}
