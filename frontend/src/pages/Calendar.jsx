import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { getTrips, getStandaloneActivities } from '../utils/storage'

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function getDatesWithData(trips, activities) {
  const set = new Set()
  trips.forEach(trip => {
    if (trip.startDate && trip.endDate) {
      const start = new Date(trip.startDate)
      const end = new Date(trip.endDate)
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        set.add(d.toISOString().slice(0, 10))
      }
    }
  })
  activities.forEach(a => {
    if (a.date) set.add(a.date)
  })
  return set
}

function getActivitiesForDate(date, trips, activities) {
  const result = []
  trips.forEach(trip => {
    if (trip.startDate <= date && trip.endDate >= date && trip.days) {
      const day = trip.days.find(d => d.date === date)
      if (day?.activities?.length) {
        day.activities.filter(a => a.title?.trim()).forEach(a => {
          result.push({ ...a, tripTitle: trip.title, tripId: trip.id, type: 'trip' })
        })
      }
    }
  })
  activities.forEach(a => {
    if (a.date === date) result.push({ ...a, tripTitle: null, tripId: null, type: 'standalone' })
  })
  return result.sort((a, b) => (a.time || '').localeCompare(b.time || ''))
}

function getCalendarDays(year, month) {
  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)
  const startPad = first.getDay()
  const daysInMonth = last.getDate()
  const cells = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }
  return cells
}

export default function Calendar() {
  const trips = getTrips()
  const activities = getStandaloneActivities()
  const now = new Date()
  const [viewDate, setViewDate] = useState(() => ({ year: now.getFullYear(), month: now.getMonth() }))
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10))

  const datesWithData = getDatesWithData(trips, activities)
  const calendarDays = getCalendarDays(viewDate.year, viewDate.month)
  const selectedActivities = getActivitiesForDate(selectedDate, trips, activities)

  const prevMonth = () => {
    setViewDate(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 }
      return { ...prev, month: prev.month - 1 }
    })
  }
  const nextMonth = () => {
    setViewDate(prev => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 }
      return { ...prev, month: prev.month + 1 }
    })
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>日历</h1>

      <div style={styles.monthBar}>
        <button type="button" onClick={prevMonth} style={styles.monthBtn}>←</button>
        <span style={styles.monthLabel}>{viewDate.year}年{viewDate.month + 1}月</span>
        <button type="button" onClick={nextMonth} style={styles.monthBtn}>→</button>
      </div>

      <div style={styles.weekdays}>
        {WEEKDAYS.map(w => <div key={w} style={styles.weekday}>{w}</div>)}
      </div>

      <div style={styles.grid}>
        {calendarDays.map((dateStr, i) => (
          <div
            key={i}
            style={{
              ...styles.cell,
              ...(dateStr === selectedDate ? styles.cellSelected : {}),
              ...(datesWithData.has(dateStr) ? styles.cellHasData : {})
            }}
            onClick={() => dateStr && setSelectedDate(dateStr)}
          >
            {dateStr ? new Date(dateStr).getDate() : ''}
          </div>
        ))}
      </div>

      <div style={styles.card}>
        <div style={styles.label}>{selectedDate} 的安排</div>
        {selectedActivities.length === 0 ? (
          <p style={styles.empty}>暂无活动</p>
        ) : (
          selectedActivities.map((a, i) => (
            <div key={i} style={styles.item}>
              <span style={styles.time}>{a.time || '全天'}</span>
              {a.type === 'trip' ? (
                <Link to={`/trip/${a.tripId}`} style={styles.actLink}>
                  {a.title}
                  <span style={styles.tag}>{a.tripTitle}</span>
                </Link>
              ) : (
                <Link to={`/activity/${a.id}`} style={styles.actLink}>
                  {a.title}
                  <span style={styles.tag}>单独活动</span>
                </Link>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const styles = {
  page: { padding: 16, paddingBottom: 80 },
  title: { fontSize: 22, marginBottom: 16, fontWeight: 600 },
  monthBar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  monthBtn: { padding: '8px 16px', fontSize: 16 },
  monthLabel: { fontWeight: 600, fontSize: 16 },
  weekdays: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 8 },
  weekday: { textAlign: 'center', fontSize: 12, color: '#666' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 },
  cell: {
    aspectRatio: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    borderRadius: 8,
    cursor: 'pointer',
    background: '#f5f5f5'
  },
  cellSelected: { background: '#0d7377', color: '#fff', fontWeight: 600 },
  cellHasData: { borderBottom: '2px solid #0d7377' },
  card: {
    background: '#fff',
    padding: 16,
    borderRadius: 10,
    marginTop: 16,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
  },
  label: { fontSize: 13, color: '#666', marginBottom: 10 },
  item: { padding: '8px 0', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  time: { color: '#0d7377', fontWeight: 500, minWidth: 50 },
  actLink: { flex: 1, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  tag: { fontSize: 12, color: '#999', background: '#eee', padding: '2px 8px', borderRadius: 4 },
  empty: { color: '#999', fontSize: 14 }
}
