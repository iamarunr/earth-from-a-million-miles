import { expect, test } from '@playwright/test'
import { face, openGlobe, panel } from './helpers'

const row = (page: import('@playwright/test').Page, name: string) => page.locator('.events').getByRole('button', { name })

test('lists the week’s events and counts them by kind @smoke', async ({ page }) => {
  await openGlobe(page)
  await expect(page.locator('.summary')).toContainText('4 natural events tracked in the 7 days up to this one')
  await expect(page.locator('.events li')).toHaveCount(4)
  await expect(page.locator('.chip')).toHaveCount(3)
  await expect(page.locator('.chip[data-cat="wildfires"]')).toContainText('2')
  // On a globe that can turn, no event is out of reach, so none is shown as far away.
  await expect(page.locator('.events li.away')).toHaveCount(0)
})

test('choosing an event shows everything about it beside its mark @smoke', async ({ page }) => {
  await openGlobe(page)
  await row(page, 'Typhoon Testa').click()

  const p = panel(page)
  await expect(p).toBeVisible()
  await expect(p.locator('strong')).toHaveText('Typhoon Testa')
  // Where it was on the chosen day, not where it went afterwards.
  await expect(p.locator('.slip-kind')).toContainText('Severe storms · 16.0°N 146.0°E')
  await expect(p).toContainText('Wind speed')
  await expect(p).toContainText('90 kts')
  await expect(p).toContainText('3 reports')
  const link = p.getByRole('link', { name: /Read the report at JTWC/ })
  await expect(link).toHaveAttribute('href', 'https://example.org/typhoon')
  await expect(link).toHaveAttribute('target', '_blank')
  await expect(link).toHaveAttribute('rel', /noreferrer/)

  // The list shows the same choice.
  await expect(row(page, 'Typhoon Testa')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.events li.selected')).toContainText('Source report')
  // The globe has turned to face it.
  await expect(page.locator('.caption')).toContainText('16.0°N 146.0°E', { timeout: 10_000 })
})

test('an event that has ended says when, and labels its size correctly', async ({ page }) => {
  await openGlobe(page)
  await row(page, 'Flood in Fiji').click()
  await expect(panel(page)).toContainText('Ended')
  await expect(panel(page)).not.toContainText('Wind speed')
  await row(page, 'Outback Wildfire').click()
  await expect(panel(page).locator('strong')).toHaveText('Outback Wildfire')
  await expect(panel(page)).toContainText('Area')
  await expect(panel(page)).toContainText('1200 acres')
})

test('choosing an event on the far side turns the globe round to it', async ({ page }) => {
  await openGlobe(page)
  await row(page, 'Prairie Wildfire').click()
  await expect(page.locator('.caption')).toContainText('40.0°N 100.0°W', { timeout: 10_000 })
  await expect(panel(page).locator('strong')).toHaveText('Prairie Wildfire')
})

test('tapping a mark on the globe opens the same panel', async ({ page }) => {
  await openGlobe(page)
  // Bring the storm to the middle of the globe, close the panel, then tap the mark.
  await row(page, 'Typhoon Testa').click()
  await expect(page.locator('.caption')).toContainText('16.0°N 146.0°E', { timeout: 10_000 })
  await page.keyboard.press('Escape')
  await expect(panel(page)).toHaveCount(0)

  const box = (await face(page).boundingBox())!
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2)
  await expect(panel(page).locator('strong')).toHaveText('Typhoon Testa')
  await expect(row(page, 'Typhoon Testa')).toHaveAttribute('aria-pressed', 'true')
})

test.describe('the panel goes away', () => {
  test.beforeEach(async ({ page }) => {
    await openGlobe(page)
    await row(page, 'Typhoon Testa').click()
    await expect(panel(page)).toBeVisible()
    await expect(page.locator('.caption')).toContainText('16.0°N 146.0°E', { timeout: 10_000 })
  })

  test('on Escape', async ({ page }) => {
    await page.keyboard.press('Escape')
    await expect(panel(page)).toHaveCount(0)
    await expect(page.locator('.events li.selected')).toHaveCount(0)
  })

  test('on its close button', async ({ page }) => {
    await panel(page).getByRole('button', { name: 'Close' }).click()
    await expect(panel(page)).toHaveCount(0)
  })

  test('on a click anywhere outside it', async ({ page }) => {
    await page.getByRole('heading', { level: 1 }).click()
    await expect(panel(page)).toHaveCount(0)
  })

  test('the moment the globe is dragged', async ({ page }) => {
    const box = (await face(page).boundingBox())!
    // Start near the bottom edge, well clear of the panel itself.
    await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.9)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width * 0.5 + 60, box.y + box.height * 0.9, { steps: 4 })
    await expect(panel(page)).toHaveCount(0)
    await page.mouse.up()
  })

  test('but not when clicking inside it', async ({ page }) => {
    await panel(page).locator('strong').click()
    await expect(panel(page)).toBeVisible()
  })
})

test('a kind of event can be hidden and shown again', async ({ page }) => {
  await openGlobe(page)
  const chip = page.locator('.chip[data-cat="wildfires"]')
  await expect(chip).toHaveAttribute('aria-pressed', 'true')
  await chip.click()
  await expect(chip).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('.events li')).toHaveCount(2)
  await expect(page.locator('.events')).not.toContainText('Wildfire')
  await chip.click()
  await expect(page.locator('.events li')).toHaveCount(4)
})

test('the page still works when the events service is down', async ({ page }) => {
  await openGlobe(page, '/', { eonetDown: true })
  await expect(page.locator('.summary')).toHaveText('NASA’s event tracker did not respond, so no events are shown.')
  await expect(page.locator('.events li')).toHaveCount(0)
  await expect(page.locator('.thumb')).toHaveCount(4)
})
