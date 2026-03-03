import React from 'react'
import { Link } from 'react-router-dom'
import { getTrips, getStandaloneActivities } from '../utils/storage'

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function getUpcomingTrips(trips, limit = 3) {
  const today = todayStr()
  return trips
    .filter(t => t.endDate >= today)
    .sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''))
    .slice(0, limit)
}

function getTodayActivities(trips, standaloneActivities) {
  const today = todayStr()
  const result = []

  trips.forEach(trip => {
    if (trip.startDate <= today && trip.endDate >= today && trip.days) {
      const day = trip.days.find(d => d.date === today)
      if (day?.activities?.length) {
        day.activities.forEach(a => {
          result.push({ ...a, tripTitle: trip.title, type: 'trip' })
        })
      }
    }
  })

  standaloneActivities.forEach(a => {
    if (a.date === today) result.push({ ...a, tripTitle: null, type: 'standalone' })
  })

  return result.sort((a, b) => (a.time || '').localeCompare(b.time || ''))
}

export default function Dashboard() {
  const trips = getTrips()
  const standaloneActivities = getStandaloneActivities()
  const upcoming = getUpcomingTrips(trips)
  const todayActivities = getTodayActivities(trips, standaloneActivities)

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>今日概览</h1>

      {todayActivities.length > 0 && (
        <div style={styles.card}>
          <div style={styles.label}>今日活动</div>
          {todayActivities.map((a, i) => (
            <div key={i} style={styles.item}>
              <span style={styles.time}>{a.time || '全天'}</span>
              <span>{a.title}</span>
              {a.tripTitle && (
                <span style={styles.tag}>{a.tripTitle}</span>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={styles.card}>
        <div style={styles.label}>即将开始</div>
        {upcoming.length === 0 ? (
          <p style={styles.empty}>暂无即将开始的行程</p>
        ) : (
          upcoming.map(t => (
            <Link key={t.id} to={`/trip/${t.id}`} style={styles.tripLink}>
              <div style={styles.tripTitle}>{t.title}</div>
              <div style={styles.tripMeta}>
                {t.destination} · {t.startDate} ~ {t.endDate}
              </div>
            </Link>
          ))
        )}
      </div>

      <nav style={styles.nav}>
        <Link to="/trip/new">新建行程</Link>
        <Link to="/trips">全部行程</Link>
      </nav>
    </div>
  )
}

const styles = {
  page: { padding: 16, paddingBottom: 80 },
  title: { fontSize: 22, marginBottom: 16, fontWeight: 600 },
  card: {
    background: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
  },
  label: { fontSize: 13, color: '#666', marginBottom: 10 },
  item: { padding: '8px 0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  time: { color: '#0d7377', fontWeight: 500, minWidth: 50 },
  tag: { fontSize: 12, color: '#999', background: '#eee', padding: '2px 8px', borderRadius: 4 },
  empty: { color: '#999', fontSize: 14 },
  tripLink: { display: 'block', padding: '10px 0', borderBottom: '1px solid #eee' },
  tripTitle: { fontWeight: 600, marginBottom: 4 },
  tripMeta: { fontSize: 13, color: '#666' },
  nav: { display: 'flex', justifyContent: 'space-around', padding: '24px 0', gap: 8 }
}
