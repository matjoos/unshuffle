import { useState } from 'react'
import { useAppState } from '../context.jsx'
import { fetchSetInfo, fetchSetParts, mergeInventories } from '../api.js'
import './SetupScreen.css'

export default function SetupScreen() {
  const { state, dispatch } = useAppState()
  const [setInput, setSetInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [loadingMessage, setLoadingMessage] = useState('')

  const sets = state.sets
  const hasSets = Object.keys(sets).length > 0
  const hasInventory = Object.keys(state.inventory).length > 0

  const loadedSetNums = new Set()
  for (const entry of Object.values(state.inventory)) {
    for (const s of Object.keys(entry.sets)) loadedSetNums.add(s)
  }
  const pendingSetNums = Object.keys(sets).filter((n) => !loadedSetNums.has(n))

  function normalizeSetNum(input) {
    const trimmed = input.trim()
    if (!trimmed) return null
    if (!trimmed.includes('-')) return `${trimmed}-1`
    return trimmed
  }

  async function handleAddSet(e) {
    e.preventDefault()
    const setNum = normalizeSetNum(setInput)
    if (!setNum || !state.apiKey) return
    if (sets[setNum]) {
      setError(`Set ${setNum} already added`)
      return
    }

    setError(null)
    setLoading(true)
    try {
      const info = await fetchSetInfo(state.apiKey, setNum)
      dispatch({ type: 'ADD_SET', setNum, setInfo: info })
      setSetInput('')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleStart() {
    if (!hasSets) return
    if (hasInventory && pendingSetNums.length === 0) {
      dispatch({ type: 'SET_SCREEN', screen: 'colors' })
      return
    }
    setError(null)
    setLoading(true)

    try {
      const toFetch = hasInventory ? pendingSetNums : Object.keys(sets)
      const fetched = {}
      for (let i = 0; i < toFetch.length; i++) {
        const setNum = toFetch[i]
        setLoadingMessage(`Fetching ${sets[setNum].name} (${i + 1}/${toFetch.length})...`)
        fetched[setNum] = await fetchSetParts(state.apiKey, setNum)
      }
      const built = mergeInventories(fetched)
      if (hasInventory) {
        dispatch({ type: 'MERGE_INVENTORY', additions: built })
      } else {
        dispatch({ type: 'LOAD_INVENTORY', inventory: built })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setLoadingMessage('')
    }
  }

  return (
    <div className="setup">
      <div className="setup-intro">
        <h2>Rebuild your LEGO sets</h2>
        <p>Enter set numbers to get a color-sorted picking list across all your sets.</p>
      </div>

      <div className="setup-section">
        <label htmlFor="api-key">Rebrickable API Key</label>
        <input
          id="api-key"
          type="text"
          placeholder="Your API key"
          value={state.apiKey}
          onChange={(e) => dispatch({ type: 'SET_API_KEY', apiKey: e.target.value })}
        />
        <p className="setup-help">
          Free key from{' '}
          <a href="https://rebrickable.com/api/" target="_blank" rel="noopener noreferrer">
            rebrickable.com/api
          </a>
        </p>
      </div>

      {state.apiKey && (
        <div className="setup-section">
          <label htmlFor="set-input">Add a set</label>
          <form className="set-input-row" onSubmit={handleAddSet}>
            <input
              id="set-input"
              type="text"
              placeholder="e.g. 75192 or 75192-1"
              value={setInput}
              onChange={(e) => setSetInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="btn-accent"
              disabled={loading || !setInput.trim()}
            >
              Add
            </button>
          </form>
        </div>
      )}

      {error && <p className="setup-error">{error}</p>}

      {hasSets && (
        <div className="setup-section">
          <ul className="set-list">
            {Object.entries(sets).map(([setNum, info]) => (
              <li key={setNum} className="set-list-item">
                {info.imgUrl && (
                  <img src={info.imgUrl} alt="" className="set-list-img" />
                )}
                <div className="set-list-info">
                  <strong>{info.name}</strong>
                  <span className="set-list-meta">{setNum} &middot; {info.numParts} parts</span>
                </div>
                <button
                  className="set-list-remove"
                  onClick={() => dispatch({ type: 'REMOVE_SET', setNum })}
                  disabled={loading}
                  aria-label={`Remove ${info.name}`}
                >
                  &times;
                </button>
              </li>
            ))}
          </ul>

          <button
            className="btn-accent btn-start"
            onClick={handleStart}
            disabled={loading}
          >
            {loading
              ? loadingMessage || 'Loading...'
              : hasInventory
              ? pendingSetNums.length > 0
                ? `Add ${pendingSetNums.length} set${pendingSetNums.length > 1 ? 's' : ''}`
                : 'Back to Sorting'
              : 'Start Sorting'}
          </button>
        </div>
      )}
    </div>
  )
}
