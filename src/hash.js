// Deep links: the screen and Parts scope live in the URL hash, e.g.
//   #/parts?set=41726-1&color=5&group=color&filter=missing&q=plate&shared=1
// so the browser Back button and shared links work.
const SCREENS = ['setup', 'colors', 'parts', 'summary']

export function stateToHash(state) {
  const { screen, view } = state
  if (screen !== 'parts') return `#/${screen}`
  const p = new URLSearchParams()
  if (view.setNum) p.set('set', view.setNum)
  if (view.colorId != null) p.set('color', String(view.colorId))
  if (view.groupBy !== 'set') p.set('group', view.groupBy)
  if (view.filter !== 'all') p.set('filter', view.filter)
  if (view.query) p.set('q', view.query)
  if (view.shared) p.set('shared', '1')
  const qs = p.toString()
  return `#/parts${qs ? `?${qs}` : ''}`
}

// Returns a reducer action for the hash, or null if it is empty/unknown.
export function hashToAction(hash) {
  const m = /^#\/([a-z]+)(?:\?(.*))?$/.exec(hash || '')
  if (!m || !SCREENS.includes(m[1])) return null
  if (m[1] !== 'parts') return { type: 'SET_SCREEN', screen: m[1] }
  const p = new URLSearchParams(m[2] || '')
  const color = p.get('color')
  return {
    type: 'OPEN_PARTS',
    view: {
      setNum: p.get('set') || null,
      colorId: color != null && color !== '' && !Number.isNaN(Number(color)) ? Number(color) : null,
      groupBy: p.get('group') === 'color' ? 'color' : 'set',
      filter: ['unresolved', 'missing'].includes(p.get('filter')) ? p.get('filter') : 'all',
      query: p.get('q') || '',
      shared: p.get('shared') === '1',
    },
  }
}
