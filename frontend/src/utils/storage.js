const TRIPS_KEY = 'trip_entries'
const STANDALONE_ACTIVITIES_KEY = 'trip_standalone_activities'
const API_CONFIG_KEY = 'trip_api_config'
const GEOCODING_CONFIG_KEY = 'trip_geocoding_config'
const EXPORT_VERSION = 1

// --- Trips ---
export function getTrips() {
  try {
    const raw = localStorage.getItem(TRIPS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveTrip(trip) {
  const trips = getTrips()
  const idx = trips.findIndex(t => t.id === trip.id)
  if (idx >= 0) {
    trips[idx] = trip
  } else {
    trips.unshift(trip)
  }
  localStorage.setItem(TRIPS_KEY, JSON.stringify(trips))
  return trips
}

export function deleteTrip(id) {
  const trips = getTrips().filter(t => t.id !== id)
  localStorage.setItem(TRIPS_KEY, JSON.stringify(trips))
  return trips
}

export function getTripById(id) {
  return getTrips().find(t => t.id === id)
}

// --- Standalone Activities ---
export function getStandaloneActivities() {
  try {
    const raw = localStorage.getItem(STANDALONE_ACTIVITIES_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveStandaloneActivity(activity) {
  const list = getStandaloneActivities()
  const idx = list.findIndex(a => a.id === activity.id)
  if (idx >= 0) {
    list[idx] = activity
  } else {
    list.unshift(activity)
  }
  localStorage.setItem(STANDALONE_ACTIVITIES_KEY, JSON.stringify(list))
  return list
}

export function deleteStandaloneActivity(id) {
  const list = getStandaloneActivities().filter(a => a.id !== id)
  localStorage.setItem(STANDALONE_ACTIVITIES_KEY, JSON.stringify(list))
  return list
}

export function getStandaloneActivityById(id) {
  return getStandaloneActivities().find(a => a.id === id)
}

// --- API Config ---
export function getApiConfig() {
  try {
    const raw = localStorage.getItem(API_CONFIG_KEY)
    return raw ? JSON.parse(raw) : {
      apiKey: '',
      baseUrl: 'https://api.openai.com/v1',
      model: 'gpt-4o-mini'
    }
  } catch {
    return { apiKey: '', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' }
  }
}

export function saveApiConfig(config) {
  localStorage.setItem(API_CONFIG_KEY, JSON.stringify(config))
  return config
}

// --- Geocoding Config ---
const DEFAULT_GEOCODING_CONFIG = {
  env: 'auto',           // 'auto' | 'cn' | 'intl'
  amapKey: '',
  amapSecurityKey: '',   // 高德安全密钥（若 Key 开启数字签名则必填）
  geoapifyKey: ''
}

export function getGeocodingConfig() {
  try {
    const raw = localStorage.getItem(GEOCODING_CONFIG_KEY)
    if (!raw) return { ...DEFAULT_GEOCODING_CONFIG }
    const parsed = JSON.parse(raw)
    return { ...DEFAULT_GEOCODING_CONFIG, ...parsed }
  } catch {
    return { ...DEFAULT_GEOCODING_CONFIG }
  }
}

export function saveGeocodingConfig(config) {
  localStorage.setItem(GEOCODING_CONFIG_KEY, JSON.stringify({ ...DEFAULT_GEOCODING_CONFIG, ...config }))
  return config
}

// --- Import / Export ---
export function exportData() {
  const data = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    [TRIPS_KEY]: getTrips(),
    [STANDALONE_ACTIVITIES_KEY]: getStandaloneActivities(),
    [API_CONFIG_KEY]: getApiConfig(),
    [GEOCODING_CONFIG_KEY]: getGeocodingConfig()
  }
  return JSON.stringify(data, null, 2)
}

export function importData(jsonStr, mode = 'merge') {
  try {
    const data = JSON.parse(jsonStr)
    if (!data || typeof data !== 'object') return { ok: false, error: '无效的 JSON' }

    const trips = data[TRIPS_KEY] || []
    const activities = data[STANDALONE_ACTIVITIES_KEY] || []
    const apiConfig = data[API_CONFIG_KEY]

    const geocodingConfig = data[GEOCODING_CONFIG_KEY]

    if (mode === 'overwrite') {
      localStorage.setItem(TRIPS_KEY, JSON.stringify(Array.isArray(trips) ? trips : []))
      localStorage.setItem(STANDALONE_ACTIVITIES_KEY, JSON.stringify(Array.isArray(activities) ? activities : []))
      if (apiConfig && typeof apiConfig === 'object') {
        localStorage.setItem(API_CONFIG_KEY, JSON.stringify(apiConfig))
      }
      if (geocodingConfig && typeof geocodingConfig === 'object') {
        localStorage.setItem(GEOCODING_CONFIG_KEY, JSON.stringify(geocodingConfig))
      }
    } else {
      const existingTrips = getTrips()
      const existingActivities = getStandaloneActivities()
      const tripIds = new Set(existingTrips.map(t => t.id))
      const actIds = new Set(existingActivities.map(a => a.id))

      const mergedTrips = [...existingTrips]
      ;(Array.isArray(trips) ? trips : []).forEach(t => {
        if (t.id && !tripIds.has(t.id)) {
          mergedTrips.push(t)
          tripIds.add(t.id)
        }
      })

      const mergedActivities = [...existingActivities]
      ;(Array.isArray(activities) ? activities : []).forEach(a => {
        if (a.id && !actIds.has(a.id)) {
          mergedActivities.push(a)
          actIds.add(a.id)
        }
      })

      localStorage.setItem(TRIPS_KEY, JSON.stringify(mergedTrips))
      localStorage.setItem(STANDALONE_ACTIVITIES_KEY, JSON.stringify(mergedActivities))
      if (apiConfig && typeof apiConfig === 'object') {
        localStorage.setItem(API_CONFIG_KEY, JSON.stringify(apiConfig))
      }
      if (geocodingConfig && typeof geocodingConfig === 'object') {
        localStorage.setItem(GEOCODING_CONFIG_KEY, JSON.stringify(geocodingConfig))
      }
    }

    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message || '解析失败' }
  }
}
