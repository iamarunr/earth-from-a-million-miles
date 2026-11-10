import { expect, test, type Page } from '@playwright/test'
import { face, openGlobe, panel } from './helpers'

const SIZES = [
  { name: 'small phone', width: 320, height: 568 },
  { name: 'phone', width: 375, height: 812 },
  { name: 'large phone', width: 430, height: 932 },
  { name: 'tablet upright', width: 768, height: 1024 },
  { name: 'tablet sideways', width: 1024, height: 768 },
  { name: 'small laptop', width: 1366, height: 768 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'large desktop', width: 1920, height: 1080 },
  { name: 'wide and short', width: 1280, height: 620 },
]

const box = async (page: Page, selector: string) => (await page.locator(selector).first().boundingBox())!

for (const size of SIZES) {
  test.describe(`${size.name} (${size.width}×${size.height})`, () => {
    test.use({ viewport: { width: size.width, height: size.height } })

    test('nothing spills sideways and nothing is cut off', async ({ page }) => {
      await openGlobe(page, '/', { still: true })
      const { scrollWidth, clientWidth } = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, clientWidth: document.documentElement.clientWidth }))
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth)

      // The globe is a full circle inside the window's width.
      const f = (await face(page).boundingBox())!
      expect(f.x).toBeGreaterThanOrEqual(0)
      expect(f.x + f.width).toBeLessThanOrEqual(size.width + 0.5)
      expect(Math.abs(f.width - f.height)).toBeLessThan(1)
      expect(f.width).toBeGreaterThanOrEqual(Math.min(280, size.width - 40))

      // No text is clipped by its own box.
      const clipped = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('h1, h2, h3, .lede, .date, .caption, .note, .edge, .chip, .datebar button, .foot-by span, .foot-links a, .about-days button')]
          .filter((el) => el.offsetParent !== null && el.scrollWidth > el.clientWidth + 1)
          .map((el) => `${el.className || el.tagName}: ${el.textContent!.slice(0, 40)}`),
      )
      expect(clipped).toEqual([])
    })

    test('everything a visitor needs is present and can be pressed', async ({ page }) => {
      await openGlobe(page, '/', { still: true })
      for (const name of ['Previous day with photos', 'Next day with photos', 'Random day', 'Play the day', 'Lat/long grid']) {
        await expect(page.getByRole('button', { name })).toBeVisible()
      }
      await expect(page.getByLabel('Choose a date')).toBeVisible()
      await expect(page.locator('.zoom:visible')).toHaveCount(1)
      await expect(page.locator('.thumb')).toHaveCount(4)
      await expect(page.locator('.events li')).toHaveCount(4)

      // Controls are big enough to press with a finger.
      const small = await page.evaluate(() =>
        [...document.querySelectorAll<HTMLElement>('button, .foot-links a, input[type=date]')]
          .filter((el) => el.offsetParent !== null)
          .map((el) => ({ el, r: el.getBoundingClientRect() }))
          .filter(({ r }) => r.width < 36 || r.height < 36)
          .map(({ el, r }) => `${el.getAttribute('aria-label') || el.textContent!.trim().slice(0, 30)}: ${Math.round(r.width)}×${Math.round(r.height)}`),
      )
      expect(small).toEqual([])
    })

    test('choosing an event shows its panel on screen', async ({ page }) => {
      await openGlobe(page, '/', { still: true })
      await page.locator('.events').getByRole('button', { name: 'Typhoon Testa' }).click()
      await expect(panel(page)).toHaveCount(1)
      // On short screens the globe and the panel cannot both fit, so the globe
      // is kept whole and most of the panel shows beneath it.
      await expect(panel(page)).toBeInViewport({ ratio: size.height < 800 ? 0.6 : 0.9 })
      const p = (await panel(page).boundingBox())!
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x + p.width).toBeLessThanOrEqual(size.width + 0.5)
      // The globe it points at is on screen too.
      await expect(face(page)).toBeInViewport({ ratio: 0.5 })
    })

    test('the About section and footer fit', async ({ page }) => {
      await openGlobe(page, '/', { still: true })
      await page.locator('footer').scrollIntoViewIfNeeded()
      await expect(page.locator('.foot-links a')).toHaveCount(3)
      // The body text keeps a readable line length.
      const chars = await page.evaluate(() => {
        // Characters that fit on one line: the column's width over the average
        // width of a character in this very text.
        const p = document.querySelector<HTMLElement>('.about-rows p')!
        const probe = document.createElement('span')
        probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;width:max-content'
        const text = p.textContent!
        probe.textContent = text
        p.appendChild(probe)
        const perChar = probe.getBoundingClientRect().width / text.length
        probe.remove()
        return p.getBoundingClientRect().width / perChar
      })
      expect(chars).toBeLessThanOrEqual(78)
      // The footer's small print is not crossed by the horizon line.
      const fine = await box(page, '.foot-fine')
      const horizon = await box(page, '.foot-horizon')
      expect(fine.y + fine.height).toBeLessThanOrEqual(horizon.y + 1)
    })
  })
}

test.describe('desktop', () => {
  test.use({ viewport: { width: 1440, height: 900 } })

  test('the whole tool fits one screen without scrolling', async ({ page }) => {
    await openGlobe(page)
    const earth = await box(page, '.earth')
    expect(Math.round(earth.height)).toBe(900)
    for (const selector of ['h1', '.datebar', '.face', '.play', '.strip', '.gridtoggle', '.chips', '.events li button span']) {
      await expect(page.locator(selector).first(), selector).toBeInViewport({ ratio: 1 })
    }
  })

  test('the globe sits between the text and the event list', async ({ page }) => {
    await openGlobe(page)
    const head = await box(page, '.head')
    const stage = await box(page, '.stage')
    const events = await box(page, '.events-col')
    const roll = await box(page, '.roll')
    expect(head.x + head.width).toBeLessThanOrEqual(stage.x + 1)
    expect(stage.x + stage.width).toBeLessThanOrEqual(events.x + 1)
    expect(roll.y).toBeGreaterThanOrEqual(stage.y + stage.height - 1)
    // The globe is the largest thing on the screen.
    const f = (await face(page).boundingBox())!
    expect(f.width).toBeGreaterThan(500)
  })

  test('the event panel floats beside its mark', async ({ page }) => {
    await openGlobe(page)
    await page.locator('.events').getByRole('button', { name: 'Typhoon Testa' }).click()
    await expect(page.locator('.slip.floating')).toBeVisible()
    await expect(page.locator('.slip.docked')).toBeHidden()
    await expect(page.locator('.caption')).toContainText('16.0°N 146.0°E', { timeout: 10_000 })
    // It does not cover the mark it describes, which is at the centre of the globe.
    const f = (await face(page).boundingBox())!
    const p = (await page.locator('.slip.floating').boundingBox())!
    const cx = f.x + f.width / 2
    const cy = f.y + f.height / 2
    const covers = cx > p.x && cx < p.x + p.width && cy > p.y && cy < p.y + p.height
    expect(covers).toBe(false)
  })
})

test.describe('phone', () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true })

  test('the globe comes straight after the title, then the photographs', async ({ page }) => {
    await openGlobe(page)
    const order = ['h1', '.lede', '.stage', '.roll', '.date', '.datebar', '.caption', '.events-col', '#about', 'footer']
    let last = -1
    for (const selector of order) {
      const b = await box(page, selector)
      expect(b.y, `${selector} comes after the one before it`).toBeGreaterThan(last)
      last = b.y
    }
    // The globe is visible without scrolling.
    await expect(face(page)).toBeInViewport({ ratio: 0.6 })
  })

  test('the event panel sits in the page under the globe', async ({ page }) => {
    await openGlobe(page)
    await page.locator('.events').getByRole('button', { name: 'Typhoon Testa' }).click()
    await expect(page.locator('.slip.docked')).toBeVisible()
    await expect(page.locator('.slip.floating')).toBeHidden()
    await expect(page.locator('.slip.docked')).toBeInViewport({ ratio: 0.9 })
    const f = (await face(page).boundingBox())!
    const p = (await page.locator('.slip.docked').boundingBox())!
    expect(p.y).toBeGreaterThanOrEqual(f.y + f.height - 1)
  })

  test('a finger can turn the globe without scrolling the page', async ({ page }) => {
    await openGlobe(page, '/', { still: true })
    await expect(face(page)).toHaveCSS('touch-action', 'none')
    await expect(page.locator('.zoom.row')).toBeVisible()
    await expect(page.locator('.zoom.corner')).toBeHidden()
  })
})
