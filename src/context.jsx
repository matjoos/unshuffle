import { createContext, useContext, useReducer, useEffect, useRef } from 'react'
import { stateToHash, hashToAction } from './hash.js'
import { STORAGE_KEY, initialState, reducer, loadPersistedState } from './state.js'

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
      const { history: _, ...persist } = state
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persist))
    }, 500)
  }, [state])

  // Keep the URL hash in step with screen/scope; follow it on Back/Forward.
  // Search typing replaces the entry instead of pushing one per keystroke.
  const lastHash = useRef(null)
  const hash = stateToHash(state)
  useEffect(() => {
    if (hash === lastHash.current) return
    const first = lastHash.current === null
    const prevBase = (lastHash.current || '').split('&q=')[0].split('?q=')[0]
    lastHash.current = hash
    if (first && window.location.hash) return // initial deep link handled below
    if (window.location.hash === hash) return
    const typing = !first && prevBase === hash.split('&q=')[0].split('?q=')[0]
    window.history[first || typing ? 'replaceState' : 'pushState'](null, '', hash)
  }, [hash])

  useEffect(() => {
    const follow = () => {
      const action = hashToAction(window.location.hash)
      if (!action) return
      if (window.location.hash === lastHash.current) return
      lastHash.current = window.location.hash
      dispatch(action)
    }
    // Deep link on load only makes sense once there is an inventory.
    if (window.location.hash && Object.keys(state.inventory).length) follow()
    window.addEventListener('hashchange', follow)
    window.addEventListener('popstate', follow)
    return () => {
      window.removeEventListener('hashchange', follow)
      window.removeEventListener('popstate', follow)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAppState() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useAppState must be used within AppProvider')
  return ctx
}
