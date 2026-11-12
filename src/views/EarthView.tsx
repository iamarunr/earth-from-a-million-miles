import { useSyncExternalStore } from 'react'
import { diskRadius, type Frame } from '../lib/epic'
import type { NaturalEvent } from '../lib/eonet'
import { fmtCoord, fmtKm, fmtLongDate, fmtTime, pad } from '../lib/format'
import { GLOBE_FILL } from '../lib/globe'
import { EVENT_WINDOW_DAYS, type EarthDay } from '../useEarthDay'
import { EventPanel } from './EventPanel'
import { eventKind, kindColor } from './kind'
import { Lately } from './Lately'
import { CREDIT, Chips, DateControls, EventList, GridToggle, Icon, Planet, Readouts, Strip } from './parts'
import { MAX_ZOOM, viaProxy, type FacingStore } from './globeView'
import { useGlobe } from './useGlobe'
import './earth.css'

/** The thin circle drawn around the chosen event when 3D is not available. */
const Ring = (
  <svg className="ring" viewBox="0 0 60 60" aria-hidden="true">
    <circle cx="30" cy="30" r="20" transform="rotate(-90 30 30)" />
  </svg>
)

/** A photograph's width as a share of the globe's box, so its Earth is the same size as the globe. */
const photoWidth = (frame: Frame | null) => `${(GLOBE_FILL / 2 / (frame ? diskRadius(frame) : 0.397)) * 100}%`

/** Where the globe is facing and which photograph was taken from nearest there. */
function Caption({ facing, near, frame }: { facing: FacingStore; near: number; frame?: Frame }) {
  const at = useSyncExternalStore(facing.subscribe, facing.get)
  // Until the photographs arrive the sentence's place is kept, so nothing moves when it appears.
  if (!frame) {
    return (
      <p className="caption-space" aria-hidden="true">
        Facing 00.0°N 000.0°E. The nearest photograph is number 00, taken at 00:00 UTC from 1,500,000 km away.
      </p>
    )
  }
  return (
    <p className="caption">
      Facing <b>{fmtCoord(at.lat, at.lon)}</b>. The nearest photograph is <b>number {pad(near + 1)}</b>, taken at{' '}
      <b>{fmtTime(frame.time)} UTC</b> from <b>{fmtKm(frame.distanceKm)}</b> away.
    </p>
  )
}

/**
 * The whole screen: a globe built from one day's photographs that can be spun
 * freely, the day's photographs, and the natural events marked on the planet.
 */
export default function EarthView({ s }: { s: EarthDay }) {
  const g = useGlobe(s)
  const { flat, status, photo, selected } = g
  const count = s.frames.length
  const photoFrame = s.frames[photo.idx]
  const ready = status === 'ready'
  const close = () => s.setSelectedId(null)
  const stop = { onPointerDown: (e: { stopPropagation(): void }) => e.stopPropagation(), onDoubleClick: (e: { stopPropagation(): void }) => e.stopPropagation() }

  // The shared parts read the day through this: on the globe, "the current
  // photo" is the one nearest the view, and choosing things turns the globe.
  const parts: EarthDay = flat
    ? s
    : {
        ...s,
        idx: photo.on ? photo.idx : g.near,
        goTo: g.showFrame,
        placed: g.marks.map((m) => ({ event: m.event, point: m.point, pos: { x: 0, y: 0, visible: true, facing: 1 } })),
        focusEvent: (event: NaturalEvent) => g.chooseEvent(event.id),
      }

  const panel = selected && !flat && <EventPanel mark={selected} onClose={close} />
  // Present from the start, so the page does not move when the globe is ready for them.
  const zoomButtons = !flat && (
    <>
      <button onClick={() => g.zoomBy(1 / 1.8)} disabled={!ready || g.zoom <= 1} aria-label="Zoom out">
        <Icon name="minus" />
      </button>
      <button onClick={() => g.zoomBy(1.8)} disabled={!ready || g.zoom >= MAX_ZOOM} aria-label="Zoom in">
        <Icon name="plus" />
      </button>
    </>
  )
  const playing = flat ? s.playing : g.active
  const note = flat
    ? 'The 3D globe is not available here, so these are the day’s photographs. Drag sideways to turn the day.'
    : !ready
      ? ''
      : photo.on && photoFrame
        ? `Photograph ${pad(photo.idx + 1)}, taken at ${fmtTime(photoFrame.time)} UTC. This is exactly what the camera saw.`
        : `Reconstructed from the day’s ${count === 1 ? 'one photograph' : `${count} photographs`}. Choose one below to see exactly what the camera saw.`
  const loading = s.error ?? (s.ready ? `Building the globe: ${g.progress} of ${count} photos` : 'Fetching the day’s photos…')

  return (
    <div className={`earth${flat ? ' is-flat' : ''}${s.lately?.length === 0 ? '' : ' has-lately'}`} id="top">
      {s.lately?.length !== 0 && <Lately s={s} />}
      <header className="head">
        <h1 tabIndex={-1}>Earth, From a Million Miles</h1>
        <p className="lede">
          {flat
            ? 'Real photographs of the whole planet, taken from 1.5 million km away. Drag sideways to turn the day, then try a date that matters to you.'
            : 'A globe made only from the photographs taken on one day, from 1.5 million km away. Drag it to spin it any way you like, then try a date that matters to you.'}{' '}
          <a href="#about">About this project</a>
        </p>
        {/* Read aloud when the day changes, by whichever control changed it. */}
        <p className="date" aria-live="polite">
          {/* A space that keeps the line's height until the day is known. */}
          {s.date ? fmtLongDate(s.date) : '\u00a0'}
        </p>
        <DateControls s={s} />
        {s.notice && (
          <p className="notice" role="status">
            {s.notice}
          </p>
        )}
        {flat ? <Readouts s={s} /> : <Caption facing={g.facing} near={g.near} frame={s.frames[g.near]} />}
      </header>

      <div className="stage">
        <div
          className={ready || flat ? 'face ready' : 'face'}
          ref={g.faceRef}
          tabIndex={flat ? undefined : 0}
          role={flat ? undefined : 'application'}
          aria-label={flat ? undefined : 'Globe. Drag it, or use the arrow keys, to spin it.'}
          {...g.faceHandlers}
        >
          <canvas ref={g.glRef} />
          {!flat && photoFrame && ready && (
            <img
              className={photo.on ? 'photo on' : 'photo'}
              src={viaProxy(photoFrame.url)}
              alt={photo.on ? `Earth at ${fmtTime(photoFrame.time)} UTC on ${fmtLongDate(s.date!)}` : ''}
              style={{ width: photoWidth(photoFrame), ['--disk' as string]: diskRadius(photoFrame) }}
              draggable={false}
            />
          )}
          <canvas ref={g.marksRef} />
          {panel && (
            <div className="slip floating" ref={g.panelRef} data-off="" data-cat={selected.event.category} style={kindColor(selected.event.category)} {...stop}>
              {panel}
            </div>
          )}
          {zoomButtons && (
            <div className="zoom corner" {...stop}>
              {zoomButtons}
            </div>
          )}
          {flat && (
            <div className="flat" style={{ width: photoWidth(s.frame) }}>
              <Planet s={s} ring={Ring} turn />
            </div>
          )}
          {status === 'loading' && <p className="face-msg">{loading}</p>}
        </div>
        {zoomButtons && <div className="zoom row">{zoomButtons}</div>}
        {panel && (
          <div className="slip docked" data-cat={selected.event.category} style={kindColor(selected.event.category)}>
            {panel}
          </div>
        )}
        <p className="note" aria-live="polite">
          {note}
        </p>
        {/* The panel opens beside the mark without taking focus, so what was chosen is also said. */}
        <p className="sr-only" role="status">
          {selected && !flat ? `${selected.event.title}. ${eventKind(selected)}.` : ''}
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
            onClick={flat ? s.togglePlay : g.togglePlay}
            disabled={flat ? count < 2 : !ready}
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
        <Strip s={parts} numbered />
      </section>

      <aside className="events-col">
        <h2>Marked on the planet</h2>
        <p className="summary">
          {!flat && s.eventsState === 'ready' && s.events.length > 0
            ? `${s.events.length} natural events tracked in the ${EVENT_WINDOW_DAYS} days up to this one. Choose one and the globe turns to it.`
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
