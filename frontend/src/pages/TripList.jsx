import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { getTrips, getStandaloneActivities, deleteTrip, deleteStandaloneActivity } from '../utils/storage'

export default function TripList() {
  const [trips, setTrips] = useState(getTrips())
  const [activities, setActivities] = useState(getStandaloneActivities())

  const handleDeleteTrip = (id, e) => {
    e.preventDefault()
    if (confirm('确定删除此行程？')) setTrips(deleteTrip(id))
  }

  const handleDeleteActivity = (id, e) => {
    e.preventDefault()
    if (confirm('确定删除此活动？')) setActivities(deleteStandaloneActivity(id))
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>行程列表</h1>

      {trips.length === 0 && activities.length === 0 ? (
        <div style={styles.empty}>
          暂无行程，<Link to="/trip/new">新建行程</Link>
        </div>
      ) : (
        <>
          {trips.map(t => (
            <div key={t.id} style={styles.item}>
              <Link to={`/trip/${t.id}`} style={styles.link}>
                <div style={styles.name}>{t.title}</div>
                <div style={styles.meta}>
                  {t.destination} · {t.startDate} ~ {t.endDate}
                  {t.type && ` · ${t.type}`}
                </div>
              </Link>
              <button
                type="button"
                onClick={e => handleDeleteTrip(t.id, e)}
                style={styles.delBtn}
                className="danger"
              >
                删除
              </button>
            </div>
          ))}

          {activities.length > 0 && (
            <div style={styles.section}>
              <div style={styles.sectionTitle}>单独活动</div>
              {activities.map(a => (
                <div key={a.id} style={styles.item}>
                  <Link to={`/activity/${a.id}`} style={styles.link}>
                    <div style={styles.name}>{a.title}</div>
                    <div style={styles.meta}>
                      {a.date} {a.place ? `· ${a.place}` : ''}
                    </div>
                  </Link>
                  <Link to={`/activity/${a.id}/edit`} style={styles.editBtn}>编辑</Link>
                  <button
                    type="button"
                    onClick={e => handleDeleteActivity(a.id, e)}
                    style={styles.delBtn}
                    className="danger"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

const styles = {
  page: { padding: 16, paddingBottom: 80 },
  title: { fontSize: 22, marginBottom: 16, fontWeight: 600 },
  empty: { textAlign: 'center', padding: 40, color: '#666' },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 14, color: '#666', marginBottom: 10 },
  item: {
    display: 'flex',
    alignItems: 'center',
    background: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    padding: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
  },
  link: { flex: 1 },
  editBtn: { padding: '8px 12px', fontSize: 13, color: '#0d7377', textDecoration: 'underline' },
  name: { fontWeight: 600, marginBottom: 4 },
  meta: { fontSize: 13, color: '#666' },
  delBtn: { padding: '8px 12px', fontSize: 13 }
}
