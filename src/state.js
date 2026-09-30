export const STORAGE_KEY = 'unshuffle-state'
export const STATE_VERSION = 1

export const initialState = {
  version: STATE_VERSION,
  apiKey: '',
  sets: {},
  inventory: {},
  screen: 'setup',
  activeColorId: null,
  activeSetNum: null,
  hideDone: false,
  // Parts view: optional set/colour scope, grouping axis and row filter.
  view: { setNum: null, colorId: null, groupBy: 'set', filter: 'all', query: '', shared: false },
  // Recent inventory snapshots for Undo. Session-only: never persisted/exported.
  history: [],
}

const HISTORY_LIMIT = 50
const INVENTORY_ACTIONS = new Set([
  'MARK_FOUND', 'MARK_MISSING', 'UNDO_FOUND', 'UNDO_MISSING',
  'CONVERT_MISSING_TO_FOUND', 'RESOLVE_ROWS', 'ADD_MANUAL_PART',
])

// Each entry upgrades a state of version N to N+1. Version 1 is the shape
// shipped so far; states without a version are treated as version 1.
const MIGRATIONS = {}

// Upgrade any saved/exported state to the current shape, filling defaults for
// fields added later. Returns null if the version is unknown/newer.
export function migrateState(raw) {
  if (!raw || typeof raw !== 'object') return null
  let version = raw.version ?? 1
  if (!Number.isInteger(version) || version < 1 || version > STATE_VERSION) return null
  let s = { ...raw }
  while (version < STATE_VERSION) {
    s = MIGRATIONS[version](s)
    version++
  }
  s = { ...initialState, ...s, version: STATE_VERSION, history: [] }
  s.view = { ...initialState.view, ...(raw.view || {}) }
  // Older builds had separate 'picking' (one colour) and 'set' screens.
  if (s.screen === 'picking' && !raw.view) {
    s.screen = 'parts'
    s.view = { ...s.view, colorId: s.activeColorId, groupBy: 'set' }
  } else if (s.screen === 'set' && !raw.view) {
    s.screen = 'parts'
    s.view = { ...s.view, setNum: s.activeSetNum, groupBy: 'color' }
  } else if (s.screen === 'picking' || s.screen === 'set') {
    s.screen = 'parts'
  }
  return s
}

// Wraps the base reducer with a bounded undo history of inventory snapshots
// (snapshots share structure, so this is cheap even for big inventories).
export function reducer(state, action) {
  if (action.type === 'UNDO_LAST') {
    const history = state.history || []
    if (history.length === 0) return state
    return { ...state, inventory: history[history.length - 1], history: history.slice(0, -1) }
  }
  const next = baseReducer(state, action)
  if (INVENTORY_ACTIONS.has(action.type) && next.inventory !== state.inventory) {
    return { ...next, history: [...(state.history || []).slice(-(HISTORY_LIMIT - 1)), state.inventory] }
  }
  return next
}

function baseReducer(state, action) {
  switch (action.type) {
    case 'SET_API_KEY':
      return { ...state, apiKey: action.apiKey }

    case 'ADD_SET':
      return {
        ...state,
        sets: { ...state.sets, [action.setNum]: action.setInfo },
      }

    case 'REMOVE_SET': {
      const { [action.setNum]: _, ...remainingSets } = state.sets
      return { ...state, sets: remainingSets }
    }

    case 'LOAD_INVENTORY':
      return { ...state, inventory: action.inventory, screen: 'colors' }

    case 'PATCH_BL_PART_IDS': {
      // Strictly additive: sets `blPartNum` on matching inventory entries.
      // Never touches found/missing/needed/colors/names. Keys not in inventory
      // are ignored (no new entries created).
      const merged = { ...state.inventory }
      let changed = 0
      for (const [partKey, blPartNum] of Object.entries(action.patch)) {
        if (merged[partKey] && merged[partKey].blPartNum !== blPartNum) {
          merged[partKey] = { ...merged[partKey], blPartNum }
          changed++
        }
      }
      if (changed === 0) return state
      return { ...state, inventory: merged }
    }

    case 'MERGE_INVENTORY': {
      const merged = { ...state.inventory }
      for (const [key, newEntry] of Object.entries(action.additions)) {
        if (!merged[key]) {
          merged[key] = newEntry
        } else {
          merged[key] = {
            ...merged[key],
            sets: { ...merged[key].sets, ...newEntry.sets },
          }
        }
      }
      return { ...state, inventory: merged, screen: 'colors' }
    }

    case 'MARK_FOUND': {
      const entry = state.inventory[action.partKey]
      const setData = entry.sets[action.setNum]
      if (setData.found + setData.missing >= setData.needed) return state
      return {
        ...state,
        inventory: {
          ...state.inventory,
          [action.partKey]: {
            ...entry,
            sets: {
              ...entry.sets,
              [action.setNum]: { ...setData, found: setData.found + 1 },
            },
          },
        },
      }
    }

    case 'MARK_MISSING': {
      const entry = state.inventory[action.partKey]
      const setData = entry.sets[action.setNum]
      if (setData.found + setData.missing >= setData.needed) return state
      return {
        ...state,
        inventory: {
          ...state.inventory,
          [action.partKey]: {
            ...entry,
            sets: {
              ...entry.sets,
              [action.setNum]: { ...setData, missing: setData.missing + 1 },
            },
          },
        },
      }
    }

    case 'UNDO_FOUND': {
      const entry = state.inventory[action.partKey]
      const setData = entry.sets[action.setNum]
      if (setData.found <= 0) return state
      return {
        ...state,
        inventory: {
          ...state.inventory,
          [action.partKey]: {
            ...entry,
            sets: {
              ...entry.sets,
              [action.setNum]: { ...setData, found: setData.found - 1 },
            },
          },
        },
      }
    }

    case 'UNDO_MISSING': {
      const entry = state.inventory[action.partKey]
      const setData = entry.sets[action.setNum]
      if (setData.missing <= 0) return state
      return {
        ...state,
        inventory: {
          ...state.inventory,
          [action.partKey]: {
            ...entry,
            sets: {
              ...entry.sets,
              [action.setNum]: { ...setData, missing: setData.missing - 1 },
            },
          },
        },
      }
    }

    case 'CONVERT_MISSING_TO_FOUND': {
      const entry = state.inventory[action.partKey]
      const setData = entry.sets[action.setNum]
      if (setData.missing <= 0) return state
      return {
        ...state,
        inventory: {
          ...state.inventory,
          [action.partKey]: {
            ...entry,
            sets: {
              ...entry.sets,
              [action.setNum]: {
                ...setData,
                missing: setData.missing - 1,
                found: setData.found + 1,
              },
            },
          },
        },
      }
    }

    // Bulk: mark every still-unresolved unit of the given rows as found.
    case 'RESOLVE_ROWS': {
      const inventory = { ...state.inventory }
      let changed = false
      for (const { partKey, setNum } of action.rows) {
        const entry = inventory[partKey]
        const sd = entry?.sets[setNum]
        if (!sd) continue
        const remaining = sd.needed - sd.found - sd.missing
        if (remaining <= 0) continue
        inventory[partKey] = {
          ...entry,
          sets: { ...entry.sets, [setNum]: { ...sd, found: sd.found + remaining } },
        }
        changed = true
      }
      return changed ? { ...state, inventory } : state
    }

    // Escape hatch: a part that is not in the Rebrickable inventory (or extra
    // copies of one that is) and is known to be missing from a set.
    case 'ADD_MANUAL_PART': {
      const { setNum, partNum, name, colorId, colorName, colorHex, quantity } = action
      const qty = Math.max(1, Math.floor(quantity) || 1)
      const num = String(partNum).trim()
      if (!num || !state.sets[setNum]) return state
      const key = `${colorId}:${num}`
      const entry = state.inventory[key] || {
        partNum: num, blPartNum: null, name: name?.trim() || `Part ${num}`,
        colorId, colorName, colorHex, imgUrl: null, manual: true, sets: {},
      }
      const sd = entry.sets[setNum] || { needed: 0, found: 0, missing: 0 }
      return {
        ...state,
        inventory: {
          ...state.inventory,
          [key]: {
            ...entry,
            sets: { ...entry.sets, [setNum]: { ...sd, needed: sd.needed + qty, missing: sd.missing + qty } },
          },
        },
      }
    }

    case 'SET_HIDE_DONE':
      return { ...state, hideDone: !!action.value }

    case 'SET_SCREEN':
      return { ...state, screen: action.screen }

    case 'SET_ACTIVE_COLOR':
      return {
        ...state,
        activeColorId: action.colorId,
        screen: 'parts',
        view: { ...state.view, setNum: null, colorId: action.colorId, groupBy: 'set' },
      }

    case 'SET_ACTIVE_SET':
      return {
        ...state,
        activeSetNum: action.setNum,
        screen: 'parts',
        view: { ...state.view, setNum: action.setNum, colorId: null, groupBy: 'color' },
      }

    // Open the Parts view with an arbitrary scope/filter (e.g. all missing parts).
    case 'OPEN_PARTS':
      return {
        ...state,
        screen: 'parts',
        view: { ...initialState.view, ...action.view },
      }

    case 'SET_VIEW':
      return { ...state, view: { ...state.view, ...action.patch } }

    case 'RESET':
      return { ...initialState }

    case 'LOAD_STATE':
      return { ...initialState, ...action.state, history: [] }

    default:
      return state
  }
}

export function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return migrateState(JSON.parse(raw))
  } catch {
    return null
  }
}

export function exportStateToFile(state) {
  const { apiKey: _, history: __, ...safe } = state
  const blob = new Blob([JSON.stringify(safe, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `unshuffle-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export async function readStateFromFile(file) {
  const text = await file.text()
  const raw = JSON.parse(text)
  const parsed = migrateState(raw)
  if (!parsed) throw new Error(`Unsupported file version (${raw?.version})`)
  return parsed
}

export function isSetComplete(inventory, setNum) {
  let hasParts = false
  for (const entry of Object.values(inventory)) {
    const sd = entry.sets[setNum]
    if (!sd) continue
    hasParts = true
    if (sd.missing > 0 || sd.found < sd.needed) return false
  }
  return hasParts
}

export function getSetProgress(inventory, setNum) {
  let totalNeeded = 0
  let totalResolved = 0
  for (const entry of Object.values(inventory)) {
    const setData = entry.sets[setNum]
    if (setData) {
      totalNeeded += setData.needed
      totalResolved += setData.found + setData.missing
    }
  }
  return totalNeeded === 0 ? 0 : Math.round((totalResolved / totalNeeded) * 100)
}

export function getColorStats(inventory) {
  const colors = {}
  for (const entry of Object.values(inventory)) {
    if (!colors[entry.colorId]) {
      colors[entry.colorId] = {
        colorId: entry.colorId,
        colorName: entry.colorName,
        colorHex: entry.colorHex,
        totalParts: 0,
        resolvedParts: 0,
      }
    }
    for (const setData of Object.values(entry.sets)) {
      colors[entry.colorId].totalParts += setData.needed
      colors[entry.colorId].resolvedParts += setData.found + setData.missing
    }
  }
  return Object.values(colors).sort((a, b) => {
    const aRemaining = a.totalParts - a.resolvedParts
    const bRemaining = b.totalParts - b.resolvedParts
    return bRemaining - aRemaining
  })
}

// Rows of the Parts view: one per (part, set) pair matching scope + filter.
// Filters: 'all' | 'unresolved' (still to check) | 'missing' (marked missing).
export function selectPartRows(inventory, view, hideDone = false) {
  const { setNum, colorId, filter } = view
  const q = (view.query || '').trim().toLowerCase()
  const rows = []
  for (const [partKey, entry] of Object.entries(inventory)) {
    if (colorId != null && entry.colorId !== colorId) continue
    if (q && !`${entry.name} ${entry.partNum} ${entry.blPartNum || ''}`.toLowerCase().includes(q)) continue
    if (view.shared && Object.keys(entry.sets).length < 2) continue
    for (const [sn, sd] of Object.entries(entry.sets)) {
      if (setNum && sn !== setNum) continue
      const remaining = sd.needed - sd.found - sd.missing
      if (filter === 'missing' && sd.missing <= 0) continue
      if (filter === 'unresolved' && remaining <= 0) continue
      if (filter === 'all' && hideDone && remaining <= 0) continue
      rows.push({ partKey, setNum: sn, entry, done: remaining <= 0 })
    }
  }
  return rows
}
