import { describe, it, expect } from 'vitest'
import {
  reducer, initialState, STATE_VERSION, loadPersistedState, STORAGE_KEY,
  readStateFromFile, migrateState, isSetComplete, getSetProgress, getColorStats,
  selectPartRows,
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
    expect(s).toMatchObject({ screen: 'parts', activeColorId: 4, view: { colorId: 4, setNum: null, groupBy: 'set' } })
    s = reducer(s, { type: 'SET_ACTIVE_SET', setNum: 'A' })
    expect(s).toMatchObject({ screen: 'parts', activeSetNum: 'A', view: { setNum: 'A', colorId: null, groupBy: 'color' } })
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

describe('migrateState', () => {
  it('treats versionless state as v1 and fills defaults for new fields', () => {
    const { version: _v, hideDone: _h, ...old } = base()
    const s = migrateState(old)
    expect(s.version).toBe(STATE_VERSION)
    expect(s.hideDone).toBe(false)
    expect(s.inventory['4:3001']).toEqual(base().inventory['4:3001'])
  })

  it('keeps stored progress and rejects unknown versions', () => {
    const s = migrateState({ ...base(), version: 1, hideDone: true })
    expect(s.hideDone).toBe(true)
    expect(migrateState({ version: STATE_VERSION + 1 })).toBeNull()
    expect(migrateState(null)).toBeNull()
  })

  it('loads an old persisted state via loadPersistedState', () => {
    const { hideDone: _h, ...old } = base()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...old, version: 1 }))
    expect(loadPersistedState().hideDone).toBe(false)
  })
})

describe('SET_HIDE_DONE', () => {
  it('toggles the shared hide-done setting', () => {
    expect(reducer(initialState, { type: 'SET_HIDE_DONE', value: true }).hideDone).toBe(true)
  })
})

describe('parts view', () => {
  const v = (o) => ({ ...initialState.view, ...o })
  it('migrates old picking/set screens to the parts view', () => {
    const { view: _v, ...old } = base()
    let s = migrateState({ ...old, screen: 'picking', activeColorId: 4 })
    expect(s).toMatchObject({ screen: 'parts', view: { colorId: 4, setNum: null, groupBy: 'set' } })
    s = migrateState({ ...old, screen: 'set', activeSetNum: 'B' })
    expect(s).toMatchObject({ screen: 'parts', view: { setNum: 'B', groupBy: 'color' } })
    expect(migrateState({ ...old, screen: 'colors' }).view).toEqual(initialState.view)
  })

  it('selectPartRows applies scope and filters', () => {
    const s = run(base(),
      { type: 'MARK_FOUND', partKey: '1:3023', setNum: 'A' },
      { type: 'MARK_MISSING', partKey: '4:3001', setNum: 'B' })
    const keys = (view, hide) => selectPartRows(s.inventory, v(view), hide).map((r) => `${r.partKey}@${r.setNum}`)
    expect(keys({})).toHaveLength(3)
    expect(keys({ colorId: 4 })).toEqual(['4:3001@A', '4:3001@B'])
    expect(keys({ setNum: 'A' })).toEqual(['4:3001@A', '1:3023@A'])
    expect(keys({ filter: 'unresolved' })).toEqual(['4:3001@A'])
    expect(keys({ filter: 'missing' })).toEqual(['4:3001@B'])
    expect(keys({}, true)).toEqual(['4:3001@A'])
    expect(selectPartRows(s.inventory, v({ setNum: 'B' })).every((r) => r.done)).toBe(true)
  })

  it('SET_VIEW patches and OPEN_PARTS resets', () => {
    let s = reducer(base(), { type: 'SET_VIEW', patch: { filter: 'missing' } })
    expect(s.view.filter).toBe('missing')
    s = reducer(s, { type: 'OPEN_PARTS', view: { filter: 'missing' } })
    expect(s).toMatchObject({ screen: 'parts', view: { filter: 'missing', setNum: null } })
  })
})

describe('undo history, search and bulk resolve', () => {
  const inv = () => ({
    a: { name: 'Brick 2 x 4', partNum: '3001', blPartNum: '3001', colorId: 5, colorName: 'Red', sets: { '1-1': { needed: 3, found: 1, missing: 1 }, '2-1': { needed: 2, found: 0, missing: 0 } } },
    b: { name: 'Plate 1 x 2', partNum: '3023', colorId: 1, colorName: 'Blue', sets: { '1-1': { needed: 4, found: 0, missing: 0 } } },
  })
  const base = { ...initialState, inventory: inv() }

  it('UNDO_LAST restores the previous inventory, repeatedly', () => {
    let s = reducer(base, { type: 'MARK_FOUND', partKey: 'b', setNum: '1-1' })
    s = reducer(s, { type: 'MARK_MISSING', partKey: 'b', setNum: '1-1' })
    expect(s.history).toHaveLength(2)
    s = reducer(s, { type: 'UNDO_LAST' })
    expect(s.inventory.b.sets['1-1']).toMatchObject({ found: 1, missing: 0 })
    s = reducer(s, { type: 'UNDO_LAST' })
    expect(s.inventory).toEqual(inv())
    expect(reducer(s, { type: 'UNDO_LAST' })).toBe(s)
  })

  it('no-op marks do not add history; history is bounded and not exported/migrated', () => {
    const full = reducer(base, { type: 'MARK_FOUND', partKey: 'a', setNum: '1-1' })
    const noop = reducer(full, { type: 'MARK_FOUND', partKey: 'a', setNum: '1-1' })
    expect(noop.history).toHaveLength(1)
    let s = base
    for (let i = 0; i < 80; i++) s = reducer(s, { type: i % 2 ? 'UNDO_FOUND' : 'MARK_FOUND', partKey: 'b', setNum: '1-1' })
    expect(s.history.length).toBeLessThanOrEqual(50)
    expect(migrateState({ ...s, history: [1, 2] }).history).toEqual([])
  })

  it('RESOLVE_ROWS marks only remaining units as found, one undo step', () => {
    const rows = [{ partKey: 'a', setNum: '1-1' }, { partKey: 'b', setNum: '1-1' }, { partKey: 'zz', setNum: 'x' }]
    const s = reducer(base, { type: 'RESOLVE_ROWS', rows })
    expect(s.inventory.a.sets['1-1']).toEqual({ needed: 3, found: 2, missing: 1 })
    expect(s.inventory.b.sets['1-1']).toEqual({ needed: 4, found: 4, missing: 0 })
    expect(reducer(s, { type: 'UNDO_LAST' }).inventory).toEqual(inv())
    expect(reducer(s, { type: 'RESOLVE_ROWS', rows })).toBe(s)
  })

  it('query filters rows by name, part number and BrickLink id', () => {
    const q = (query) => selectPartRows(base.inventory, { ...initialState.view, query }).map((r) => r.partKey + r.setNum)
    expect(q('plate')).toEqual(['b1-1'])
    expect(q('3001')).toEqual(['a1-1', 'a2-1'])
    expect(q('  ')).toHaveLength(3)
    expect(q('nothing')).toEqual([])
  })
})

describe('shared filter and manual parts', () => {
  const v = (o) => ({ ...initialState.view, ...o })
  it('shared filter keeps only parts used by 2+ sets', () => {
    const rows = selectPartRows(base().inventory, v({ shared: true }))
    expect(rows.map((r) => `${r.partKey}@${r.setNum}`)).toEqual(['4:3001@A', '4:3001@B'])
  })

  it('ADD_MANUAL_PART creates a missing entry, merges on repeat, is undoable', () => {
    const add = { type: 'ADD_MANUAL_PART', setNum: 'A', partNum: ' 9999 ', name: '', colorId: 1, colorName: 'Blue', colorHex: '0055BF', quantity: 2 }
    let s = reducer(base(), add)
    expect(s.inventory['1:9999']).toMatchObject({ partNum: '9999', name: 'Part 9999', manual: true })
    expect(sd(s, '1:9999', 'A')).toEqual({ needed: 2, found: 0, missing: 2 })
    s = reducer(s, add)
    expect(sd(s, '1:9999', 'A')).toEqual({ needed: 4, found: 0, missing: 4 })
    // extra copies of an existing part raise both needed and missing
    s = reducer(s, { ...add, partNum: '3023', quantity: 1 })
    expect(sd(s, '1:3023', 'A')).toEqual({ needed: 2, found: 0, missing: 1 })
    s = reducer(s, { type: 'UNDO_LAST' })
    expect(sd(s, '1:3023', 'A').needed).toBe(1)
  })

  it('ignores manual parts for unknown sets or empty numbers', () => {
    const s = base()
    expect(reducer(s, { type: 'ADD_MANUAL_PART', setNum: 'Z', partNum: '1', colorId: 1, quantity: 1 })).toBe(s)
    expect(reducer(s, { type: 'ADD_MANUAL_PART', setNum: 'A', partNum: ' ', colorId: 1, quantity: 1 })).toBe(s)
  })
})
