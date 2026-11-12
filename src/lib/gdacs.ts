// GDACS: the Global Disaster Alert and Coordination System, run by the United
// Nations and the European Commission. Unlike NASA's tracker it says how severe
// an event is, so it is where red-alert floods, earthquakes, eruptions and
// fires come from.

import type { Recent } from './lately'

const BASE = 'https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH'

/** Cyclones are left to NASA's tracker, which already follows them. */
const KINDS: Record<string, string> = { FL: 'floods', EQ: 'earthquakes', VO: 'volcanoes', WF: 'wildfires' }

export interface RawAlert {
  geometry?: { type: string; coordinates: unknown }
  properties: {
    eventtype: string
    eventid: number
    name?: string
    alertlevel?: string
    fromdate: string
    todate: string
  }
}

const shiftDate = (date: string, days: number) => {
  const d = new Date(date + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** "Eruption  Kanlaon" and lists of a dozen countries are tidied for a small label. */
function label(name: string): string {
  const tidy = name.replace(/\s+/g, ' ').replace(/ ,/g, ',').trim()
  return tidy.length > 34 ? tidy.split(',')[0] : tidy
}

/**
 * Turn red alerts into entries for the row of recent events. Each opens on a
 * day that has photographs: the first day of a flood, earthquake or eruption,
 * the last day of a fire, when its smoke has spread furthest.
 */
export function pickAlerts(alerts: RawAlert[], dates: string[]): Recent[] {
  const found: Recent[] = []
  for (const { properties: p, geometry: g } of alerts) {
    const category = KINDS[p.eventtype]
    if (!category || p.alertlevel?.toLowerCase() !== 'red' || !p.name) continue
    const from = p.fromdate.slice(0, 10)
    const to = p.todate.slice(0, 10)
    const days = dates.filter((d) => d >= from && d <= to)
    if (!days.length) continue
    const point = g?.type === 'Point' ? (g.coordinates as [number, number]) : null
    found.push({
      id: `gdacs-${p.eventtype}-${p.eventid}`,
      title: label(p.name),
      category,
      date: category === 'wildfires' ? days[days.length - 1] : days[0],
      // NASA lists GDACS floods and fires under the same number, so its mark can be opened.
      see: {
        ...(category === 'floods' || category === 'wildfires' ? { eventTitleEnds: ` ${p.eventid}` } : {}),
        ...(point && Number.isFinite(point[0]) && Number.isFinite(point[1]) ? { lat: point[1], lon: point[0] } : {}),
      },
    })
  }
  return found
}

/** Red alerts that began or continued in the `days` days up to and including `date`. */
export async function fetchAlerts(date: string, days: number, dates: string[], signal?: AbortSignal): Promise<Recent[]> {
  const url = `${BASE}?eventlist=${Object.keys(KINDS).join(';')}&alertlevel=red&fromDate=${shiftDate(date, -(days - 1))}&toDate=${date}`
  const timeout = AbortSignal.timeout(12000)
  const res = await fetch(url, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  // With no red alerts in the period, GDACS answers with nothing at all.
  if (res.status === 204) return []
  const raw = (await res.json()) as { features?: RawAlert[] }
  const earliest = shiftDate(date, -(days - 1))
  return pickAlerts(raw.features ?? [], dates.filter((d) => d >= earliest))
}
