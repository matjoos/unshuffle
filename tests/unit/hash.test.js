import { describe, it, expect } from 'vitest'
import { stateToHash, hashToAction } from '../../src/hash.js'
import { initialState } from '../../src/state.js'

const st = (screen, view = {}) => ({ ...initialState, screen, view: { ...initialState.view, ...view } })

describe('deep-link hash', () => {
  it('encodes plain screens', () => {
    expect(stateToHash(st('colors'))).toBe('#/colors')
    expect(stateToHash(st('summary'))).toBe('#/summary')
  })
  it('round-trips the parts scope', () => {
    const view = { setNum: '31058-1', colorId: 5, groupBy: 'color', filter: 'missing', query: 'plate 1x2', shared: true }
    const h = stateToHash(st('parts', view))
    expect(h).toContain('set=31058-1')
    expect(hashToAction(h)).toEqual({ type: 'OPEN_PARTS', view })
  })
  it('default parts view has a bare hash', () => {
    expect(stateToHash(st('parts'))).toBe('#/parts')
    expect(hashToAction('#/parts').view).toEqual(initialState.view)
  })
  it('ignores junk', () => {
    expect(hashToAction('')).toBeNull()
    expect(hashToAction('#/nope')).toBeNull()
    expect(hashToAction('#/parts?color=abc').view.colorId).toBeNull()
    expect(hashToAction('#/summary')).toEqual({ type: 'SET_SCREEN', screen: 'summary' })
  })
})
