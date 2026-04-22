import { useMemo, useState } from 'react'
import { useAppState, isSetComplete } from '../context.jsx'
import PartCard from './PartCard.jsx'
import ProgressBar from './ProgressBar.jsx'
import './SetScreen.css'

export default function SetScreen() {
  const { state, dispatch } = useAppState()
  const [hideDone, setHideDone] = useState(false)

  const setNum = state.activeSetNum
  const setInfo = state.sets[setNum]

  // Freeze ordering at entry time (per setNum) so marking a piece doesn't
  // shuffle the color group or the card under the user's finger.
  const frozen = useMemo(() => {
    const byColor = {}
    for (const [partKey, entry] of Object.entries(state.inventory)) {
      const sd = entry.sets[setNum]
      if (!sd) continue
      if (!byColor[entry.colorId]) {
        byColor[entry.colorId] = {
          colorId: entry.colorId,
          colorName: entry.colorName,
          undoneCount: 0,
          parts: [],
        }
      }
      const done = sd.needed - sd.found - sd.missing <= 0
      if (!done) byColor[entry.colorId].undoneCount++
      byColor[entry.colorId].parts.push({ partKey, done })
    }
    const orderedColorIds = Object.values(byColor)
      .sort(
        (a, b) =>
          b.undoneCount - a.undoneCount || a.colorName.localeCompare(b.colorName)
      )
      .map((c) => c.colorId)
    const partOrderByColor = {}
    for (const c of Object.values(byColor)) {
      partOrderByColor[c.colorId] = c.parts
        .sort((a, b) => (a.done === b.done ? 0 : a.done ? 1 : -1))
        .map((p) => p.partKey)
    }
    return { orderedColorIds, partOrderByColor }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setNum])

  // Current-state color map: live entries keyed by partKey for fast lookup.
  const colorMap = {}
  let totalNeeded = 0
  let totalResolved = 0
  let totalRemaining = 0
  for (const [partKey, entry] of Object.entries(state.inventory)) {
    const sd = entry.sets[setNum]
    if (!sd) continue
    totalNeeded += sd.needed
    totalResolved += sd.found + sd.missing
    const remaining = sd.needed - sd.found - sd.missing
    totalRemaining += Math.max(0, remaining)
    const done = remaining <= 0
    if (!colorMap[entry.colorId]) {
      colorMap[entry.colorId] = {
        colorId: entry.colorId,
        colorName: entry.colorName,
        colorHex: entry.colorHex,
        items: {},
      }
    }
    colorMap[entry.colorId].items[partKey] = { partKey, entry, setData: sd, done }
  }
  const percent =
    totalNeeded === 0 ? 0 : Math.round((totalResolved / totalNeeded) * 100)

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

      <ProgressBar
        percent={percent}
        complete={isSetComplete(state.inventory, setNum)}
      />

      <label className="set-screen-toggle">
        <input
          type="checkbox"
          checked={hideDone}
          onChange={(e) => setHideDone(e.target.checked)}
        />
        Hide done
      </label>

      {frozen.orderedColorIds.map((cid) => {
        const c = colorMap[cid]
        if (!c) return null
        const partKeys = frozen.partOrderByColor[cid] || []
        const itemsInOrder = partKeys.map((k) => c.items[k]).filter(Boolean)
        const visible = hideDone
          ? itemsInOrder.filter((p) => !p.done)
          : itemsInOrder
        if (visible.length === 0) return null
        const undoneCount = itemsInOrder.filter((p) => !p.done).length
        return (
          <div key={cid} className="set-color-group">
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
