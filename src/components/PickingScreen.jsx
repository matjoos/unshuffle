import { useAppState } from '../context.jsx'
import PartCard from './PartCard.jsx'
import './PickingScreen.css'

export default function PickingScreen() {
  const { state, dispatch } = useAppState()
  const { inventory, activeColorId, sets } = state

  // Filter inventory to current color
  const colorParts = Object.entries(inventory).filter(
    ([, entry]) => entry.colorId === activeColorId
  )

  // Get color info from first entry
  const colorName = colorParts.length > 0 ? colorParts[0][1].colorName : ''
  const colorHex = colorParts.length > 0 ? colorParts[0][1].colorHex : '999'

  // Separate done vs remaining, expand per-set
  const cards = []
  for (const [partKey, entry] of colorParts) {
    for (const setNum of Object.keys(entry.sets)) {
      const setData = entry.sets[setNum]
      const done = setData.found + setData.missing >= setData.needed
      cards.push({ partKey, entry, setNum, done })
    }
  }

  const remaining = cards.filter((c) => !c.done)
  const done = cards.filter((c) => c.done)

  return (
    <div className="picking-screen">
      <div className="picking-header">
        <button
          className="picking-back"
          onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'colors' })}
        >
          &larr; Colors
        </button>
        <div className="picking-color">
          <span
            className="picking-color-dot"
            style={{ backgroundColor: `#${colorHex}` }}
          />
          {colorName}
        </div>
        <span className="picking-count">
          {remaining.length} left
        </span>
      </div>

      <div className="picking-list">
        {remaining.map(({ partKey, entry, setNum }) => (
          <PartCard
            key={`${partKey}:${setNum}`}
            partKey={partKey}
            entry={entry}
            setNum={setNum}
            setName={sets[setNum]?.name || setNum}
          />
        ))}
        {done.map(({ partKey, entry, setNum }) => (
          <PartCard
            key={`${partKey}:${setNum}`}
            partKey={partKey}
            entry={entry}
            setNum={setNum}
            setName={sets[setNum]?.name || setNum}
          />
        ))}
      </div>

      {remaining.length === 0 && (
        <div className="picking-alldone">
          All {colorName} parts resolved!
        </div>
      )}
    </div>
  )
}
