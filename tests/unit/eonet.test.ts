import { afterEach, describe, expect, it, vi } from 'vitest'
import { categoryStyle, fetchEvents, isSwappedFlood, positionAt, type NaturalEvent } from '../../src/lib/eonet'

afterEach(() => vi.unstubAllGlobals())

const raw = {
  events: [
    {
      id: 'EONET_1',
      title: 'Typhoon Example',
      closed: null,
      categories: [{ id: 'severeStorms', title: 'Severe Storms' }],
      sources: [{ id: 'JTWC', url: 'https://example.org/typhoon' }],
      geometry: [
        { date: '2026-11-06T00:00:00Z', type: 'Point', coordinates: [140, 16], magnitudeValue: 90, magnitudeUnit: 'kts' },
        { date: '2026-11-04T00:00:00Z', type: 'Point', coordinates: [150, 12], magnitudeValue: 45, magnitudeUnit: 'kts' },
        { date: '2026-11-05T00:00:00Z', type: 'Point', coordinates: [145, 14], magnitudeValue: null, magnitudeUnit: null },
      ],
    },
    {
      id: 'EONET_2',
      title: 'Iceberg Example',
      closed: '2026-11-06T00:00:00Z',
      categories: [{ id: 'seaLakeIce', title: 'Sea and Lake Ice' }],
      sources: [],
      geometry: [
        {
          date: '2026-11-02T00:00:00Z',
          type: 'Polygon',
          coordinates: [[[10, -70], [20, -70], [20, -60], [10, -60]]],
          magnitudeValue: 120,
          magnitudeUnit: 'NM^2',
        },
      ],
    },
    { id: 'EONET_3', title: 'Nowhere', closed: null, categories: [], sources: [], geometry: [] },
    {
      id: 'EONET_4',
      title: 'Broken',
      closed: null,
      categories: [{ id: 'wildfires', title: 'Wildfires' }],
      sources: [],
      geometry: [{ date: '2026-11-02T00:00:00Z', type: 'Polygon', coordinates: [[]], magnitudeValue: null, magnitudeUnit: null }],
    },
  ],
}

describe('fetchEvents', () => {
  it('asks for the week ending on the chosen day and parses what comes back', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(raw)))
    vi.stubGlobal('fetch', fetchMock)
    const events = await fetchEvents('2026-11-07', 7)

    expect(fetchMock.mock.calls[0][0]).toBe('https://eonet.gsfc.nasa.gov/api/v3/events?status=all&start=2026-11-01&end=2026-11-07')
    // Events with no usable position are left out.
    expect(events.map((e) => e.id)).toEqual(['EONET_1', 'EONET_2'])

    const storm = events[0]
    expect(storm.category).toBe('severeStorms')
    expect(storm.sourceUrl).toBe('https://example.org/typhoon')
    expect(storm.sourceName).toBe('JTWC')
    expect(storm.closed).toBeNull()
    // Positions are sorted oldest first.
    expect(storm.points.map((p) => p.lon)).toEqual([150, 145, 140])
    expect(storm.points[0].magnitude).toBe('45 kts')
    expect(storm.points[1].magnitude).toBeNull()

    const ice = events[1]
    expect(ice.sourceUrl).toBeNull()
    expect(ice.closed).toBe(Date.parse('2026-11-06T00:00:00Z'))
    // A polygon is placed at the middle of its outline.
    expect(ice.points[0].lat).toBeCloseTo(-65)
    expect(ice.points[0].lon).toBeCloseTo(15)
  })

  it('crosses a month boundary when counting back', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ events: [] })))
    vi.stubGlobal('fetch', fetchMock)
    await fetchEvents('2024-03-02', 7)
    expect(fetchMock.mock.calls[0][0]).toContain('start=2024-02-25&end=2024-03-02')
  })

  it('fails with the status when the service answers with an error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 500 })))
    await expect(fetchEvents('2020-01-01', 7)).rejects.toThrow('500')
  })
})

describe('positionAt', () => {
  const event = {
    points: [
      { time: 100, lat: 1, lon: 1, magnitude: null },
      { time: 200, lat: 2, lon: 2, magnitude: null },
      { time: 300, lat: 3, lon: 3, magnitude: null },
    ],
  } as NaturalEvent

  it('gives the latest position recorded up to that moment', () => {
    expect(positionAt(event, 250).lat).toBe(2)
    expect(positionAt(event, 200).lat).toBe(2)
    expect(positionAt(event, 9999).lat).toBe(3)
  })

  it('falls back to the first position for a moment before any report', () => {
    expect(positionAt(event, 50).lat).toBe(1)
  })
})

describe('categoryStyle', () => {
  it('knows the common categories', () => {
    expect(categoryStyle('wildfires').label).toBe('Wildfires')
  })
  it('still labels a category it has never seen', () => {
    expect(categoryStyle('meteors', 'Meteors')).toEqual({ label: 'Meteors', color: '#ffd166' })
  })
})

describe('floods NASA published with latitude and longitude swapped', () => {
  const flood = (title: string, ring: number[][]) => ({
    events: [
      {
        id: title,
        title,
        closed: null,
        categories: [{ id: 'floods', title: 'Floods' }],
        sources: [],
        geometry: [{ date: '2026-08-25T20:00:00Z', type: 'Polygon', coordinates: [ring], magnitudeValue: null, magnitudeUnit: null }],
      },
    ],
  })
  const place = async (date: string, title: string, ring: number[][]) => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(flood(title, ring)))))
    const [event] = await fetchEvents(date)
    return event.points[0]
  }

  it('knows which floods are affected', () => {
    expect(isSwappedFlood('Flood in Nepal 1104124')).toBe(true)
    expect(isSwappedFlood('Flood in India, Nepal 1104198')).toBe(true)
    expect(isSwappedFlood('Flood in Spain 1104199')).toBe(false)
    expect(isSwappedFlood('Flood in Costa Rica 1104003')).toBe(false)
    expect(isSwappedFlood('Typhoon Testa')).toBe(false)
  })

  it('puts the August 2026 flood in Nepal, not near the North Pole', async () => {
    const p = await place('2026-08-26', 'Flood in Nepal 1104124', [[27, 85], [28, 86]])
    expect(p.lat).toBeCloseTo(27.5)
    expect(p.lon).toBeCloseTo(85.5)
  })

  it('leaves later floods as they came', async () => {
    const p = await place('2026-10-11', 'Flood in Nepal 1104225', [[84, 28], [85, 28]])
    expect(p.lat).toBeCloseTo(28)
    expect(p.lon).toBeCloseTo(84.5)
  })

  it('leaves an affected flood alone once its outline is plainly the right way round', async () => {
    const p = await place('2026-08-27', 'Flood in Philippines 1104130', [[120.6, 15.1]])
    expect(p.lat).toBeCloseTo(15.1)
    expect(p.lon).toBeCloseTo(120.6)
  })
})
