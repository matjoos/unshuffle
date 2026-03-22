import { useAppState, getSetProgress } from '../context.jsx'
import { buildBrickLinkXML, buildCSV, downloadFile } from '../export.js'
import ProgressBar from './ProgressBar.jsx'
import './SummaryScreen.css'

export default function SummaryScreen() {
  const { state, dispatch } = useAppState()
  const { inventory, sets } = state

  // Collect missing parts
  const missingParts = []
  for (const [partKey, entry] of Object.entries(inventory)) {
    for (const [setNum, setData] of Object.entries(entry.sets)) {
      if (setData.missing > 0) {
        missingParts.push({ partKey, entry, setNum, missing: setData.missing })
      }
    }
  }

  const totalMissing = missingParts.reduce((sum, p) => sum + p.missing, 0)

  function handleExportXML() {
    const xml = buildBrickLinkXML(inventory)
    downloadFile(xml, 'unshuffle-missing.xml', 'application/xml')
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
            label={info.name}
            percent={getSetProgress(inventory, setNum)}
          />
        ))}
      </div>

      <h2>Missing Parts ({totalMissing})</h2>
      {missingParts.length === 0 ? (
        <p className="summary-none">No missing parts yet! Keep sorting.</p>
      ) : (
        <>
          <ul className="summary-list">
            {missingParts.map(({ partKey, entry, setNum, missing }) => (
              <li key={`${partKey}:${setNum}`} className="summary-item">
                {entry.imgUrl && (
                  <img src={entry.imgUrl} alt="" className="summary-img" />
                )}
                <div className="summary-item-info">
                  <strong>{entry.name}</strong>
                  <span className="summary-item-meta">
                    {entry.colorName} &middot; {entry.partNum} &middot; {sets[setNum]?.name || setNum}
                  </span>
                </div>
                <span className="summary-item-qty">&times;{missing}</span>
              </li>
            ))}
          </ul>

          <div className="summary-export">
            <button className="btn-accent" onClick={handleExportXML}>
              Export BrickLink XML
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
