import { expect, test } from '@playwright/test'
import { atTop, facing, openGlobe, settled } from './helpers'

test('the introduction links down to the About section @smoke', async ({ page }) => {
  await openGlobe(page)
  await page.getByRole('link', { name: 'About this project' }).click()
  await settled(page)
  await expect(page.getByRole('heading', { level: 2, name: 'About this project' })).toBeInViewport()
})

test('About explains the project and links to NASA', async ({ page }) => {
  await openGlobe(page)
  const about = page.locator('#about')
  for (const title of ['Where the photographs come from', 'How far back you can go', 'Why it matters', 'Why NASA shares it', 'How this globe is made', 'Days worth seeing']) {
    await expect(about.getByRole('heading', { level: 3, name: title })).toBeVisible()
  }
  // The count and latest day come from NASA's list, not from fixed text.
  await expect(about).toContainText('photographs for 10 days')
  await expect(about).toContainText('the most recent being 7 November 2026')
  await expect(about).toContainText('13 June 2015')

  const links = {
    EPIC: 'https://epic.gsfc.nasa.gov/',
    'NASA’s open APIs': 'https://api.nasa.gov/',
    'EPIC API': 'https://epic.gsfc.nasa.gov/about/api',
    EONET: 'https://eonet.gsfc.nasa.gov/',
  }
  for (const [name, href] of Object.entries(links)) {
    const link = about.getByRole('link', { name, exact: true })
    await expect(link).toHaveAttribute('href', href)
    await expect(link).toHaveAttribute('target', '_blank')
    await expect(link).toHaveAttribute('rel', /noreferrer/)
  }
})

test('a "day worth seeing" loads that day and returns to the globe', async ({ page }) => {
  await openGlobe(page)
  await page.locator('#about').getByRole('button', { name: '21 August 2017' }).click()
  await expect(page.locator('.date')).toHaveText('21 August 2017')
  await expect(page).toHaveURL(/\?date=2017-08-21/)
  await atTop(page)
  await expect(page.locator('.face.ready')).toBeVisible()
})

test('every "day worth seeing" is a day the archive has', async ({ page }) => {
  await openGlobe(page)
  const days = page.locator('.about-days button')
  await expect(days).toHaveCount(4)
  for (const label of await days.allTextContents()) {
    await page.locator('.about-days').getByRole('button', { name: label }).click()
    // Had the day been missing, the page would have moved to a different one.
    await expect(page.locator('.date')).toHaveText(label)
  }
})

test('the footer names the author and links out', async ({ page }) => {
  await openGlobe(page)
  const foot = page.locator('footer')
  await expect(foot.locator('.foot-by')).toContainText('Made by')
  await expect(foot.locator('.foot-by span')).toHaveText('Naresh Kumar')
  const links = {
    Portfolio: 'https://knnaresh.com',
    'Buy me a coffee': 'https://buymeacoffee.com/knnaresh',
    'Source on GitHub': 'https://github.com/iamarunr/earth-from-a-million-miles',
  }
  for (const [name, href] of Object.entries(links)) {
    const link = foot.getByRole('link', { name })
    await expect(link).toHaveAttribute('href', href)
    await expect(link).toHaveAttribute('target', '_blank')
  }
  await expect(foot).toContainText('Not affiliated with or endorsed by NASA')
  await expect(foot).toContainText('NASA EPIC')
})

test('"Back to the globe" returns to the top', async ({ page }) => {
  await openGlobe(page)
  await page.locator('footer').scrollIntoViewIfNeeded()
  await page.getByRole('link', { name: 'Back to the globe' }).click()
  await atTop(page)
})

test('keys belong to the page once the reader is in the text', async ({ page }) => {
  await openGlobe(page, '/', { still: true })
  const before = await facing(page).textContent()
  await expect(page.getByRole('button', { name: 'Play the day' })).toBeVisible()
  await page.evaluate(() => document.getElementById('about')!.scrollIntoView({ behavior: 'instant' }))
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Space')
  await page.waitForTimeout(400)
  // The globe has not turned and has not started playing.
  await expect(facing(page)).toHaveText(before!)
  await expect(page.getByRole('button', { name: 'Play the day' })).toBeAttached()
})
