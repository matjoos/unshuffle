import { useAppState } from '../context.jsx'
import './UndoBar.css'

// Floating Undo for accidental marks (covers single and bulk changes).
export default function UndoBar() {
  const { state, dispatch } = useAppState()
  const n = state.history.length
  if (n === 0 || state.screen === 'setup') return null
  return (
    <button className="undo-bar" onClick={() => dispatch({ type: 'UNDO_LAST' })}>
      ↶ Undo <span className="undo-count">{n}</span>
    </button>
  )
}
