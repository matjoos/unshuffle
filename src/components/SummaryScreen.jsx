import { useMemo, useState } from 'react'
import { useAppState, getSetProgress } from '../context.jsx'
import { fetchBrickLinkColorMap } from '../api.js'
import { buildBrickLinkXML, buildCSV, downloadFile } from '../export.js'
import ProgressBar from './ProgressBar.jsx'
import './SummaryScreen.css'

export default function SummaryScreen() {
  const { state, dispatch } = useAppState()
  const { inventory, sets } = state
  const [exporting, setExporting] = useState(false)
  const [groupBy, setGroupBy] = useState('set')

  // Group missing parts by set
  const missingBySet = {}
  for (const [partKey, entry] of Object.entries(inventory)) {
    for (const [setNum, setData] of Object.entries(entry.sets)) {
      if (setData.missing > 0) {
        if (!missingBySet[setNum]) missingBySet[setNum] = []
        missingBySet[setNum].push({ partKey, entry, setNum, missing: setData.missing })
      }
    }
  }

  // Group missing parts by color. Each part entry carries the list of sets it's
  // still missing from, so the user can tap a set-chip to credit it.
  const missingByColor = {}
  for (const [partKey, entry] of Object.entries(inventory)) {
    const setsMissing = Object.entries(entry.sets)
      .filter(([, sd]) => sd.missing > 0)
      .map(([setNum, sd]) => ({
        setNum,
        setName: sets[setNum]?.name || setNum,
        missing: sd.missing,
      }))
    if (setsMissing.length === 0) continue
    const cid = entry.colorId
    if (!missingByColor[cid]) {
      missingByColor[cid] = {
        colorId: cid,
        colorName: entry.colorName,
        colorHex: entry.colorHex,
        parts: [],
      }
    }
    missingByColor[cid].parts.push({ partKey, entry, setsMissing })
  }

  // Enrich each part with its own current total-missing qty.
  for (const c of Object.values(missingByColor)) {
    for (const p of c.parts) {
      p.total = p.setsMissing.reduce((s, sm) => s + sm.missing, 0)
    }
    c.totalMissing = c.parts.reduce((s, p) => s + p.total, 0)
  }

  // Freeze the color + part ordering at mount time so tapping a chip doesn't
  // reshuffle rows under the user's finger. Re-enter the screen to resort.
  const frozenOrder = useMemo(() => {
    const snap = {}
    for (const [partKey, entry] of Object.entries(inventory)) {
      const totalForPart = Object.values(entry.sets).reduce(
        (s, sd) => s + sd.missing,
        0
      )
      if (totalForPart === 0) continue
      const cid = entry.colorId
      if (!snap[cid]) {
        snap[cid] = {
          colorId: cid,
          colorName: entry.colorName,
          totalMissing: 0,
          parts: [],
        }
      }
      snap[cid].totalMissing += totalForPart
      snap[cid].parts.push({
        partKey,
        totalForPart,
        name: entry.name,
      })
    }
    const orderedColorIds = Object.values(snap)
      .sort((a, b) => b.totalMissing - a.totalMissing)
      .map((c) => c.colorId)
    const partOrderByColor = {}
    for (const c of Object.values(snap)) {
      partOrderByColor[c.colorId] = c.parts
        .sort(
          (a, b) =>
            b.totalForPart - a.totalForPart || a.name.localeCompare(b.name)
        )
        .map((p) => p.partKey)
    }
    return { orderedColorIds, partOrderByColor }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Build a rendered list from frozen order + live state. Colors or parts that
  // have hit 0 missing are filtered out of the live render.
  const colorGroups = frozenOrder.orderedColorIds
    .map((cid) => {
      const live = missingByColor[cid]
      if (!live) return null
      const partKeys = frozenOrder.partOrderByColor[cid] || []
      const parts = partKeys
        .map((pk) => live.parts.find((p) => p.partKey === pk))
        .filter(Boolean)
      if (parts.length === 0) return null
      return { ...live, parts }
    })
    .filter(Boolean)

  const totalMissing = Object.values(missingBySet)
    .flat()
    .reduce((sum, p) => sum + p.missing, 0)

  async function handleExportXML() {
    setExporting(true)
    try {
      const colorMap = await fetchBrickLinkColorMap(state.apiKey)
      const xml = buildBrickLinkXML(inventory, colorMap)
      downloadFile(xml, 'unshuffle-missing.xml', 'application/xml')
    } catch {
      const xml = buildBrickLinkXML(inventory, {})
      downloadFile(xml, 'unshuffle-missing.xml', 'application/xml')
    } finally {
      setExporting(false)
    }
  }

  function handleExportCSV() {
    const csv = buildCSV(inventory)
    downloadFile(csv, 'unshuffle-missing.csv', 'text/csv')
  }

  return (
    <div className="summary-screen">
      <button
        className="picking-back"
        onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'colors' })}
      >
        &larr; Colors
      </button>

      <h2>Progress</h2>
      <div className="summary-progress">
        {Object.entries(sets).map(([setNum, info]) => (
          <ProgressBar
            key={setNum}
            label={`${info.name} (${setNum})`}
            percent={getSetProgress(inventory, setNum)}
          />
        ))}
      </div>

      <div className="summary-missing-header">
        <h2>Missing Parts ({totalMissing})</h2>
        {totalMissing > 0 && (
          <div className="summary-groupby" role="tablist">
            <button
              role="tab"
              aria-selected={groupBy === 'set'}
              className={`summary-groupby-btn ${groupBy === 'set' ? 'active' : ''}`}
              onClick={() => setGroupBy('set')}
            >
              By set
            </button>
            <button
              role="tab"
              aria-selected={groupBy === 'color'}
              className={`summary-groupby-btn ${groupBy === 'color' ? 'active' : ''}`}
              onClick={() => setGroupBy('color')}
            >
              By color
            </button>
          </div>
        )}
      </div>

      {totalMissing === 0 ? (
        <p className="summary-none">No missing parts yet! Keep sorting.</p>
      ) : (
        <>
          {groupBy === 'set' &&
            Object.entries(missingBySet).map(([setNum, parts]) => (
              <div key={setNum} className="summary-set-group">
                <div className="summary-set-header">
                  {sets[setNum]?.imgUrl && (
                    <img src={sets[setNum].imgUrl} alt="" className="summary-set-img" />
                  )}
                  <div className="summary-set-info">
                    <strong>{sets[setNum]?.name || setNum}</strong>
                    <span className="summary-set-num">{setNum}</span>
                  </div>
                  <span className="summary-set-count">
                    {parts.reduce((s, p) => s + p.missing, 0)} missing
                  </span>
                </div>
                <ul className="summary-list">
                  {parts.map(({ partKey, entry, missing }) => (
                    <li key={`${partKey}:${setNum}`} className="summary-item">
                      {entry.imgUrl && (
                        <img src={entry.imgUrl} alt="" className="summary-img" />
                      )}
                      <div className="summary-item-info">
                        <strong>{entry.name}</strong>
                        <span className="summary-item-meta">
                          {entry.colorName} &middot; {entry.partNum}
                        </span>
                      </div>
                      <span className="summary-item-qty">&times;{missing}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

          {groupBy === 'color' &&
            colorGroups.map((c) => (
              <div key={c.colorId} className="summary-color-group">
                <div className="summary-color-header">
                  <span
                    className="summary-color-dot"
                    style={{ backgroundColor: `#${c.colorHex}` }}
                  />
                  <strong>{c.colorName}</strong>
                  <span className="summary-set-count">{c.totalMissing} missing</span>
                </div>
                <ul className="summary-list">
                  {c.parts.map(({ partKey, entry, setsMissing, total }) => (
                    <li key={partKey} className="summary-item summary-item-col">
                      <div className="summary-item-row">
                        {entry.imgUrl && (
                          <img src={entry.imgUrl} alt="" className="summary-img" />
                        )}
                        <div className="summary-item-info">
                          <strong>{entry.name}</strong>
                          <span className="summary-item-meta">{entry.partNum}</span>
                        </div>
                        <span className="summary-item-qty">&times;{total}</span>
                      </div>
                      <div className="summary-chip-row">
                        <span className="summary-chip-label">Found one? Credit to:</span>
                        {setsMissing.map((sm) => (
                          <button
                            key={sm.setNum}
                            className="summary-chip"
                            onClick={() =>
                              dispatch({
                                type: 'CONVERT_MISSING_TO_FOUND',
                                partKey,
                                setNum: sm.setNum,
                              })
                            }
                            title={`Credit one to ${sm.setName} (${sm.setNum})`}
                          >
                            <span className="summary-chip-name">{sm.setName}</span>
                            <span className="summary-chip-num">{sm.setNum}</span>
                            <span className="summary-chip-count">({sm.missing})</span>
                          </button>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

          <div className="summary-export">
            <button className="btn-accent" onClick={handleExportXML} disabled={exporting}>
              {exporting ? 'Preparing...' : 'Export BrickLink XML'}
            </button>
            <button className="btn-export-secondary" onClick={handleExportCSV}>
              Export CSV
            </button>
          </div>
        </>
      )}
    </div>
  )
}
