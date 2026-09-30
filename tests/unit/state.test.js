import { describe, it, expect } from 'vitest'
import {
  reducer, initialState, STATE_VERSION, loadPersistedState, STORAGE_KEY,
  readStateFromFile, isSetComplete, getSetProgress, getColorStats,
} from '../../src/state.js'

const inv = () => ({
  '4:3001': {
    partNum: '3001', name: 'Brick 2 x 4', colorId: 4, colorName: 'Red', colorHex: 'C91A09', imgUrl: null,
    sets: { A: { needed: 2, found: 0, missing: 0 }, B: { needed: 1, found: 0, missing: 0 } },
  },
  '1:3023': {
    partNum: '3023', name: 'Plate 1 x 2', colorId: 1, colorName: 'Blue', colorHex: '0055BF', imgUrl: null,
    sets: { A: { needed: 1, found: 0, missing: 0 } },
  },
})
const base = () => ({ ...initialState, inventory: inv(), sets: { A: { name: 'A' }, B: { name: 'B' } } })
const run = (s, ...actions) => actions.reduce(reducer, s)
const sd = (s, key, set) => s.inventory[key].sets[set]

describe('found/missing accounting', () => {
  it('marks found and missing without exceeding needed', () => {
    const a = { partKey: '4:3001', setNum: 'A' }
    const s = run(base(),
      { type: 'MARK_FOUND', ...a }, { type: 'MARK_MISSING', ...a },
      { type: 'MARK_FOUND', ...a }, { type: 'MARK_MISSING', ...a })
    expect(sd(s, '4:3001', 'A')).toEqual({ needed: 2, found: 1, missing: 1 })
  })

  it('does not mutate previous state', () => {
    const s0 = base()
    reducer(s0, { type: 'MARK_FOUND', partKey: '4:3001', setNum: 'A' })
    expect(sd(s0, '4:3001', 'A').found).toBe(0)
  })

  it('undoes found and missing, never below zero', () => {
    const a = { partKey: '4:3001', setNum: 'A' }
    let s = run(base(), { type: 'MARK_FOUND', ...a }, { type: 'MARK_MISSING', ...a })
    s = run(s, { type: 'UNDO_FOUND', ...a }, { type: 'UNDO_FOUND', ...a }, { type: 'UNDO_MISSING', ...a }, { type: 'UNDO_MISSING', ...a })
    expect(sd(s, '4:3001', 'A')).toEqual({ needed: 2, found: 0, missing: 0 })
  })

  it('converts missing to found (credit) only when something is missing', () => {
    const a = { partKey: '4:3001', setNum: 'B' }
    const s0 = base()
    expect(reducer(s0, { type: 'CONVERT_MISSING_TO_FOUND', ...a })).toBe(s0)
    const s = run(s0, { type: 'MARK_MISSING', ...a }, { type: 'CONVERT_MISSING_TO_FOUND', ...a })
    expect(sd(s, '4:3001', 'B')).toEqual({ needed: 1, found: 1, missing: 0 })
  })

  it('keeps sets independent for a shared part', () => {
    const s = run(base(), { type: 'MARK_FOUND', partKey: '4:3001', setNum: 'A' })
    expect(sd(s, '4:3001', 'B').found).toBe(0)
  })
})

describe('inventory actions', () => {
  it('MERGE_INVENTORY adds sets to existing parts and keeps progress', () => {
    let s = run(base(), { type: 'MARK_FOUND', partKey: '4:3001', setNum: 'A' })
    const additions = {
      '4:3001': { ...inv()['4:3001'], sets: { C: { needed: 5, found: 0, missing: 0 } } },
      '0:3710': { partNum: '3710', name: 'Plate', colorId: 0, colorName: 'Black', colorHex: '000', sets: { C: { needed: 1, found: 0, missing: 0 } } },
    }
    s = reducer(s, { type: 'MERGE_INVENTORY', additions })
    expect(sd(s, '4:3001', 'A').found).toBe(1)
    expect(sd(s, '4:3001', 'C').needed).toBe(5)
    expect(s.inventory['0:3710']).toBeDefined()
    expect(s.screen).toBe('colors')
  })

  it('PATCH_BL_PART_IDS is additive and ignores unknown keys', () => {
    let s = run(base(), { type: 'MARK_FOUND', partKey: '4:3001', setNum: 'A' })
    const s2 = reducer(s, { type: 'PATCH_BL_PART_IDS', patch: { '4:3001': 'bl3001', '9:nope': 'x' } })
    expect(s2.inventory['4:3001'].blPartNum).toBe('bl3001')
    expect(sd(s2, '4:3001', 'A').found).toBe(1)
    expect(s2.inventory['9:nope']).toBeUndefined()
    expect(reducer(s2, { type: 'PATCH_BL_PART_IDS', patch: { '4:3001': 'bl3001' } })).toBe(s2)
  })

  it('ADD_SET / REMOVE_SET / RESET / navigation', () => {
    let s = reducer(initialState, { type: 'ADD_SET', setNum: 'X-1', setInfo: { name: 'X' } })
    expect(s.sets['X-1'].name).toBe('X')
    s = reducer(s, { type: 'REMOVE_SET', setNum: 'X-1' })
    expect(s.sets).toEqual({})
    s = reducer(base(), { type: 'SET_ACTIVE_COLOR', colorId: 4 })
    expect(s).toMatchObject({ screen: 'picking', activeColorId: 4 })
    s = reducer(s, { type: 'SET_ACTIVE_SET', setNum: 'A' })
    expect(s).toMatchObject({ screen: 'set', activeSetNum: 'A' })
    expect(reducer(s, { type: 'RESET' })).toEqual(initialState)
  })
})

describe('selectors', () => {
  it('progress counts found + missing as resolved', () => {
    const s = run(base(),
      { type: 'MARK_FOUND', partKey: '4:3001', setNum: 'A' },
      { type: 'MARK_MISSING', partKey: '1:3023', setNum: 'A' })
    expect(getSetProgress(s.inventory, 'A')).toBe(67) // 2 of 3
    expect(getSetProgress(s.inventory, 'nope')).toBe(0)
  })

  it('a set is complete only when everything is found (not missing)', () => {
    let s = base()
    const all = [['4:3001', 'A'], ['4:3001', 'A'], ['1:3023', 'A']]
    for (const [partKey, setNum] of all) s = reducer(s, { type: 'MARK_FOUND', partKey, setNum })
    expect(isSetComplete(s.inventory, 'A')).toBe(true)
    expect(isSetComplete(s.inventory, 'B')).toBe(false)
    expect(isSetComplete(s.inventory, 'nope')).toBe(false)
    s = run(s, { type: 'UNDO_FOUND', partKey: '1:3023', setNum: 'A' }, { type: 'MARK_MISSING', partKey: '1:3023', setNum: 'A' })
    expect(getSetProgress(s.inventory, 'A')).toBe(100)
    expect(isSetComplete(s.inventory, 'A')).toBe(false)
  })

  it('colour stats total across sets, sorted by most remaining', () => {
    const s = run(base(), { type: 'MARK_FOUND', partKey: '4:3001', setNum: 'A' })
    const stats = getColorStats(s.inventory)
    expect(stats.map((c) => c.colorId)).toEqual([4, 1])
    expect(stats[0]).toMatchObject({ totalParts: 3, resolvedParts: 1 })
  })
})

describe('persistence & import compat', () => {
  it('loads persisted state of the current version', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...base(), version: STATE_VERSION }))
    expect(loadPersistedState().inventory['4:3001']).toBeDefined()
  })

  it('ignores corrupt or unknown-version storage', () => {
    localStorage.setItem(STORAGE_KEY, '{nope')
    expect(loadPersistedState()).toBeNull()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 999 }))
    expect(loadPersistedState()).toBeNull()
    localStorage.removeItem(STORAGE_KEY)
    expect(loadPersistedState()).toBeNull()
  })

  it('reads an exported file (no apiKey) and LOAD_STATE keeps defaults', async () => {
    const { apiKey: _k, ...exported } = { ...base(), version: STATE_VERSION }
    const file = new File([JSON.stringify(exported)], 'x.json')
    const parsed = await readStateFromFile(file)
    const s = reducer(initialState, { type: 'LOAD_STATE', state: parsed })
    expect(s.inventory['4:3001']).toBeDefined()
    expect(s.apiKey).toBe('')
  })

  it('rejects files of an unsupported version', async () => {
    const file = new File([JSON.stringify({ version: 42 })], 'x.json')
    await expect(readStateFromFile(file)).rejects.toThrow(/Unsupported file version/)
  })
})
