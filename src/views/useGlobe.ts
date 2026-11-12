import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { positionAt } from '../lib/eonet'
import { GLOBE_FILL, basis, createGlobe, dot, type Globe } from '../lib/globe'
import type { EarthDay } from '../useEarthDay'
import {
  MAX_ZOOM, NO_MARKS, calm, clampLat, clampZoom, createFacing, drawMarks, placePanel, viaProxy, wrapLon,
  type Hit, type Mark, type Place, type View,
} from './globeView'

/** How long the globe takes to turn to a place, and how long a photograph stays up while the day plays. */
const FLY_MS = 900
const PLAY_STEP_MS = 2400

/**
 * The globe: one day's photographs on a sphere that can be spun, zoomed and
 * turned to a photograph or an event, by pointer, wheel or keyboard.
 */
export function useGlobe(s: EarthDay) {
  const faceRef = useRef<HTMLDivElement>(null)
  const glRef = useRef<HTMLCanvasElement>(null)
  const marksRef = useRef<HTMLCanvasElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const globe = useRef<Globe | null>(null)
  const view = useRef<View>({ lat: 8, lon: 20, vLat: 0, vLon: 0, zoom: 1, zoomTo: 1, dirty: true, drag: null, fly: null, pinch: null })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const hits = useRef<Hit[]>([])
  const [facing] = useState(() => createFacing({ lat: 8, lon: 20 }))

  const [spinning, setSpinning] = useState(() => !calm())
  /** Playing the day: stepping through the real photographs in order. */
  const [dayPlaying, setDayPlaying] = useState(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed' | 'unsupported'>('loading')
  const [progress, setProgress] = useState(0)
  /** The photographs the globe was last built from. */
  const [builtFor, setBuiltFor] = useState<EarthDay['frames'] | null>(null)
  /** The photograph taken from nearest to where the globe is facing. */
  const [near, setNear] = useState(0)
  const [zoom, setZoom] = useState(1)
  /** The real photograph shown over the reconstruction, when the view matches one exactly. */
  const [photo, setPhoto] = useState<{ idx: number; on: boolean }>({ idx: 0, on: false })
  const hidePhoto = () => setPhoto((p) => (p.on ? { ...p, on: false } : p))

  // Without WebGL2, or if the photos cannot be loaded into it, show the photographs themselves.
  const flat = status === 'failed' || status === 'unsupported'

  const dayEnd = s.date ? Date.parse(`${s.date}T23:59:59Z`) : 0
  const marks = useMemo<Mark[]>(() => {
    // Rarer kinds of event first, so a week of wildfires does not bury the storms.
    const rarity = new Map(s.categories.map(([id, c]) => [id, c.count]))
    return s.events
      .filter((e) => !s.hidden.has(e.category))
      .sort((a, b) => (rarity.get(a.category) ?? 0) - (rarity.get(b.category) ?? 0))
      .map((event) => {
        // Where the event was on the chosen day, not where it went afterwards.
        const point = positionAt(event, dayEnd)
        return { event, point, v: basis(point.lat, point.lon).c }
      })
  }, [s.events, s.hidden, s.categories, dayEnd])

  // The grid is drawn on the reconstruction, so leave the photograph when it is switched on.
  useEffect(() => {
    if (s.showGrid) setPhoto((p) => (p.on ? { ...p, on: false } : p))
  }, [s.showGrid])

  // The animation loop reads the latest values through this ref.
  const shown = status === 'ready' ? marks : NO_MARKS
  const live = useRef({ spinning, marks: shown, selectedId: s.selectedId, grid: s.showGrid, frames: s.frames })
  useEffect(() => {
    live.current = { spinning, marks: shown, selectedId: s.selectedId, grid: s.showGrid, frames: s.frames }
    view.current.dirty = true
  })

  useEffect(() => {
    try {
      globe.current = createGlobe(glRef.current!)
    } catch {
      globe.current = null
    }
    if (!globe.current) setStatus('unsupported')
    return () => globe.current?.dispose()
  }, [])

  // Put the day's photos on the globe.
  useEffect(() => {
    if (!s.ready || !globe.current) return
    let current = true
    setStatus('loading')
    setProgress(0)
    setPhoto({ idx: 0, on: false })
    Object.assign(view.current, { lat: s.frames[0].lat0, lon: s.frames[0].lon0, zoom: 1, zoomTo: 1, fly: null, dirty: true })
    const size = Math.min(window.innerWidth, window.innerHeight) < 700 ? 720 : 1080
    globe.current
      .setFrames(s.frames, (f) => viaProxy(f.url), size, (n) => current && setProgress(n))
      .then(() => {
        if (!current) return
        setBuiltFor(s.frames)
        setStatus('ready')
        view.current.dirty = true
      })
      .catch(() => current && setStatus('failed'))
    return () => {
      current = false
    }
  }, [s.ready, s.frames])

  // The globe's size on the page, and whether it is in sight, are watched
  // rather than measured on every frame. Nothing is drawn while it is scrolled away.
  const onScreen = useRef(true)
  const width = useRef(0)
  useEffect(() => {
    const face = faceRef.current
    if (!face) return
    width.current = face.clientWidth
    const ro = new ResizeObserver(() => {
      width.current = face.clientWidth
      view.current.dirty = true
    })
    ro.observe(face)
    const io = new IntersectionObserver(([entry]) => {
      onScreen.current = entry.isIntersecting
      if (entry.isIntersecting) view.current.dirty = true
    })
    io.observe(face)
    return () => {
      ro.disconnect()
      io.disconnect()
    }
  }, [])

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let lastUi = 0
    let uiStale = true
    let ringFor: string | null = null
    let ringT0 = 0

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      const v = view.current
      const dt = Math.min(50, now - last)
      last = now
      const face = faceRef.current
      const gl = glRef.current
      const overlay = marksRef.current
      if (!face || !gl || !overlay) return
      // Off screen, only a turn already under way is finished; the idle spin waits.
      if (!onScreen.current && !v.fly) return

      if (v.fly) {
        const t = Math.min(1, (now - v.fly.t0) / (calm() ? 1 : FLY_MS))
        const k = 1 - Math.pow(1 - t, 4)
        v.lat = v.fly.lat0 + v.fly.dLat * k
        v.lon = v.fly.lon0 + v.fly.dLon * k
        if (t >= 1) {
          const arrive = v.fly.arrive
          v.fly = null
          arrive?.()
        }
        v.dirty = true
      } else if (!v.drag) {
        if (Math.abs(v.vLon) > 0.003 || Math.abs(v.vLat) > 0.003) {
          v.lon += v.vLon * dt
          v.lat = clampLat(v.lat + v.vLat * dt)
          // Decay by elapsed time, so momentum lasts the same on any display.
          const decay = Math.pow(0.94, dt / 16.7)
          v.vLon *= decay
          v.vLat *= decay
          v.dirty = true
        } else if (live.current.spinning) {
          // The Earth turns eastward, so the view drifts west.
          v.lon -= 0.006 * dt
          v.dirty = true
        }
      }

      if (Math.abs(v.zoomTo - v.zoom) > 0.002) {
        v.zoom += (v.zoomTo - v.zoom) * Math.min(1, dt * 0.012)
        v.dirty = true
      }

      const css = width.current
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const px = Math.round(css * dpr)
      if (px && gl.width !== px) {
        gl.width = gl.height = overlay.width = overlay.height = px
        v.dirty = true
      }

      if (v.dirty && px) {
        v.dirty = false
        uiStale = true
        globe.current?.draw(v.lat, v.lon, live.current.grid, v.zoom)

        const { selectedId } = live.current
        if (!selectedId) ringFor = null
        const drawn = drawMarks(overlay.getContext('2d')!, px, dpr, v, live.current.marks, selectedId, (id) => {
          if (ringFor !== id) {
            ringFor = id
            ringT0 = 0
          }
          if (!ringT0 && !v.fly) ringT0 = now
          if (!ringT0) return null
          const t = calm() ? 1 : Math.min(1, (now - ringT0) / 520)
          if (t < 1) v.dirty = true
          return t
        })
        hits.current = drawn.hits
        if (panelRef.current) placePanel(panelRef.current, face, drawn.selected, css)
      }

      // The words about the view update a few times a second, not every frame.
      if (uiStale && now - lastUi > 140) {
        uiStale = false
        lastUi = now
        const c = basis(v.lat, v.lon).c
        let nearest = 0
        let best = -2
        live.current.frames.forEach((f, i) => {
          const d = dot(basis(f.lat0, f.lon0).c, c)
          if (d > best) {
            best = d
            nearest = i
          }
        })
        facing.set({ lat: v.lat, lon: wrapLon(v.lon) })
        setNear(nearest)
        setZoom(v.zoomTo)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [facing])

  const flyTo = (lat: number, lon: number, arrive?: () => void, zoomTo?: number, keepPlaying = false) => {
    const v = view.current
    setSpinning(false)
    if (!keepPlaying) setDayPlaying(false)
    hidePhoto()
    v.vLat = v.vLon = 0
    if (zoomTo) v.zoomTo = clampZoom(zoomTo)
    v.fly = { lat0: v.lat, lon0: v.lon, dLat: clampLat(lat) - v.lat, dLon: wrapLon(lon - v.lon), t0: performance.now(), arrive }
  }
  /** On a scrolling page, bring the globe back into view before it turns. */
  const revealGlobe = (roomBelow = 0) => {
    const box = faceRef.current?.getBoundingClientRect()
    if (box && (box.top < 0 || box.bottom + roomBelow > window.innerHeight)) {
      faceRef.current!.scrollIntoView({ block: 'start', behavior: calm() ? 'auto' : 'smooth' })
    }
  }
  /** Turn to the camera's exact viewpoint for a photo, then show the photograph itself. */
  const showFrame = (i: number, keepPlaying = false) => {
    const f = s.frames[i]
    if (!f) return
    if (!keepPlaying) revealGlobe()
    flyTo(f.lat0, f.lon0, () => setPhoto({ idx: i, on: true }), 1, keepPlaying)
  }
  /** Choose an event, from the globe or the list: the globe turns to it and its panel opens. */
  const chooseEvent = (id: string | null) => {
    const mark = id === s.selectedId ? undefined : marks.find((m) => m.event.id === id)
    s.setSelectedId(mark ? mark.event.id : null)
    if (!mark) return
    // Where the panel sits under the globe, leave room for it as well.
    revealGlobe(window.innerWidth < 1100 ? 340 : 0)
    flyTo(mark.point.lat, mark.point.lon)
  }

  // A day opened for something particular: once it is on the globe, turn to that.
  const aimed = useRef<{ aim: unknown; turned: boolean; found: boolean }>({ aim: null, turned: false, found: false })
  useEffect(() => {
    const aim = s.aim
    if (aimed.current.aim !== aim) aimed.current = { aim, turned: false, found: false }
    const a = aimed.current
    if (!aim || aim.date !== s.date || !s.ready || builtFor !== s.frames || status !== 'ready') return
    if (!a.turned) {
      a.turned = true
      if (aim.time) {
        const t = Date.parse(aim.time)
        let closest = 0
        s.frames.forEach((f, i) => {
          if (Math.abs(f.time.getTime() - t) < Math.abs(s.frames[closest].time.getTime() - t)) closest = i
        })
        flyTo(s.frames[closest].lat0, s.frames[closest].lon0, () => setPhoto({ idx: closest, on: true }), 1)
      } else if (aim.lat !== undefined && aim.lon !== undefined) {
        flyTo(aim.lat, aim.lon)
      }
    }
    // The events arrive separately, sometimes after the photographs.
    if ((aim.eventId || aim.eventTitleEnds) && !a.found && s.eventsState === 'ready') {
      a.found = true
      const mark = marks.find((m) => (aim.eventId ? m.event.id === aim.eventId : m.event.title.endsWith(aim.eventTitleEnds!)))
      if (mark) {
        s.setSelectedId(mark.event.id)
        flyTo(mark.point.lat, mark.point.lon)
      }
    }
  })

  const active = spinning || dayPlaying
  /** Pause whatever is moving, or play the day's photographs in order. */
  const togglePlay = () => {
    setSpinning(false)
    setDayPlaying(!active)
  }
  const zoomBy = (factor: number) => {
    const v = view.current
    v.zoomTo = clampZoom(v.zoomTo * factor)
    setSpinning(false)
    setDayPlaying(false)
    hidePhoto()
    v.dirty = true
  }

  /** The latitude and longitude under a point on screen, or null off the globe. */
  const pointAt = (clientX: number, clientY: number): Place | null => {
    const face = faceRef.current
    if (!face) return null
    const v = view.current
    const box = face.getBoundingClientRect()
    const R = ((box.width * GLOBE_FILL) / 2) * v.zoom
    const x = (clientX - box.left - box.width / 2) / R
    const y = -(clientY - box.top - box.height / 2) / R
    if (x * x + y * y >= 1) return null
    const z = Math.sqrt(1 - x * x - y * y)
    const b = basis(v.lat, v.lon)
    const P = [0, 1, 2].map((i) => z * b.c[i] + x * b.e[i] + y * b.n[i])
    return { lat: (Math.asin(P[2]) * 180) / Math.PI, lon: (Math.atan2(P[1], P[0]) * 180) / Math.PI }
  }
  /** Turn to a place by the shorter way round, magnifying as it goes. */
  const zoomInto = (p: Place, times: number) => {
    const v = view.current
    flyTo(p.lat, v.lon + wrapLon(p.lon - v.lon), undefined, v.zoomTo * times)
  }
  const pinchDist = () => {
    const [a, b] = [...pointers.current.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }
  /** The marks near a point on screen, nearest first. */
  const marksNear = (face: HTMLElement, clientX: number, clientY: number, within: number) => {
    const box = face.getBoundingClientRect()
    return hits.current
      .map((h) => ({ id: h.id, d: Math.hypot(h.x - (clientX - box.left), h.y - (clientY - box.top)) }))
      .filter((h) => h.d < within)
      .sort((a, b) => a.d - b.d)
  }

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || flat) return
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const v = view.current
    if (pointers.current.size === 2) {
      // Two fingers: pinch to zoom.
      Object.assign(v, { drag: null, pinch: { dist: pinchDist(), zoom: v.zoomTo } })
      setSpinning(false)
      setDayPlaying(false)
      hidePhoto()
      return
    }
    Object.assign(v, { drag: { x: e.clientX, y: e.clientY, t: performance.now(), moved: false }, fly: null, vLat: 0, vLon: 0 })
  }
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const v = view.current
    if (pointers.current.has(e.pointerId)) pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (v.pinch && pointers.current.size === 2) {
      v.zoom = v.zoomTo = clampZoom((v.pinch.zoom * pinchDist()) / Math.max(1, v.pinch.dist))
      v.dirty = true
      return
    }
    if (!v.drag) {
      // Show a pointing hand over a mark.
      if (e.pointerType === 'mouse' && !flat) {
        e.currentTarget.style.cursor = marksNear(e.currentTarget, e.clientX, e.clientY, 10).length ? 'pointer' : ''
      }
      return
    }
    const dx = e.clientX - v.drag.x
    const dy = e.clientY - v.drag.y
    if (!v.drag.moved) {
      if (Math.hypot(dx, dy) < 5) return
      v.drag.moved = true
      setSpinning(false)
      setDayPlaying(false)
      // Swiping the globe closes the event panel.
      s.setSelectedId(null)
      hidePhoto()
    }
    const now = performance.now()
    const dt = Math.max(1, now - v.drag.t)
    const degPerPx = 57.3 / (((e.currentTarget.clientWidth * GLOBE_FILL) / 2) * v.zoom)
    const dLon = (-dx * degPerPx) / Math.max(0.35, Math.cos((v.lat * Math.PI) / 180))
    const dLat = dy * degPerPx
    v.lon += dLon
    v.lat = clampLat(v.lat + dLat)
    v.vLon = dLon / dt
    v.vLat = dLat / dt
    Object.assign(v.drag, { x: e.clientX, y: e.clientY, t: now })
    v.dirty = true
  }
  const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
    const v = view.current
    pointers.current.delete(e.pointerId)
    if (v.pinch) {
      if (pointers.current.size < 2) v.pinch = null
      return
    }
    const drag = v.drag
    v.drag = null
    if (!drag) return
    if (performance.now() - drag.t > 90 || calm()) v.vLat = v.vLon = 0
    if (drag.moved) return

    // A tap. Several marks under it: zoom into the cluster so one can be chosen.
    const under = marksNear(e.currentTarget, e.clientX, e.clientY, 18)
    if (under.length > 2 && v.zoomTo < MAX_ZOOM - 0.5) {
      const p = pointAt(e.clientX, e.clientY)
      if (p) return zoomInto(p, 2.5)
    }
    chooseEvent(under[0]?.id ?? null)
  }
  const onPointerCancel = (e: PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId)
    Object.assign(view.current, { drag: null, pinch: null })
  }
  const onDoubleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (flat) return
    const p = pointAt(e.clientX, e.clientY)
    if (p) zoomInto(p, 2)
  }

  // The event panel closes on Escape or a press anywhere else. Presses on
  // the globe, the list and the zoom buttons are left to their own handlers.
  const { selectedId, setSelectedId } = s
  useEffect(() => {
    if (!selectedId) return
    const onDown = (e: Event) => {
      if (!(e.target as Element).closest?.('.slip, .face, .events, .zoom')) setSelectedId(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedId(null)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [selectedId, setSelectedId])

  // The wheel, keyboard and timer listeners are attached once and call the latest of these.
  const lastZoomWheel = useRef(0)
  const latest = useRef<{ step(): void; wheel(e: WheelEvent): void; key(e: KeyboardEvent): void }>({ step() {}, wheel() {}, key() {} })
  useEffect(() => {
    latest.current = {
      step: () => showFrame(((photo.on ? photo.idx : near) + 1) % s.frames.length, true),

      // Scrolling over the globe zooms it. The page keeps the scroll when the globe
      // is not fully in view, and when it is already zoomed all the way out and the
      // reader scrolls down, so the text below is never out of reach.
      wheel: (e) => {
        if (flat) return
        if (!e.ctrlKey) {
          const box = faceRef.current!.getBoundingClientRect()
          const inView = box.top >= -1 && box.bottom <= window.innerHeight + 1
          // A zoom-out that reaches the limit should not spill into a page scroll.
          const justZoomed = e.timeStamp - lastZoomWheel.current < 450
          const zoomedIn = view.current.zoomTo > 1.01
          const wantsIn = e.deltaY < 0 && window.scrollY <= 2
          if (!inView || !(zoomedIn || wantsIn || justZoomed)) return
        }
        e.preventDefault()
        lastZoomWheel.current = e.timeStamp
        zoomBy(Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0015)))
      },

      // Arrow keys turn the globe (or step photos without 3D); space starts and stops it.
      key: (e) => {
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
        if ((tag === 'BUTTON' || tag === 'A') && e.key === ' ') return
        // Once the reader has scrolled down to the text, keys belong to the page.
        if (window.scrollY > window.innerHeight * 0.6) return
        // Up and down scroll the page unless the globe itself has focus.
        if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && !flat && document.activeElement !== faceRef.current) {
          if (document.documentElement.scrollHeight > window.innerHeight + 1) return
        }
        const n = s.frames.length
        if (e.key === ' ') {
          e.preventDefault()
          if (flat) s.togglePlay()
          else togglePlay()
          return
        }
        if (!flat && (e.key === '+' || e.key === '=')) return zoomBy(1.6)
        if (!flat && (e.key === '-' || e.key === '_')) return zoomBy(1 / 1.6)
        const turn: Record<string, [number, number]> = {
          ArrowLeft: [0, -12],
          ArrowRight: [0, 12],
          ArrowUp: [10, 0],
          ArrowDown: [-10, 0],
        }
        const d = turn[e.key]
        if (!d) return
        e.preventDefault()
        const z = view.current.zoomTo
        if (!flat) flyTo(view.current.lat + d[0] / z, view.current.lon + d[1] / z)
        else if (n && d[1]) s.goTo((s.idx + Math.sign(d[1]) + n) % n)
      },
    }
  })
  useEffect(() => {
    const face = faceRef.current
    const onWheel = (e: WheelEvent) => latest.current.wheel(e)
    const onKey = (e: KeyboardEvent) => latest.current.key(e)
    face?.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('keydown', onKey)
    return () => {
      face?.removeEventListener('wheel', onWheel)
      window.removeEventListener('keydown', onKey)
    }
  }, [])
  useEffect(() => {
    if (!dayPlaying || status !== 'ready' || s.frames.length < 2) return
    latest.current.step()
    const t = setInterval(() => latest.current.step(), PLAY_STEP_MS)
    return () => clearInterval(t)
  }, [dayPlaying, status, s.frames.length])

  return {
    faceRef, glRef, marksRef, panelRef, facing,
    status, flat, progress, photo, near, zoom, marks,
    selected: marks.find((m) => m.event.id === s.selectedId) ?? null,
    /** Whether anything is moving by itself: the idle spin or the day being played. */
    active,
    togglePlay, zoomBy, showFrame, chooseEvent,
    faceHandlers: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onDoubleClick },
  }
}

export type GlobeState = ReturnType<typeof useGlobe>
