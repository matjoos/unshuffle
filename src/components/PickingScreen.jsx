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

  // Group by set
  const bySet = {}
  for (const [partKey, entry] of colorParts) {
    for (const setNum of Object.keys(entry.sets)) {
      if (!bySet[setNum]) bySet[setNum] = []
      const setData = entry.sets[setNum]
      const done = setData.found + setData.missing >= setData.needed
      bySet[setNum].push({ partKey, entry, setNum, done })
    }
  }

  // Count total remaining cards
  let totalRemaining = 0
  for (const cards of Object.values(bySet)) {
    totalRemaining += cards.filter((c) => !c.done).length
  }

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
          {totalRemaining} left
        </span>
      </div>

      {Object.entries(bySet).map(([setNum, cards]) => {
        const setInfo = sets[setNum]
        const remaining = cards.filter((c) => !c.done)
        const done = cards.filter((c) => c.done)
        const allDone = remaining.length === 0

        return (
          <div key={setNum} className="picking-set-group">
            <div className={`picking-set-header ${allDone ? 'picking-set-done' : ''}`}>
              {setInfo?.imgUrl && (
                <img src={setInfo.imgUrl} alt="" className="picking-set-img" />
              )}
              <div className="picking-set-info">
                <strong>{setInfo?.name || setNum}</strong>
                <span className="picking-set-num">{setNum}</span>
              </div>
              <span className="picking-set-status">
                {allDone ? '\u2713 Done' : `${remaining.length} parts left`}
              </span>
            </div>

            <div className="picking-list">
              {remaining.map(({ partKey, entry, setNum: sn }) => (
                <PartCard
                  key={`${partKey}:${sn}`}
                  partKey={partKey}
                  entry={entry}
                  setNum={sn}
                />
              ))}
              {done.map(({ partKey, entry, setNum: sn }) => (
                <PartCard
                  key={`${partKey}:${sn}`}
                  partKey={partKey}
                  entry={entry}
                  setNum={sn}
                />
              ))}
            </div>
          </div>
        )
      })}

      {totalRemaining === 0 && (
        <div className="picking-alldone">
          All {colorName} parts resolved!
        </div>
      )}
    </div>
  )
}
