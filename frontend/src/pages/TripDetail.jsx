import React, { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { getTripById, saveTrip } from '../utils/storage'
import { callLLM } from '../utils/llm'

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

      {trip.days?.length > 0 && (
        <div style={styles.card}>
          <h3 style={styles.section}>日程安排</h3>
          {trip.days.map((day, i) => (
            <div key={day.date} style={styles.day}>
              <div style={styles.dayDate}>{day.date}</div>
              {(day.activities || []).filter(a => a.title?.trim()).map((a, j) => (
                <div key={a.id || j} style={styles.actItem}>
                  <div style={styles.act}>
                    <span style={styles.actTime}>{a.time || '全天'}</span>
                    <span style={styles.actTitle}>{a.title}</span>
                    {a.place && <span style={styles.actPlace}>{a.place}</span>}
                    <span style={styles.actType}>{a.type || '其他'}</span>
                    {a.cost != null && a.cost !== '' && !isNaN(parseFloat(a.cost)) && (
                      <span style={styles.actCost}>¥{parseFloat(a.cost)}</span>
                    )}
                    {a.remindBefore && (
                      <span style={styles.remindBadge}>提前{a.remindBefore}分钟提醒</span>
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
  day: { marginBottom: 16 },
  dayDate: { fontWeight: 600, color: '#0d7377', marginBottom: 8 },
  actItem: { padding: '6px 0' },
  act: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 14 },
  actTime: { minWidth: 50, color: '#666' },
  actTitle: { fontWeight: 500 },
  actPlace: { color: '#666', fontSize: 13 },
  actType: { fontSize: 12, background: '#eee', padding: '2px 8px', borderRadius: 4 },
  actCost: { color: '#0d7377', fontWeight: 500 },
  remindBadge: { fontSize: 11, color: '#666', background: '#eee', padding: '2px 6px', borderRadius: 4 },
  actPhotos: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  photoThumb: { width: 60, height: 60, objectFit: 'cover', borderRadius: 6 },
  budgetRow: { display: 'flex', flexWrap: 'wrap', gap: 16, fontSize: 14 },
  overBudget: { color: '#c00', fontWeight: 600 },
  aiBtn: { marginTop: 8, padding: '8px 16px', fontSize: 14 },
  aiResult: { marginTop: 8, padding: 12, background: '#f5f5f5', borderRadius: 8 },
  aiText: { whiteSpace: 'pre-wrap', fontSize: 14, margin: '0 0 8px 0' },
  aiApply: { padding: '6px 12px', fontSize: 13 }
}
