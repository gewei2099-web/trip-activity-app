import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { saveTrip, getTripById } from '../utils/storage'
import { uuid } from '../utils/uuid'
import { TRIP_TYPES, ACTIVITY_TYPES } from '../utils/constants'

function emptyActivity() {
  return { id: uuid(), title: '', time: '', place: '', type: '景点', memo: '', cost: '' }
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

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

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
        </div>

        {days.length > 0 && (
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>日程安排</h3>
            {days.map((day, dayIdx) => (
              <div key={day.date} style={styles.dayCard}>
                <div style={styles.dayHeader}>{day.date}</div>
                {(day.activities || []).map((a, actIdx) => (
                  <div key={a.id} style={styles.actRow}>
                    <input
                      placeholder="活动标题"
                      value={a.title}
                      onChange={e => updateActivity(dayIdx, actIdx, 'title', e.target.value)}
                      style={{ flex: 2 }}
                    />
                    <input
                      placeholder="时间"
                      value={a.time}
                      onChange={e => updateActivity(dayIdx, actIdx, 'time', e.target.value)}
                      style={{ width: 80 }}
                    />
                    <select
                      value={a.type}
                      onChange={e => updateActivity(dayIdx, actIdx, 'type', e.target.value)}
                      style={{ width: 70 }}
                    >
                      {ACTIVITY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                    <input
                      placeholder="地点"
                      value={a.place}
                      onChange={e => updateActivity(dayIdx, actIdx, 'place', e.target.value)}
                      style={{ flex: 1 }}
                    />
                    {(day.activities || []).length > 1 && (
                      <button type="button" onClick={() => removeActivity(dayIdx, actIdx)} className="danger" style={styles.delBtn}>删</button>
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
    </div>
  )
}

const styles = {
  page: { padding: 16, paddingBottom: 80 },
  title: { fontSize: 22, marginBottom: 16, fontWeight: 600 },
  field: { marginBottom: 16 },
  row: { display: 'flex', gap: 12 },
  section: { marginTop: 24 },
  sectionTitle: { marginBottom: 12, fontSize: 16 },
  dayCard: { background: '#fff', padding: 12, borderRadius: 8, marginBottom: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.06)' },
  dayHeader: { fontWeight: 600, marginBottom: 10, color: '#0d7377' },
  actRow: { display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' },
  delBtn: { padding: '8px 12px', fontSize: 12 },
  addBtn: { marginTop: 4, padding: '8px 12px', fontSize: 13 },
  submit: { width: '100%', padding: 14, marginTop: 16 }
}
