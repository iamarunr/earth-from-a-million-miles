// Cloudflare Worker for the deployed site.
//
// NASA's image server sends no CORS headers, so the browser cannot load its
// photos into WebGL directly. This serves them from the site's own address:
//   /epic-archive/natural/2025/06/01/jpg/epic_1b_20250601010436.jpg
//   -> https://epic.gsfc.nasa.gov/archive/natural/2025/06/01/jpg/epic_1b_20250601010436.jpg
// Everything else is the built site in ./dist.

const UPSTREAM = 'https://epic.gsfc.nasa.gov/archive'
// Only EPIC natural-colour photos, so this cannot be used as an open proxy.
const PHOTO = /^\/epic-archive(\/natural\/\d{4}\/\d{2}\/\d{2}\/(?:jpg|thumbs|png)\/epic_[\w.]+\.(?:jpg|png))$/

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/epic-archive/')) return env.ASSETS.fetch(request)

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET, HEAD' } })
    }
    const match = PHOTO.exec(url.pathname)
    if (!match) return new Response('Not found', { status: 404 })

    const cacheKey = new Request(url.origin + url.pathname)
    const cache = caches.default
    const cached = await cache.match(cacheKey)
    if (cached) return cached

    let upstream
    try {
      upstream = await fetch(UPSTREAM + match[1], { signal: AbortSignal.timeout(20000) })
    } catch {
      return new Response('NASA photo service did not answer', { status: 504 })
    }
    if (!upstream.ok) {
      return new Response('Photo unavailable', { status: upstream.status === 404 ? 404 : 502 })
    }

    // A published photo never changes, so it can be kept for a long time.
    const response = new Response(upstream.body, {
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') ?? 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
    ctx.waitUntil(cache.put(cacheKey, response.clone()))
    return response
  },
}
