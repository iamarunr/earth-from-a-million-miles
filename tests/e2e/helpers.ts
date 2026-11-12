import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { expect, type Page } from '@playwright/test'

const here = (p: string) => fileURLToPath(new URL(p, import.meta.url))
const FRAMES = JSON.parse(readFileSync(here('./fixtures/frames.json'), 'utf8')) as { image: string; date: string }[]
const EVENTS = readFileSync(here('./fixtures/events.json'), 'utf8')
const PHOTO = readFileSync(here('../../public/sample/earth-2026-11-07.jpg'))

/** Days the pretend archive holds. There is a gap between June 2019 and February 2020. */
/** One red alert, an earthquake, and one orange that must be ignored. */
const ALERTS = {
  features: [
    { geometry: { type: 'Point', coordinates: [100, 10] }, properties: { eventtype: 'EQ', eventid: 1, name: 'Earthquake in Testland', alertlevel: 'Red', fromdate: '2026-11-05T03:00:00', todate: '2026-11-05T03:00:00' } },
    { geometry: { type: 'Point', coordinates: [20, 20] }, properties: { eventtype: 'VO', eventid: 2, name: 'Eruption  Minor', alertlevel: 'Orange', fromdate: '2026-11-06T00:00:00', todate: '2026-11-06T00:00:00' } },
  ],
}

export const DATES = ['2015-06-13', '2017-08-21', '2019-06-27', '2020-02-12', '2023-06-21', '2023-12-21', '2024-04-08', '2026-08-26', '2026-10-08', '2026-10-11', '2026-10-20', '2026-11-05', '2026-11-06', '2026-11-07']
export const LATEST = '2026-11-07'

export interface MockOptions {
  /** NASA's photo service does not answer at all. */
  epicDown?: boolean
  /** The site's photo proxy is missing, as on a host without the worker. */
  proxyDown?: boolean
  /** The disaster alert service does not answer. */
  gdacsDown?: boolean
  /** The events service does not answer. */
  eonetDown?: boolean
  /** Ask for reduced motion, which also keeps the globe from turning by itself. */
  still?: boolean
}

/** Answer every request to NASA from recorded data. */
export async function mockNasa(page: Page, opts: MockOptions = {}) {
  await page.route('https://epic.gsfc.nasa.gov/api/natural/all', (route) =>
    opts.epicDown ? route.abort() : route.fulfill({ json: DATES.map((date) => ({ date })) }),
  )
  await page.route('https://epic.gsfc.nasa.gov/api/natural/date/*', (route) => {
    if (opts.epicDown) return route.abort()
    const day = route.request().url().split('/').pop()!
    // The recorded day, re-dated to whichever day was asked for.
    const frames = FRAMES.map((f) => ({
      ...f,
      date: f.date.replace('2026-11-07', day),
      image: f.image.replace('20261107', day.replaceAll('-', '')),
    }))
    return route.fulfill({ json: frames })
  })
  await page.route('https://epic.gsfc.nasa.gov/archive/**', (route) => route.fulfill({ body: PHOTO, contentType: 'image/jpeg' }))
  await page.route('**/epic-archive/**', (route) =>
    opts.proxyDown ? route.fulfill({ status: 404, body: 'Not found' }) : route.fulfill({ body: PHOTO, contentType: 'image/jpeg' }),
  )
  await page.route('https://www.gdacs.org/**', (route) => (opts.gdacsDown ? route.abort() : route.fulfill({ json: ALERTS })))
  await page.route('https://eonet.gsfc.nasa.gov/**', (route) =>
    opts.eonetDown ? route.abort() : route.fulfill({ body: EVENTS, contentType: 'application/json' }),
  )
}

/** Open the page and wait until the 3D globe has been built. */
export async function openGlobe(page: Page, path = '/', opts: MockOptions = {}) {
  await mockNasa(page, opts)
  if (opts.still) await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(path)
  await expect(page.locator('.face.ready')).toBeVisible({ timeout: 20_000 })
  await expect(page.getByRole('button', { name: 'Zoom in' }).first()).toBeVisible()
}

export const face = (page: Page) => page.locator('.face')
/** The event panel, whichever of its two placements is showing. */
export const panel = (page: Page) => page.locator('.slip:visible')
export const zoomOut = (page: Page) => page.locator('.zoom:visible').getByRole('button', { name: 'Zoom out' })
export const zoomIn = (page: Page) => page.locator('.zoom:visible').getByRole('button', { name: 'Zoom in' })

/** Wait until the page has stopped scrolling. */
export async function settled(page: Page) {
  await page.waitForFunction(
    () =>
      new Promise<boolean>((resolve) => {
        const y = window.scrollY
        setTimeout(() => resolve(window.scrollY === y), 150)
      }),
  )
}

/** The page has come to rest at the very top. */
export const atTop = (page: Page) => expect.poll(() => page.evaluate(() => window.scrollY), { timeout: 5000 }).toBe(0)
/** The first value in the caption: where the globe is facing. */
export const facing = (page: Page) => page.locator('.caption b').first()
