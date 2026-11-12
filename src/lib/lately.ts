// The strongest recent storms and any eruptions, chosen from NASA's event
// tracker, so a first-time visitor has somewhere to start.

import type { Day, See } from '../days'
import type { NaturalEvent } from './eonet'

export interface Recent {
  id: string
  title: string
  category: string
  /** The day to open: one the photo archive has, when the event was at its worst. */
  date: string
  /** What to turn to, when it is not simply the event with this id. */
  see?: See
}

/** How far back to look, in days. */
export const LATELY_DAYS = 30
/** Only these kinds of event say how severe they are, or are rare enough to always matter. */
export const LATELY_CATEGORIES = 'severeStorms,volcanoes'
/** Hurricane strength: 64 knots of sustained wind. */
const HURRICANE_KTS = 64

const knots = (magnitude: string | null) => (magnitude && /kts/i.test(magnitude) ? parseFloat(magnitude) : 0)
const dayOf = (time: number) => new Date(time).toISOString().slice(0, 10)

/**
 * Pick what to offer from a list of recent events. A storm counts if it reached
 * hurricane strength on a day that has photographs; a volcano always counts.
 * Newest first, and the stronger of two on the same day.
 */
export function pickRecent(events: NaturalEvent[], dates: string[], limit = 4): Recent[] {
  const have = new Set(dates)
  const found: (Recent & { strength: number })[] = []
  for (const e of events) {
    const seen = e.points.filter((p) => have.has(dayOf(p.time)))
    if (!seen.length) continue
    if (e.category === 'severeStorms') {
      const peak = seen.reduce((a, b) => (knots(b.magnitude) > knots(a.magnitude) ? b : a))
      if (knots(peak.magnitude) < HURRICANE_KTS) continue
      found.push({ id: e.id, title: e.title, category: e.category, date: dayOf(peak.time), strength: knots(peak.magnitude) })
    } else if (e.category === 'volcanoes') {
      found.push({ id: e.id, title: e.title, category: e.category, date: dayOf(seen[seen.length - 1].time), strength: 0 })
    }
  }
  return found
    .sort((a, b) => b.date.localeCompare(a.date) || b.strength - a.strength)
    .slice(0, limit)
    .map(({ id, title, category, date }) => ({ id, title, category, date }))
}

const daysBetween = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 86_400_000

/**
 * Add the days chosen by hand that are still recent. NASA's tracker cannot say
 * how bad a flood or landslide was, so those only get here this way. A day
 * chosen by hand is never pushed out by an automatic one, and replaces the
 * automatic entry for the same event.
 */
export function withPicked(auto: Recent[], picked: Day[], dates: string[], limit = 4): Recent[] {
  const latest = dates[dates.length - 1]
  const have = new Set(dates)
  const mine = picked
    .filter((d) => d.title && have.has(d.date) && daysBetween(d.date, latest) < LATELY_DAYS)
    .map((d): Recent => ({ id: d.see?.eventId ?? d.date, title: d.title!, category: d.category ?? 'other', date: d.date, see: d.see }))
    .slice(0, limit)
  const ids = new Set(mine.map((r) => r.id))
  const rest = auto.filter((r) => !ids.has(r.id)).slice(0, limit - mine.length)
  return [...mine, ...rest].sort((a, b) => b.date.localeCompare(a.date))
}
