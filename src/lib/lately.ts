// The strongest recent storms and any eruptions, chosen from NASA's event
// tracker, so a first-time visitor has somewhere to start.

import type { NaturalEvent } from './eonet'

export interface Recent {
  id: string
  title: string
  category: string
  /** The day to open: one the photo archive has, when the event was at its worst. */
  date: string
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
