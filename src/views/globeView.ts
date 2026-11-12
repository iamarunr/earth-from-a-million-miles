// The parts of the globe that need no React: its state between frames, where
// it is facing, drawing the event marks, and placing the panel beside one.

import { categoryStyle, type EventPoint, type NaturalEvent } from '../lib/eonet'
import { GLOBE_FILL, basis, dot, type Vec3 } from '../lib/globe'

export const MAX_ZOOM = 8
/** The distance, in CSS pixels, between a mark and the panel pinned beside it. */
const PANEL_GAP = 34

export interface Mark {
  event: NaturalEvent
  point: EventPoint
  /** The mark's position as a unit vector from the centre of the Earth. */
  v: Vec3
}
/** Nothing is marked until the globe itself is on screen. */
export const NO_MARKS: Mark[] = []

export const calm = () => matchMedia('(prefers-reduced-motion: reduce)').matches
export const clampLat = (lat: number) => Math.max(-89, Math.min(89, lat))
export const clampZoom = (z: number) => Math.max(1, Math.min(MAX_ZOOM, z))
export const wrapLon = (lon: number) => ((((lon + 180) % 360) + 360) % 360) - 180
/** NASA's image server sends no CORS headers, so WebGL needs the photos same-origin. */
export const viaProxy = (url: string) => url.replace('https://epic.gsfc.nasa.gov/archive', '/epic-archive')

export interface View {
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

export interface Hit {
  id: string
  x: number
  y: number
}

export interface Place {
  lat: number
  lon: number
}

/**
 * Where the globe is facing. It changes many times a second while the globe
 * turns, so it is kept out of React state: only the sentence that prints it
 * subscribes, and the rest of the page is not rendered again.
 */
export interface FacingStore {
  get(): Place
  subscribe(listener: () => void): () => void
}

export function createFacing(first: Place) {
  let value = first
  const listeners = new Set<() => void>()
  const tenths = (n: number) => Math.round(n * 10)
  return {
    get: () => value,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    set(next: Place) {
      // The page prints one decimal place, so smaller changes are not news.
      if (tenths(next.lat) === tenths(value.lat) && tenths(next.lon) === tenths(value.lon)) return
      value = next
      listeners.forEach((l) => l())
    },
  }
}

/** Draw the event marks for one view. Returns where each landed and where the chosen one is. */
export function drawMarks(
  ctx: CanvasRenderingContext2D,
  px: number,
  dpr: number,
  v: View,
  marks: Mark[],
  selectedId: string | null,
  ringProgress: (id: string) => number | null,
) {
  ctx.clearRect(0, 0, px, px)
  const b = basis(v.lat, v.lon)
  const lens = (px * GLOBE_FILL) / 2
  const R = lens * v.zoom
  const hits: Hit[] = []
  let selected: { x: number; y: number } | null = null
  for (const m of marks) {
    const depth = dot(m.v, b.c)
    if (depth < 0.04) continue
    const x = px / 2 + dot(m.v, b.e) * R
    const y = px / 2 - dot(m.v, b.n) * R
    if (Math.hypot(x - px / 2, y - px / 2) > lens - 3 * dpr) continue
    ctx.globalAlpha = Math.min(1, 0.4 + depth * 2)
    ctx.fillStyle = categoryStyle(m.event.category).color
    ctx.beginPath()
    ctx.arc(x, y, 3.6 * dpr, 0, Math.PI * 2)
    ctx.fill()
    hits.push({ id: m.event.id, x: x / dpr, y: y / dpr })
    if (m.event.id !== selectedId) continue
    // The circle is drawn once the globe has finished turning to the mark.
    const t = ringProgress(m.event.id)
    if (t === null) continue
    selected = { x: x / dpr, y: y / dpr }
    ctx.globalAlpha = 1
    ctx.strokeStyle = '#fff'
    ctx.lineWidth = 1.25 * dpr
    ctx.beginPath()
    ctx.arc(x, y, 13 * dpr, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - Math.pow(1 - t, 3)))
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  return { hits, selected }
}

/** Pin the event panel beside the chosen mark, kept within the globe's column. */
export function placePanel(panel: HTMLElement, face: HTMLElement, at: { x: number; y: number } | null, css: number) {
  const stage = face.parentElement!
  panel.toggleAttribute('data-off', !at)
  if (!at) return stage.removeAttribute('data-panel-low')
  const w = panel.offsetWidth
  const h = panel.offsetHeight
  const faceBox = face.getBoundingClientRect()
  const stageBox = stage.getBoundingClientRect()
  // The panel may reach into the gaps between columns, but not the columns themselves.
  const gap = window.innerWidth >= 1100 ? 36 : 0
  const minX = stageBox.left - gap - faceBox.left
  const maxX = stageBox.right + gap - faceBox.left - w
  const fitsLeft = at.x - PANEL_GAP - w >= minX
  const fitsRight = at.x + PANEL_GAP <= maxX
  let x: number
  let y: number
  if (fitsLeft || fitsRight) {
    // Prefer the side with room.
    x = (at.x > css * 0.5 && fitsLeft) || !fitsRight ? at.x - PANEL_GAP - w : at.x + PANEL_GAP
    y = Math.max(0, Math.min(css - h, at.y - h / 2))
  } else {
    // No room beside the mark: hang the panel below it (or above), never over it.
    x = Math.max(minX, Math.min(maxX, at.x - w / 2))
    const floor = stageBox.bottom - faceBox.top
    const ceiling = stageBox.top - faceBox.top
    if (at.y + PANEL_GAP + h <= floor) y = at.y + PANEL_GAP
    else if (at.y - PANEL_GAP - h >= ceiling) y = at.y - PANEL_GAP - h
    else y = Math.max(ceiling, floor - h)
  }
  panel.style.transform = `translate(${x}px, ${y}px)`
  // When the panel hangs below the globe, the note beneath gives way to it.
  stage.toggleAttribute('data-panel-low', y + h > css)
}
