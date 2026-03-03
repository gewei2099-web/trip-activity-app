import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { getTripById } from '../utils/storage'

export default function TripDetail() {
  const { id } = useParams()
  const trip = getTripById(id)

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
                <div key={a.id || j} style={styles.act}>
                  <span style={styles.actTime}>{a.time || '全天'}</span>
                  <span style={styles.actTitle}>{a.title}</span>
                  {a.place && <span style={styles.actPlace}>{a.place}</span>}
                  <span style={styles.actType}>{a.type || '其他'}</span>
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
  act: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', padding: '6px 0', fontSize: 14 },
  actTime: { minWidth: 50, color: '#666' },
  actTitle: { fontWeight: 500 },
  actPlace: { color: '#666', fontSize: 13 },
  actType: { fontSize: 12, background: '#eee', padding: '2px 8px', borderRadius: 4 }
}
