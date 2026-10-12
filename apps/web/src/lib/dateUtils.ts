import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz'
import {
  format,
  formatDistanceToNow,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
  startOfDay,
  endOfDay,
  addMinutes,
  isBefore,
  isAfter,
} from 'date-fns'

/**
 * Format a UTC timestamp in the user's timezone.
 */
export function formatInTz(isoString: string, pattern: string, timezone: string): string {
  return formatInTimeZone(new Date(isoString), timezone, pattern)
}

/**
 * Return relative time string ("in 3 hours", "2 days ago") with the exact
 * time in the user's timezone available as a tooltip title.
 */
export function relativeWithExact(isoString: string, timezone: string): { relative: string; exact: string } {
  const date = parseISO(isoString)
  return {
    relative: formatDistanceToNow(date, { addSuffix: true }),
    exact: formatInTimeZone(date, timezone, "MMM d, yyyy 'at' h:mm a"),
  }
}

/**
 * Format a due date with smart labels (Today, Tomorrow, etc.)
 */
export function formatDueDate(isoString: string | null, timezone: string): string {
  if (!isoString) return 'No due date'
  const date = toZonedTime(new Date(isoString), timezone)
  if (isToday(date)) return `Today at ${format(date, 'h:mm a')}`
  if (isTomorrow(date)) return `Tomorrow at ${format(date, 'h:mm a')}`
  if (isYesterday(date)) return `Yesterday at ${format(date, 'h:mm a')}`
  return format(date, "MMM d 'at' h:mm a")
}

/**
 * Get today's local date boundaries in UTC.
 */
export function getTodayBounds(timezone: string): { start: Date; end: Date } {
  const nowLocal = toZonedTime(new Date(), timezone)
  const startLocal = startOfDay(nowLocal)
  const endLocal = endOfDay(nowLocal)
  return {
    start: fromZonedTime(startLocal, timezone),
    end: fromZonedTime(endLocal, timezone),
  }
}

/**
 * Get week boundaries for the week containing the given date.
 */
export function getWeekBounds(date: Date, timezone: string): { start: Date; end: Date } {
  const local = toZonedTime(date, timezone)
  const dayOfWeek = local.getDay()
  const startLocal = startOfDay(new Date(local))
  startLocal.setDate(startLocal.getDate() - dayOfWeek)
  const endLocal = new Date(startLocal)
  endLocal.setDate(endLocal.getDate() + 6)
  const end = endOfDay(endLocal)
  return {
    start: fromZonedTime(startLocal, timezone),
    end: fromZonedTime(end, timezone),
  }
}

/**
 * Convert a local time string (HH:mm) on a given local date to a UTC instant.
 * DST-safe via date-fns-tz.
 */
export function localTimeOnDateToUTC(date: Date, timeStr: string, timezone: string): Date {
  const [hours, minutes] = timeStr.split(':').map(Number)
  const localDate = toZonedTime(date, timezone)
  localDate.setHours(hours, minutes, 0, 0)
  return fromZonedTime(localDate, timezone)
}

/**
 * Check if a UTC timestamp falls within quiet hours (handles overnight windows).
 */
export function isInQuietHours(
  ts: Date,
  quietStart: string | null,
  quietEnd: string | null,
  timezone: string
): boolean {
  if (!quietStart || !quietEnd) return false
  const local = toZonedTime(ts, timezone)
  const [startH, startM] = quietStart.split(':').map(Number)
  const [endH, endM] = quietEnd.split(':').map(Number)
  const minutesOfDay = local.getHours() * 60 + local.getMinutes()
  const startMins = startH * 60 + startM
  const endMins = endH * 60 + endM

  if (startMins <= endMins) {
    // Same-day window e.g., 01:00 - 07:00
    return minutesOfDay >= startMins && minutesOfDay < endMins
  } else {
    // Overnight window e.g., 22:00 - 07:00
    return minutesOfDay >= startMins || minutesOfDay < endMins
  }
}

/**
 * Shift a timestamp to the end of the quiet window if it falls inside it.
 */
export function shiftOutOfQuietHours(
  ts: Date,
  quietStart: string | null,
  quietEnd: string | null,
  timezone: string
): Date {
  if (!isInQuietHours(ts, quietStart, quietEnd, timezone)) return ts
  if (!quietEnd) return ts

  const local = toZonedTime(ts, timezone)
  const [endH, endM] = quietEnd.split(':').map(Number)
  const candidate = new Date(local)
  candidate.setHours(endH, endM, 0, 0)

  // If the end time is earlier (overnight), advance to next day
  if (isBefore(fromZonedTime(candidate, timezone), ts)) {
    candidate.setDate(candidate.getDate() + 1)
    candidate.setHours(endH, endM, 0, 0)
  }
  return fromZonedTime(candidate, timezone)
}

export { addMinutes, isBefore, isAfter, parseISO, format, isToday, isTomorrow }
