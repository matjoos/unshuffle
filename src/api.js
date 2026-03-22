const BASE_URL = 'https://rebrickable.com/api/v3/lego'

async function apiFetch(apiKey, path) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `key ${apiKey}` },
  })
  if (res.status === 401) throw new Error('Invalid API key')
  if (res.status === 404) throw new Error('Set not found')
  if (res.status === 429) throw new Error('Rate limited — wait a moment and try again')
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  return res.json()
}

export async function fetchSetInfo(apiKey, setNum) {
  const data = await apiFetch(apiKey, `/sets/${setNum}/`)
  return {
    name: data.name,
    numParts: data.num_parts,
    imgUrl: data.set_img_url,
    year: data.year,
  }
}

export async function fetchSetParts(apiKey, setNum) {
  const parts = []
  let url = `/sets/${setNum}/parts/?page_size=1000&inc_minifig_parts=1`

  while (url) {
    const data = await apiFetch(apiKey, url)
    for (const item of data.results) {
      if (item.is_spare) continue
      parts.push({
        partNum: item.part.part_num,
        name: item.part.name,
        imgUrl: item.part.part_img_url,
        colorId: item.color.id,
        colorName: item.color.name,
        colorHex: item.color.rgb,
        quantity: item.quantity,
      })
    }
    // next is a full URL — extract the path portion
    if (data.next) {
      url = data.next.replace(BASE_URL, '')
    } else {
      url = null
    }
  }

  return parts
}

export function mergeInventories(fetchedSets) {
  const inventory = {}
  for (const [setNum, parts] of Object.entries(fetchedSets)) {
    for (const part of parts) {
      const key = `${part.colorId}:${part.partNum}`
      if (!inventory[key]) {
        inventory[key] = {
          partNum: part.partNum,
          name: part.name,
          colorId: part.colorId,
          colorName: part.colorName,
          colorHex: part.colorHex,
          imgUrl: part.imgUrl,
          sets: {},
        }
      }
      if (!inventory[key].sets[setNum]) {
        inventory[key].sets[setNum] = { needed: 0, found: 0, missing: 0 }
      }
      inventory[key].sets[setNum].needed += part.quantity
    }
  }
  return inventory
}
