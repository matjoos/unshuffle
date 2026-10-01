import './ProgressBar.css'

export default function ProgressBar({ label, percent, complete = false, labelNode }) {
  return (
    <div className="progress-bar">
      {(labelNode || label) && (
        <span className="progress-label">{labelNode || label}</span>
      )}
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="progress-pct">{percent}%</span>
      <span
        className="progress-star"
        title={complete ? 'All parts found' : ''}
        aria-hidden={!complete}
      >
        {complete ? '\u2605' : ''}
      </span>
    </div>
  )
}
