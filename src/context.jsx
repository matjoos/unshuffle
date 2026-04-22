import { createContext, useContext, useReducer, useEffect, useRef } from 'react'

const STORAGE_KEY = 'unshuffle-state'
const STATE_VERSION = 1

const initialState = {
  version: STATE_VERSION,
  apiKey: '',
  sets: {},
  inventory: {},
  screen: 'setup',
  activeColorId: null,
  activeSetNum: null,
}

function reducer(state, action) {
  switch (action.type) {
    case 'SET_API_KEY':
      return { ...state, apiKey: action.apiKey }

    case 'ADD_SET':
      return {
        ...state,
        sets: { ...state.sets, [action.setNum]: action.setInfo },
      }

    case 'REMOVE_SET':
      const { [action.setNum]: _, ...remainingSets } = state.sets
      return { ...state, sets: remainingSets }

    case 'LOAD_INVENTORY':
      return { ...state, inventory: action.inventory, screen: 'colors' }

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

    case 'SET_SCREEN':
      return { ...state, screen: action.screen }

    case 'SET_ACTIVE_COLOR':
      return { ...state, activeColorId: action.colorId, screen: 'picking' }

    case 'SET_ACTIVE_SET':
      return { ...state, activeSetNum: action.setNum, screen: 'set' }

    case 'RESET':
      return { ...initialState }

    case 'LOAD_STATE':
      return { ...initialState, ...action.state }

    default:
      return state
  }
}

function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed.version !== STATE_VERSION) return null
    return parsed
  } catch {
    return null
  }
}

const AppContext = createContext(null)

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, () => {
    const persisted = loadPersistedState()
    return persisted || initialState
  })

  const debounceRef = useRef(null)

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    }, 500)
  }, [state])

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppState() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppState must be used within AppProvider')
  return ctx
}

export function exportStateToFile(state) {
  const { apiKey: _, ...safe } = state
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
  const parsed = JSON.parse(text)
  if (parsed.version !== STATE_VERSION) {
    throw new Error(`Unsupported file version (${parsed.version})`)
  }
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
