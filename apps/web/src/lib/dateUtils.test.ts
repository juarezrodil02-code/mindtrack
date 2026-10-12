import { describe, it, expect } from 'vitest'
import {
  isInQuietHours,
  shiftOutOfQuietHours,
  formatDueDate,
  localTimeOnDateToUTC,
} from './dateUtils'

describe('Quiet Hours Logic', () => {
  const tz = 'America/New_York'

  it('detects time inside overnight quiet hours (e.g. 23:30 during 22:00-07:00)', () => {
    // 23:30 in New York
    const dt = new Date('2026-10-12T23:30:00-04:00')
    expect(isInQuietHours(dt, '22:00', '07:00', tz)).toBe(true)
  })

  it('detects time inside morning overnight quiet hours (e.g. 05:30 during 22:00-07:00)', () => {
    // 05:30 in New York
    const dt = new Date('2026-10-13T05:30:00-04:00')
    expect(isInQuietHours(dt, '22:00', '07:00', tz)).toBe(true)
  })

  it('detects time outside overnight quiet hours (e.g. 14:00 during 22:00-07:00)', () => {
    const dt = new Date('2026-10-12T14:00:00-04:00')
    expect(isInQuietHours(dt, '22:00', '07:00', tz)).toBe(false)
  })

  it('detects same-day quiet hours (e.g. 02:00 during 01:00-06:00)', () => {
    const dt = new Date('2026-10-12T02:00:00-04:00')
    expect(isInQuietHours(dt, '01:00', '06:00', tz)).toBe(true)
  })

  it('returns false when quiet hours are not configured', () => {
    const dt = new Date('2026-10-12T02:00:00-04:00')
    expect(isInQuietHours(dt, null, null, tz)).toBe(false)
  })

  it('shifts quiet hours reminder to the end of the window (07:00)', () => {
    const dt = new Date('2026-10-12T23:30:00-04:00')
    const shifted = shiftOutOfQuietHours(dt, '22:00', '07:00', tz)
    expect(isInQuietHours(shifted, '22:00', '07:00', tz)).toBe(false)
  })
})

describe('Date Formatting Utilities', () => {
  const tz = 'UTC'

  it('formats null due date gracefully', () => {
    expect(formatDueDate(null, tz)).toBe('No due date')
  })

  it('formats specific ISO due dates correctly', () => {
    const result = formatDueDate('2026-10-25T15:30:00Z', tz)
    expect(result).toContain('Oct 25')
  })

  it('converts local time on date to UTC', () => {
    const baseDate = new Date('2026-10-15T00:00:00Z')
    const utcDate = localTimeOnDateToUTC(baseDate, '14:30', 'UTC')
    expect(utcDate.toISOString()).toContain('2026-10-15T14:30:00')
  })
})
