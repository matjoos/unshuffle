import { vi } from 'vitest'
import { SET_INFO, partsPage, COLOR_LIST } from '../fixtures/rebrickable.js'

// Mock global fetch with Rebrickable fixtures. Returns the spy for assertions.
export function mockRebrickable({ pageSize } = {}) {
  const spy = vi.fn(async (url) => {
    const u = new URL(url)
    const json = (body, status = 200) =>
      ({ ok: status < 400, status, json: async () => body })
    let m = u.pathname.match(/\/lego\/sets\/([^/]+)\/parts\/$/)
    if (m) {
      if (!SET_INFO[m[1]]) return json({}, 404)
      return json(partsPage(m[1], { page: Number(u.searchParams.get('page') || 1), pageSize: pageSize ?? Number(u.searchParams.get('page_size')) }))
    }
    m = u.pathname.match(/\/lego\/sets\/([^/]+)\/$/)
    if (m) return SET_INFO[m[1]] ? json(SET_INFO[m[1]]) : json({}, 404)
    if (u.pathname.endsWith('/lego/colors/')) return json(COLOR_LIST)
    return json({}, 404)
  })
  vi.stubGlobal('fetch', spy)
  return spy
}
