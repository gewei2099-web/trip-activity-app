import md5 from 'md5'
import { getGeocodingConfig } from './storage'

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'
const PHOTON_URL = 'https://photon.komoot.io/api/'
const OPENMETEO_URL = 'https://geocoding-api.open-meteo.com/v1/search'
const AMAP_URL = 'https://restapi.amap.com/v3/geocode/geo'
const GEOAPIFY_URL = 'https://api.geoapify.com/v1/geocode/search'
const IPINFO_URL = 'https://ipinfo.io/json'

const LANG_HEADER = { 'Accept-Language': 'zh-CN,zh' }
const CN_COUNTRIES = ['CN', 'HK', 'MO', 'TW']

// 自动检测结果缓存（1 小时有效）
let _regionCache = null
let _regionCacheTime = 0
const CACHE_TTL = 60 * 60 * 1000

// 常见中文地点 → 英文回退查询
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

function amapSign(params, securityKey) {
  const keys = Object.keys(params).filter(k => k !== 'sig').sort()
  const str = keys.map(k => `${k}=${params[k]}`).join('&') + securityKey
  return md5(str)
}

async function tryAmap(q, limit, apiKey, securityKey) {
  if (!apiKey?.trim()) return []
  const params = { key: apiKey, address: q, output: 'json' }
  if (securityKey?.trim()) {
    params.sig = amapSign(params, securityKey.trim())
  }
  const query = new URLSearchParams(params).toString()
  const res = await fetch(`${AMAP_URL}?${query}`)
  if (!res.ok) return []
  const data = await res.json()
  if (data.status !== '1' || !data.geocodes?.length) return []
  return data.geocodes.slice(0, limit).map(r => {
    const parts = (r.location || '').split(',').map(Number)
    const lat = parts[1] ?? 0
    const lng = parts[0] ?? 0
    return { display: r.formatted_address || r.address || q, lat, lng }
  })
}

async function tryGeoapify(q, limit, apiKey) {
  if (!apiKey?.trim()) return []
  const params = new URLSearchParams({ text: q, limit: String(limit), lang: 'zh', apiKey })
  const res = await fetch(`${GEOAPIFY_URL}?${params}`)
  if (!res.ok) return []
  const data = await res.json()
  return (data.features || []).slice(0, limit).map(f => {
    const p = f.properties || {}
    const coords = f.geometry?.coordinates || []
    const lng = coords[0] ?? 0
    const lat = coords[1] ?? 0
    const display = p.formatted || [p.name, p.street, p.city, p.country].filter(Boolean).join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    return { display, lat: parseFloat(lat), lng: parseFloat(lng) }
  })
}

async function detectRegion() {
  const now = Date.now()
  if (_regionCache != null && now - _regionCacheTime < CACHE_TTL) {
    return _regionCache
  }
  try {
    const res = await fetch(IPINFO_URL, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) return 'intl'
    const data = await res.json()
    const country = data?.country || ''
    _regionCache = CN_COUNTRIES.includes(country) ? 'cn' : 'intl'
    _regionCacheTime = now
    return _regionCache
  } catch {
    _regionCache = 'intl'
    _regionCacheTime = now
    return 'intl'
  }
}

async function resolveRegion(env) {
  if (env === 'cn' || env === 'intl') return env
  return detectRegion()
}

async function runChain(q, limit, chain) {
  for (const fn of chain) {
    try {
      const list = await fn(q, limit)
      if (list?.length > 0) return list
    } catch (_) {}
  }
  return []
}

export async function searchPlace(query, limit = 5) {
  if (!query?.trim() || query.length < 2) return []
  const q = query.trim()
  const config = getGeocodingConfig()
  const region = await resolveRegion(config.env || 'auto')

  // 国内链：高德(有key) → Nominatim → Photon → Open-Meteo
  const cnChain = [
    ...(config.amapKey?.trim() ? [(query, lim) => tryAmap(query, lim, config.amapKey, config.amapSecurityKey)] : []),
    tryNominatim,
    tryPhoton,
    tryOpenMeteo
  ]
  // 海外链：Geoapify(有key) → Nominatim → Photon → Open-Meteo
  const intlChain = [
    ...(config.geoapifyKey?.trim() ? [(query, lim) => tryGeoapify(query, lim, config.geoapifyKey)] : []),
    tryNominatim,
    tryPhoton,
    tryOpenMeteo
  ]
  const chain = region === 'cn' ? cnChain : intlChain

  // 收集要尝试的查询（含英文回退）
  const queriesToTry = [q]
  for (const [zh, enList] of Object.entries(PLACE_FALLBACKS)) {
    if (q.includes(zh)) {
      queriesToTry.push(...enList)
      break
    }
  }

  for (const tryQ of queriesToTry) {
    const list = await runChain(tryQ, limit, chain)
    if (list.length > 0) return list
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
