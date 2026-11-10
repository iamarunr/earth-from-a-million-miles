import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { diskRadius } from '../lib/epic'
import { categoryStyle, positionAt, type NaturalEvent } from '../lib/eonet'
import { GLOBE_FILL, basis, createGlobe, dot, type Globe, type Vec3 } from '../lib/globe'
import { fmtCoord, fmtKm, fmtLongDate, fmtTime, type EarthDay } from '../useEarthDay'
import { CREDIT, Chips, DateControls, EventList, GridToggle, Icon, Planet, Readouts, Strip } from './parts'
import './earth.css'

/** One colour per kind of event. These are the only strong colours on the page. */
const MARK_COLOR: Record<string, string> = {
  wildfires: '#ff5b3a',
  severeStorms: '#ffffff',
  floods: '#ffd60a',
  seaLakeIce: '#7cc8ff',
  volcanoes: '#ff9a1f',
}
// Kinds without a colour of their own here use the same colour as their chip and list row.
const markColor = (category: string) => MARK_COLOR[category] ?? categoryStyle(category).color
/** The thin circle drawn around the chosen event when 3D is not available. */
const Ring = (
  <svg className="ring" viewBox="0 0 60 60" aria-hidden="true">
    <circle cx="30" cy="30" r="20" transform="rotate(-90 30 30)" />
  </svg>
)

/** Nothing is marked until the globe itself is on screen. */
const NO_MARKS: { event: NaturalEvent; point: NaturalEvent['points'][number]; v: Vec3 }[] = []
const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const pad = (n: number) => String(n).padStart(2, '0')
const clampLat = (lat: number) => Math.max(-89, Math.min(89, lat))
const MAX_ZOOM = 8
const clampZoom = (z: number) => Math.max(1, Math.min(MAX_ZOOM, z))
const fmtWhen = (t: number) =>
  `${new Date(t).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })} UTC`
const fmtDay = (t: number) =>
  new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const wrapLon = (lon: number) => ((((lon + 180) % 360) + 360) % 360) - 180
/** NASA's image server sends no CORS headers, so WebGL needs the photos same-origin. */
const viaProxy = (url: string) => url.replace('https://epic.gsfc.nasa.gov/archive', '/epic-archive')

interface View {
  lat: number
  lon: number
  vLat: number
  vLon: number
  /** Magnification inside the round lens: 1 shows the whole globe. */
  zoom: number
  zoomTo: number
  dirty: boolean
  drag: { x: number; y: number; t: number; moved: boolean } | null
  fly: { lat0: number; lon0: number; dLat: number; dLon: number; t0: number; arrive?: () => void } | null
  pinch: { dist: number; zoom: number } | null
}

/**
 * The whole screen: a globe built from one day's photographs that can be spun
 * freely, the day's photographs, and the natural events marked on the planet.
 */
export default function EarthView({ s }: { s: EarthDay }) {
  const faceRef = useRef<HTMLDivElement>(null)
  const glRef = useRef<HTMLCanvasElement>(null)
  const marksRef = useRef<HTMLCanvasElement>(null)
  const calloutRef = useRef<HTMLDivElement>(null)
  const globe = useRef<Globe | null>(null)
  const view = useRef<View>({ lat: 8, lon: 20, vLat: 0, vLon: 0, zoom: 1, zoomTo: 1, dirty: true, drag: null, fly: null, pinch: null })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const hits = useRef<{ id: string; x: number; y: number }[]>([])

  const [spinning, setSpinning] = useState(() => !calm())
  /** Playing the day: stepping through the real photographs in order. */
  const [dayPlaying, setDayPlaying] = useState(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'failed' | 'unsupported'>('loading')
  const [progress, setProgress] = useState(0)
  const [facing, setFacing] = useState({ lat: 8, lon: 20, near: 0, zoom: 1 })
  /** The real photograph shown over the reconstruction, when the view matches one exactly. */
  const [photo, setPhoto] = useState<{ idx: number; on: boolean }>({ idx: 0, on: false })
  const hidePhoto = () => setPhoto((p) => (p.on ? { ...p, on: false } : p))

  // Without WebGL2, or if the photos cannot be loaded into it, show the photographs themselves.
  const flat = status === 'failed' || status === 'unsupported'

  const dayEnd = s.date ? Date.parse(`${s.date}T23:59:59Z`) : 0
  const marks = useMemo(() => {
    // Rarer kinds of event first, so a week of wildfires does not bury the storms.
    const rarity = new Map(s.categories.map(([id, c]) => [id, c.count]))
    return s.events
      .filter((e) => !s.hidden.has(e.category))
      .sort((a, b) => (rarity.get(a.category) ?? 0) - (rarity.get(b.category) ?? 0))
      .map((event) => {
        // Where the event was on the chosen day, not where it went afterwards.
        const point = positionAt(event, dayEnd)
        return { event, point, v: basis(point.lat, point.lon).c as Vec3 }
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
        setStatus('ready')
        view.current.dirty = true
      })
      .catch(() => current && setStatus('failed'))
    return () => {
      current = false
    }
  }, [s.ready, s.frames])

  // Nothing is drawn while the globe is scrolled out of sight.
  const onScreen = useRef(true)
  useEffect(() => {
    const face = faceRef.current
    if (!face || !('IntersectionObserver' in window)) return
    const io = new IntersectionObserver(([entry]) => {
      onScreen.current = entry.isIntersecting
      if (entry.isIntersecting) view.current.dirty = true
    })
    io.observe(face)
    return () => io.disconnect()
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
        const t = Math.min(1, (now - v.fly.t0) / (calm() ? 1 : 900))
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

      const css = face.clientWidth
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

        // Event marks on the surface.
        const ctx = overlay.getContext('2d')!
        ctx.clearRect(0, 0, px, px)
        const b = basis(v.lat, v.lon)
        const lens = (px * GLOBE_FILL) / 2
        const R = lens * v.zoom
        const found: typeof hits.current = []
        let sel: { x: number; y: number } | null = null
        for (const m of live.current.marks) {
          const depth = dot(m.v, b.c)
          if (depth < 0.04) continue
          const x = px / 2 + dot(m.v, b.e) * R
          const y = px / 2 - dot(m.v, b.n) * R
          if (Math.hypot(x - px / 2, y - px / 2) > lens - 3 * dpr) continue
          const color = markColor(m.event.category)
          ctx.globalAlpha = Math.min(1, 0.4 + depth * 2)
          ctx.fillStyle = color
          ctx.beginPath()
          ctx.arc(x, y, 3.6 * dpr, 0, Math.PI * 2)
          ctx.fill()
          found.push({ id: m.event.id, x: x / dpr, y: y / dpr })
          if (m.event.id === live.current.selectedId) {
            if (ringFor !== m.event.id) {
              ringFor = m.event.id
              ringT0 = 0
            }
            // The circle is drawn once the globe has finished turning to the mark.
            if (!ringT0 && !v.fly) ringT0 = now
            if (!ringT0) continue
            const t = calm() ? 1 : Math.min(1, (now - ringT0) / 520)
            if (t < 1) v.dirty = true
            sel = { x: x / dpr, y: y / dpr }
            ctx.globalAlpha = 1
            ctx.strokeStyle = '#fff'
            ctx.lineWidth = 1.25 * dpr
            ctx.beginPath()
            ctx.arc(x, y, 13 * dpr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - Math.pow(1 - t, 3)))
            ctx.stroke()
          }
        }
        if (!live.current.selectedId) ringFor = null
        ctx.globalAlpha = 1
        hits.current = found

        const callout = calloutRef.current
        if (callout) {
          // Pin the event panel beside the mark, kept within the globe's height.
          callout.toggleAttribute('data-off', !sel)
          if (!sel) face.parentElement!.removeAttribute('data-panel-low')
          if (sel) {
            const w = callout.offsetWidth
            const h = callout.offsetHeight
            // Prefer the side with room; never leave the stage column.
            const faceBox = face.getBoundingClientRect()
            const stageBox = face.parentElement!.getBoundingClientRect()
            // The panel may reach into the gaps between columns, but not the columns themselves.
            const gap = window.innerWidth >= 1100 ? 36 : 0
            const minX = stageBox.left - gap - faceBox.left
            const maxX = stageBox.right + gap - faceBox.left - w
            const fitsLeft = sel.x - 34 - w >= minX
            const fitsRight = sel.x + 34 <= maxX
            let x: number
            let y: number
            if (fitsLeft || fitsRight) {
              x = (sel.x > css * 0.5 && fitsLeft) || !fitsRight ? sel.x - 34 - w : sel.x + 34
              y = Math.max(0, Math.min(css - h, sel.y - h / 2))
            } else {
              // No room beside the mark: hang the slip below it (or above), never over it.
              x = Math.max(minX, Math.min(maxX, sel.x - w / 2))
              const floor = stageBox.bottom - faceBox.top
              const ceiling = stageBox.top - faceBox.top
              if (sel.y + 34 + h <= floor) y = sel.y + 34
              else if (sel.y - 34 - h >= ceiling) y = sel.y - 34 - h
              else y = Math.max(ceiling, floor - h)
            }
            callout.style.transform = `translate(${x}px, ${y}px)`
            // When the panel hangs below the globe, the note beneath gives way to it.
            face.parentElement!.toggleAttribute('data-panel-low', y + h > css)
          }
        }
      }

      // Readouts update a few times a second, not every frame.
      if (uiStale && now - lastUi > 140) {
        uiStale = false
        lastUi = now
        const c = basis(v.lat, v.lon).c
        let near = 0
        let best = -2
        live.current.frames.forEach((f, i) => {
          const d = dot(basis(f.lat0, f.lon0).c, c)
          if (d > best) {
            best = d
            near = i
          }
        })
        setFacing({ lat: v.lat, lon: wrapLon(v.lon), near, zoom: v.zoomTo })
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const flyTo = (lat: number, lon: number, arrive?: () => void, zoom?: number, keepPlaying = false) => {
    const v = view.current
    setSpinning(false)
    if (!keepPlaying) setDayPlaying(false)
    hidePhoto()
    v.vLat = v.vLon = 0
    if (zoom) v.zoomTo = clampZoom(zoom)
    v.fly = { lat0: v.lat, lon0: v.lon, dLat: clampLat(lat) - v.lat, dLon: wrapLon(lon - v.lon), t0: performance.now(), arrive }
  }
  /** Turn to the camera's exact viewpoint for a photo, then show the photograph itself. */
  /** On a scrolling page, bring the globe back into view before it turns. */
  const revealGlobe = (roomBelow = 0) => {
    const box = faceRef.current?.getBoundingClientRect()
    if (box && (box.top < 0 || box.bottom + roomBelow > window.innerHeight)) {
      faceRef.current!.scrollIntoView({ block: 'start', behavior: calm() ? 'auto' : 'smooth' })
    }
  }
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
  const active = spinning || dayPlaying
  /** Pause whatever is moving, or play the day's photographs in order. */
  const togglePlay = () => {
    setSpinning(false)
    setDayPlaying(!active)
  }
  const step = useRef(() => {})
  useEffect(() => {
    step.current = () => showFrame(((photo.on ? photo.idx : facing.near) + 1) % s.frames.length, true)
  })
  useEffect(() => {
    if (!dayPlaying || status !== 'ready' || s.frames.length < 2) return
    step.current()
    const t = setInterval(() => step.current(), 2400)
    return () => clearInterval(t)
  }, [dayPlaying, status, s.frames.length])

  const zoomBy = (factor: number) => {
    const v = view.current
    v.zoomTo = clampZoom(v.zoomTo * factor)
    setSpinning(false)
    setDayPlaying(false)
    hidePhoto()
    v.dirty = true
  }
  /** The latitude and longitude under a point on screen, or null off the globe. */
  const pointAt = (clientX: number, clientY: number) => {
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
  const pinchDist = () => {
    const [a, b] = [...pointers.current.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
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
        const box = e.currentTarget.getBoundingClientRect()
        const over = hits.current.some((h) => Math.hypot(h.x - (e.clientX - box.left), h.y - (e.clientY - box.top)) < 10)
        e.currentTarget.style.cursor = over ? 'pointer' : ''
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

    // A tap. Find the marks under it.
    const box = e.currentTarget.getBoundingClientRect()
    const near = hits.current
      .map((h) => ({ id: h.id, d: Math.hypot(h.x - (e.clientX - box.left), h.y - (e.clientY - box.top)) }))
      .filter((h) => h.d < 18)
      .sort((a, b) => a.d - b.d)
    // Several marks under one tap: zoom into the cluster so one can be chosen.
    if (near.length > 2 && v.zoomTo < MAX_ZOOM - 0.5) {
      const p = pointAt(e.clientX, e.clientY)
      if (p) return flyTo(p.lat, v.lon + wrapLon(p.lon - v.lon), undefined, v.zoomTo * 2.5)
    }
    chooseEvent(near[0]?.id ?? null)
  }
  const onDoubleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (flat) return
    const p = pointAt(e.clientX, e.clientY)
    const v = view.current
    if (p) flyTo(p.lat, v.lon + wrapLon(p.lon - v.lon), undefined, v.zoomTo * 2)
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

  // Scrolling over the globe zooms it. The page keeps the scroll when the globe
  // is not fully in view, and when it is already zoomed all the way out and the
  // reader scrolls down, so the text below is never out of reach.
  const lastZoomWheel = useRef(0)
  useEffect(() => {
    const face = faceRef.current
    if (!face) return
    const onWheel = (e: WheelEvent) => {
      if (flat) return
      if (!e.ctrlKey) {
        const box = face.getBoundingClientRect()
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
    }
    face.addEventListener('wheel', onWheel, { passive: false })
    return () => face.removeEventListener('wheel', onWheel)
  })

  // Arrow keys turn the globe (or step photos without 3D); space starts and stops it.
  const keys = useRef<(e: KeyboardEvent) => void>(() => {})
  useEffect(() => {
    keys.current = (e) => {
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
    }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keys.current(e)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const selected = marks.find((m) => m.event.id === s.selectedId) ?? null
  const nearFrame = s.frames[facing.near]
  const photoFrame = s.frames[photo.idx]
  const count = s.frames.length

  // The shared parts read the day through this: on the globe, "the current
  // photo" is the one nearest the view, and choosing things turns the globe.
  const parts: EarthDay = flat
    ? s
    : {
        ...s,
        idx: photo.on ? photo.idx : facing.near,
        goTo: showFrame,
        placed: marks.map((m) => ({ event: m.event, point: m.point, pos: { x: 0, y: 0, visible: true, facing: 1 } })),
        focusEvent: (event: NaturalEvent) => chooseEvent(event.id),
      }

  // Everything known about the chosen event, shown beside its mark.
  const slip = selected && !flat && (
    <>
      <button className="slip-close" onClick={() => s.setSelectedId(null)} aria-label="Close">
        <Icon name="close" />
      </button>
      <strong>{selected.event.title}</strong>
      <p className="slip-kind">
        <i />
        {categoryStyle(selected.event.category, selected.event.categoryTitle).label} ·{' '}
        {fmtCoord(selected.point.lat, selected.point.lon)}
      </p>
      <dl>
        <div>
          <dt>Reported</dt>
          <dd>{fmtWhen(selected.point.time)}</dd>
        </div>
        {selected.point.magnitude && (
          <div>
            <dt>{/kts|mph|km\/h/i.test(selected.point.magnitude) ? 'Wind speed' : /hectare|acre|km²|NM\^2/i.test(selected.point.magnitude) ? 'Area' : 'Magnitude'}</dt>
            <dd>{selected.point.magnitude}</dd>
          </div>
        )}
        {selected.event.points.length > 1 && (
          <div>
            <dt>Tracked since</dt>
            <dd>
              {fmtDay(selected.event.points[0].time)} · {selected.event.points.length} reports
            </dd>
          </div>
        )}
        {selected.event.closed && (
          <div>
            <dt>Ended</dt>
            <dd>{fmtDay(selected.event.closed)}</dd>
          </div>
        )}
      </dl>
      {selected.event.sourceUrl && (
        <a href={selected.event.sourceUrl} target="_blank" rel="noreferrer">
          Read the report{selected.event.sourceName ? ` at ${selected.event.sourceName}` : ''} <Icon name="link" />
        </a>
      )}
    </>
  )

  const zoomButtons = !flat && status === 'ready' && (
    <>
      <button onClick={() => zoomBy(1 / 1.8)} disabled={facing.zoom <= 1} aria-label="Zoom out">
        <Icon name="minus" />
      </button>
      <button onClick={() => zoomBy(1.8)} disabled={facing.zoom >= MAX_ZOOM} aria-label="Zoom in">
        <Icon name="plus" />
      </button>
    </>
  )
  const playing = flat ? s.playing : active
  const note = flat
    ? 'The 3D globe is not available here, so these are the day’s photographs. Drag sideways to turn the day.'
    : photo.on && photoFrame
      ? `Photograph ${pad(photo.idx + 1)}, taken at ${fmtTime(photoFrame.time)} UTC. This is exactly what the camera saw.`
      : `Reconstructed from the day’s ${count === 1 ? 'one photograph' : `${count} photographs`}. Choose one below to see exactly what the camera saw.`

  return (
    <div className={flat ? 'earth is-flat' : 'earth'} id="top">
      <header className="head">
        <h1>Earth, From a Million Miles</h1>
        <p className="lede">
          {flat
            ? 'Real photographs of the whole planet, taken from 1.5 million km away. Drag sideways to turn the day, then try a date that matters to you.'
            : 'A globe made only from the photographs taken on one day, from 1.5 million km away. Drag it to spin it any way you like, then try a date that matters to you.'}{' '}
          <a href="#about">About this project</a>
        </p>
        <p className="date">{s.date ? fmtLongDate(s.date) : ' '}</p>
        <DateControls s={s} />
        {s.notice && <p className="notice">{s.notice}</p>}
        {flat ? (
          <Readouts s={s} />
        ) : (
          nearFrame && (
            <p className="caption">
              Facing <b>{fmtCoord(facing.lat, facing.lon)}</b>. The nearest photograph is{' '}
              <b>number {pad(facing.near + 1)}</b>, taken at <b>{fmtTime(nearFrame.time)} UTC</b> from{' '}
              <b>{fmtKm(nearFrame.distanceKm)}</b> away.
            </p>
          )
        )}
      </header>

      <div className="stage">
        <div
          className={status === 'ready' || flat ? 'face ready' : 'face'}
          ref={faceRef}
          tabIndex={flat ? undefined : 0}
          role={flat ? undefined : 'application'}
          aria-label={flat ? undefined : 'Globe. Drag it, or use the arrow keys, to spin it.'}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={(e) => {
            pointers.current.delete(e.pointerId)
            Object.assign(view.current, { drag: null, pinch: null })
          }}
          onDoubleClick={onDoubleClick}
        >
          <canvas ref={glRef} />
          {!flat && photoFrame && status === 'ready' && (
            <img
              className={photo.on ? 'photo on' : 'photo'}
              src={viaProxy(photoFrame.url)}
              alt={photo.on ? `Earth at ${fmtTime(photoFrame.time)} UTC on ${fmtLongDate(s.date!)}` : ''}
              style={{ width: `${(GLOBE_FILL / 2 / diskRadius(photoFrame)) * 100}%`, ['--disk' as string]: diskRadius(photoFrame) }}
              draggable={false}
            />
          )}
          <canvas ref={marksRef} />
          {slip && (
            <div
              className="slip floating"
              ref={calloutRef}
              data-off=""
              data-cat={selected!.event.category}
              onPointerDown={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
            >
              {slip}
            </div>
          )}
          {zoomButtons && (
            <div className="zoom corner" onPointerDown={(e) => e.stopPropagation()} onDoubleClick={(e) => e.stopPropagation()}>
              {zoomButtons}
            </div>
          )}
          {flat && (
            <div className="flat" style={{ width: `${(GLOBE_FILL / 2 / (s.frame ? diskRadius(s.frame) : 0.397)) * 100}%` }}>
              <Planet s={s} ring={Ring} turn />
            </div>
          )}
          {status === 'loading' && (
            <p className="face-msg">
              {s.error ?? (s.ready ? `Building the globe: ${progress} of ${count} photos` : 'Fetching the day’s photos…')}
            </p>
          )}
        </div>
        {zoomButtons && <div className="zoom row">{zoomButtons}</div>}
        {slip && !flat && (
          <div className="slip docked" data-cat={selected!.event.category}>
            {slip}
          </div>
        )}
        <p className="note" aria-live="polite">
          {note}
        </p>
      </div>

      <section className="roll" aria-label="The day’s photos">
        {/* Sits on the line at the foot of the first screen: there is more below. */}
        <a className="cue" href="#about" aria-label="Scroll down to read about this project">
          <span>Scroll</span>
          <svg className="cue-mouse" viewBox="0 0 14 22" aria-hidden="true">
            <rect x="0.75" y="0.75" width="12.5" height="20.5" rx="6.25" />
            <path className="cue-wheel" d="M7 5.5v3.5" />
          </svg>
          <svg className="cue-arrow" viewBox="0 0 14 22" aria-hidden="true">
            <path d="M7 3.5v15M2 13.5l5 5 5-5" />
          </svg>
        </a>
        <div className="rollbar">
          <button
            className="play"
            onClick={flat ? s.togglePlay : togglePlay}
            disabled={flat ? count < 2 : status !== 'ready'}
            aria-label={playing ? 'Pause' : 'Play the day'}
          >
            <Icon name={playing ? 'pause' : 'play'} />
          </button>
          <span className="edge">
            {count > 1
              ? `Taken ${fmtTime(s.frames[0].time)} to ${fmtTime(s.frames[count - 1].time)} UTC`
              : s.frames[0]
                ? `Taken ${fmtTime(s.frames[0].time)} UTC`
                : ''}
          </span>
          <GridToggle s={s} />
        </div>
        <Strip
          s={parts}
          label={(i, t) => (
            <>
              <b>{pad(i + 1)}</b> {t}
            </>
          )}
        />
      </section>

      <aside className="events-col">
        <h2>Marked on the planet</h2>
        <p className="summary">
          {!flat && s.eventsState === 'ready' && s.events.length > 0
            ? `${s.events.length} natural events tracked in the 7 days up to this one. Choose one and the globe turns to it.`
            : s.summary}
        </p>
        <Chips s={s} />
        <EventList s={parts} />
        <p className="credit">
          {CREDIT}{' '}
          {flat
            ? 'Arrow keys step through the photographs; space plays the day.'
            : 'Arrow keys turn the globe, + and − zoom, space plays the day.'}
        </p>
      </aside>
    </div>
  )
}
