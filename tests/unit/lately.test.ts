import { describe, expect, it } from 'vitest'
import type { NaturalEvent } from '../../src/lib/eonet'
import { pickRecent } from '../../src/lib/lately'

const event = (id: string, category: string, points: [string, string | null][]): NaturalEvent => ({
  id,
  title: id,
  category,
  categoryTitle: category,
  sourceUrl: null,
  sourceName: null,
  closed: null,
  points: points.map(([day, magnitude]) => ({ time: Date.parse(`${day}T06:00:00Z`), lat: 0, lon: 0, magnitude })),
})

const DATES = ['2026-11-01', '2026-11-03', '2026-11-05', '2026-11-06']

describe('pickRecent', () => {
  it('opens a storm on the day it was strongest', () => {
    const storm = event('Typhoon A', 'severeStorms', [['2026-11-01', '50 kts'], ['2026-11-03', '110 kts'], ['2026-11-05', '80 kts']])
    expect(pickRecent([storm], DATES)).toEqual([{ id: 'Typhoon A', title: 'Typhoon A', category: 'severeStorms', date: '2026-11-03' }])
  })

  it('only counts days that have photographs', () => {
    // The peak fell on the 4th, which the archive does not have.
    const storm = event('Typhoon B', 'severeStorms', [['2026-11-03', '70 kts'], ['2026-11-04', '140 kts']])
    expect(pickRecent([storm], DATES)[0].date).toBe('2026-11-03')
    const unseen = event('Typhoon C', 'severeStorms', [['2026-11-04', '140 kts']])
    expect(pickRecent([unseen], DATES)).toEqual([])
  })

  it('leaves out storms below hurricane strength, and kinds with no measure of severity', () => {
    const weak = event('Tropical Storm D', 'severeStorms', [['2026-11-05', '50 kts']])
    const fire = event('Wildfire', 'wildfires', [['2026-11-05', '900 hectare']])
    const flood = event('Flood', 'floods', [['2026-11-05', null]])
    expect(pickRecent([weak, fire, flood], DATES)).toEqual([])
  })

  it('always includes a volcano, on its latest day with photographs', () => {
    const volcano = event('Volcano E', 'volcanoes', [['2026-11-01', null], ['2026-11-05', null]])
    expect(pickRecent([volcano], DATES)[0]).toMatchObject({ id: 'Volcano E', date: '2026-11-05' })
  })

  it('puts the newest first, the stronger first on the same day, and keeps to the limit', () => {
    const list = [
      event('old', 'severeStorms', [['2026-11-01', '100 kts']]),
      event('new-weaker', 'severeStorms', [['2026-11-06', '70 kts']]),
      event('new-stronger', 'severeStorms', [['2026-11-06', '120 kts']]),
      event('middle', 'severeStorms', [['2026-11-03', '90 kts']]),
    ]
    expect(pickRecent(list, DATES, 3).map((r) => r.id)).toEqual(['new-stronger', 'new-weaker', 'middle'])
  })
})
