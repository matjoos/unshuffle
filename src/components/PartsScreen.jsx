import { useMemo } from 'react'
import { useAppState } from '../context.jsx'
import { selectPartRows, getSetProgress, isSetComplete } from '../state.js'
import SetLink from './SetLink.jsx'
import PartCard from './PartCard.jsx'
import ProgressBar from './ProgressBar.jsx'
import './PartsScreen.css'

const FILTERS = [
  ['all', 'All'],
  ['unresolved', 'Unresolved'],
  ['missing', 'Missing'],
]

// One view for every "parts matching <filter>, grouped by <axis>" question.
export default function PartsScreen() {
  const { state, dispatch } = useAppState()
  const { inventory, sets, hideDone, view } = state
  const { setNum, colorId, groupBy, filter } = view
  const setView = (patch) => dispatch({ type: 'SET_VIEW', patch })

  const colors = useMemo(() => {
    const m = {}
    for (const e of Object.values(inventory)) {
      m[e.colorId] = { colorId: e.colorId, colorName: e.colorName, colorHex: e.colorHex }
    }
    return Object.values(m).sort((a, b) => a.colorName.localeCompare(b.colorName))
  }, [inventory])

  // Freeze group and row order when scope/grouping/filter change, so marking a
  // part doesn't reshuffle the list under the user's finger.
  const frozen = useMemo(() => {
    const rows = selectPartRows(inventory, { ...view, filter: 'all' })
    const groups = {}
    for (const r of rows) {
      const gk = groupBy === 'set' ? r.setNum : r.entry.colorId
      const g = (groups[gk] ||= { key: gk, name: groupBy === 'set' ? sets[gk]?.name || gk : r.entry.colorName, undone: 0, rows: [] })
      if (!r.done) g.undone++
      g.rows.push(r)
    }
    const ordered = Object.values(groups).sort(
      (a, b) => b.undone - a.undone || a.name.localeCompare(b.name)
    )
    const rowOrder = {}
    ordered.forEach((g, gi) => {
      g.rows
        .sort((a, b) => a.done - b.done || a.entry.name.localeCompare(b.entry.name))
        .forEach((r, ri) => { rowOrder[`${r.partKey}:${r.setNum}`] = gi * 1e6 + ri })
    })
    return { order: ordered.map((g) => g.key), rowOrder }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setNum, colorId, groupBy])

  const live = selectPartRows(inventory, view, hideDone)
  const groups = {}
  for (const r of live) {
    const gk = groupBy === 'set' ? r.setNum : r.entry.colorId
    const g = (groups[gk] ||= { key: gk, rows: [] })
    g.rows.push(r)
  }
  for (const g of Object.values(groups)) {
    g.rows.sort((a, b) =>
      (frozen.rowOrder[`${a.partKey}:${a.setNum}`] ?? 1e12) -
      (frozen.rowOrder[`${b.partKey}:${b.setNum}`] ?? 1e12))
  }
  const orderedGroups = Object.values(groups).sort(
    (a, b) => {
      const ia = frozen.order.indexOf(a.key), ib = frozen.order.indexOf(b.key)
      return (ia < 0 ? 1e9 : ia) - (ib < 0 ? 1e9 : ib)
    })

  const scoped = selectPartRows(inventory, { ...view, filter: 'all' })
  const left = scoped.filter((r) => !r.done).length
  const missingCount = scoped.reduce((n, r) => n + r.entry.sets[r.setNum].missing, 0)
  const colorInfo = colors.find((c) => c.colorId === colorId)
  const setInfo = setNum ? sets[setNum] : null

  return (
    <div className="parts-screen">
      <div className="parts-header">
        <button
          className="picking-back"
          onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'colors' })}
        >
          &larr; Colors
        </button>
        <div className="parts-title">
          {setInfo?.imgUrl && <img src={setInfo.imgUrl} alt="" className="parts-title-img" />}
          {colorInfo && (
            <span className="parts-color-dot" style={{ backgroundColor: `#${colorInfo.colorHex}` }} />
          )}
          <span>
            {[setInfo?.name || (setNum ? setNum : null), colorInfo?.colorName]
              .filter(Boolean).join(' · ') || 'All parts'}
          </span>
        </div>
        <span className="parts-count">{left} left</span>
      </div>

      {setNum && (
        <ProgressBar
          percent={getSetProgress(inventory, setNum)}
          complete={isSetComplete(inventory, setNum)}
        />
      )}

      <div className="parts-controls">
        <input
          type="search"
          className="parts-search"
          aria-label="Search parts"
          placeholder="Search parts by name or number…"
          value={view.query || ''}
          onChange={(e) => setView({ query: e.target.value })}
        />
        <div className="parts-scope">
          <label>
            Set
            <select
              aria-label="Scope set"
              value={setNum ?? ''}
              onChange={(e) => setView({ setNum: e.target.value || null })}
            >
              <option value="">All sets</option>
              {Object.entries(sets).map(([sn, info]) => (
                <option key={sn} value={sn}>{info.name} ({sn})</option>
              ))}
            </select>
          </label>
          <label>
            Color
            <select
              aria-label="Scope color"
              value={colorId ?? ''}
              onChange={(e) => setView({ colorId: e.target.value === '' ? null : Number(e.target.value) })}
            >
              <option value="">All colors</option>
              {colors.map((c) => (
                <option key={c.colorId} value={c.colorId}>{c.colorName}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="parts-seg-row">
          <div className="summary-groupby" role="tablist" aria-label="Group by">
            {[['set', 'By set'], ['color', 'By color']].map(([v, label]) => (
              <button
                key={v}
                role="tab"
                aria-selected={groupBy === v}
                className={`summary-groupby-btn ${groupBy === v ? 'active' : ''}`}
                onClick={() => setView({ groupBy: v })}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="summary-groupby" role="tablist" aria-label="Filter">
            {FILTERS.map(([v, label]) => (
              <button
                key={v}
                role="tab"
                aria-selected={filter === v}
                className={`summary-groupby-btn ${filter === v ? 'active' : ''}`}
                onClick={() => setView({ filter: v })}
              >
                {label}{v === 'missing' && missingCount > 0 ? ` (${missingCount})` : ''}
              </button>
            ))}
          </div>
        </div>
        {filter === 'all' && (
          <label className="set-screen-toggle">
            <input
              type="checkbox"
              checked={hideDone}
              onChange={(e) => dispatch({ type: 'SET_HIDE_DONE', value: e.target.checked })}
            />
            Hide done
          </label>
        )}
      </div>

      {orderedGroups.map((g) => {
        const undone = g.rows.filter((r) => !r.done).length
        const isSet = groupBy === 'set'
        const info = isSet ? sets[g.key] : null
        const colorOf = !isSet ? g.rows[0].entry : null
        return (
          <div key={g.key} className="parts-group">
            <div className="parts-group-header">
              {info?.imgUrl && <img src={info.imgUrl} alt="" className="picking-set-img" />}
              {colorOf && (
                <span className="parts-color-dot" style={{ backgroundColor: `#${colorOf.colorHex}` }} />
              )}
              <div className="picking-set-info">
                <strong>{isSet ? <SetLink setNum={g.key} /> : colorOf.colorName}</strong>
                {isSet && <span className="picking-set-num">{g.key}</span>}
              </div>
              <span className="picking-set-status">
                {undone === 0 ? '✓ Done' : `${undone} ${undone === 1 ? 'part' : 'parts'} left`}
              </span>
              {undone > 0 && (
                <button
                  className="btn-found parts-group-all"
                  title="Mark every unresolved part in this group as found (Undo available)"
                  onClick={() =>
                    dispatch({
                      type: 'RESOLVE_ROWS',
                      rows: g.rows.filter((r) => !r.done).map(({ partKey, setNum }) => ({ partKey, setNum })),
                    })
                  }
                >
                  All found
                </button>
              )}
            </div>
            <div className="picking-list">
              {g.rows.map((r) => (
                <PartCard
                  key={`${r.partKey}:${r.setNum}`}
                  partKey={r.partKey}
                  entry={r.entry}
                  setNum={r.setNum}
                  showSet={!isSet && !setNum}
                  showColor={isSet && colorId == null}
                />
              ))}
            </div>
          </div>
        )
      })}

      {orderedGroups.length === 0 && (
        <div className="picking-alldone">
          {filter === 'missing' ? 'No missing parts here.' : 'All parts here are resolved!'}
        </div>
      )}
    </div>
  )
}
