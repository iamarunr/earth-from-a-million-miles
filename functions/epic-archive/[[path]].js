// Cloudflare Pages runs this for /epic-archive/*. It reuses the Worker's
// photo proxy, so the site deploys the same way on Pages or on Workers.
import worker from '../../worker/index.js'

export const onRequest = (context) => worker.fetch(context.request, context.env, context)
