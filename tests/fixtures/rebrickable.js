// Fixture data in the exact shape of Rebrickable API v3 responses consumed by src/api.js.
// Two sets share parts (and colours) so merge/credit logic is exercised.

const part = (part_num, name, blId, img) => ({
  part_num,
  name,
  part_img_url: img ?? `https://cdn.rebrickable.com/media/parts/ldraw/0/${part_num}.png`,
  external_ids: blId ? { BrickLink: [blId], LDraw: [part_num] } : {},
})
const color = (id, name, rgb) => ({ id, name, rgb })

export const COLORS = {
  red: color(4, 'Red', 'C91A09'),
  blue: color(1, 'Blue', '0055BF'),
  white: color(15, 'White', 'FFFFFF'),
  black: color(0, 'Black', '05131D'),
}

export const SET_INFO = {
  '31058-1': {
    set_num: '31058-1', name: 'Mighty Dinosaurs', year: 2017, num_parts: 174,
    set_img_url: 'https://cdn.rebrickable.com/media/sets/31058-1.jpg',
  },
  '31088-1': {
    set_num: '31088-1', name: 'Deep Sea Creatures', year: 2019, num_parts: 230,
    set_img_url: 'https://cdn.rebrickable.com/media/sets/31088-1.jpg',
  },
  '10698-1': {
    set_num: '10698-1', name: 'Large Creative Brick Box', year: 2015, num_parts: 790,
    set_img_url: 'https://cdn.rebrickable.com/media/sets/10698-1.jpg',
  },
}

const line = (p, c, quantity, is_spare = false) => ({
  id: Math.floor(Math.random() * 1e6), inv_part_id: 1, part: p, color: c, quantity, is_spare,
  element_id: '1', num_sets: 10,
})

export const SET_PARTS = {
  '31058-1': [
    line(part('3001', 'Brick 2 x 4', '3001'), COLORS.red, 4),
    line(part('3001', 'Brick 2 x 4', '3001'), COLORS.blue, 2),
    line(part('3023', 'Plate 1 x 2', '3023'), COLORS.white, 6),
    line(part('3069bpr0001', 'Tile 1 x 2 with Eye Pattern', null), COLORS.black, 2),
    line(part('3001', 'Brick 2 x 4', '3001'), COLORS.red, 1, true), // spare: ignored
  ],
  '31088-1': [
    line(part('3001', 'Brick 2 x 4', '3001'), COLORS.red, 3),
    line(part('3023', 'Plate 1 x 2', '3023'), COLORS.white, 4),
    line(part('3023', 'Plate 1 x 2', '3023'), COLORS.blue, 5),
    line(part('3710', 'Plate 1 x 4', '3710'), COLORS.blue, 2),
  ],
  '10698-1': [
    line(part('3001', 'Brick 2 x 4', '3001'), COLORS.red, 10),
  ],
}

// Wrap results in Rebrickable's paginated envelope.
export function partsPage(setNum, { page = 1, pageSize = 1000, baseUrl = 'https://rebrickable.com/api/v3/lego' } = {}) {
  const all = SET_PARTS[setNum]
  const slice = all.slice((page - 1) * pageSize, page * pageSize)
  const hasNext = page * pageSize < all.length
  return {
    count: all.length,
    next: hasNext
      ? `${baseUrl}/sets/${setNum}/parts/?page=${page + 1}&page_size=${pageSize}&inc_minifig_parts=1`
      : null,
    previous: null,
    results: slice,
  }
}

export const COLOR_LIST = {
  count: 4,
  next: null,
  previous: null,
  results: Object.values(COLORS).map((c, i) => ({
    ...c, is_trans: false,
    external_ids: { BrickLink: { ext_ids: [[5, 7, 1, 11][i]], ext_descrs: [[c.name]] } },
  })),
}
