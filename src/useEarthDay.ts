import { useCallback, useEffect, useMemo, useState } from 'react'
import { FIRST_DATE, SAMPLE_DATE, fetchDates, fetchFrames, prefetchFrames, project, loadSampleFrames, type Frame } from './lib/epic'
import { DAYS, type See } from './days'
import { LATELY_CATEGORIES, LATELY_DAYS, newestFirst, pickRecent, withPicked, type Recent } from './lib/lately'
import { fetchAlerts } from './lib/gdacs'
import { fetchEvents, positionAt, type NaturalEvent } from './lib/eonet'
import { fmtLongDate } from './lib/format'

export const EVENT_WINDOW_DAYS = 7
const FRAME_MS = 260

/** Latest available date on or before the one asked for. */
export function snapToAvailable(dates: string[], wanted: string): string {
  let lo = 0
  let hi = dates.length - 1
  let found = dates[0]
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (dates[mid] <= wanted) {
      found = dates[mid]
      lo = mid + 1
    } else hi = mid - 1
  }
  return found
}

const pathThrough = (frame: Frame, pts: [number, number][]) => {
  let d = ''
  let pen = false
  for (const [lat, lon] of pts) {
    const p = project(frame, lat, lon)
    if (!p.visible) {
      pen = false
      continue
    }
    d += `${pen ? 'L' : 'M'}${(p.x * 1000).toFixed(1)} ${(p.y * 1000).toFixed(1)}`
    pen = true
  }
  return d
}

/** Latitude/longitude grid lines as SVG path data in a 0–1000 box. */
function graticule(frame: Frame) {
  const parallel = (lat: number) => {
    const pts: [number, number][] = []
    for (let lon = -180; lon <= 180; lon += 3) pts.push([lat, lon])
    return pathThrough(frame, pts)
  }
  let d = ''
  for (let lon = -180; lon < 180; lon += 30) {
    const pts: [number, number][] = []
    for (let lat = -90; lat <= 90; lat += 3) pts.push([lat, lon])
    d += pathThrough(frame, pts)
  }
  for (const lat of [-60, -30, 30, 60]) d += parallel(lat)
  return { d, equator: parallel(0) }
}

/** Something on a chosen day for the globe to turn to once the day has loaded. */
export type Aim = See & { date: string }

export function useEarthDay() {
  const [dates, setDates] = useState<string[] | null>(null)
  const [date, setDate] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [frames, setFrames] = useState<Frame[]>([])
  const [framesFor, setFramesFor] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [loaded, setLoaded] = useState<Set<string>>(new Set())
  const [events, setEvents] = useState<NaturalEvent[]>([])
  const [eventsState, setEventsState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showGrid, setShowGrid] = useState(false)
  const [aim, setAim] = useState<Aim | null>(null)
  /** Recent events worth opening; null while they are being looked up. */
  const [lately, setLately] = useState<Recent[] | null>(null)

  const pickDate = useCallback(
    (wanted: string, list = dates, target?: See) => {
      if (!list?.length) return
      const snapped = snapToAvailable(list, wanted)
      setNotice(
        snapped === wanted
          ? null
          : wanted < FIRST_DATE
            ? `The camera’s first photos are from ${fmtLongDate(list[0])}. Showing that day.`
            : `No photos were taken on ${fmtLongDate(wanted)}. Showing ${fmtLongDate(snapped)}.`,
      )
      setAim(target && snapped === wanted ? { ...target, date: snapped } : null)
      setDate(snapped)
    },
    [dates],
  )

  useEffect(() => {
    const ctrl = new AbortController()
    const wanted = new URLSearchParams(location.search).get('date')
    // A link to a particular day: ask for its photos at the same time as the list of days.
    if (wanted && /^\d{4}-\d{2}-\d{2}$/.test(wanted) && wanted >= FIRST_DATE) prefetchFrames(wanted)
    fetchDates(ctrl.signal)
      .then((list) => {
        setDates(list)
        // What to offer at the top: NASA's strongest storms, GDACS's red alerts, and the days chosen by hand.
        // Either service may fail; the row is made from whatever answered.
        const latest = list[list.length - 1]
        Promise.allSettled([
          fetchEvents(latest, LATELY_DAYS, ctrl.signal, LATELY_CATEGORIES).then((ev) => pickRecent(ev, list, 8)),
          fetchAlerts(latest, LATELY_DAYS, list, ctrl.signal),
        ]).then((got) => {
          if (ctrl.signal.aborted) return
          setLately(withPicked(newestFirst(...got.map((r) => (r.status === 'fulfilled' ? r.value : []))), DAYS, list))
        })
        pickDate(wanted && /^\d{4}-\d{2}-\d{2}$/.test(wanted) ? wanted : list[list.length - 1], list)
      })
      .catch((e) => {
        if (e.name === "AbortError") return
        // The archive is unreachable: fall back to the one saved photo.
        loadSampleFrames()
        setLately([])
        setDates([SAMPLE_DATE])
        setDate(SAMPLE_DATE)
        setNotice("NASA’s photo service is not responding right now, so this is one saved photo from 7 November 2026. Reload later for every day since 2015.")
      })
    return () => ctrl.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!date) return
    const ctrl = new AbortController()
    setError(null)
    setPlaying(false)
    setSelectedId(null)
    const params = new URLSearchParams(location.search)
    params.set('date', date)
    history.replaceState(null, '', `?${params}`)

    fetchFrames(date, ctrl.signal)
      .then((f) => {
        setFrames(f)
        setFramesFor(date)
        setIdx(0)
        setLoaded(new Set())
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setError(`The photos for ${fmtLongDate(date)} did not load. Try another day.`)
      })

    setEventsState('loading')
    fetchEvents(date, EVENT_WINDOW_DAYS, ctrl.signal)
      .then((ev) => {
        setEvents(ev)
        setEventsState('ready')
      })
      .catch((e) => {
        if (e.name === 'AbortError') return
        setEvents([])
        setEventsState('error')
      })
    return () => ctrl.abort()
  }, [date])

  const ready = framesFor === date && frames.length > 0
  const frame = ready ? frames[Math.min(idx, frames.length - 1)] : null

  useEffect(() => {
    if (!playing || frames.length < 2) return
    const t = setInterval(() => setIdx((i) => (i + 1) % frames.length), FRAME_MS)
    return () => clearInterval(t)
  }, [playing, frames.length])

  const dateIndex = dates && date ? dates.indexOf(date) : -1
  const stepDay = useCallback(
    (by: number) => {
      const next = dates?.[dateIndex + by]
      if (dateIndex >= 0 && next) {
        setNotice(null)
        setAim(null)
        setDate(next)
      }
    },
    [dates, dateIndex],
  )

  const categories = useMemo(() => {
    const counts = new Map<string, { title: string; count: number }>()
    for (const e of events) {
      const c = counts.get(e.category) ?? { title: e.categoryTitle, count: 0 }
      c.count++
      counts.set(e.category, c)
    }
    return [...counts.entries()].sort((a, b) => b[1].count - a[1].count)
  }, [events])

  const placed = useMemo(() => {
    if (!frame) return []
    const t = frame.time.getTime()
    return events
      .filter((e) => !hidden.has(e.category))
      .map((event) => {
        const point = positionAt(event, t)
        return { event, point, pos: project(frame, point.lat, point.lon) }
      })
  }, [events, hidden, frame])

  const inView = useMemo(() => placed.filter((p) => p.pos.visible), [placed])
  const selected = placed.find((p) => p.event.id === selectedId) ?? null
  const grid = useMemo(() => (frame && showGrid ? graticule(frame) : null), [frame, showGrid])
  const track = useMemo(() => {
    if (!frame || !selected || selected.event.points.length < 2) return null
    return pathThrough(
      frame,
      selected.event.points.map((p) => [p.lat, p.lon]),
    )
  }, [frame, selected])

  /** Select an event and turn the Earth to the photo that shows it best. */
  const focusEvent = (event: NaturalEvent) => {
    if (selectedId === event.id) return setSelectedId(null)
    setSelectedId(event.id)
    let best = idx
    let bestFacing = 0
    frames.forEach((f, i) => {
      const pt = positionAt(event, f.time.getTime())
      const facing = project(f, pt.lat, pt.lon).facing
      if (facing > bestFacing) {
        bestFacing = facing
        best = i
      }
    })
    if (bestFacing > 0) {
      setPlaying(false)
      setIdx(best)
    }
  }

  const toggleCategory = (id: string) =>
    setHidden((h) => {
      const next = new Set(h)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return {
    dates, date, dateIndex, notice, error, ready, frames, frame, idx, playing, loaded,
    events, eventsState, categories, hidden, placed, inView, selected, selectedId, showGrid, grid, track, aim, lately,
    pickDate, stepDay, focusEvent, toggleCategory, setSelectedId, setShowGrid,
    randomDay: () => {
      if (!dates) return
      setNotice(null)
      setAim(null)
      setDate(dates[Math.floor(Math.random() * dates.length)])
    },
    goTo: (i: number) => {
      setPlaying(false)
      setIdx(i)
    },
    togglePlay: () => setPlaying((p) => !p),
    markLoaded: (id: string) => setLoaded((s) => (s.has(id) ? s : new Set(s).add(id))),
    summary:
      eventsState === 'loading'
        ? 'Looking up natural events…'
        : eventsState === 'error'
          ? 'NASA’s event tracker did not respond, so no events are shown.'
          : events.length === 0
            ? 'No natural events were being tracked that week.'
            : `${events.length} natural events tracked in the ${EVENT_WINDOW_DAYS} days up to this one, ${inView.length} of them on the side of Earth in this photo.`,
  }
}

export type EarthDay = ReturnType<typeof useEarthDay>
