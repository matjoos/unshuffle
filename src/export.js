export function buildBrickLinkXML(inventory, colorMap) {
  const items = []

  for (const entry of Object.values(inventory)) {
    let totalMissing = 0
    for (const setData of Object.values(entry.sets)) {
      totalMissing += setData.missing
    }
    if (totalMissing === 0) continue

    const blColorId = colorMap?.[entry.colorId]
    items.push(
      `  <ITEM>
    <ITEMTYPE>P</ITEMTYPE>
    <ITEMID>${escapeXml(entry.partNum)}</ITEMID>${blColorId != null ? `\n    <COLOR>${blColorId}</COLOR>` : ''}
    <MINQTY>${totalMissing}</MINQTY>
  </ITEM>`
    )
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<INVENTORY>
${items.join('\n')}
</INVENTORY>`
}

export function buildCSV(inventory) {
  const lines = ['Part Number,Part Name,Color,Quantity Missing']

  for (const entry of Object.values(inventory)) {
    let totalMissing = 0
    for (const setData of Object.values(entry.sets)) {
      totalMissing += setData.missing
    }
    if (totalMissing === 0) continue

    lines.push(
      `${csvEscape(entry.partNum)},${csvEscape(entry.name)},${csvEscape(entry.colorName)},${totalMissing}`
    )
  }

  return lines.join('\n')
}

export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function csvEscape(str) {
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}
