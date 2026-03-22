import { useState } from 'react'
import { useAppState, getSetProgress } from '../context.jsx'
import { fetchBrickLinkColorMap } from '../api.js'
import { buildBrickLinkXML, buildCSV, downloadFile } from '../export.js'
import ProgressBar from './ProgressBar.jsx'
import './SummaryScreen.css'

export default function SummaryScreen() {
  const { state, dispatch } = useAppState()
  const { inventory, sets } = state
  const [exporting, setExporting] = useState(false)

  // Collect missing parts grouped by set
  const missingBySet = {}
  for (const [partKey, entry] of Object.entries(inventory)) {
    for (const [setNum, setData] of Object.entries(entry.sets)) {
      if (setData.missing > 0) {
        if (!missingBySet[setNum]) missingBySet[setNum] = []
        missingBySet[setNum].push({ partKey, entry, setNum, missing: setData.missing })
      }
    }
  }

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
      // Fall back to export without color mapping
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

      <h2>Missing Parts ({totalMissing})</h2>
      {totalMissing === 0 ? (
        <p className="summary-none">No missing parts yet! Keep sorting.</p>
      ) : (
        <>
          {Object.entries(missingBySet).map(([setNum, parts]) => (
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
