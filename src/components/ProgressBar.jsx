import './ProgressBar.css'

export default function ProgressBar({ label, percent }) {
  return (
    <div className="progress-bar">
      {label && <span className="progress-label">{label}</span>}
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="progress-pct">{percent}%</span>
    </div>
  )
}
