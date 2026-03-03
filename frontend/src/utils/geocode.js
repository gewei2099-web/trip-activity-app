const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search'

export async function searchPlace(query, limit = 5) {
  if (!query?.trim() || query.length < 2) return []
  const params = new URLSearchParams({
    q: query.trim(),
    format: 'json',
    limit: String(limit),
    addressdetails: '1'
  })
  const res = await fetch(`${NOMINATIM_URL}?${params}`, {
    headers: { 'User-Agent': 'TripActivityApp/1.0' }
  })
  if (!res.ok) throw new Error('地点搜索失败')
  const data = await res.json()
  return data.map(item => ({
    display: item.display_name,
    lat: parseFloat(item.lat),
    lng: parseFloat(item.lon),
    placeId: item.place_id
  }))
}
