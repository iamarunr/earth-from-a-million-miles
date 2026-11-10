import { expect, test } from '@playwright/test'
import { mockNasa } from './helpers'

test('shows a saved photograph when NASA’s photo service is down', async ({ page }) => {
  await mockNasa(page, { epicDown: true })
  await page.goto('/')
  await expect(page.locator('.notice')).toContainText('NASA’s photo service is not responding right now')
  await expect(page.locator('.date')).toHaveText('7 November 2026')
  await expect(page.locator('.thumb')).toHaveCount(1)
  await expect(page.locator('.face.ready')).toBeVisible({ timeout: 20_000 })
  // With one photograph there is nothing to step through or play.
  await expect(page.getByRole('button', { name: 'Previous day with photos' })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Next day with photos' })).toBeDisabled()
})

test.describe('without the 3D globe', () => {
  test('falls back to the photographs when the photo proxy is missing', async ({ page }) => {
    await mockNasa(page, { proxyDown: true })
    await page.goto('/')
    await expect(page.locator('.earth.is-flat')).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('.note')).toContainText('The 3D globe is not available here')
    await expect(page.locator('.lede')).toContainText('Real photographs of the whole planet')
    await expect(page.locator('.frames img.on')).toBeVisible()
    await expect(page.locator('.readouts')).toBeVisible()
    await expect(page.locator('.zoom')).toHaveCount(0)
    await expect(page.locator('.credit')).toContainText('Arrow keys step through the photographs')
  })

  test('falls back when the browser has no WebGL2', async ({ page }) => {
    await page.addInitScript(() => {
      const real = HTMLCanvasElement.prototype.getContext
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, type: string, ...rest: unknown[]) {
        if (type === 'webgl2') return null
        return (real as (...a: unknown[]) => unknown).call(this, type, ...rest)
      } as typeof real
    })
    await mockNasa(page)
    await page.goto('/')
    await expect(page.locator('.earth.is-flat')).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('.frames img.on')).toBeVisible()
  })

  test('the photographs can still be stepped, played and marked with events', async ({ page }) => {
    await mockNasa(page, { proxyDown: true })
    await page.goto('/')
    await expect(page.locator('.earth.is-flat')).toBeVisible({ timeout: 20_000 })

    // A flat photograph cannot turn, so the event on the far side of the first
    // photograph is listed last and shown fainter.
    await expect(page.locator('.events li')).toHaveCount(4)
    await expect(page.locator('.events li').last()).toContainText('Prairie Wildfire')
    await expect(page.locator('.events li').last()).toHaveClass(/away/)

    await page.getByRole('button', { name: /07:53 UTC/ }).click()
    await expect(page.locator('.thumb.on')).toContainText('07:53')
    await page.keyboard.press('ArrowRight')
    await expect(page.locator('.thumb.on')).toContainText('15:05')

    await page.getByRole('button', { name: 'Play the day' }).click()
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
    await page.getByRole('button', { name: 'Pause' }).click()

    await expect(page.locator('.events li')).toHaveCount(4)
    await expect(page.locator('.summary')).toContainText('4 natural events')
  })
})
