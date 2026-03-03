import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { saveTrip, getTripById } from '../utils/storage'
import { uuid } from '../utils/uuid'
import { TRIP_TYPES, ACTIVITY_TYPES } from '../utils/constants'
import { readAsBase64 } from '../utils/image'
import { callLLM } from '../utils/llm'
import { searchPlace } from '../utils/geocode'
import TimeSelect from '../components/TimeSelect'
import MapPicker from '../components/MapPicker'

function emptyActivity() {
  return { id: uuid(), title: '', time: '', place: '', type: '景点', memo: '', cost: '', lat: undefined, lng: undefined, photos: [], remindBefore: '' }
}

function buildDays(startDate, endDate, existingDays) {
  if (!startDate || !endDate || startDate > endDate) return []
  const days = []
  const start = new Date(startDate)
  const end = new Date(endDate)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10)
    const existing = existingDays?.find(day => day.date === dateStr)
    days.push({
      date: dateStr,
      activities: existing?.activities?.length ? existing.activities.map(a => ({ ...emptyActivity(), ...a, id: a.id || uuid() })) : [emptyActivity()]
    })
  }
  return days
}

export default function TripForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [form, setForm] = useState({
    title: '',
    destination: '',
    startDate: '',
    endDate: '',
    type: '旅游',
    budget: '',
    memo: '',
    diary: '',
    days: []
  })

  useEffect(() => {
    if (id) {
      const t = getTripById(id)
      if (t) setForm({ ...t, days: t.days || [] })
    }
  }, [id])

  useEffect(() => {
    if (form.startDate && form.endDate) {
      const built = buildDays(form.startDate, form.endDate, form.days)
      if (built.length > 0) setForm(prev => ({ ...prev, days: built }))
    }
  }, [form.startDate, form.endDate])

  const days = form.days || []
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState('')
  const [placeSearching, setPlaceSearching] = useState(null)
  const [placeResults, setPlaceResults] = useState([])
  const [placeSearchTarget, setPlaceSearchTarget] = useState(null)
  const [mapPickerTarget, setMapPickerTarget] = useState(null)

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

  const handleAiSuggest = async () => {
    setAiLoading(true)
    setAiResult('')
    try {
      const prompt = `你是一位旅行规划助手。用户将去 ${form.destination || '某地'}，${form.startDate || '开始日期'} 到 ${form.endDate || '结束日期'}，类型：${form.type}。
请给出行程建议，包含每日主要景点、餐厅建议，格式简洁，便于复制到日程中。`
      const text = await callLLM([{ role: 'user', content: prompt }])
      setAiResult(text)
    } catch (err) {
      setAiResult(`错误: ${err.message}`)
    } finally {
      setAiLoading(false)
    }
  }

  const addActivity = (dayIdx) => {
    setForm(prev => ({
      ...prev,
      days: prev.days.map((day, i) =>
        i === dayIdx ? { ...day, activities: [...(day.activities || []), emptyActivity()] } : day
      )
    }))
  }

  const updateActivity = (dayIdx, actIdx, k, v) => {
    setForm(prev => ({
      ...prev,
      days: prev.days.map((day, i) =>
        i === dayIdx
          ? {
              ...day,
              activities: (day.activities || []).map((a, j) =>
                j === actIdx ? { ...a, [k]: v } : a
              )
            }
          : day
      )
    }))
  }

  const removeActivity = (dayIdx, actIdx) => {
    setForm(prev => ({
      ...prev,
      days: prev.days.map((day, i) =>
        i === dayIdx ? { ...day, activities: (day.activities || []).filter((_, j) => j !== actIdx) } : day
      )
    }))
  }

  const addPhoto = async (dayIdx, actIdx, e) => {
    const file = e.target.files?.[0]
    if (!file?.type.startsWith('image/')) return
    try {
      const base64 = await readAsBase64(file)
      updateActivity(dayIdx, actIdx, 'photos', [...(days[dayIdx]?.activities?.[actIdx]?.photos || []), base64])
    } catch (err) {
      alert('图片处理失败')
    }
    e.target.value = ''
  }
  const removePhoto = (dayIdx, actIdx, photoIdx) => {
    const photos = (days[dayIdx]?.activities?.[actIdx]?.photos || []).filter((_, i) => i !== photoIdx)
    updateActivity(dayIdx, actIdx, 'photos', photos)
  }

  const handlePlaceSearch = async (dayIdx, actIdx) => {
    const place = days[dayIdx]?.activities?.[actIdx]?.place || ''
    if (!place.trim() || place.length < 2) {
      alert('请先输入地点名称（至少2个字）')
      return
    }
    setPlaceSearchTarget({ dayIdx, actIdx })
    setPlaceSearching(`${dayIdx}-${actIdx}`)
    setPlaceResults([])
    try {
      const list = await searchPlace(place, 5)
      setPlaceResults(list)
      if (list.length === 0) alert('未找到匹配地点')
    } catch (err) {
      alert(err.message || '搜索失败')
    } finally {
      setPlaceSearching(null)
    }
  }
  const selectPlace = (item) => {
    if (!placeSearchTarget) return
    const { dayIdx, actIdx } = placeSearchTarget
    updateActivity(dayIdx, actIdx, 'place', item.display)
    updateActivity(dayIdx, actIdx, 'lat', item.lat)
    updateActivity(dayIdx, actIdx, 'lng', item.lng)
    setPlaceResults([])
    setPlaceSearchTarget(null)
  }

  const handleMapPickerSelect = ({ lat, lng, place }) => {
    if (!mapPickerTarget) return
    const { dayIdx, actIdx } = mapPickerTarget
    updateActivity(dayIdx, actIdx, 'lat', lat)
    updateActivity(dayIdx, actIdx, 'lng', lng)
    if (place) updateActivity(dayIdx, actIdx, 'place', place)
    setMapPickerTarget(null)
  }

  const REMIND_OPTIONS = [
    { value: '', label: '不提醒' },
    { value: '10', label: '前10分钟' },
    { value: '30', label: '前30分钟' },
    { value: '60', label: '前1小时' },
    { value: '120', label: '前2小时' }
  ]

  const handleSubmit = (e) => {
    e.preventDefault()
    const trip = {
      ...form,
      id: form.id || uuid(),
      days: days.map(day => ({
        ...day,
        activities: (day.activities || []).filter(a => a.title?.trim()).map(a => ({ ...a, id: a.id || uuid() }))
      }))
    }
    saveTrip(trip)
    navigate(`/trip/${trip.id}`)
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>{isEdit ? '编辑行程' : '新建行程'}</h1>
      <form onSubmit={handleSubmit}>
        <div style={styles.field}>
          <label>标题</label>
          <input value={form.title} onChange={e => update('title', e.target.value)} placeholder="如：北京三日游" required />
        </div>
        <div style={styles.row}>
          <div style={styles.field}>
            <label>目的地</label>
            <input value={form.destination} onChange={e => update('destination', e.target.value)} placeholder="如：北京" />
          </div>
          <div style={styles.field}>
            <label>类型</label>
            <select value={form.type} onChange={e => update('type', e.target.value)}>
              {TRIP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div style={styles.row}>
          <div style={styles.field}>
            <label>开始日期</label>
            <input type="date" value={form.startDate} onChange={e => update('startDate', e.target.value)} required />
          </div>
          <div style={styles.field}>
            <label>结束日期</label>
            <input type="date" value={form.endDate} onChange={e => update('endDate', e.target.value)} required />
          </div>
        </div>
        <div style={styles.field}>
          <label>预算（元）</label>
          <input type="number" placeholder="0" value={form.budget} onChange={e => update('budget', e.target.value)} />
        </div>
        <div style={styles.field}>
          <label>备注</label>
          <textarea placeholder="出行前说明" value={form.memo} onChange={e => update('memo', e.target.value)} />
          <button type="button" onClick={handleAiSuggest} disabled={aiLoading} style={styles.aiBtn}>
            {aiLoading ? '生成中...' : 'AI 建议'}
          </button>
          {aiResult && (
            <div style={styles.aiResult}>
              <pre style={styles.aiText}>{aiResult}</pre>
              <button type="button" onClick={() => { update('memo', (form.memo || '') + '\n\n' + aiResult); setAiResult('') }} style={styles.aiApply}>
                应用到备注
              </button>
            </div>
          )}
        </div>

        {days.length > 0 && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>日程安排</h3>
            <p style={styles.sectionHint}>填写每个活动的标题、时间、地点等</p>
            {days.map((day, dayIdx) => (
              <div key={day.date} style={styles.dayCard}>
                <div style={styles.dayHeader}>{day.date}</div>
                {(day.activities || []).map((a, actIdx) => (
                  <div key={a.id} style={styles.actBlock}>
                    <div style={styles.actField}>
                      <label style={styles.actLabel}>活动标题</label>
                      <input placeholder="如：参观故宫" value={a.title} onChange={e => updateActivity(dayIdx, actIdx, 'title', e.target.value)} style={styles.actInput} />
                    </div>
                    <div style={styles.actRow}>
                      <div style={{ ...styles.actField, flex: 1, minWidth: 0 }}>
                        <label style={styles.actLabel}>类型</label>
                        <select value={a.type} onChange={e => updateActivity(dayIdx, actIdx, 'type', e.target.value)} style={styles.actInput}>
                          {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div style={{ ...styles.actField, flex: 1, minWidth: 0 }}>
                        <label style={styles.actLabel}>时间</label>
                        <TimeSelect value={a.time || ''} onChange={v => updateActivity(dayIdx, actIdx, 'time', v)} />
                      </div>
                      <div style={{ ...styles.actField, flex: 0.8, minWidth: 0 }}>
                        <label style={styles.actLabel}>费用</label>
                        <input type="number" placeholder="0" value={a.cost ?? ''} onChange={e => updateActivity(dayIdx, actIdx, 'cost', e.target.value)} style={styles.actInput} />
                      </div>
                    </div>
                    <div style={styles.actField}>
                      <label style={styles.actLabel}>地点</label>
                      <div style={styles.placeRow}>
                        <input placeholder="如：南京南站" value={a.place} onChange={e => updateActivity(dayIdx, actIdx, 'place', e.target.value)} style={styles.placeInput} />
                        <button type="button" onClick={() => handlePlaceSearch(dayIdx, actIdx)} disabled={placeSearching === `${dayIdx}-${actIdx}`} style={styles.searchBtn}>
                          {placeSearching === `${dayIdx}-${actIdx}` ? '…' : '选地点'}
                        </button>
                        <button type="button" onClick={() => setMapPickerTarget({ dayIdx, actIdx })} style={styles.mapBtn}>
                          地图选点
                        </button>
                      </div>
                      {placeResults.length > 0 && placeSearchTarget?.dayIdx === dayIdx && placeSearchTarget?.actIdx === actIdx && (
                        <div style={styles.placeResults}>
                          {placeResults.map((r, i) => (
                            <button key={i} type="button" onClick={() => selectPlace(r)} style={styles.placeOpt}>{r.display}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div style={styles.actRow}>
                      <div style={styles.actField}>
                        <label style={styles.actLabel}>经度</label>
                        <input type="number" step="any" placeholder="选地点填充" value={a.lat ?? ''} onChange={e => updateActivity(dayIdx, actIdx, 'lat', e.target.value)} style={styles.actInput} />
                      </div>
                      <div style={styles.actField}>
                        <label style={styles.actLabel}>纬度</label>
                        <input type="number" step="any" placeholder="选地点填充" value={a.lng ?? ''} onChange={e => updateActivity(dayIdx, actIdx, 'lng', e.target.value)} style={styles.actInput} />
                      </div>
                    </div>
                    <div style={styles.actField}>
                      <label style={styles.actLabel}>闹钟</label>
                      <select value={a.remindBefore ?? ''} onChange={e => updateActivity(dayIdx, actIdx, 'remindBefore', e.target.value)} style={styles.actInput}>
                        {REMIND_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div style={styles.actField}>
                      <label style={styles.actLabel}>图片</label>
                      <div style={styles.photoRow}>
                        {(a.photos || []).map((p, pi) => (
                          <div key={pi} style={styles.photoWrap}>
                            <img src={p} alt="" style={styles.photoThumb} />
                            <button type="button" onClick={() => removePhoto(dayIdx, actIdx, pi)} style={styles.photoDel}>×</button>
                          </div>
                        ))}
                        <button type="button" onClick={() => document.getElementById(`photo-${dayIdx}-${actIdx}`)?.click()} style={styles.addPhoto}>+ 添加</button>
                        <input id={`photo-${dayIdx}-${actIdx}`} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => addPhoto(dayIdx, actIdx, e)} />
                      </div>
                    </div>
                    {(day.activities || []).length > 1 && (
                      <button type="button" onClick={() => removeActivity(dayIdx, actIdx)} className="danger" style={styles.delBtn}>删除</button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => addActivity(dayIdx)} style={styles.addBtn} className="secondary">+ 添加活动</button>
              </div>
            ))}
          </div>
        )}

        {isEdit && (
          <div style={styles.field}>
            <label>游记（出行后填写）</label>
            <textarea placeholder="感受与回顾" value={form.diary} onChange={e => update('diary', e.target.value)} />
          </div>
        )}

        <button type="submit" style={styles.submit}>保存</button>
      </form>
      {mapPickerTarget && (
        <MapPicker
          open={!!mapPickerTarget}
          onClose={() => setMapPickerTarget(null)}
          onSelect={handleMapPickerSelect}
          initialLat={days[mapPickerTarget?.dayIdx]?.activities?.[mapPickerTarget?.actIdx]?.lat}
          initialLng={days[mapPickerTarget?.dayIdx]?.activities?.[mapPickerTarget?.actIdx]?.lng}
          initialPlace={days[mapPickerTarget?.dayIdx]?.activities?.[mapPickerTarget?.actIdx]?.place}
        />
      )}
    </div>
  )
}

const styles = {
  page: { padding: 16, paddingBottom: 100 },
  title: { fontSize: 20, marginBottom: 18, fontWeight: 600 },
  field: { marginBottom: 16 },
  row: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  section: { marginTop: 24 },
  sectionTitle: { marginBottom: 8, fontSize: 16 },
  sectionHint: { fontSize: 13, color: '#666', marginBottom: 12 },
  dayCard: { background: '#f8f9fa', padding: 16, borderRadius: 12, marginBottom: 20, border: '1px solid #e9ecef' },
  dayHeader: { fontWeight: 600, marginBottom: 14, color: '#0d7377', fontSize: 16 },
  actBlock: { marginBottom: 18, padding: 14, background: '#fff', borderRadius: 10, border: '1px solid #e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' },
  actField: { marginBottom: 12 },
  actRow: { display: 'flex', gap: 10, marginBottom: 12 },
  actLabel: { display: 'block', fontSize: 13, color: '#555', marginBottom: 6, fontWeight: 500 },
  actInput: { width: '100%', padding: '12px 14px', fontSize: 16, borderRadius: 8, border: '1px solid #ddd', boxSizing: 'border-box', minHeight: 44, background: '#fff' },
  placeRow: { display: 'flex', gap: 10 },
  placeInput: { flex: 1, minWidth: 0, padding: '12px 14px', fontSize: 16, borderRadius: 8, border: '1px solid #ddd', minHeight: 44 },
  searchBtn: { padding: '12px 16px', fontSize: 15, whiteSpace: 'nowrap', minHeight: 44 },
  mapBtn: { padding: '12px 16px', fontSize: 14, whiteSpace: 'nowrap', minHeight: 44 },
  placeResults: { marginTop: 8, border: '1px solid #ddd', borderRadius: 8, background: '#fff', maxHeight: 160, overflow: 'auto' },
  placeOpt: { display: 'block', width: '100%', padding: '14px 16px', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', fontSize: 15, color: '#333', minHeight: 44 },
  photoRow: { display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' },
  photoWrap: { position: 'relative' },
  photoThumb: { width: 72, height: 72, objectFit: 'cover', borderRadius: 8 },
  photoDel: { position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: '50%', background: '#c00', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14 },
  addPhoto: { padding: '14px 18px', minHeight: 44, display: 'flex', alignItems: 'center', border: '1px dashed #ccc', borderRadius: 8, background: '#fafafa', cursor: 'pointer', fontSize: 15 },
  aiBtn: { marginTop: 8, padding: '8px 16px', fontSize: 14 },
  aiResult: { marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 8 },
  aiText: { whiteSpace: 'pre-wrap', fontSize: 14, margin: '0 0 8px 0' },
  aiApply: { padding: '6px 12px', fontSize: 13 },
  delBtn: { marginTop: 10, padding: '12px 16px', fontSize: 14, minHeight: 44 },
  addBtn: { marginTop: 8, padding: '14px 18px', fontSize: 15, minHeight: 44 },
  submit: { width: '100%', padding: 16, marginTop: 20, fontSize: 16, minHeight: 48 }
}
