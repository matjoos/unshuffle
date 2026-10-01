import { useAppState } from '../context.jsx'

// A set name/number that jumps to that set's screen.
export default function SetLink({ setNum, children, className = '' }) {
  const { state, dispatch } = useAppState()
  return (
    <button
      type="button"
      className={`set-link ${className}`}
      onClick={() => dispatch({ type: 'SET_ACTIVE_SET', setNum })}
      title={`Open ${state.sets[setNum]?.name || setNum}`}
    >
      {children ?? state.sets[setNum]?.name ?? setNum}
    </button>
  )
}
