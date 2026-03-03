import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { saveStandaloneActivity, getStandaloneActivityById } from '../utils/storage'
import { uuid } from '../utils/uuid'
import { ACTIVITY_TYPES } from '../utils/constants'

export default function ActivityForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = !!id

  const [form, setForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    title: '',
    time: '',
    place: '',
    type: '其他',
    memo: '',
    cost: ''
  })

  useEffect(() => {
    if (id) {
      const a = getStandaloneActivityById(id)
      if (a) setForm({ ...a })
    }
  }, [id])

  const update = (k, v) => setForm(prev => ({ ...prev, [k]: v }))

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
          <input type="date" value={form.date} onChange={e => update('date', e.target.value)} required />
        </div>
        <div style={styles.field}>
          <label>标题</label>
          <input value={form.title} onChange={e => update('title', e.target.value)} placeholder="如：某某演唱会" required />
        </div>
        <div style={styles.row}>
          <div style={styles.field}>
            <label>时间</label>
            <input value={form.time} onChange={e => update('time', e.target.value)} placeholder="如：19:00" />
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
          <input value={form.place} onChange={e => update('place', e.target.value)} placeholder="如：某某剧院" />
        </div>
        <div style={styles.field}>
          <label>费用（元）</label>
          <input type="number" placeholder="0" value={form.cost} onChange={e => update('cost', e.target.value)} />
        </div>
        <div style={styles.field}>
          <label>备注</label>
          <textarea value={form.memo} onChange={e => update('memo', e.target.value)} placeholder="活动说明" />
        </div>
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
  submit: { width: '100%', padding: 14, marginTop: 8 }
}
