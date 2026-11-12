import { expect, test } from '@playwright/test'
import { openGlobe, panel } from './helpers'

test('recent events are offered at the very top @smoke', async ({ page }) => {
  await openGlobe(page)
  const lately = page.getByRole('navigation', { name: 'Recent events to look at' })
  // Of the recorded events only the typhoon reached hurricane strength.
  await expect(lately.getByRole('button')).toHaveCount(1)
  await expect(lately.getByRole('button')).toHaveText(/Typhoon Testa\s*6 Nov/)
  const top = await lately.evaluate((el) => el.getBoundingClientRect().top)
  const title = await page.getByRole('heading', { level: 1 }).evaluate((el) => el.getBoundingClientRect().top)
  expect(top).toBeLessThan(title)
})

test('choosing a recent event opens its day and shows it on the globe', async ({ page }) => {
  await openGlobe(page, '/', { still: true })
  await page.getByRole('navigation', { name: 'Recent events to look at' }).getByRole('button', { name: /Typhoon Testa/ }).click()
  await expect(page.locator('.date')).toHaveText('6 November 2026')
  await expect(page).toHaveURL(/\?date=2026-11-06/)
  await expect(panel(page)).toContainText('Typhoon Testa', { timeout: 15_000 })
})

test('the row is left out when the event tracker does not answer', async ({ page }) => {
  await openGlobe(page, '/', { eonetDown: true })
  await expect(page.locator('.lately')).toHaveCount(0)
  await expect(page.locator('.earth')).not.toHaveClass(/has-lately/)
})
