// EPIC: the Earth Polychromatic Imaging Camera on DSCOVR, parked at the
// Sun–Earth L1 point about 1.5 million km away. It photographs the whole
// sunlit disk of Earth roughly every 1–2 hours.

const BASE = 'https://epic.gsfc.nasa.gov'
const EARTH_RADIUS_KM = 6378.137
// Half of the camera's field of view. Measured from the published images
// (disk radius vs. spacecraft distance); matches the instrument's 0.62° spec.
const HALF_FOV_RAD = (0.3122 * Math.PI) / 180

export const FIRST_DATE = '2015-06-13'

export interface Frame {
  id: string
  time: Date
  /** Point on Earth directly beneath the spacecraft (centre of the disk). */
  lat0: number
  lon0: number
  distanceKm: number
  url: string
  thumb: string
}

interface RawFrame {
  identifier: string
  image: string
  date: string
  centroid_coordinates: { lat: number; lon: number }
  dscovr_j2000_position: { x: number; y: number; z: number }
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  // Give up after 12 seconds so a stalled server shows an error instead of hanging.
  const timeout = AbortSignal.timeout(12000)
  const res = await fetch(url, { signal: signal ? AbortSignal.any([signal, timeout]) : timeout })
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  return res.json() as Promise<T>
}

/** Every date that has imagery, oldest first, as YYYY-MM-DD. */
export async function fetchDates(signal?: AbortSignal): Promise<string[]> {
  const raw = await getJson<{ date: string }[]>(`${BASE}/api/natural/all`, signal)
  return raw.map((d) => d.date).sort()
}

const frameCache = new Map<string, Frame[]>()
const early = new Map<string, Promise<RawFrame[]>>()

/**
 * Start fetching a day before it is known to be the one shown, so a link to a
 * particular date does not wait for the list of all dates first.
 */
export function prefetchFrames(date: string) {
  if (frameCache.has(date) || early.has(date)) return
  const req = getJson<RawFrame[]>(`${BASE}/api/natural/date/${date}`)
  early.set(date, req)
  // A failure here is not an error yet: the real request will try again.
  req.catch(() => early.delete(date))
}

export async function fetchFrames(date: string, signal?: AbortSignal): Promise<Frame[]> {
  const cached = frameCache.get(date)
  if (cached) return cached
  const url = `${BASE}/api/natural/date/${date}`
  const raw = await (early.get(date)?.catch(() => getJson<RawFrame[]>(url, signal)) ?? getJson<RawFrame[]>(url, signal))
  early.delete(date)
  signal?.throwIfAborted()
  const frames = raw
    .map((f): Frame => {
      const [day] = f.date.split(' ')
      const path = day.replaceAll('-', '/')
      const p = f.dscovr_j2000_position
      return {
        id: f.identifier,
        time: new Date(f.date.replace(' ', 'T') + 'Z'),
        lat0: f.centroid_coordinates.lat,
        lon0: f.centroid_coordinates.lon,
        distanceKm: Math.hypot(p.x, p.y, p.z),
        url: `${BASE}/archive/natural/${path}/jpg/${f.image}.jpg`,
        thumb: `${BASE}/archive/natural/${path}/thumbs/${f.image}.jpg`,
      }
    })
    .sort((a, b) => a.time.getTime() - b.time.getTime())
  frameCache.set(date, frames)
  return frames
}

export interface Projected {
  /** Position in the image, 0–1 from the top-left corner. */
  x: number
  y: number
  /** False when the point is on the far side of the planet. */
  visible: boolean
  /** 0 at the edge of the disk, 1 at the centre. */
  facing: number
}

const rad = (d: number) => (d * Math.PI) / 180

/**
 * Where a latitude/longitude lands in an EPIC photo.
 *
 * The images are centred on Earth with north up, so this is a perspective
 * projection of a sphere seen from the spacecraft's distance, looking at the
 * point directly beneath it.
 */
export function project(frame: Frame, lat: number, lon: number): Projected {
  const d = frame.distanceKm / EARTH_RADIUS_KM
  const p = rad(lat)
  const p0 = rad(frame.lat0)
  const dl = rad(lon - frame.lon0)

  const cosC = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(dl)
  const x = Math.cos(p) * Math.sin(dl)
  const y = Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(dl)

  const horizon = 1 / d
  const limbRadius = 0.5 / (Math.sqrt(d * d - 1) * Math.tan(HALF_FOV_RAD))
  const scale = (limbRadius * Math.sqrt(d * d - 1)) / (d - cosC)

  return {
    x: 0.5 + scale * x,
    y: 0.5 - scale * y,
    visible: cosC > horizon,
    facing: Math.max(0, (cosC - horizon) / (1 - horizon)),
  }
}

/** Radius of the Earth's disk in a photo, as a fraction of the image width. */
export function diskRadius(frame: Frame): number {
  const d = frame.distanceKm / EARTH_RADIUS_KM
  return 0.5 / (Math.sqrt(d * d - 1) * Math.tan(HALF_FOV_RAD))
}

/**
 * One saved photo, used when NASA's photo service cannot be reached so the
 * page still has an Earth to show.
 */
export const SAMPLE_DATE = '2026-11-07'
export const SAMPLE_FRAMES: Frame[] = [
  {
    id: 'sample-20261107004554',
    time: new Date('2026-11-07T00:41:06Z'),
    lat0: -8.752441,
    lon0: 155.266113,
    distanceKm: Math.hypot(-1230220.712501, -783365.087499, -221769.975562),
    url: '/sample/earth-2026-11-07.jpg',
    thumb: '/sample/earth-2026-11-07.jpg',
  },
]

/** Put the saved photo in place of a day that could not be fetched. */
export function loadSampleFrames() {
  frameCache.set(SAMPLE_DATE, SAMPLE_FRAMES)
}
