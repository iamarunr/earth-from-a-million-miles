import { expect, test } from '@playwright/test'
import { DATES, face, facing, openGlobe, settled, zoomIn, zoomOut } from './helpers'

test('loads the latest day and builds the globe @smoke', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))

  await openGlobe(page)
  await expect(page).toHaveTitle('Earth, From a Million Miles')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Earth, From a Million Miles')
  await expect(page.locator('.date')).toHaveText('7 November 2026')
  await expect(page).toHaveURL(/\?date=2026-11-07$/)
  await expect(page.locator('.thumb')).toHaveCount(4)
  await expect(page.locator('.caption')).toContainText('Facing')
  await expect(page.locator('.caption')).toContainText('km away')
  await expect(page.locator('.note')).toContainText('Reconstructed from the day’s 4 photographs')
  await expect(page.locator('.edge')).toHaveText('Taken 00:41 to 22:17 UTC')
  expect(errors).toEqual([])
})

test('the globe is actually drawn, not left blank @smoke', async ({ page }) => {
  await openGlobe(page)
  // Give the fade-in time to finish, then look at the pixels in the middle.
  await page.waitForTimeout(1600)
  const shot = await face(page).screenshot()
  const lit = await page.evaluate(async (b64) => {
    const img = new Image()
    img.src = 'data:image/png;base64,' + b64
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.width
    c.height = img.height
    const g = c.getContext('2d')!
    g.drawImage(img, 0, 0)
    const s = Math.floor(img.width / 4)
    const d = g.getImageData(Math.floor(img.width / 2 - s / 2), Math.floor(img.height / 2 - s / 2), s, s).data
    let bright = 0
    for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 60) bright++
    return bright / (d.length / 4)
  }, shot.toString('base64'))
  expect(lit).toBeGreaterThan(0.5)
})

test.describe('choosing a day', () => {
  test('opens the day named in the address', async ({ page }) => {
    await openGlobe(page, '/?date=2017-08-21')
    await expect(page.locator('.date')).toHaveText('21 August 2017')
    await expect(page.getByLabel('Choose a date')).toHaveValue('2017-08-21')
  })

  test('moves a day with no photographs back to the closest earlier one', async ({ page }) => {
    await openGlobe(page, '/?date=2019-10-01')
    await expect(page.locator('.date')).toHaveText('27 June 2019')
    await expect(page).toHaveURL(/\?date=2019-06-27$/)
  })

  test('ignores a nonsense date in the address', async ({ page }) => {
    await openGlobe(page, '/?date=not-a-date')
    await expect(page.locator('.date')).toHaveText('7 November 2026')
  })

  test('steps to the previous and next day', async ({ page }) => {
    await openGlobe(page)
    const prev = page.getByRole('button', { name: 'Previous day with photos' })
    const next = page.getByRole('button', { name: 'Next day with photos' })
    await expect(next).toBeDisabled()
    await prev.click()
    await expect(page.locator('.date')).toHaveText('6 November 2026')
    await expect(page).toHaveURL(/\?date=2026-11-06$/)
    await expect(page.locator('.face.ready')).toBeVisible()
    await next.click()
    await expect(page.locator('.date')).toHaveText('7 November 2026')
  })

  test('cannot go before the first day', async ({ page }) => {
    await openGlobe(page, '/?date=2015-06-13')
    await expect(page.getByRole('button', { name: 'Previous day with photos' })).toBeDisabled()
    await expect(page.getByLabel('Choose a date')).toHaveAttribute('min', '2015-06-13')
    await expect(page.getByLabel('Choose a date')).toHaveAttribute('max', '2026-11-07')
  })

  test('accepts a typed date', async ({ page }) => {
    await openGlobe(page)
    await page.getByLabel('Choose a date').fill('2024-04-08')
    await expect(page.locator('.date')).toHaveText('8 April 2024')
    await expect(page).toHaveURL(/\?date=2024-04-08$/)
  })

  test('random day lands on a day that has photographs', async ({ page }) => {
    await openGlobe(page)
    await page.getByRole('button', { name: 'Random day' }).click()
    await expect(page.locator('.face.ready')).toBeVisible()
    const value = await page.getByLabel('Choose a date').inputValue()
    expect(DATES).toContain(value)
  })
})

test.describe('the day’s photographs', () => {
  test('choosing one shows exactly what the camera saw', async ({ page }) => {
    await openGlobe(page)
    await page.getByRole('button', { name: /15:05 UTC/ }).click()
    await expect(page.locator('.note')).toHaveText('Photograph 03, taken at 15:05 UTC. This is exactly what the camera saw.', { timeout: 10_000 })
    await expect(page.locator('.photo.on')).toBeVisible()
    await expect(page.locator('.photo.on')).toHaveAttribute('alt', 'Earth at 15:05 UTC on 7 November 2026')
    await expect(page.locator('.thumb.on')).toContainText('15:05')
    await expect(page.locator('.caption')).toContainText('60.8°W')
  })

  test('dragging the globe leaves the photograph and returns to the reconstruction', async ({ page }) => {
    await openGlobe(page)
    await page.getByRole('button', { name: /07:53 UTC/ }).click()
    await expect(page.locator('.photo.on')).toBeVisible({ timeout: 10_000 })
    const box = (await face(page).boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2, { steps: 6 })
    await page.mouse.up()
    await expect(page.locator('.photo.on')).toHaveCount(0)
    await expect(page.locator('.note')).toContainText('Reconstructed')
  })

  test('the globe turns by itself until stopped, then play runs through the day', async ({ page }) => {
    await openGlobe(page)
    // It arrives turning slowly, so the one button starts as Pause.
    const pause = page.getByRole('button', { name: 'Pause' })
    const play = page.getByRole('button', { name: 'Play the day' })
    await expect(pause).toBeVisible()
    const before = await facing(page).textContent()
    await expect(facing(page)).not.toHaveText(before!)

    await pause.click()
    await expect(play).toBeVisible()
    // Let it coast to a stop, then check it stays put.
    await page.waitForTimeout(800)
    const stopped = await facing(page).textContent()
    await page.waitForTimeout(600)
    await expect(facing(page)).toHaveText(stopped!)

    await play.click()
    await expect(pause).toBeVisible()
    await expect(page.locator('.thumb.on')).toContainText('07:53', { timeout: 10_000 })
    await expect(page.locator('.thumb.on')).toContainText('15:05', { timeout: 10_000 })
    await pause.click()
    await expect(play).toBeVisible()
  })

  test('with reduced motion the globe waits to be turned', async ({ page }) => {
    await openGlobe(page, '/', { still: true })
    await expect(page.getByRole('button', { name: 'Play the day' })).toBeVisible()
    const before = await facing(page).textContent()
    await page.waitForTimeout(600)
    await expect(facing(page)).toHaveText(before!)
  })
})

test.describe('turning and zooming', () => {
  test('dragging turns the globe', async ({ page }) => {
    await openGlobe(page, '/', { still: true })
    const lat = async () => (await facing(page).textContent())!.split(' ')[0]
    const before = await lat()
    const box = (await face(page).boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 - 160, box.y + box.height / 2 + 90, { steps: 8 })
    await page.mouse.up()
    // Latitude never changes while it turns by itself, so this is the drag.
    expect(await lat()).not.toBe(before)
  })

  test('arrow keys turn it, space plays, + and − zoom', async ({ page }) => {
    await openGlobe(page, '/', { still: true })
    const before = await facing(page).textContent()
    await page.keyboard.press('ArrowRight')
    await expect(facing(page)).not.toHaveText(before!)
    await page.keyboard.press('Space')
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
    await page.keyboard.press('Space')
    await expect(page.getByRole('button', { name: 'Play the day' })).toBeVisible()
    await expect(zoomOut(page)).toBeDisabled()
    await page.keyboard.press('+')
    await expect(zoomOut(page)).toBeEnabled()
    await page.keyboard.press('-')
    await expect(zoomOut(page)).toBeDisabled()
  })

  test('up and down keys scroll the page unless the globe has focus', async ({ page }) => {
    await openGlobe(page, '/', { still: true })
    const before = await facing(page).textContent()
    await page.keyboard.press('ArrowDown')
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
    await expect(facing(page)).toHaveText(before!)

    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
    await face(page).focus()
    await settled(page)
    const y = await page.evaluate(() => window.scrollY)
    await page.keyboard.press('ArrowDown')
    await expect(facing(page)).not.toHaveText(before!)
    await settled(page)
    // An unhandled Down key would have scrolled by a line or more.
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - y)).toBeLessThan(10)
  })

  test('zoom buttons work and stop at their limits', async ({ page }) => {
    await openGlobe(page)
    await expect(zoomOut(page)).toBeDisabled()
    let presses = 0
    while (await zoomIn(page).isEnabled()) {
      await zoomIn(page).click()
      expect(++presses).toBeLessThan(10)
      await page.waitForTimeout(150)
    }
    expect(presses).toBeGreaterThan(1)
    await expect(zoomOut(page)).toBeEnabled()
    while (await zoomOut(page).isEnabled()) {
      await zoomOut(page).click()
      expect(--presses).toBeGreaterThanOrEqual(0)
      await page.waitForTimeout(150)
    }
    // The same number of presses brings it all the way back.
    expect(presses).toBe(0)
    await expect(zoomIn(page)).toBeEnabled()
  })

  test('the scroll wheel zooms over the globe and scrolls the page elsewhere', async ({ page }) => {
    await openGlobe(page)
    const box = (await face(page).boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)

    // Wheel up: zooms in, the page stays put.
    await page.mouse.wheel(0, -400)
    await expect(zoomOut(page)).toBeEnabled()
    expect(await page.evaluate(() => window.scrollY)).toBe(0)

    // Wheel down: zooms back out before the page moves.
    for (let i = 0; i < 6; i++) await page.mouse.wheel(0, 400)
    await expect(zoomOut(page)).toBeDisabled()
    expect(await page.evaluate(() => window.scrollY)).toBe(0)

    // After a pause, wheel down again moves on to the text below.
    await page.waitForTimeout(600)
    await page.mouse.wheel(0, 400)
    await settled(page)
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
    await expect(zoomOut(page)).toBeDisabled()
  })

  test('the wheel scrolls the page when the pointer is off the globe', async ({ page }) => {
    await openGlobe(page)
    await page.mouse.move(100, 200)
    await page.mouse.wheel(0, -300)
    await page.mouse.wheel(0, 300)
    await settled(page)
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
    await expect(zoomOut(page)).toBeDisabled()
  })

  test('double-click zooms in', async ({ page }) => {
    await openGlobe(page)
    const box = (await face(page).boundingBox())!
    // Off-centre and away from the test events, so it is a zoom and not a selection.
    await page.mouse.dblclick(box.x + box.width * 0.5, box.y + box.height * 0.2)
    await expect(zoomOut(page)).toBeEnabled()
  })

  test('the grid can be switched on and off', async ({ page }) => {
    await openGlobe(page)
    const grid = page.getByRole('button', { name: 'Lat/long grid' })
    await expect(grid).toHaveAttribute('aria-pressed', 'false')
    await grid.click()
    await expect(grid).toHaveAttribute('aria-pressed', 'true')
  })
})
