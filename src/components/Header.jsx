import { useRef } from 'react'
import { useAppState, exportStateToFile, readStateFromFile } from '../context.jsx'
import './Header.css'

export default function Header() {
  const { state, dispatch } = useAppState()
  const fileInputRef = useRef(null)
  const hasData = Object.keys(state.inventory).length > 0
  const hasSets = Object.keys(state.sets).length > 0

  function handleReset() {
    if (confirm('Reset all progress? This cannot be undone.')) {
      dispatch({ type: 'RESET' })
    }
  }

  function handleExport() {
    exportStateToFile(state)
  }

  async function handleImportFile(e) {
    const file = e.target.files[0]
    e.target.value = ''
    if (!file) return
    try {
      const imported = await readStateFromFile(file)
      if (hasSets && !confirm('Replace current progress with imported file?')) return
      dispatch({ type: 'LOAD_STATE', state: { ...imported, apiKey: state.apiKey } })
    } catch (err) {
      alert('Import failed: ' + err.message)
    }
  }

  return (
    <header className="header">
      <h1
        className="header-title"
        onClick={() => hasData && dispatch({ type: 'SET_SCREEN', screen: 'colors' })}
        style={{ cursor: hasData ? 'pointer' : 'default' }}
      >
        Unshuffle
      </h1>
      <div className="header-actions">
        <button className="header-btn" onClick={() => fileInputRef.current?.click()}>
          Import
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handleImportFile}
          style={{ display: 'none' }}
        />
        {hasSets && (
          <button className="header-btn" onClick={handleExport}>
            Export
          </button>
        )}
        {hasData && (
          <button className="header-reset" onClick={handleReset}>
            Reset
          </button>
        )}
      </div>
    </header>
  )
}
