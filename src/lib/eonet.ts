// EONET: NASA's Earth Observatory Natural Event Tracker.

const BASE = 'https://eonet.gsfc.nasa.gov/api/v3'

export interface EventPoint {
  time: number
  lat: number
  lon: number
  magnitude: string | null
}

export interface NaturalEvent {
  id: string
  title: string
  category: string
  categoryTitle: string
  sourceUrl: string | null
  /** Short name of the organisation that reported it, e.g. GDACS. */
  sourceName: string | null
  /** When the event ended, if it has. */
  closed: number | null
  /** Recorded positions, oldest first. Storms have many; fires usually one. */
  points: EventPoint[]
}

interface RawGeometry {
  date: string
  type: 'Point' | 'Polygon'
  coordinates: unknown
  magnitudeValue: number | null
  magnitudeUnit: string | null
}

interface RawEvent {
  id: string
  title: string
  closed: string | null
  categories: { id: string; title: string }[]
  sources: { id: string; url: string }[]
  geometry: RawGeometry[]
}

export const CATEGORY_STYLE: Record<string, { label: string; color: string }> = {
  wildfires: { label: 'Wildfires', color: '#ff8a3d' },
  severeStorms: { label: 'Severe storms', color: '#6fe3ff' },
  volcanoes: { label: 'Volcanoes', color: '#ff4d6d' },
  seaLakeIce: { label: 'Sea & lake ice', color: '#e8f4ff' },
  floods: { label: 'Floods', color: '#6f8cff' },
  dustHaze: { label: 'Dust & haze', color: '#e6c27a' },
  earthquakes: { label: 'Earthquakes', color: '#c78bff' },
  landslides: { label: 'Landslides', color: '#b98a5e' },
  drought: { label: 'Drought', color: '#ffd166' },
  snow: { label: 'Snow', color: '#ffffff' },
  tempExtremes: { label: 'Temperature extremes', color: '#ff6fb5' },
  waterColor: { label: 'Water colour', color: '#5fe0a8' },
  manmade: { label: 'Human-made', color: '#aab2bd' },
}

export function categoryStyle(id: string, fallbackLabel?: string) {
  return CATEGORY_STYLE[id] ?? { label: fallbackLabel ?? id, color: '#ffd166' }
}

function toPoint(g: RawGeometry): EventPoint | null {
  let lon: number
  let lat: number
  if (g.type === 'Point') {
    ;[lon, lat] = g.coordinates as [number, number]
  } else {
    // Polygon: use the middle of its outer ring.
    const ring = (g.coordinates as [number, number][][])[0]
    if (!ring?.length) return null
    lon = ring.reduce((s, c) => s + c[0], 0) / ring.length
    lat = ring.reduce((s, c) => s + c[1], 0) / ring.length
  }
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  return {
    time: Date.parse(g.date),
    lat,
    lon,
    magnitude: g.magnitudeValue != null ? `${g.magnitudeValue} ${g.magnitudeUnit ?? ''}`.trim() : null,
  }
}

const shiftDate = (date: string, days: number) => {
  const d = new Date(date + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

const cache = new Map<string, NaturalEvent[]>()

/** Events reported in the `days` days up to and including `date`. */
export async function fetchEvents(date: string, days = 7, signal?: AbortSignal): Promise<NaturalEvent[]> {
  const key = `${date}:${days}`
  const cached = cache.get(key)
  if (cached) return cached

  const url = `${BASE}/events?status=all&start=${shiftDate(date, -(days - 1))}&end=${date}`
  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  const raw = (await res.json()) as { events: RawEvent[] }

  const events = raw.events
    .map((e): NaturalEvent => {
      const cat = e.categories[0] ?? { id: 'other', title: 'Other' }
      return {
        id: e.id,
        title: e.title,
        category: cat.id,
        categoryTitle: cat.title,
        sourceUrl: e.sources[0]?.url ?? null,
        sourceName: e.sources[0]?.id ?? null,
        closed: e.closed ? Date.parse(e.closed) : null,
        points: e.geometry
          .map(toPoint)
          .filter((p): p is EventPoint => p !== null)
          .sort((a, b) => a.time - b.time),
      }
    })
    .filter((e) => e.points.length > 0)

  cache.set(key, events)
  return events
}

/** The event's most recent recorded position at the given moment. */
export function positionAt(event: NaturalEvent, time: number): EventPoint {
  let best = event.points[0]
  for (const p of event.points) {
    if (p.time <= time) best = p
    else break
  }
  return best
}
