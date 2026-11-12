import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { face, mockNasa, openGlobe, panel } from './helpers'

// The design rules in DESIGN.md, checked on the real page.

const axe = (page: Page) => new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'])
const summary = (violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations']) =>
  violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length}) ${v.nodes[0].target.join(' ')}`)

test.describe('accessibility', () => {
  for (const size of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'phone', width: 375, height: 812 },
  ]) {
    test(`no accessibility violations on ${size.name}, with an event open`, async ({ page }) => {
      await page.setViewportSize(size)
      await openGlobe(page, '/', { still: true })
      expect(summary((await axe(page).analyze()).violations)).toEqual([])
      await page.locator('.events').getByRole('button', { name: 'Typhoon Testa' }).click()
      await expect(panel(page)).toBeVisible()
      expect(summary((await axe(page).analyze()).violations)).toEqual([])
    })
  }

  test('no accessibility violations without the 3D globe', async ({ page }) => {
    await mockNasa(page, { proxyDown: true })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')
    await expect(page.locator('.earth.is-flat')).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('.frames img.on')).toBeVisible()
    expect(summary((await axe(page).analyze()).violations)).toEqual([])
  })

  test('every control can be reached with Tab and shows where focus is', async ({ page }) => {
    await openGlobe(page, '/', { still: true })
    const seen: string[] = []
    for (let i = 0; i < 30; i++) {
      await page.keyboard.press('Tab')
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement
        const cs = getComputedStyle(el)
        return {
          name: el.getAttribute('aria-label') || el.textContent!.trim().slice(0, 40),
          outline: cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) >= 2,
        }
      })
      expect(info.outline, `"${info.name}" shows a focus ring`).toBe(true)
      seen.push(info.name)
    }
    for (const name of ['About this project', 'Previous day with photos', 'Choose a date', 'Random day', 'Globe. Drag it, or use the arrow keys, to spin it.', 'Zoom in', 'Play the day', 'Lat/long grid']) {
      expect(seen, name).toContain(name)
    }
  })

  test('what changes on the page is said aloud, not only shown', async ({ page }) => {
    await openGlobe(page, '/', { still: true })
    // The day, when any control changes it.
    await expect(page.locator('.date')).toHaveAttribute('aria-live', 'polite')
    // A name and its date are two words to a screen reader, not one.
    await expect(page.locator('.lately').getByRole('button', { name: 'Typhoon Testa 6 Nov' })).toBeVisible()
    // Choosing an event opens a panel without moving focus, so its name is announced.
    const said = page.locator('.stage [role="status"]')
    await expect(said).toHaveText('')
    await page.locator('.events').getByRole('button', { name: 'Typhoon Testa' }).click()
    await expect(said).toHaveText(/^Typhoon Testa\. Severe storms · /)
    await page.keyboard.press('Escape')
    await expect(said).toHaveText('')
  })

  test('opening a day from the About section takes keyboard focus back up to the globe', async ({ page }) => {
    await openGlobe(page, '/', { still: true })
    await page.locator('.about-days button').first().focus()
    await page.keyboard.press('Enter')
    await expect(face(page)).toBeFocused()
  })

  test('nothing jumps while the day loads', async ({ page }) => {
    await page.addInitScript(() => {
      const w = window as unknown as { shift: number }
      w.shift = 0
      new PerformanceObserver((list) => {
        for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) if (!e.hadRecentInput) w.shift += e.value
      }).observe({ type: 'layout-shift', buffered: true })
    })
    for (const size of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(size)
      await openGlobe(page, '/', { still: true })
      await expect(page.locator('.events li').first()).toBeVisible()
      expect(await page.evaluate(() => (window as unknown as { shift: number }).shift), `layout shift at ${size.width} wide`).toBeLessThan(0.02)
    }
  })

  test('the page has one main heading and an ordered outline', async ({ page }) => {
    await openGlobe(page)
    await expect(page.locator('h1')).toHaveCount(1)
    const levels = await page.locator('h1, h2, h3').evaluateAll((els) => els.map((el) => Number(el.tagName[1])))
    for (let i = 1; i < levels.length; i++) expect(levels[i] - levels[i - 1], 'no heading level is skipped').toBeLessThanOrEqual(1)
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /.{50,}/)
  })
})

test.describe('the clean look', () => {
  test('black ground, white ink, one typeface at regular weight', async ({ page }) => {
    await openGlobe(page)
    await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(0, 0, 0)')
    await expect(page.locator('.earth')).toHaveCSS('color', 'rgb(255, 255, 255)')
    await page.evaluate(() => document.fonts.ready)
    expect(await page.evaluate(() => document.fonts.check('16px "Geist Variable"'))).toBe(true)

    const odd = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('body *')]
        .filter((el) => el.offsetParent !== null && el.textContent!.trim() && el.children.length === 0)
        .map((el) => ({ el, cs: getComputedStyle(el) }))
        .filter(({ cs }) => !cs.fontFamily.includes('Geist Variable') || cs.fontWeight !== '400')
        .map(({ el, cs }) => `${el.tagName}.${el.className}: ${cs.fontFamily.slice(0, 20)} ${cs.fontWeight}`),
    )
    expect(odd).toEqual([])
  })

  test('the only strong colours are the event marks and Play', async ({ page }) => {
    await openGlobe(page)
    await expect(page.locator('.play')).toHaveCSS('background-color', 'rgb(169, 203, 255)')
    const dot = (cat: string) => page.locator(`.chip[data-cat="${cat}"] i`)
    await expect(dot('wildfires')).toHaveCSS('background-color', 'rgb(255, 91, 58)')
    await expect(dot('severeStorms')).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(dot('floods')).toHaveCSS('background-color', 'rgb(255, 214, 10)')

    // Everything else that carries text is black, white or grey.
    const coloured = await page.evaluate(() => {
      const grey = (c: string) => {
        const m = c.match(/[\d.]+/g)!.map(Number)
        return Math.max(m[0], m[1], m[2]) - Math.min(m[0], m[1], m[2]) <= 8
      }
      return [...document.querySelectorAll<HTMLElement>('body *')]
        .filter((el) => el.offsetParent !== null && el.textContent!.trim() && el.children.length === 0 && !el.closest('.play, .notice'))
        .filter((el) => !grey(getComputedStyle(el).color))
        .map((el) => `${el.tagName}.${el.className}: ${getComputedStyle(el).color}`)
    })
    expect(coloured).toEqual([])
  })

  test('headings are large and tight, labels small and uppercase', async ({ page }) => {
    await openGlobe(page)
    const h1 = await page.locator('h1').evaluate((el) => {
      const cs = getComputedStyle(el)
      return { size: parseFloat(cs.fontSize), tracking: parseFloat(cs.letterSpacing) / parseFloat(cs.fontSize), leading: parseFloat(cs.lineHeight) / parseFloat(cs.fontSize) }
    })
    expect(h1.size).toBeGreaterThanOrEqual(40)
    expect(h1.size).toBeLessThanOrEqual(96)
    expect(h1.tracking).toBeLessThan(0)
    expect(h1.tracking).toBeGreaterThanOrEqual(-0.04)
    expect(h1.leading).toBeLessThanOrEqual(1.05)
    for (const selector of ['.events-col h2', '.chip', '.gridtoggle', '.about h3', '.foot-by', '.foot-links a']) {
      await expect(page.locator(selector).first(), selector).toHaveCSS('text-transform', 'uppercase')
    }
  })

  test('text has enough contrast against the black ground', async ({ page }) => {
    await openGlobe(page)
    const weak = await page.evaluate(() => {
      const lum = (c: string) => {
        const [r, g, b] = c.match(/[\d.]+/g)!.slice(0, 3).map((v) => {
          const x = Number(v) / 255
          return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
        })
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
      }
      return [...document.querySelectorAll<HTMLElement>('.earth *, .about *, .foot *')]
        .filter((el) => el.offsetParent !== null && el.textContent!.trim() && el.children.length === 0 && !el.closest('.play, .slip, [aria-pressed="true"].gridtoggle, :disabled'))
        .map((el) => ({ el, ratio: (lum(getComputedStyle(el).color) + 0.05) / 0.05 }))
        .filter(({ ratio }) => ratio < 4.5)
        .map(({ el, ratio }) => `${el.tagName}.${el.className}: ${ratio.toFixed(2)}`)
    })
    expect(weak).toEqual([])
  })

  test('the parts the browser draws are themed too', async ({ page }) => {
    await openGlobe(page)
    await expect(page.locator('.earth')).toHaveCSS('color-scheme', 'dark')
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#000000')
    const selection = await page.evaluate(() => getComputedStyle(document.querySelector('.lede')!, '::selection').backgroundColor)
    expect(selection).toBe('rgb(255, 255, 255)')
  })

  test('with reduced motion nothing animates', async ({ page }) => {
    await openGlobe(page, '/', { still: true })
    const moving = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('body *')]
        .filter((el) => {
          const cs = getComputedStyle(el)
          const longest = (v: string) => Math.max(...v.split(',').map((t) => parseFloat(t) * (t.trim().endsWith('ms') ? 1 : 1000)))
          return longest(cs.transitionDuration) > 20 || (cs.animationName !== 'none' && longest(cs.animationDuration) > 20)
        })
        .map((el) => el.className || el.tagName),
    )
    expect(moving).toEqual([])
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto')
  })

  test('the globe arrives by fading up out of the dark', async ({ page }) => {
    await mockNasa(page)
    await page.goto('/')
    const canvas = face(page).locator('canvas').first()
    // Before the photographs land it is there but invisible; afterwards fully shown.
    await expect(page.locator('.face.ready')).toBeVisible({ timeout: 20_000 })
    await expect(canvas).toHaveCSS('opacity', '1', { timeout: 5000 })
    const transition = await canvas.evaluate((el) => getComputedStyle(el).transitionProperty)
    expect(transition).toContain('opacity')
  })
})
