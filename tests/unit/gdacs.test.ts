import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchAlerts, pickAlerts, type RawAlert } from '../../src/lib/gdacs'
import { withPicked } from '../../src/lib/lately'

const alert = (eventtype: string, eventid: number, name: string, alertlevel: string, from: string, to = from, at: [number, number] = [85.5, 27.8]): RawAlert => ({
  geometry: { type: 'Point', coordinates: at },
  properties: { eventtype, eventid, name, alertlevel, fromdate: `${from}T05:00:00`, todate: `${to}T05:00:00` },
})

const DATES = ['2026-08-25', '2026-08-26', '2026-08-28', '2026-08-30']

describe('pickAlerts', () => {
  it('opens a red-alert flood on its first day, at NASA’s mark for it', () => {
    const out = pickAlerts([alert('FL', 1104124, 'Flood in Nepal', 'Red', '2026-08-26', '2026-09-01')], DATES)
    expect(out).toEqual([
      { id: 'gdacs-FL-1104124', title: 'Flood in Nepal', category: 'floods', date: '2026-08-26', see: { eventTitleEnds: ' 1104124', lat: 27.8, lon: 85.5 } },
    ])
  })

  it('turns to where an earthquake struck, since NASA does not list earthquakes', () => {
    const [quake] = pickAlerts([alert('EQ', 7, 'Earthquake in Indonesia', 'Red', '2026-08-28', '2026-08-28', [120, -5])], DATES)
    expect(quake).toMatchObject({ category: 'earthquakes', date: '2026-08-28', see: { lat: -5, lon: 120 } })
    expect(quake.see).not.toHaveProperty('eventTitleEnds')
  })

  it('opens a fire on its last day with photographs', () => {
    const [fire] = pickAlerts([alert('WF', 9, 'Forest fires in France', 'Red', '2026-08-25', '2026-08-29')], DATES)
    expect(fire.date).toBe('2026-08-28')
  })

  it('ignores anything below red, cyclones, droughts, and days without photographs', () => {
    const out = pickAlerts(
      [
        alert('EQ', 1, 'Earthquake in Panama', 'Orange', '2026-08-26'),
        alert('TC', 2, 'Tropical Cyclone MURASU-26', 'Red', '2026-08-26'),
        alert('DR', 3, 'Drought in Brazil', 'Red', '2026-08-26'),
        alert('EQ', 4, 'Earthquake in Chile', 'Red', '2026-08-27'),
      ],
      DATES,
    )
    expect(out).toEqual([])
  })

  it('tidies names for a small label', () => {
    const out = pickAlerts(
      [alert('VO', 1, 'Eruption  Kanlaon', 'Red', '2026-08-26'), alert('FL', 2, 'Flood in Aruba, , Brazil, Colombia, Costa Rica, Panama', 'Red', '2026-08-26')],
      DATES,
    )
    expect(out.map((r) => r.title)).toEqual(['Eruption Kanlaon', 'Flood in Aruba'])
  })

  it('is not shown twice when the same event was also chosen by hand', () => {
    const alerts = pickAlerts([alert('FL', 1104124, 'Flood in Nepal', 'Red', '2026-08-26')], DATES)
    const day = { date: '2026-08-26', what: '', title: 'Nepal flood', category: 'floods', see: { eventId: 'EONET_23468' } }
    expect(withPicked(alerts, [day], DATES).map((r) => r.title)).toEqual(['Nepal flood'])
  })
})

describe('fetchAlerts', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('asks for red alerts in the period and reads the answer', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ features: [alert('EQ', 7, 'Earthquake in Indonesia', 'Red', '2026-08-28')] })))
    vi.stubGlobal('fetch', fetchMock)
    const out = await fetchAlerts('2026-08-30', 30, DATES)
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/alertlevel=red&fromDate=2026-08-01&toDate=2026-08-30$/)
    expect(out.map((r) => r.title)).toEqual(['Earthquake in Indonesia'])
  })

  it('treats an empty answer as no alerts, which is what GDACS sends on a quiet month', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(null, { status: 204 })))
    expect(await fetchAlerts('2026-08-30', 30, DATES)).toEqual([])
  })
})
