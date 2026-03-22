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

  function normalizeSetNum(input) {
    const trimmed = input.trim()
    if (!trimmed) return null
    // Add "-1" suffix if not present (most sets use -1)
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
    setError(null)
    setLoading(true)

    try {
      const fetched = {}
      const setNums = Object.keys(sets)
      for (let i = 0; i < setNums.length; i++) {
        const setNum = setNums[i]
        setLoadingMessage(`Fetching ${sets[setNum].name} (${i + 1}/${setNums.length})...`)
        fetched[setNum] = await fetchSetParts(state.apiKey, setNum)
      }
      const inventory = mergeInventories(fetched)
      dispatch({ type: 'LOAD_INVENTORY', inventory })
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
            {loading ? loadingMessage || 'Loading...' : 'Start Sorting'}
          </button>
        </div>
      )}
    </div>
  )
}
