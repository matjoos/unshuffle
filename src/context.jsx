import { createContext, useContext, useReducer, useEffect, useRef } from 'react'
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
