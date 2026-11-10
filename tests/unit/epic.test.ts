import { afterEach, describe, expect, it, vi } from 'vitest'
import { SAMPLE_DATE, SAMPLE_FRAMES, diskRadius, fetchDates, fetchFrames, loadSampleFrames, project, type Frame } from '../../src/lib/epic'

const frame: Frame = {
  id: 'f',
  time: new Date('2026-11-07T02:29:00Z'),
  lat0: -8.75,
  lon0: 155.27,
  distanceKm: 1_474_945,
  url: '',
  thumb: '',
}

afterEach(() => vi.unstubAllGlobals())

describe('project', () => {
  it('puts the point beneath the spacecraft at the centre of the photo', () => {
    const p = project(frame, frame.lat0, frame.lon0)
    expect(p.x).toBeCloseTo(0.5, 6)
    expect(p.y).toBeCloseTo(0.5, 6)
    expect(p.visible).toBe(true)
    expect(p.facing).toBeCloseTo(1, 6)
  })

  it('keeps north up and east to the right', () => {
    expect(project(frame, frame.lat0 + 20, frame.lon0).y).toBeLessThan(0.5)
    expect(project(frame, frame.lat0 - 20, frame.lon0).y).toBeGreaterThan(0.5)
    expect(project(frame, frame.lat0, frame.lon0 + 20).x).toBeGreaterThan(0.5)
    expect(project(frame, frame.lat0, frame.lon0 - 20).x).toBeLessThan(0.5)
  })

  it('hides the far side of the planet', () => {
    const p = project(frame, -frame.lat0, frame.lon0 + 180)
    expect(p.visible).toBe(false)
    expect(p.facing).toBe(0)
  })

  it('places every visible point inside the disk', () => {
    const r = diskRadius(frame)
    for (let lat = -90; lat <= 90; lat += 15) {
      for (let lon = -180; lon < 180; lon += 15) {
        const p = project(frame, lat, lon)
        if (p.visible) expect(Math.hypot(p.x - 0.5, p.y - 0.5)).toBeLessThanOrEqual(r + 1e-9)
      }
    }
  })

  it('lands a point on the horizon exactly on the edge of the disk', () => {
    const d = frame.distanceKm / 6378.137
    const horizonDeg = (Math.acos(1 / d) * 180) / Math.PI
    // Along the meridian from the centre, so only latitude changes.
    const p = project({ ...frame, lat0: 0 }, horizonDeg - 1e-6, frame.lon0)
    expect(Math.hypot(p.x - 0.5, p.y - 0.5)).toBeCloseTo(diskRadius(frame), 5)
  })

  it('treats longitudes that wrap past 180° as the same place', () => {
    const a = project(frame, 10, 170)
    const b = project(frame, 10, -190)
    expect(a.x).toBeCloseTo(b.x, 9)
    expect(a.y).toBeCloseTo(b.y, 9)
  })
})

describe('diskRadius', () => {
  it('matches the size of Earth in a real photo', () => {
    // Measured from a published photo: the disk spans about 79% of the width.
    expect(diskRadius(frame)).toBeCloseTo(0.397, 2)
  })

  it('shrinks as the spacecraft moves away', () => {
    expect(diskRadius({ ...frame, distanceKm: 1_600_000 })).toBeLessThan(diskRadius(frame))
  })
})

describe('fetchFrames', () => {
  const raw = [
    {
      identifier: 'b',
      image: 'epic_1b_20250601031041',
      date: '2025-06-01 03:05:53',
      centroid_coordinates: { lat: 20.1, lon: 122.5 },
      dscovr_j2000_position: { x: 3, y: 4, z: 0 },
    },
    {
      identifier: 'a',
      image: 'epic_1b_20250601010436',
      date: '2025-06-01 00:59:48',
      centroid_coordinates: { lat: 20.0, lon: 154.1 },
      dscovr_j2000_position: { x: 707158.34, y: 1203024.04, z: 507747.26 },
    },
  ]

  it('parses a day into frames, oldest first, with archive addresses', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(raw)))
    vi.stubGlobal('fetch', fetchMock)
    const frames = await fetchFrames('2025-06-01')
    expect(fetchMock.mock.calls[0][0]).toBe('https://epic.gsfc.nasa.gov/api/natural/date/2025-06-01')
    expect(frames.map((f) => f.id)).toEqual(['a', 'b'])
    expect(frames[0].time.toISOString()).toBe('2025-06-01T00:59:48.000Z')
    expect(frames[0].lat0).toBe(20.0)
    expect(frames[0].lon0).toBe(154.1)
    expect(frames[0].distanceKm).toBeCloseTo(Math.hypot(707158.34, 1203024.04, 507747.26), 3)
    expect(frames[1].distanceKm).toBe(5)
    expect(frames[0].url).toBe('https://epic.gsfc.nasa.gov/archive/natural/2025/06/01/jpg/epic_1b_20250601010436.jpg')
    expect(frames[0].thumb).toBe('https://epic.gsfc.nasa.gov/archive/natural/2025/06/01/thumbs/epic_1b_20250601010436.jpg')
  })

  it('asks NASA only once for a day already fetched', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(raw)))
    vi.stubGlobal('fetch', fetchMock)
    await fetchFrames('2025-06-02')
    await fetchFrames('2025-06-02')
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('fails with the status when NASA answers with an error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('down', { status: 503 })))
    await expect(fetchFrames('2025-06-03')).rejects.toThrow('503')
  })
})

describe('fetchDates', () => {
  it('returns the dates oldest first', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([{ date: '2026-11-07' }, { date: '2015-06-13' }, { date: '2020-01-01' }]))))
    expect(await fetchDates()).toEqual(['2015-06-13', '2020-01-01', '2026-11-07'])
  })
})

describe('saved sample', () => {
  it('stands in for its day without asking NASA', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    loadSampleFrames()
    expect(await fetchFrames(SAMPLE_DATE)).toBe(SAMPLE_FRAMES)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(SAMPLE_FRAMES[0].url.startsWith('/sample/')).toBe(true)
  })
})
