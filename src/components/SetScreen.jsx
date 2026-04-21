import { useState } from 'react'
import { useAppState } from '../context.jsx'
import PartCard from './PartCard.jsx'
import ProgressBar from './ProgressBar.jsx'
import './SetScreen.css'

export default function SetScreen() {
  const { state, dispatch } = useAppState()
  const [hideDone, setHideDone] = useState(false)

  const setNum = state.activeSetNum
  const setInfo = state.sets[setNum]

  // Collect every inventory entry belonging to this set
  const items = []
  for (const [partKey, entry] of Object.entries(state.inventory)) {
    const setData = entry.sets[setNum]
    if (!setData) continue
    const remaining = setData.needed - setData.found - setData.missing
    const done = remaining <= 0
    items.push({ partKey, entry, setData, remaining, done })
  }

  // Group by color
  const colorMap = {}
  for (const p of items) {
    const cid = p.entry.colorId
    if (!colorMap[cid]) {
      colorMap[cid] = {
        colorId: cid,
        colorName: p.entry.colorName,
        colorHex: p.entry.colorHex,
        items: [],
      }
    }
    colorMap[cid].items.push(p)
  }

  // Sort colors by remaining count (most remaining first), then name
  const colors = Object.values(colorMap).sort((a, b) => {
    const ar = a.items.filter((p) => !p.done).length
    const br = b.items.filter((p) => !p.done).length
    if (br !== ar) return br - ar
    return a.colorName.localeCompare(b.colorName)
  })

  // Within each color: undone first, done after
  for (const c of colors) {
    c.items.sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1))
  }

  const totalNeeded = items.reduce((s, p) => s + p.setData.needed, 0)
  const totalResolved = items.reduce((s, p) => s + p.setData.found + p.setData.missing, 0)
  const percent = totalNeeded === 0 ? 0 : Math.round((totalResolved / totalNeeded) * 100)
  const totalRemaining = items.reduce((s, p) => s + Math.max(0, p.remaining), 0)

  return (
    <div className="set-screen">
      <div className="set-screen-header">
        <button
          className="set-screen-back"
          onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'colors' })}
        >
          &larr; Sets
        </button>
        {setInfo?.imgUrl && (
          <img src={setInfo.imgUrl} alt="" className="set-screen-img" />
        )}
        <div className="set-screen-info">
          <strong>{setInfo?.name || setNum}</strong>
          <span className="set-screen-meta">
            {setNum} &middot; {totalRemaining} parts left
          </span>
        </div>
      </div>

      <ProgressBar percent={percent} />

      <label className="set-screen-toggle">
        <input
          type="checkbox"
          checked={hideDone}
          onChange={(e) => setHideDone(e.target.checked)}
        />
        Hide done
      </label>

      {colors.map((c) => {
        const visible = hideDone ? c.items.filter((p) => !p.done) : c.items
        if (visible.length === 0) return null
        const undoneCount = c.items.filter((p) => !p.done).length
        return (
          <div key={c.colorId} className="set-color-group">
            <div className="set-color-header">
              <span
                className="set-color-dot"
                style={{ backgroundColor: `#${c.colorHex}` }}
              />
              <strong>{c.colorName}</strong>
              <span className="set-color-count">
                {undoneCount === 0 ? '\u2713 Done' : `${undoneCount} left`}
              </span>
            </div>
            <div className="set-color-list">
              {visible.map((p) => (
                <PartCard
                  key={p.partKey}
                  partKey={p.partKey}
                  entry={p.entry}
                  setNum={setNum}
                />
              ))}
            </div>
          </div>
        )
      })}

      {totalRemaining === 0 && (
        <div className="set-screen-alldone">
          All parts of {setInfo?.name || setNum} resolved!
        </div>
      )}
    </div>
  )
}
