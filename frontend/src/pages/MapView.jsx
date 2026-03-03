import React, { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { getTrips, getStandaloneActivities } from '../utils/storage'
import L from 'leaflet'

// 修复 Leaflet 默认图标在 vite 下的路径问题
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
})

function collectMarkers(trips, standaloneActivities) {
  const list = []
  trips.forEach(t => {
    t.days?.forEach(d => {
      (d.activities || [])
        .filter(a => a.lat != null && a.lng != null && !isNaN(parseFloat(a.lat)) && !isNaN(parseFloat(a.lng)))
        .forEach(a => {
          list.push({
            ...a,
            lat: parseFloat(a.lat),
            lng: parseFloat(a.lng),
            tripTitle: t.title,
            link: `/trip/${t.id}`
          })
        })
    })
  })
  standaloneActivities
    .filter(a => a.lat != null && a.lng != null && !isNaN(parseFloat(a.lat)) && !isNaN(parseFloat(a.lng)))
    .forEach(a => {
      list.push({
        ...a,
        lat: parseFloat(a.lat),
        lng: parseFloat(a.lng),
        tripTitle: null,
        link: `/activity/${a.id}`
      })
    })
  return list
}

const DEFAULT_CENTER = [39.9, 116.4]
const DEFAULT_ZOOM = 10

export default function MapView() {
  const trips = getTrips()
  const activities = getStandaloneActivities()
  const markers = useMemo(() => collectMarkers(trips, activities), [trips, activities])

  const center = markers.length > 0 ? [markers[0].lat, markers[0].lng] : DEFAULT_CENTER

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>地图视图</h1>
      <p style={styles.hint}>© OpenStreetMap contributors</p>
      <div style={styles.mapWrap}>
        <MapContainer
          center={center}
          zoom={DEFAULT_ZOOM}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {markers.map((m, i) => (
            <Marker key={i} position={[m.lat, m.lng]}>
              <Popup>
                <div>
                  <strong>{m.title}</strong>
                  {m.place && <div>{m.place}</div>}
                  {m.tripTitle && <div style={{ fontSize: 12, color: '#666' }}>{m.tripTitle}</div>}
                  <Link to={m.link} style={styles.popupLink}>查看详情</Link>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
      {markers.length === 0 && (
        <p style={styles.empty}>暂无带坐标的活动，可在行程或活动中添加经纬度</p>
      )}
    </div>
  )
}

const styles = {
  page: { padding: 16, paddingBottom: 80 },
  title: { fontSize: 22, marginBottom: 8, fontWeight: 600 },
  hint: { fontSize: 12, color: '#666', marginBottom: 12 },
  mapWrap: { height: 400, borderRadius: 10, overflow: 'hidden', border: '1px solid #ddd' },
  popupLink: { fontSize: 14, color: '#0d7377', marginTop: 8, display: 'block' },
  empty: { marginTop: 12, color: '#999', fontSize: 14 }
}
