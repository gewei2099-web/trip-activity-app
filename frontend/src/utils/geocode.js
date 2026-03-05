const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const PHOTON_URL = 'https://photon.komoot.io/api/'
const OPENMETEO_URL = 'https://geocoding-api.open-meteo.com/v1/search'

// 国内外均优先中文
const LANG_HEADER = { 'Accept-Language': 'zh-CN,zh' }

// 常见中文地点 → 英文回退查询（用于 Nominatim/Photon 返回空时）
const PLACE_FALLBACKS = {
  '新加坡樟宜机场': ['Changi Airport Singapore', 'Changi Airport'],
  '樟宜机场': ['Changi Airport Singapore', 'Changi Airport'],
  '北京首都机场': ['Beijing Capital International Airport'],
  '浦东机场': ['Shanghai Pudong International Airport'],
  '虹桥机场': ['Shanghai Hongqiao Airport']
}

function formatNominatim(data) {
  return (data || []).map(item => ({
    display: item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon)
  }))
}

function formatPhoton(data) {
  return (data.features || []).map(f => {
    const [lng, lat] = f.geometry?.coordinates || [0, 0]
    const name = f.properties?.name || f.properties?.street || f.properties?.city || ''
    const addr = [f.properties?.street, f.properties?.city, f.properties?.state, f.properties?.country].filter(Boolean).join(', ')
    return {
      display: name ? `${name}${addr ? ' · ' + addr : ''}` : addr || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
      lat: parseFloat(lat),
      lng: parseFloat(lng)
    }
  })
}

function formatOpenMeteo(data) {
  return (data.results || []).map(r => ({
    display: r.name + (r.country ? `, ${r.country}` : ''),
    lat: parseFloat(r.latitude),
    lng: parseFloat(r.longitude)
  }))
}

async function tryNominatim(q, limit) {
  const params = new URLSearchParams({ q, format: 'json', limit: String(limit), 'accept-language': 'zh-CN,zh' })
  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { 'User-Agent': 'TripActivityApp/1.0', ...LANG_HEADER }
  })
  if (!res.ok) return []
  const data = await res.json()
  return formatNominatim(data)
}

async function tryPhoton(q, limit) {
  const params = new URLSearchParams({ q, limit: String(limit) })
  const res = await fetch(`${PHOTON_URL}?${params}`, {
    headers: { 'User-Agent': 'TripActivityApp/1.0', ...LANG_HEADER }
  })
  if (!res.ok) return []
  const data = await res.json()
  return formatPhoton(data)
}

async function tryOpenMeteo(q, limit) {
  const params = new URLSearchParams({ name: q, count: String(limit) })
  const res = await fetch(`${OPENMETEO_URL}?${params}`)
  if (!res.ok) return []
  const data = await res.json()
  return formatOpenMeteo(data)
}

export async function searchPlace(query, limit = 5) {
  if (!query?.trim() || query.length < 2) return []
  const q = query.trim()

  // 收集要尝试的查询（含英文回退）
  const queriesToTry = [q]
  for (const [zh, enList] of Object.entries(PLACE_FALLBACKS)) {
    if (q.includes(zh)) {
      queriesToTry.push(...enList)
      break
    }
  }

  for (const tryQ of queriesToTry) {
    try {
      let list = await tryNominatim(tryQ, limit)
      if (list.length > 0) return list
    } catch (_) {}

    try {
      let list = await tryPhoton(tryQ, limit)
      if (list.length > 0) return list
    } catch (_) {}

    try {
      let list = await tryOpenMeteo(tryQ, limit)
      if (list.length > 0) return list
    } catch (_) {}
  }

  throw new Error('地点搜索失败，可能是网络限制。请点击「地图选点」在地图上选位置')
}

export async function reverseGeocode(lat, lng) {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: 'json',
      'accept-language': 'zh-CN,zh'
    })
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      headers: { 'User-Agent': 'TripActivityApp/1.0', ...LANG_HEADER }
    })
    if (res.ok) {
      const data = await res.json()
      return data.display_name || ''
    }
  } catch (_) {}
  return ''
}
