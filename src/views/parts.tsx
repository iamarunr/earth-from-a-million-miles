import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react'
import { FIRST_DATE, diskRadius } from '../lib/epic'
import { categoryStyle } from '../lib/eonet'
import { fmtCoord, fmtKm, fmtLongDate, fmtTime, type EarthDay } from '../useEarthDay'

const ICONS = {
  prev: 'M14.5 5.5 8 12l6.5 6.5',
  next: 'M9.5 5.5 16 12l-6.5 6.5',
  play: 'M8 5.5v13l11-6.5z',
  pause: 'M8 5.5v13M16 5.5v13',
  shuffle: 'M4 7h3.5c2 0 3.2 1 4.3 2.8l1.4 2.4C14.3 14 15.5 15 17.5 15H20M4 17h3.5c1.3 0 2.3-.5 3.1-1.4M20 9h-2.5c-1.3 0-2.3.5-3.1 1.4M17.5 6.5 20 9l-2.5 2.5M17.5 12.5 20 15l-2.5 2.5',
  grid: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM3.5 12h17M12 3.5c2.5 2.3 3.8 5.2 3.8 8.5s-1.3 6.2-3.8 8.5c-2.5-2.3-3.8-5.2-3.8-8.5s1.3-6.2 3.8-8.5z',
  link: 'M8 16 16 8M9.5 8H16v6.5',
  plus: 'M12 5.5v13M5.5 12h13',
  minus: 'M5.5 12h13',
  close: 'M6.5 6.5l11 11M17.5 6.5l-11 11',
  reset: 'M12 3.5a8.5 8.5 0 1 0 0 17 8.5 8.5 0 0 0 0-17zM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
}

export function Icon({ name }: { name: keyof typeof ICONS }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true" data-fill={name === 'play' ? '' : undefined}>
      <path d={ICONS[name]} />
    </svg>
  )
}

const cssVar = (color: string) => ({ '--c': color }) as CSSProperties

export function DateControls({ s }: { s: EarthDay }) {
  const last = s.dates?.[s.dates.length - 1]
  return (
    <div className="datebar">
      <button onClick={() => s.stepDay(-1)} disabled={s.dateIndex <= 0} aria-label="Previous day with photos">
        <Icon name="prev" />
      </button>
      <input
        type="date"
        aria-label="Choose a date"
        value={s.date ?? ''}
        min={FIRST_DATE}
        max={last}
        onChange={(e) => e.target.value && s.pickDate(e.target.value)}
      />
      <button
        onClick={() => s.stepDay(1)}
        disabled={!s.dates || s.dateIndex < 0 || s.dateIndex >= s.dates.length - 1}
        aria-label="Next day with photos"
      >
        <Icon name="next" />
      </button>
      <button className="random" onClick={s.randomDay} disabled={!s.dates}>
        <Icon name="shuffle" />
        <span>Random day</span>
      </button>
    </div>
  )
}

export function GridToggle({ s }: { s: EarthDay }) {
  return (
    <button className="gridtoggle" aria-pressed={s.showGrid} onClick={() => s.setShowGrid(!s.showGrid)}>
      <Icon name="grid" />
      <span>Lat/long grid</span>
    </button>
  )
}

export function readouts(s: EarthDay): [string, string][] {
  if (!s.frame) return []
  return [
    ['Taken', `${fmtTime(s.frame.time)} UTC`],
    ['Camera distance', fmtKm(s.frame.distanceKm)],
    ['Directly below', fmtCoord(s.frame.lat0, s.frame.lon0)],
    ['Photo', `${s.idx + 1} of ${s.frames.length}`],
  ]
}

export function Readouts({ s }: { s: EarthDay }) {
  return (
    <dl className="readouts">
      {readouts(s).map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  )
}

/** The photograph with the grid, event marks and the selected event's label. */
/** Drag sideways on the photo to step through the day, as if turning the planet. */
function useTurn(s: EarthDay, enabled?: boolean) {
  const drag = useRef<{ x: number; idx: number } | null>(null)
  const moved = useRef(false)
  if (!enabled) return {}
  return {
    onPointerDown: (e: PointerEvent<HTMLDivElement>) => {
      moved.current = false
      if (e.button === 0) drag.current = { x: e.clientX, idx: s.idx }
    },
    onPointerMove: (e: PointerEvent<HTMLDivElement>) => {
      const d = drag.current
      const n = s.frames.length
      if (!d || n < 2) return
      const dx = e.clientX - d.x
      if (!moved.current) {
        if (Math.abs(dx) < 8) return
        moved.current = true
        e.currentTarget.setPointerCapture(e.pointerId)
      }
      // One photo is about 27° of rotation, which moves the surface about this far.
      const step = e.currentTarget.clientWidth * 0.16
      const i = (((d.idx + Math.round(dx / step)) % n) + n) % n
      if (i !== s.idx) s.goTo(i)
    },
    onPointerUp: () => (drag.current = null),
    onPointerCancel: () => (drag.current = null),
    onClickCapture: (e: { stopPropagation(): void; preventDefault(): void }) => {
      if (!moved.current) return
      e.stopPropagation()
      e.preventDefault()
    },
  }
}

export function Planet({ s, ring, turn }: { s: EarthDay; ring?: ReactNode; turn?: boolean }) {
  const turnHandlers = useTurn(s, turn)
  const { frame } = s
  const shown = frame && s.loaded.has(frame.id)
  return (
    <div className={turn ? 'planet turn' : 'planet'} {...turnHandlers} style={frame ? ({ '--disk': diskRadius(frame) } as CSSProperties) : undefined}>
      {s.error ? (
        <p className="planet-msg">{s.error}</p>
      ) : !s.ready ? (
        <p className="planet-msg">Fetching the day’s photos…</p>
      ) : (
        <>
          <div className="frames">
            {s.frames.map((f, i) => (
              <img
                key={f.id}
                src={f.url}
                alt={i === s.idx ? `Earth at ${fmtTime(f.time)} UTC on ${fmtLongDate(s.date!)}` : ''}
                className={i === s.idx ? 'on' : undefined}
                onLoad={() => s.markLoaded(f.id)}
                draggable={false}
              />
            ))}
          </div>
          {!shown && <p className="planet-msg">Loading photo…</p>}
          <svg className="overlay" viewBox="0 0 1000 1000" aria-hidden="true">
            {s.grid && (
              <>
                <path d={s.grid.d} className="grid" />
                <path d={s.grid.equator} className="grid equator" />
              </>
            )}
            {s.track && <path d={s.track} className="track" />}
          </svg>
          {shown &&
            s.inView.map(({ event, pos }) => {
              const isSel = event.id === s.selectedId
              return (
                <button
                  key={event.id}
                  className={isSel ? 'marker selected' : 'marker'}
                  data-cat={event.category}
                  style={{
                    ...cssVar(categoryStyle(event.category).color),
                    left: `${pos.x * 100}%`,
                    top: `${pos.y * 100}%`,
                    opacity: isSel ? 1 : 0.5 + 0.5 * Math.min(1, pos.facing * 3),
                  }}
                  title={event.title}
                  aria-label={event.title}
                  aria-pressed={isSel}
                  onClick={() => s.setSelectedId(isSel ? null : event.id)}
                >
                  {isSel && ring}
                </button>
              )
            })}
          {s.selected?.pos.visible && (
            <div
              className={s.selected.pos.x > 0.58 ? 'callout left' : 'callout'}
              data-cat={s.selected.event.category}
              style={{ left: `${s.selected.pos.x * 100}%`, top: `${s.selected.pos.y * 100}%` }}
            >
              <strong>{s.selected.event.title}</strong>
              <span>
                {categoryStyle(s.selected.event.category, s.selected.event.categoryTitle).label} ·{' '}
                {fmtCoord(s.selected.point.lat, s.selected.point.lon)}
                {s.selected.point.magnitude ? ` · ${s.selected.point.magnitude}` : ''}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export function Strip({ s, label }: { s: EarthDay; label?: (i: number, time: string) => ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  // Keep the current frame in view by scrolling the strip itself, never the page.
  useEffect(() => {
    const strip = ref.current
    const on = strip?.querySelector<HTMLElement>('.thumb.on')
    if (!strip || !on || strip.scrollWidth <= strip.clientWidth) return
    const left = on.offsetLeft - strip.offsetLeft - (strip.clientWidth - on.clientWidth) / 2
    strip.scrollTo({ left, behavior: 'smooth' })
  }, [s.idx, s.frames])
  return (
    <div className="strip" ref={ref} role="group" aria-label="Photos from this day">
      {s.ready &&
        s.frames.map((f, i) => (
          <button
            key={f.id}
            className={i === s.idx ? 'thumb on' : 'thumb'}
            onClick={() => s.goTo(i)}
            // The spoken name starts with the words shown under the thumbnail.
            aria-label={`${label ? String(i + 1).padStart(2, '0') + ' ' : ''}${fmtTime(f.time)} UTC, photograph ${i + 1} of ${s.frames.length}`}
            aria-current={i === s.idx}
          >
            <img src={f.thumb} alt="" width="120" height="120" decoding="async" />
            <span>{label ? label(i, fmtTime(f.time)) : fmtTime(f.time)}</span>
          </button>
        ))}
    </div>
  )
}

export function Chips({ s }: { s: EarthDay }) {
  if (!s.categories.length) return null
  return (
    <div className="chips">
      {s.categories.map(([id, { title, count }]) => {
        const style = categoryStyle(id, title)
        const off = s.hidden.has(id)
        return (
          <button
            key={id}
            className="chip"
            data-cat={id}
            style={cssVar(style.color)}
            onClick={() => s.toggleCategory(id)}
            aria-pressed={!off}
          >
            <i />
            {style.label} <b>{count}</b>
          </button>
        )
      })}
    </div>
  )
}

export function EventList({ s }: { s: EarthDay }) {
  const rows = s.placed
    .slice()
    .sort((a, b) => Number(b.pos.visible) - Number(a.pos.visible) || b.pos.facing - a.pos.facing)
  // A long week is shown as its first rows, with the rest one press away.
  const CAP = 14
  const [expanded, setExpanded] = useState(false)
  const showAll = expanded || rows.findIndex((r) => r.event.id === s.selectedId) >= CAP
  const visible = showAll ? rows : rows.slice(0, CAP)
  const ref = useRef<HTMLUListElement>(null)
  // When an event is chosen on the globe, bring its row into view in the list
  // by scrolling the list itself, never the page.
  useEffect(() => {
    const list = ref.current
    const row = list?.querySelector<HTMLElement>('li.selected')
    if (!list || !row || list.scrollHeight <= list.clientHeight) return
    const top = row.offsetTop - list.offsetTop - (list.clientHeight - row.clientHeight) / 2
    list.scrollTo({ top, behavior: 'smooth' })
  }, [s.selectedId])
  return (
    <ul className="events" ref={ref}>
      {visible.map(({ event, pos }) => {
        const isSel = event.id === s.selectedId
        return (
          <li key={event.id} className={isSel ? 'selected' : pos.visible ? undefined : 'away'}>
            <button
              onClick={() => s.focusEvent(event)}
              aria-pressed={isSel}
              data-cat={event.category}
              style={cssVar(categoryStyle(event.category).color)}
            >
              <i />
              <span>{event.title}</span>
            </button>
            {isSel && event.sourceUrl && (
              <a href={event.sourceUrl} target="_blank" rel="noreferrer">
                Source report <Icon name="link" />
              </a>
            )}
          </li>
        )
      })}
      {!showAll && rows.length > CAP && (
        <li className="more">
          <button onClick={() => setExpanded(true)}>Show all {rows.length} events</button>
        </li>
      )}
    </ul>
  )
}

export const CREDIT = 'Imagery: NASA EPIC / NOAA DSCOVR. Events: NASA EONET.'
