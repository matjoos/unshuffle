import { describe, it, expect } from 'vitest'
import { buildBrickLinkXML, buildCSV } from '../../src/export.js'

const inventory = {
  '4:3001': {
    partNum: '3001', blPartNum: '3001', name: 'Brick 2 x 4', colorId: 4, colorName: 'Red',
    sets: { A: { needed: 4, found: 1, missing: 2 }, B: { needed: 2, found: 0, missing: 1 } },
  },
  '0:3069bpr0001': {
    partNum: '3069bpr0001', blPartNum: null, name: 'Tile, 1 x 2 "Eye" & <co>', colorId: 0, colorName: 'Black',
    sets: { A: { needed: 2, found: 0, missing: 2 } },
  },
  '1:3023': {
    partNum: '3023', blPartNum: '3023', name: 'Plate 1 x 2', colorId: 1, colorName: 'Blue',
    sets: { A: { needed: 2, found: 2, missing: 0 } },
  },
}

describe('BrickLink export', () => {
  it('sums missing across sets, skips parts with none missing', () => {
    const { xml } = buildBrickLinkXML(inventory, { 4: 5, 0: 11 })
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<INVENTORY>')).toBe(true)
    expect(xml.match(/<ITEM>/g)).toHaveLength(2)
    expect(xml).toMatch(/<ITEMID>3001<\/ITEMID>\s*<COLOR>5<\/COLOR>\s*<MINQTY>3<\/MINQTY>/)
    expect(xml).not.toContain('3023')
  })

  it('reports parts without a BrickLink id and falls back to the Rebrickable id', () => {
    const { xml, unmapped } = buildBrickLinkXML(inventory, { 4: 5, 0: 11 })
    expect(unmapped).toEqual([{ partNum: '3069bpr0001', name: inventory['0:3069bpr0001'].name, colorName: 'Black', qty: 2 }])
    expect(xml).toContain('<ITEMID>3069bpr0001</ITEMID>')
  })

  it('omits COLOR when the colour is unmapped', () => {
    const { xml } = buildBrickLinkXML(inventory, {})
    expect(xml).not.toContain('<COLOR>')
    expect(buildBrickLinkXML(inventory, undefined).xml).not.toContain('<COLOR>')
  })

  it('produces an empty inventory when nothing is missing', () => {
    const { xml, unmapped } = buildBrickLinkXML({ '1:3023': inventory['1:3023'] }, {})
    expect(xml).not.toContain('<ITEM>')
    expect(unmapped).toEqual([])
  })
})

describe('CSV export', () => {
  it('writes header and quotes fields with commas/quotes', () => {
    const lines = buildCSV(inventory).split('\n')
    expect(lines[0]).toBe('Part Number,Part Name,Color,Quantity Missing')
    expect(lines).toHaveLength(3)
    expect(lines[1]).toBe('3001,Brick 2 x 4,Red,3')
    expect(lines[2]).toBe('3069bpr0001,"Tile, 1 x 2 ""Eye"" & <co>",Black,2')
  })
})
