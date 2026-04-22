import { useAppState, getSetProgress, getColorStats, isSetComplete } from '../context.jsx'
import ProgressBar from './ProgressBar.jsx'
import ColorSwatch from './ColorSwatch.jsx'
import './ColorsScreen.css'

export default function ColorsScreen() {
  const { state, dispatch } = useAppState()
  const colors = getColorStats(state.inventory)

  return (
    <div className="colors-screen">
      <div className="colors-progress">
        {Object.entries(state.sets).map(([setNum, info]) => (
          <button
            key={setNum}
            className="colors-progress-btn"
            onClick={() => dispatch({ type: 'SET_ACTIVE_SET', setNum })}
          >
            <ProgressBar
              label={info.name}
              percent={getSetProgress(state.inventory, setNum)}
              complete={isSetComplete(state.inventory, setNum)}
            />
          </button>
        ))}
      </div>

      <h2>Pick a color</h2>
      <p className="colors-hint">Grab a bag of one color and tap it below.</p>

      <div className="color-grid">
        {colors.map((color) => (
          <ColorSwatch
            key={color.colorId}
            color={color}
            onClick={() => dispatch({ type: 'SET_ACTIVE_COLOR', colorId: color.colorId })}
          />
        ))}
      </div>

      <button
        className="btn-accent btn-summary"
        onClick={() => dispatch({ type: 'SET_SCREEN', screen: 'summary' })}
      >
        View Missing Parts
      </button>
    </div>
  )
}
