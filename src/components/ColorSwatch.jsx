function textColorForBg(hex) {
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#333' : '#fff'
}

export default function ColorSwatch({ color, onClick }) {
  const remaining = color.totalParts - color.resolvedParts
  const done = remaining === 0
  const textColor = textColorForBg(color.colorHex)

  return (
    <button
      className="color-swatch"
      style={{
        backgroundColor: `#${color.colorHex}`,
        color: textColor,
        opacity: done ? 0.5 : 1,
      }}
      onClick={onClick}
    >
      <span className="swatch-name">{color.colorName}</span>
      <span className="swatch-count">
        {done ? '\u2713' : remaining}
      </span>
    </button>
  )
}
