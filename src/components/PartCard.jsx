import { useAppState } from '../context.jsx'
import './PartCard.css'

export default function PartCard({ partKey, entry, setNum, setName }) {
  const { dispatch } = useAppState()
  const setData = entry.sets[setNum]
  const remaining = setData.needed - setData.found - setData.missing
  const done = remaining <= 0

  return (
    <div className={`part-card ${done ? 'part-card-done' : ''}`}>
      <div className="part-card-img">
        {entry.imgUrl ? (
          <img src={entry.imgUrl} alt={entry.name} />
        ) : (
          <div className="part-card-placeholder">{entry.partNum}</div>
        )}
      </div>
      <div className="part-card-info">
        <div className="part-card-name">{entry.name}</div>
        <div className="part-card-meta">
          {setName} &middot; {entry.partNum}
        </div>
        <div className="part-card-counts">
          <span>Need: {setData.needed}</span>
          {setData.found > 0 && (
            <span className="count-found">Found: {setData.found}</span>
          )}
          {setData.missing > 0 && (
            <span className="count-missing">Missing: {setData.missing}</span>
          )}
          {remaining > 0 && <span>Left: {remaining}</span>}
        </div>
      </div>
      <div className="part-card-actions">
        {!done ? (
          <>
            <button
              className="btn-found"
              onClick={() => dispatch({ type: 'MARK_FOUND', partKey, setNum })}
            >
              +Found
            </button>
            <button
              className="btn-missing"
              onClick={() => dispatch({ type: 'MARK_MISSING', partKey, setNum })}
            >
              +Missing
            </button>
          </>
        ) : (
          <div className="part-card-done-label">Done</div>
        )}
        {(setData.found > 0 || setData.missing > 0) && (
          <div className="part-card-undo">
            {setData.found > 0 && (
              <button onClick={() => dispatch({ type: 'UNDO_FOUND', partKey, setNum })}>
                -Found
              </button>
            )}
            {setData.missing > 0 && (
              <button onClick={() => dispatch({ type: 'UNDO_MISSING', partKey, setNum })}>
                -Missing
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
