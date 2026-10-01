import { useMemo, useState } from 'react'
import { useAppState } from '../context.jsx'
import { getSetProgress, isSetComplete, exportStateToFile } from '../state.js'
import { fetchBrickLinkColorMap, fetchSetParts } from '../api.js'
import { buildBrickLinkXML, buildCSV, downloadFile } from '../export.js'
import SetLink from './SetLink.jsx'
import ProgressBar from './ProgressBar.jsx'
import './SummaryScreen.css'

export default function SummaryScreen() {
  const { state, dispatch } = useAppState()
  const { inventory, sets } = state
  const [exporting, setExporting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshStatus, setRefreshStatus] = useState('')

  let totalMissing = 0
  for (const entry of Object.values(inventory)) {
    for (const sd of Object.values(entry.sets)) totalMissing += sd.missing
  }

  // Count missing-part entries without a BrickLink mapping (for UI warning).
  const unmappedCount = useMemo(() => {
    const { unmapped } = buildBrickLinkXML(inventory, {})
    return unmapped.length
  }, [inventory])

  async function handleExportXML() {
    setExporting(true)
    try {
      const colorMap = await fetchBrickLinkColorMap(state.apiKey)
      const { xml } = buildBrickLinkXML(inventory, colorMap)
      downloadFile(xml, 'unshuffle-missing.xml', 'application/xml')
    } catch {
      const { xml } = buildBrickLinkXML(inventory, {})
      downloadFile(xml, 'unshuffle-missing.xml', 'application/xml')
    } finally {
      setExporting(false)
    }
  }

  async function handleRefreshPartIds() {
    const msg =
      'This fetches BrickLink part IDs for all your loaded sets so the ' +
      'exported XML works with BrickLink Wanted Lists. Your progress ' +
      '(found/missing counts) will not be changed. A backup of your ' +
      'current progress will be downloaded first. Continue?'
    if (!confirm(msg)) return

    // 1. Safety backup.
    exportStateToFile(state)

    setRefreshing(true)
    try {
      const patch = {}
      const setNums = Object.keys(state.sets)
      let mappedCount = 0
      for (let i = 0; i < setNums.length; i++) {
        const setNum = setNums[i]
        setRefreshStatus(
          `Fetching ${sets[setNum]?.name || setNum} (${i + 1}/${setNums.length})...`
        )
        const parts = await fetchSetParts(state.apiKey, setNum)
        for (const p of parts) {
          if (p.blPartNum) {
            const key = `${p.colorId}:${p.partNum}`
            if (!(key in patch)) mappedCount++
            patch[key] = p.blPartNum
          }
        }
      }
      dispatch({ type: 'PATCH_BL_PART_IDS', patch })
      setRefreshStatus(`Updated ${mappedCount} parts with BrickLink IDs.`)
    } catch (err) {
      setRefreshStatus('Refresh failed: ' + err.message)
    } finally {
      setRefreshing(false)
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
        {Object.entries(sets)
          .filter(([setNum]) => !state.hideDone || !isSetComplete(inventory, setNum))
          .map(([setNum, info]) => (
          <ProgressBar
            key={setNum}
            labelNode={
              <>
                <SetLink setNum={setNum}>{info.name}</SetLink> ({setNum})
              </>
            }
            percent={getSetProgress(inventory, setNum)}
            complete={isSetComplete(inventory, setNum)}
          />
        ))}
      </div>

      <label className="set-screen-toggle">
        <input
          type="checkbox"
          checked={state.hideDone}
          onChange={(e) => dispatch({ type: 'SET_HIDE_DONE', value: e.target.checked })}
        />
        Hide done sets
      </label>

      <div className="summary-missing-header">
        <h2>Missing Parts ({totalMissing})</h2>
        {totalMissing > 0 && (
          <button
            className="btn-export-secondary"
            onClick={() => dispatch({ type: 'OPEN_PARTS', view: { filter: 'missing', groupBy: 'color' } })}
          >
            Review &amp; mark found
          </button>
        )}
      </div>

      {totalMissing === 0 ? (
        <p className="summary-none">No missing parts yet! Keep sorting.</p>
      ) : (
        <>
          {(unmappedCount > 0 || refreshStatus) && (
            <div className="summary-refresh-note">
              {unmappedCount > 0 && (
                <p>
                  <strong>{unmappedCount}</strong>{' '}
                  {unmappedCount === 1 ? 'part is' : 'parts are'} missing a
                  BrickLink ID and may be rejected on upload. Click Refresh to
                  fetch the correct IDs from Rebrickable.
                </p>
              )}
              {refreshStatus && <p className="summary-refresh-status">{refreshStatus}</p>}
              <button
                className="btn-export-secondary"
                onClick={handleRefreshPartIds}
                disabled={refreshing}
              >
                {refreshing ? 'Refreshing...' : 'Refresh part IDs'}
              </button>
            </div>
          )}

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
