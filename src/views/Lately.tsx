import { fmtShortDay } from '../lib/format'
import type { EarthDay } from '../useEarthDay'
import { kindColor } from './kind'

/** Recent events to start from, in one line across the top. Its place is kept while they are looked up. */
export function Lately({ s }: { s: EarthDay }) {
  return (
    <nav className="lately" aria-label="Recent events to look at">
      <span className="label">Lately</span>
      <ul>
        {s.lately?.map((r) => (
          <li key={r.id}>
            <button
              data-cat={r.category}
              style={kindColor(r.category)}
              onClick={() => s.pickDate(r.date, undefined, r.see ?? { eventId: r.id })}
            >
              <i />
              {/* The space is not drawn, but keeps the name and the date apart when read aloud. */}
              {r.title} <b>{fmtShortDay(r.date)}</b>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
