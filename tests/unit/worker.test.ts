import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
// @ts-expect-error plain JavaScript module
import worker from '../../worker/index.js'

const PHOTO = '/epic-archive/natural/2025/06/01/jpg/epic_1b_20250601010436.jpg'
const site = 'https://earth.example'

let cache: { match: ReturnType<typeof vi.fn>; put: ReturnType<typeof vi.fn> }
let upstream: ReturnType<typeof vi.fn>
const env = { ASSETS: { fetch: vi.fn(async () => new Response('<html>site</html>')) } }
const ctx = { waitUntil: vi.fn() }

const call = (path: string, init?: RequestInit) => worker.fetch(new Request(site + path, init), env, ctx) as Promise<Response>

beforeEach(() => {
  cache = { match: vi.fn(async () => undefined), put: vi.fn(async () => undefined) }
  upstream = vi.fn(async () => new Response('JPEGDATA', { headers: { 'Content-Type': 'image/jpeg', 'Set-Cookie': 'x=1' } }))
  vi.stubGlobal('caches', { default: cache })
  vi.stubGlobal('fetch', upstream)
  env.ASSETS.fetch.mockClear()
  ctx.waitUntil.mockClear()
})
afterEach(() => vi.unstubAllGlobals())

describe('photo proxy', () => {
  it('serves the site itself for every other address', async () => {
    const res = await call('/')
    expect(await res.text()).toBe('<html>site</html>')
    expect(upstream).not.toHaveBeenCalled()
  })

  it('fetches a photo from NASA and marks it as never changing', async () => {
    const res = await call(PHOTO)
    expect(upstream.mock.calls[0][0]).toBe('https://epic.gsfc.nasa.gov/archive/natural/2025/06/01/jpg/epic_1b_20250601010436.jpg')
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('image/jpeg')
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=31536000, immutable')
    // Nothing else from NASA's response is passed on.
    expect(res.headers.get('Set-Cookie')).toBeNull()
    expect(await res.text()).toBe('JPEGDATA')
    expect(cache.put).toHaveBeenCalledTimes(1)
    expect(ctx.waitUntil).toHaveBeenCalledTimes(1)
  })

  it('also serves thumbnails and PNGs', async () => {
    expect((await call('/epic-archive/natural/2025/06/01/thumbs/epic_1b_20250601010436.jpg')).status).toBe(200)
    expect((await call('/epic-archive/natural/2025/06/01/png/epic_1b_20250601010436.png')).status).toBe(200)
  })

  it('answers from its cache without asking NASA again', async () => {
    cache.match.mockResolvedValueOnce(new Response('CACHED'))
    const res = await call(PHOTO)
    expect(await res.text()).toBe('CACHED')
    expect(upstream).not.toHaveBeenCalled()
  })

  it('ignores a query string when caching', async () => {
    await call(PHOTO + '?nocache=123')
    expect((cache.match.mock.calls[0][0] as Request).url).toBe(site + PHOTO)
  })

  it.each([
    '/epic-archive/enhanced/2025/06/01/jpg/epic_RGB_20250601010436.jpg',
    '/epic-archive/natural/2025/06/01/jpg/../../../../../api/natural/all',
    '/epic-archive/natural/2025/6/1/jpg/epic_1b_20250601010436.jpg',
    '/epic-archive/natural/2025/06/01/jpg/evil.jpg',
    '/epic-archive/natural/2025/06/01/jpg/epic_1b_20250601010436.jpg/extra',
    '/epic-archive/',
  ])('refuses anything that is not an EPIC photo: %s', async (path) => {
    const res = await call(path)
    // Either refused outright, or (after the address is tidied) not treated as a photo.
    expect(upstream).not.toHaveBeenCalled()
    expect(res.headers.get('Cache-Control')).toBeNull()
  })

  it('refuses to be used for anything but reading', async () => {
    const res = await call(PHOTO, { method: 'POST' })
    expect(res.status).toBe(405)
    expect(upstream).not.toHaveBeenCalled()
  })

  it('reports a missing photo as missing and does not cache it', async () => {
    upstream.mockResolvedValueOnce(new Response('', { status: 404 }))
    expect((await call(PHOTO)).status).toBe(404)
    expect(cache.put).not.toHaveBeenCalled()
  })

  it('reports trouble at NASA as a gateway error', async () => {
    upstream.mockResolvedValueOnce(new Response('', { status: 500 }))
    expect((await call(PHOTO)).status).toBe(502)
    upstream.mockRejectedValueOnce(new Error('timeout'))
    expect((await call(PHOTO)).status).toBe(504)
  })
})
