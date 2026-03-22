import { useAppState } from '../context.jsx'
import './Header.css'

export default function Header() {
  const { state, dispatch } = useAppState()
  const hasData = Object.keys(state.inventory).length > 0

  function handleReset() {
    if (confirm('Reset all progress? This cannot be undone.')) {
      dispatch({ type: 'RESET' })
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
      {hasData && (
        <button className="header-reset" onClick={handleReset}>
          Reset
        </button>
      )}
    </header>
  )
}
