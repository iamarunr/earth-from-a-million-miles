import type { CSSProperties } from 'react'
import { categoryStyle } from '../lib/eonet'
import { fmtCoord } from '../lib/format'
import type { Mark } from './globeView'

/** Hand a kind of event's colour to the styles as --c: the dot in a list row, a chip or a panel. */
export const kindColor = (category: string) => ({ '--c': categoryStyle(category).color }) as CSSProperties

/** "Severe storms · 16.0°N 146.0°E": what an event is and where. */
export const eventKind = ({ event, point }: Pick<Mark, 'event' | 'point'>) =>
  `${categoryStyle(event.category, event.categoryTitle).label} · ${fmtCoord(point.lat, point.lon)}`
