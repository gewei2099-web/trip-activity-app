const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const PHOTON_URL = 'https://photon.komoot.io/api/'

// 国内外均优先中文
const LANG_HEADER = { 'Accept-Language': 'zh-CN,zh' }

function formatNominatim(data) {
  return data.map(item => ({
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

export async function searchPlace(query, limit = 5) {
  if (!query?.trim() || query.length < 2) return []
  const q = query.trim()

  try {
    const params = new URLSearchParams({ q, format: 'json', limit: String(limit), 'accept-language': 'zh-CN,zh' })
    const res = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: { 'User-Agent': 'TripActivityApp/1.0', ...LANG_HEADER }
    })
    if (res.ok) {
      const data = await res.json()
      return formatNominatim(data)
    }
  } catch (_) {}

  try {
    const params = new URLSearchParams({ q, limit: String(limit) })
    const res = await fetch(`${PHOTON_URL}?${params}`, {
      headers: { 'User-Agent': 'TripActivityApp/1.0', ...LANG_HEADER }
    })
    if (res.ok) {
      const data = await res.json()
      return formatPhoton(data)
    }
  } catch (_) {}

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
