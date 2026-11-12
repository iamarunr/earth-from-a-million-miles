import { fmtDay, fmtWhen } from '../lib/format'
import { eventKind } from './kind'
import { Icon } from './parts'
import type { Mark } from './globeView'

/** What the number reported with an event measures, judged from its unit. */
const magnitudeLabel = (magnitude: string) =>
  /kts|mph|km\/h/i.test(magnitude) ? 'Wind speed' : /hectare|acre|km²|NM\^2/i.test(magnitude) ? 'Area' : 'Magnitude'

/** Everything known about the chosen event, shown beside its mark. */
export function EventPanel({ mark, onClose }: { mark: Mark; onClose: () => void }) {
  const { event, point } = mark
  const facts: [string, string][] = [['Reported', fmtWhen(point.time)]]
  if (point.magnitude) facts.push([magnitudeLabel(point.magnitude), point.magnitude])
  if (event.points.length > 1) facts.push(['Tracked since', `${fmtDay(event.points[0].time)} · ${event.points.length} reports`])
  if (event.closed) facts.push(['Ended', fmtDay(event.closed)])
  return (
    <>
      <button className="slip-close" onClick={onClose} aria-label="Close">
        <Icon name="close" />
      </button>
      <strong>{event.title}</strong>
      <p className="slip-kind">
        <i />
        {eventKind(mark)}
      </p>
      <dl>
        {facts.map(([term, value]) => (
          <div key={term}>
            <dt>{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {event.sourceUrl && (
        <a href={event.sourceUrl} target="_blank" rel="noreferrer">
          Read the report{event.sourceName ? ` at ${event.sourceName}` : ''} <Icon name="link" />
        </a>
      )}
    </>
  )
}
