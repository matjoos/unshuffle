import { test as base, expect } from '@playwright/test'
import { SET_INFO, partsPage, COLOR_LIST } from '../fixtures/rebrickable.js'

// Intercept all Rebrickable API traffic with fixtures; images get a 1x1 png.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')

export const test = base.extend({
  page: async ({ page }, use) => {
    await page.route('https://rebrickable.com/api/v3/lego/**', async (route) => {
      const u = new URL(route.request().url())
      const json = (body, status = 200) =>
        route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
      let m = u.pathname.match(/\/lego\/sets\/([^/]+)\/parts\/$/)
      if (m) return SET_INFO[m[1]] ? json(partsPage(m[1])) : json({}, 404)
      m = u.pathname.match(/\/lego\/sets\/([^/]+)\/$/)
      if (m) return SET_INFO[m[1]] ? json(SET_INFO[m[1]]) : json({}, 404)
      if (u.pathname.endsWith('/lego/colors/')) return json(COLOR_LIST)
      return json({}, 404)
    })
    await page.route(/cdn\.rebrickable\.com/, (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: PNG }))
    await use(page)
  },
})
export { expect }

export async function addSets(page, nums, key = 'test-key') {
  await page.goto('./')
  await page.getByLabel('Rebrickable API Key').fill(key)
  for (const n of nums) {
    await page.getByLabel('Add a set').fill(n)
    await page.getByRole('button', { name: 'Add', exact: true }).click()
    await expect(page.getByRole('button', { name: /^Remove / }).last()).toBeVisible()
  }
  await page.getByRole('button', { name: 'Start Sorting' }).click()
  await expect(page.getByRole('heading', { name: 'Pick a color' })).toBeVisible()
}
