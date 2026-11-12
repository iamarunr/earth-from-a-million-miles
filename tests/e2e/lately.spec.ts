import { expect, test } from '@playwright/test'
import { openGlobe, panel } from './helpers'

test('recent events are offered at the very top @smoke', async ({ page }) => {
  await openGlobe(page)
  const lately = page.getByRole('navigation', { name: 'Recent events to look at' })
  // Of the recorded events only the typhoon reached hurricane strength; Champi is a day chosen by hand.
  await expect(lately.getByRole('button')).toHaveText([/Typhoon Testa\s*6 Nov/, /Super Typhoon Champi\s*20 Oct/])
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

test('a day chosen by hand is offered while it is recent, and opens that day', async ({ page }) => {
  await openGlobe(page, '/', { still: true })
  await page.locator('.lately').getByRole('button', { name: /Super Typhoon Champi/ }).click()
  await expect(page.locator('.date')).toHaveText('20 October 2026')
  await expect(page.locator('.face.ready')).toBeVisible()
})

test('without the event tracker, only the days chosen by hand are offered', async ({ page }) => {
  await openGlobe(page, '/', { eonetDown: true })
  await expect(page.locator('.lately button')).toHaveText([/Super Typhoon Champi\s*20 Oct/])
})
