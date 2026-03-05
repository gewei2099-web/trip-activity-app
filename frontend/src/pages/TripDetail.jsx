import React, { useState, useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { getTripById, saveTrip } from '../utils/storage'
import { callLLM } from '../utils/llm'
import { MAP_TILES, DEFAULT_TILE } from '../utils/mapTiles'
import L from 'leaflet'

// 修复 Leaflet 默认图标路径
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
})

function collectTripMarkers(trip) {
  if (!trip?.days) return []
  const list = []
  trip.days.forEach(d => {
    (d.activities || [])
      .filter(a => a.lat != null && a.lng != null && !isNaN(parseFloat(a.lat)) && !isNaN(parseFloat(a.lng)))
      .forEach(a => {
        list.push({
          ...a,
          lat: parseFloat(a.lat),
          lng: parseFloat(a.lng)
        })
      })
  })
  return list
}

function calcTripCost(trip) {
  let total = 0
  trip.days?.forEach(day => {
    (day.activities || []).forEach(a => {
      const c = parseFloat(a.cost)
      if (!isNaN(c) && c > 0) total += c
    })
  })
  return total
}

export default function TripDetail() {
  const { id } = useParams()
  const trip = getTripById(id)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState('')
  const tripMarkers = useMemo(() => (trip ? collectTripMarkers(trip) : []), [trip])

  const handleAiSummary = async () => {
    if (!trip?.diary?.trim()) return
    setAiLoading(true)
    setAiResult('')
    try {
      const prompt = `请对以下游记进行摘要，提炼 3-5 个要点，并给出 2-3 个情感/主题标签。游记内容：\n\n"""\n${trip.diary}\n"""`
      const text = await callLLM([{ role: 'user', content: prompt }])
      setAiResult(text)
    } catch (err) {
      setAiResult(`错误: ${err.message}`)
    } finally {
      setAiLoading(false)
    }
  }
  const appendSummary = () => {
    if (!trip || !aiResult) return
    saveTrip({ ...trip, diary: (trip.diary || '') + '\n\n--- AI 摘要 ---\n' + aiResult })
    setAiResult('')
  }

  if (!trip) {
    return (
      <div style={styles.page}>
        <p>行程不存在</p>
        <Link to="/trips">返回列表</Link>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.actions}>
        <Link to="/trips" style={styles.back}>← 返回</Link>
        <Link to={`/trip/${trip.id}/edit`} style={styles.edit}>编辑</Link>
      </div>

      <h1 style={styles.title}>{trip.title}</h1>
      <div style={styles.meta}>
        {trip.destination && <span>{trip.destination}</span>}
        {trip.type && <span>{trip.type}</span>}
        <span>{trip.startDate} ~ {trip.endDate}</span>
        {trip.budget && <span>预算: ¥{trip.budget}</span>}
      </div>

      {(trip.budget != null && trip.budget !== '') || calcTripCost(trip) > 0 ? (
        <div style={styles.card}>
          <h3 style={styles.section}>预算与花费</h3>
          <div style={styles.budgetRow}>
            <span>总预算：¥{(parseFloat(trip.budget) || 0).toLocaleString()}</span>
            <span>实际花费：¥{calcTripCost(trip).toLocaleString()}</span>
            <span style={calcTripCost(trip) > (parseFloat(trip.budget) || 0) ? styles.overBudget : {}}>
              差额：¥{((parseFloat(trip.budget) || 0) - calcTripCost(trip)).toLocaleString()}
            </span>
          </div>
        </div>
      ) : null}

      {trip.memo && (
        <div style={styles.card}>
          <h3 style={styles.section}>备注</h3>
          <p style={styles.text}>{trip.memo}</p>
        </div>
      )}

      {trip && (
        <div style={styles.card}>
          <h3 style={styles.section}>活动地图</h3>
          {tripMarkers.length === 0 ? (
            <>
              <p style={styles.mapHint}>暂无带坐标的活动。编辑行程时为活动填写地点并点击「选地点」或「地图选点」，保存后可在此查看</p>
              <Link to={`/trip/${trip.id}/edit`} style={styles.mapEditLink}>去编辑</Link>
            </>
          ) : (
            <div style={styles.mapWrap}>
              <MapContainer
                center={[tripMarkers[0].lat, tripMarkers[0].lng]}
                zoom={tripMarkers.length > 1 ? undefined : 10}
                bounds={tripMarkers.length > 1 ? L.latLngBounds(tripMarkers.map(m => [m.lat, m.lng])) : null}
                boundsOptions={tripMarkers.length > 1 ? { padding: [30, 30] } : undefined}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
              >
                <TileLayer
                  attribution={MAP_TILES[DEFAULT_TILE].attribution}
                  url={MAP_TILES[DEFAULT_TILE].url}
                  maxZoom={MAP_TILES[DEFAULT_TILE].maxZoom}
                />
                {tripMarkers.map((m, i) => (
                  <Marker key={i} position={[m.lat, m.lng]}>
                    <Popup>
                      <div>
                        <strong>{m.title}</strong>
                        {m.place && <div>{m.place}</div>}
                        {m.time && <div>{m.time}</div>}
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          )}
        </div>
      )}

      {trip.days?.length > 0 && (
        <div style={styles.card}>
          <h3 style={styles.section}>日程安排</h3>
          {trip.days.map((day, i) => (
            <div key={day.date} style={styles.day}>
              <div style={styles.dayDate}>{day.date}</div>
              {(day.activities || []).filter(a => a.title?.trim()).map((a, j) => (
                <div key={a.id || j} style={styles.actCard}>
                  <div style={styles.actTime}>{a.time || '全天'}</div>
                  <div style={styles.actTitle}>{a.title}</div>
                  {a.place && <div style={styles.actPlace}>{a.place}</div>}
                  <div style={styles.actTags}>
                    <span style={styles.actType}>{a.type || '其他'}</span>
                    {a.cost != null && a.cost !== '' && !isNaN(parseFloat(a.cost)) && (
                      <span style={styles.actCost}>¥{parseFloat(a.cost)}</span>
                    )}
                    {a.remindBefore && (
                      <span style={styles.remindBadge}>提前{a.remindBefore}分钟</span>
                    )}
                  </div>
                  {(a.photos || []).length > 0 && (
                    <div style={styles.actPhotos}>
                      {a.photos.map((p, pi) => (
                        <img key={pi} src={p} alt="" style={styles.photoThumb} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {trip.diary && (
        <div style={styles.card}>
          <h3 style={styles.section}>游记</h3>
          <p style={styles.text}>{trip.diary}</p>
          <button type="button" onClick={handleAiSummary} disabled={aiLoading} style={styles.aiBtn}>
            {aiLoading ? '生成中...' : 'AI 摘要'}
          </button>
          {aiResult && (
            <div style={styles.aiResult}>
              <pre style={styles.aiText}>{aiResult}</pre>
              <button type="button" onClick={appendSummary} style={styles.aiApply}>追加到游记</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const styles = {
  page: { padding: 16, paddingBottom: 80 },
  actions: { display: 'flex', justifyContent: 'space-between', marginBottom: 12 },
  back: { fontSize: 14 },
  edit: { fontSize: 14, color: '#0d7377', textDecoration: 'underline' },
  title: { fontSize: 22, marginBottom: 8, fontWeight: 600 },
  meta: { display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 14, color: '#666', marginBottom: 16 },
  card: {
    background: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
  },
  section: { fontSize: 15, marginBottom: 10 },
  text: { fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' },
  day: { marginBottom: 20 },
  dayDate: { fontWeight: 600, color: '#0d7377', marginBottom: 12, fontSize: 16 },
  actCard: {
    background: '#f8f9fa',
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    border: '1px solid #e9ecef'
  },
  actTime: { fontSize: 15, color: '#0d7377', fontWeight: 600, marginBottom: 6 },
  actTitle: { fontSize: 16, fontWeight: 600, marginBottom: 4 },
  actPlace: { fontSize: 14, color: '#666', marginBottom: 8 },
  actTags: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  actType: { fontSize: 13, background: '#e9ecef', padding: '4px 10px', borderRadius: 6 },
  actCost: { fontSize: 14, color: '#0d7377', fontWeight: 600 },
  remindBadge: { fontSize: 12, color: '#666', background: '#e9ecef', padding: '4px 8px', borderRadius: 6 },
  actPhotos: { display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  photoThumb: { width: 72, height: 72, objectFit: 'cover', borderRadius: 8 },
  budgetRow: { display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 14 },
  overBudget: { color: '#c00', fontWeight: 600 },
  aiBtn: { marginTop: 8, padding: '8px 16px', fontSize: 14 },
  aiResult: { marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 8 },
  aiText: { whiteSpace: 'pre-wrap', fontSize: 14, margin: '0 0 8px 0' },
  aiApply: { padding: '6px 12px', fontSize: 13 },
  mapHint: { fontSize: 14, color: '#666', marginBottom: 12, lineHeight: 1.5 },
  mapEditLink: { fontSize: 14, color: '#0d7377', textDecoration: 'underline' },
  mapWrap: { height: 280, borderRadius: 8, overflow: 'hidden', marginTop: 8 }
}
