import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { saveStandaloneActivity, getStandaloneActivityById } from '../utils/storage'
import { uuid } from '../utils/uuid'
import { ACTIVITY_TYPES } from '../utils/constants'
import { readAsBase64 } from '../utils/image'
import { searchPlace } from '../utils/geocode'
import TimeSelect from '../components/TimeSelect'
import DateSelect from '../components/DateSelect'
import MapPicker from '../components/MapPicker'

export default function ActivityForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id
  const photoInputRef = useRef(null)

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    title: '',
    time: '',
    place: '',
    type: '其他',
    memo: '',
    cost: '',
    lat: '',
    lng: '',
    photos: [],
    remindBefore: ''
  })

  useEffect(() => {
    if (id) {
      const a = getStandaloneActivityById(id)
      if (a) setForm({ lat: '', lng: '', ...a, photos: a.photos || [] })
    }
  }, [id])

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }))
  const [placeSearching, setPlaceSearching] = useState(false)
  const [placeResults, setPlaceResults] = useState([])
  const [mapPickerOpen, setMapPickerOpen] = useState(false)

  const handlePlaceSearch = async () => {
    if (!form.place?.trim() || form.place.length < 2) {
      alert('请先输入地点名称（至少2个字）')
      return
    }
    setPlaceSearching(true)
    setPlaceResults([])
    try {
      const list = await searchPlace(form.place, 5)
      setPlaceResults(list)
      if (list.length === 0) alert('未找到匹配地点')
    } catch (err) {
      alert(err.message || '搜索失败')
    } finally {
      setPlaceSearching(false)
    }
  }
  const selectPlace = (item) => {
    update('place', item.display)
    update('lat', item.lat)
    update('lng', item.lng)
    setPlaceResults([])
  }

  const handleMapPickerSelect = ({ lat, lng, place }) => {
    update('lat', lat)
    update('lng', lng)
    if (place) update('place', place)
    setMapPickerOpen(false)
  }

  const REMIND_OPTIONS = [
    { value: '', label: '不提醒' },
    { value: '10', label: '前10分钟' },
    { value: '30', label: '前30分钟' },
    { value: '60', label: '前1小时' },
    { value: '120', label: '前2小时' }
  ]

  const handleAddPhoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file?.type.startsWith('image/')) return
    try {
      const base64 = await readAsBase64(file)
      update('photos', [...(form.photos || []), base64])
    } catch (err) {
      alert('图片处理失败')
    }
    e.target.value = ''
  }
  const removePhoto = (idx) => {
    update('photos', (form.photos || []).filter((_, i) => i !== idx))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const activity = {
      ...form,
      id: form.id || uuid()
    }
    saveStandaloneActivity(activity)
    navigate('/trips')
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>{isEdit ? '编辑活动' : '新建单独活动'}</h1>
      <form onSubmit={handleSubmit}>
        <div style={styles.field}>
          <label>日期</label>
          <DateSelect value={form.date} onChange={v => update('date', v)} />
        </div>
        <div style={styles.field}>
          <label>标题</label>
          <input value={form.title} onChange={e => update('title', e.target.value)} placeholder="如：某某演唱会" required />
        </div>
        <div style={styles.row}>
          <div style={styles.field}>
            <label>时间（可选）</label>
            <TimeSelect value={form.time || ''} onChange={v => update('time', v)} />
          </div>
          <div style={styles.field}>
            <label>类型</label>
            <select value={form.type} onChange={e => update('type', e.target.value)}>
              {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div style={styles.field}>
          <label>地点</label>
          <div style={styles.placeRow}>
            <input value={form.place} onChange={e => update('place', e.target.value)} placeholder="如：南京南站" style={{ flex: 1 }} />
            <button type="button" onClick={handlePlaceSearch} disabled={placeSearching}>{placeSearching ? '…' : '选地点'}</button>
            <button type="button" onClick={() => setMapPickerOpen(true)}>地图选点</button>
          </div>
          {placeResults.length > 0 && (
            <div style={styles.placeResults}>
              {placeResults.map((r, i) => (
                <button key={i} type="button" onClick={() => selectPlace(r)} style={styles.placeOpt}>{r.display}</button>
              ))}
            </div>
          )}
        </div>
        <div style={styles.row}>
          <div style={styles.field}>
            <label>经度（选地点自动填充，可手动修改）</label>
            <input type="number" step="any" value={form.lat ?? ''} onChange={e => update('lat', e.target.value)} placeholder="选地点自动填充" />
          </div>
          <div style={styles.field}>
            <label>纬度（选地点自动填充，可手动修改）</label>
            <input type="number" step="any" value={form.lng ?? ''} onChange={e => update('lng', e.target.value)} placeholder="选地点自动填充" />
          </div>
        </div>
        <div style={styles.field}>
          <label>闹钟提醒（可选）</label>
          <select value={form.remindBefore ?? ''} onChange={e => update('remindBefore', e.target.value)}>
            {REMIND_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <div style={styles.field}>
          <label>费用（元）</label>
          <input type="number" placeholder="0" value={form.cost} onChange={e => update('cost', e.target.value)} />
        </div>
        <div style={styles.field}>
          <label>备注</label>
          <textarea value={form.memo} onChange={e => update('memo', e.target.value)} placeholder="活动说明" />
        </div>
        <div style={styles.field}>
          <label>图片</label>
          <div style={styles.photoGrid}>
            {(form.photos || []).map((p, i) => (
              <div key={i} style={styles.photoWrap}>
                <img src={p} alt="" style={styles.photoThumb} />
                <button type="button" onClick={() => removePhoto(i)} style={styles.photoDel}>×</button>
              </div>
            ))}
            <button type="button" onClick={() => photoInputRef.current?.click()} style={styles.addPhoto}>+ 添加</button>
          </div>
          <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAddPhoto} />
        </div>
        <button type="submit" style={styles.submit}>保存</button>
      </form>
      <MapPicker
        open={mapPickerOpen}
        onClose={() => setMapPickerOpen(false)}
        onSelect={handleMapPickerSelect}
        initialLat={form.lat}
        initialLng={form.lng}
        initialPlace={form.place}
      />
    </div>
  )
}

const styles = {
  page: { padding: 16, paddingBottom: 80 },
  title: { fontSize: 22, marginBottom: 16, fontWeight: 600 },
  field: { marginBottom: 16 },
  row: { display: 'flex', gap: 12 },
  placeRow: { display: 'flex', gap: 8 },
  placeResults: { marginTop: 6, border: '1px solid #ddd', borderRadius: 6, background: '#fff', maxHeight: 150, overflow: 'auto' },
  placeOpt: { display: 'block', width: '100%', padding: '8px 12px', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13 },
  photoGrid: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  photoWrap: { position: 'relative' },
  photoThumb: { width: 80, height: 80, objectFit: 'cover', borderRadius: 8 },
  photoDel: { position: 'absolute', top: -6, right: -6, width: 24, height: 24, borderRadius: '50%', background: '#c00', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1 },
  addPhoto: { width: 80, height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed #ccc', borderRadius: 8, background: '#f9f9f9', cursor: 'pointer', fontSize: 14 },
  submit: { width: '100%', padding: 14, marginTop: 8 }
}
