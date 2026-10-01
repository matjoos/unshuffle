import { describe, it, expect, afterEach } from 'vitest'
import { vi } from 'vitest'
import { fetchSetInfo, fetchSetParts, fetchBrickLinkColorMap, mergeInventories } from '../../src/api.js'
import { mockRebrickable } from './helpers.js'

afterEach(() => vi.unstubAllGlobals())

describe('api', () => {
  it('maps set info and sends the key header', async () => {
    const spy = mockRebrickable()
    const info = await fetchSetInfo('KEY', '31058-1')
    expect(info).toEqual({
      name: 'Mighty Dinosaurs', numParts: 174, year: 2017,
      imgUrl: 'https://cdn.rebrickable.com/media/sets/31058-1.jpg',
    })
    expect(spy.mock.calls[0][1].headers.Authorization).toBe('key KEY')
  })

  it('throws readable errors', async () => {
    mockRebrickable()
    await expect(fetchSetInfo('K', '99999-1')).rejects.toThrow('Set not found')
    vi.stubGlobal('fetch', async () => ({ ok: false, status: 401 }))
    await expect(fetchSetInfo('K', 'x')).rejects.toThrow('Invalid API key')
    vi.stubGlobal('fetch', async () => ({ ok: false, status: 429 }))
    await expect(fetchSetInfo('K', 'x')).rejects.toThrow(/Rate limited/)
    vi.stubGlobal('fetch', async () => ({ ok: false, status: 500 }))
    await expect(fetchSetInfo('K', 'x')).rejects.toThrow('API error: 500')
  })

  it('skips spare parts and extracts BrickLink ids', async () => {
    mockRebrickable()
    const parts = await fetchSetParts('K', '31058-1')
    expect(parts).toHaveLength(4)
    expect(parts[0]).toMatchObject({ partNum: '3001', blPartNum: '3001', colorId: 4, quantity: 4 })
    expect(parts.find((p) => p.partNum === '3069bpr0001').blPartNum).toBeNull()
  })

  it('follows pagination', async () => {
    const spy = mockRebrickable({ pageSize: 2 })
    const parts = await fetchSetParts('K', '31088-1')
    expect(parts).toHaveLength(4)
    expect(spy).toHaveBeenCalledTimes(2)
  })

  it('builds a Rebrickable -> BrickLink colour map', async () => {
    mockRebrickable()
    const map = await fetchBrickLinkColorMap('K')
    expect(map).toEqual({ 4: 5, 1: 7, 15: 1, 0: 11 })
  })

  it('merges sets into a colour:part keyed inventory with shared parts', async () => {
    mockRebrickable()
    const fetched = {
      '31058-1': await fetchSetParts('K', '31058-1'),
      '31088-1': await fetchSetParts('K', '31088-1'),
    }
    const inv = mergeInventories(fetched)
    expect(Object.keys(inv)).toHaveLength(6)
    expect(inv['4:3001'].sets).toEqual({
      '31058-1': { needed: 4, found: 0, missing: 0 },
      '31088-1': { needed: 3, found: 0, missing: 0 },
    })
    expect(inv['15:3023'].sets['31088-1'].needed).toBe(4)
  })

  it('sums duplicate lines within one set', () => {
    const p = { partNum: 'a', colorId: 1, colorName: 'Blue', colorHex: '00F', name: 'A', quantity: 2 }
    const inv = mergeInventories({ 'x-1': [p, p] })
    expect(inv['1:a'].sets['x-1'].needed).toBe(4)
  })
})
