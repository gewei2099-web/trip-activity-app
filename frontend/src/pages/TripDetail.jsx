import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import { getTripById, saveTrip } from '../utils/storage'
import { getAppConfig } from '../utils/storage'
import { callLLM } from '../utils/llm'
import { MAP_TILES, DEFAULT_TILE } from '../utils/mapTiles'
import L from 'leaflet'
import 'leaflet-polylinedecorator'

// 修复 Leaflet 默认图标路径
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
})

const DAY_COLORS = ['#0d7377', '#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2']
const ACTIVITY_COLORS = { 景点: '#0d7377', 餐厅: '#d97706', 交通: '#2563eb', 住宿: '#7c3aed', 其他: '#6b7280' }

function parseTimeToSort(t) {
  if (!t || !t.trim()) return 9999
  const m = t.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return 9999
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10)
}

function collectTripMarkers(trip) {
  if (!trip?.days) return []
  const list = []
  trip.days.forEach((d, dayIdx) => {
    const withCoords = (d.activities || [])
      .map((a, actIdx) => ({ ...a, actIdx }))
      .filter(a => a.lat != null && a.lng != null && !isNaN(parseFloat(a.lat)) && !isNaN(parseFloat(a.lng)))
    withCoords.sort((a, b) => parseTimeToSort(a.time) - parseTimeToSort(b.time))
    withCoords.forEach((a, seq) => {
      list.push({
        ...a,
        lat: parseFloat(a.lat),
        lng: parseFloat(a.lng),
        dayDate: d.date,
        dayIndex: dayIdx,
        actIdxInDay: a.actIdx,
        sequence: seq + 1
      })
    })
  })
  return list
}

function createNumberedIcon(num, color) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px;border:2px solid #fff;box-shadow:0 2px 4px rgba(0,0,0,0.3)">${num}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  })
}

function MapControls({ tileKey, onTileChange, mapWrapRef }) {
  const handleFullscreen = () => {
    const el = mapWrapRef?.current
    if (!el) return
    if (!document.fullscreenElement) {
      el.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }
  return (
    <div style={controlStyles.wrapper}>
      <select value={tileKey} onChange={e => onTileChange(e.target.value)} style={controlStyles.select}>
        {Object.entries(MAP_TILES).map(([k, v]) => (
          <option key={k} value={k}>{v.label || k}</option>
        ))}
      </select>
      <button type="button" onClick={handleFullscreen} style={controlStyles.btn} title="全屏">全屏</button>
    </div>
  )
}

function MapContent({ markers, selectedDate, onMarkerClick }) {
  const map = useMap()
  const filtered = useMemo(() => {
    if (!selectedDate) return markers
    return markers.filter(m => m.dayDate === selectedDate)
  }, [markers, selectedDate])

  // 选「全部」时按日期+时间排序并分配全局序号；选某天时用当日序号
  const displayMarkers = useMemo(() => {
    if (selectedDate) return filtered
    const sorted = [...filtered].sort((a, b) => {
      const dateCmp = (a.dayDate || '').localeCompare(b.dayDate || '')
      if (dateCmp !== 0) return dateCmp
      return parseTimeToSort(a.time) - parseTimeToSort(b.time)
    })
    return sorted.map((m, i) => ({ ...m, globalSequence: i + 1 }))
  }, [filtered, selectedDate])

  useEffect(() => {
    if (filtered.length === 0) return
    if (filtered.length === 1) {
      map.setView([filtered[0].lat, filtered[0].lng], map.getZoom())
    } else {
      map.fitBounds(L.latLngBounds(filtered.map(m => [m.lat, m.lng])), { padding: [30, 30] })
    }
  }, [filtered, map])

  const polylinesByDay = useMemo(() => {
    const byDay = {}
    filtered.forEach(m => {
      if (!byDay[m.dayDate]) byDay[m.dayDate] = []
      byDay[m.dayDate].push([m.lat, m.lng])
    })
    return Object.entries(byDay).filter(([, pts]) => pts.length > 1)
  }, [filtered])

  return (
    <>
      {polylinesByDay.map(([day, pts], i) => {
        const color = DAY_COLORS[i % DAY_COLORS.length]
        return (
          <React.Fragment key={day}>
            <Polyline positions={pts} pathOptions={{ color, weight: 4, opacity: 0.8 }} />
            <PolylineDecorator positions={pts} color={color} />
          </React.Fragment>
        )
      })}
      {displayMarkers.map((m, i) => {
        const color = DAY_COLORS[(m.dayIndex || 0) % DAY_COLORS.length]
        const label = selectedDate
          ? m.sequence
          : (m.sequence === 1 ? (m.dayIndex || 0) + 1 : `${(m.dayIndex || 0) + 1}-${m.sequence}`)
        return (
          <Marker
            key={`${m.dayDate}-${m.actIdxInDay}-${i}`}
            position={[m.lat, m.lng]}
            icon={createNumberedIcon(label, color)}
            eventHandlers={{ click: () => onMarkerClick(m) }}
          >
            <Popup>
              <div style={popupStyles.wrap}>
                <div style={popupStyles.badge}>{m.dayDate} · {label}</div>
                <strong style={popupStyles.title}>{m.title}</strong>
                {m.place && <div style={popupStyles.place}>{m.place}</div>}
                <div style={popupStyles.row}>
                  {m.time && <span>{m.time}</span>}
                  {m.type && <span style={{ ...popupStyles.tag, background: ACTIVITY_COLORS[m.type] || '#999' }}>{m.type}</span>}
                  {m.cost != null && m.cost !== '' && !isNaN(parseFloat(m.cost)) && (
                    <span style={popupStyles.cost}>¥{parseFloat(m.cost)}</span>
                  )}
                </div>
                {(m.photos || []).length > 0 && (
                  <img src={m.photos[0]} alt="" style={popupStyles.thumb} />
                )}
              </div>
            </Popup>
          </Marker>
        )
      })}
    </>
  )
}

function PolylineDecorator({ positions, color }) {
  const map = useMap()
  useEffect(() => {
    if (!map || !positions || positions.length < 2 || typeof L.polylineDecorator !== 'function') return
    try {
      const latlngs = positions.map(p => L.latLng(p[0], p[1]))
      const dec = L.polylineDecorator(latlngs, {
        patterns: [{
          offset: '100%',
          repeat: 0,
          symbol: L.Symbol.arrowHead({ pixelSize: 12, polygon: true, pathOptions: { color, weight: 1, fillColor: color } })
        }]
      })
      dec.addTo(map)
      return () => { map.removeLayer(dec) }
    } catch (_) {}
  }, [map, positions?.length, color])
  return null
}

const controlStyles = {
  wrapper: { position: 'absolute', top: 8, right: 8, zIndex: 1000, display: 'flex', gap: 8 },
  select: { padding: '6px 10px', fontSize: 13, borderRadius: 6, border: '1px solid #ddd' },
  btn: { padding: '6px 10px', fontSize: 14, background: '#fff', color: '#333', border: '1px solid #ddd', borderRadius: 6, cursor: 'pointer' }
}

const popupStyles = {
  wrap: { minWidth: 160 },
  badge: { fontSize: 11, color: '#666', marginBottom: 6 },
  title: { display: 'block', fontSize: 15, marginBottom: 6 },
  place: { fontSize: 13, color: '#666', marginBottom: 6 },
  row: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', fontSize: 13 },
  tag: { padding: '2px 8px', borderRadius: 4, color: '#fff', fontSize: 12 },
  cost: { fontWeight: 600, color: '#0d7377' },
  thumb: { width: 80, height: 80, objectFit: 'cover', borderRadius: 8, marginTop: 8 }
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
  const [refresh, setRefresh] = useState(0)
  const trip = useMemo(() => getTripById(id), [id, refresh])
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState('')
  const [selectedDate, setSelectedDate] = useState(null)
  const [tileKey, setTileKey] = useState(DEFAULT_TILE)
  const mapWrapRef = useRef(null)
  const tripMarkers = useMemo(() => (trip ? collectTripMarkers(trip) : []), [trip])
  const datesWithMarkers = useMemo(() => [...new Set(tripMarkers.map(m => m.dayDate))].sort(), [tripMarkers])

  const handleMarkerClick = (m) => {
    if (m.id) document.getElementById(`act-${m.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const handlePackingCheck = (itemId, checked) => {
    if (!trip) return
    const list = (trip.packingList || []).map(i => (i.id === itemId ? { ...i, checked } : i))
    saveTrip({ ...trip, packingList: list })
    setRefresh(r => r + 1)
  }

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

      <div style={styles.card}>
        <h3 style={styles.section}>携带物品</h3>
        {(trip.packingList || []).length === 0 ? (
          <p style={styles.packingHint}>
            暂无物品。<Link to={`/trip/${trip.id}/edit`} style={styles.mapEditLink}>在编辑页添加</Link>需要携带的物品，出发前在此勾选以防遗漏
          </p>
        ) : (() => {
          const list = trip.packingList || []
          const packingCategories = getAppConfig().packingCategories || []
          const byCat = {}
          list.forEach(item => {
            const c = (item.category && packingCategories.includes(item.category)) ? item.category : '其他'
            if (!byCat[c]) byCat[c] = []
            byCat[c].push(item)
          })
          const order = [...packingCategories, ...Object.keys(byCat).filter(c => !packingCategories.includes(c))]
          return (
            <div style={styles.packingGroupWrap}>
              {order.filter(c => (byCat[c] || []).length > 0).map(cat => (
                <div key={cat} style={styles.packingGroup}>
                  <div style={styles.packingGroupTitle}>{cat}</div>
                  <ul style={styles.packingList}>
                    {(byCat[cat] || []).map(item => (
                      <li key={item.id} style={styles.packingItem}>
                        <label style={styles.packingLabel}>
                          <input
                            type="checkbox"
                            checked={!!item.checked}
                            onChange={e => handlePackingCheck(item.id, e.target.checked)}
                            style={styles.packingCheckbox}
                          />
                          <span style={item.checked ? styles.packingDone : {}}>{item.name}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )
        })()}
        <Link to={`/trip/${trip.id}/edit`} style={styles.packingEditLink}>去编辑</Link>
      </div>

      {trip && (
        <div style={styles.card}>
          <h3 style={styles.section}>活动地图</h3>
          {tripMarkers.length === 0 ? (
            <>
              <p style={styles.mapHint}>暂无带坐标的活动。编辑行程时为活动填写地点并点击「选地点」或「地图选点」，保存后可在此查看</p>
              <Link to={`/trip/${trip.id}/edit`} style={styles.mapEditLink}>去编辑</Link>
            </>
          ) : (
            <>
              {datesWithMarkers.length > 1 && (
                <div style={styles.dateFilter}>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(null)}
                    style={{ ...styles.dateBtn, ...(!selectedDate ? styles.dateBtnActive : {}) }}
                  >
                    全部
                  </button>
                  {datesWithMarkers.map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setSelectedDate(d)}
                      style={{ ...styles.dateBtn, ...(selectedDate === d ? styles.dateBtnActive : {}) }}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}
              <div ref={mapWrapRef} style={styles.mapWrap}>
                <MapContainer
                  center={[tripMarkers[0].lat, tripMarkers[0].lng]}
                  zoom={tripMarkers.length > 1 ? undefined : 10}
                  bounds={tripMarkers.length > 1 ? L.latLngBounds(tripMarkers.map(m => [m.lat, m.lng])) : null}
                  boundsOptions={tripMarkers.length > 1 ? { padding: [30, 30] } : undefined}
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={true}
                >
                  <TileLayer
                    attribution={MAP_TILES[tileKey].attribution}
                    url={MAP_TILES[tileKey].url}
                    maxZoom={MAP_TILES[tileKey].maxZoom}
                  />
                  <MapContent
                    markers={tripMarkers}
                    selectedDate={selectedDate}
                    onMarkerClick={handleMarkerClick}
                  />
                  <MapControls tileKey={tileKey} onTileChange={setTileKey} mapWrapRef={mapWrapRef} />
                </MapContainer>
              </div>
            </>
          )}
        </div>
      )}

      {trip.days?.length > 0 && (
        <div style={styles.card}>
          <h3 style={styles.section}>日程安排</h3>
          {trip.days.map((day, i) => (
            <div key={day.date} style={styles.day}>
              <div style={styles.dayDate}>{day.date}</div>
              {(day.activities || [])
                .filter(a => a.title?.trim())
                .sort((a, b) => parseTimeToSort(a.time) - parseTimeToSort(b.time))
                .map((a, j) => (
                <div key={a.id || j} id={a.id ? `act-${a.id}` : undefined} style={styles.actCard}>
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
  dateFilter: { display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 },
  dateBtn: { padding: '6px 12px', fontSize: 13, border: '1px solid #ccc', borderRadius: 6, background: '#eee', color: '#555', cursor: 'pointer' },
  dateBtnActive: { background: '#0d7377', color: '#fff', borderColor: '#0d7377' },
  mapWrap: { height: 300, borderRadius: 8, overflow: 'hidden', marginTop: 8, position: 'relative' },
  packingHint: { fontSize: 14, color: '#666', marginBottom: 8, lineHeight: 1.5 },
  packingList: { listStyle: 'none', padding: 0, margin: 0 },
  packingItem: { marginBottom: 10 },
  packingLabel: { display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 15 },
  packingCheckbox: { width: 18, height: 18, cursor: 'pointer' },
  packingDone: { textDecoration: 'line-through', color: '#999' },
  packingGroupWrap: { marginTop: 4 },
  packingGroup: { marginBottom: 16 },
  packingGroupTitle: { fontSize: 14, fontWeight: 600, color: '#0d7377', marginBottom: 8 }
}
