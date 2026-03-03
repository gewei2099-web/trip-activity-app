import React from 'react'
import { useParams, Link } from 'react-router-dom'
import { getStandaloneActivityById } from '../utils/storage'

export default function ActivityDetail() {
  const { id } = useParams()
  const activity = getStandaloneActivityById(id)

  if (!activity) {
    return (
      <div style={styles.page}>
        <p>活动不存在</p>
        <Link to="/trips">返回列表</Link>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.actions}>
        <Link to="/trips" style={styles.back}>← 返回</Link>
        <Link to={`/activity/${activity.id}/edit`} style={styles.edit}>编辑</Link>
      </div>

      <h1 style={styles.title}>{activity.title}</h1>
      <div style={styles.meta}>
        <span>{activity.date}</span>
        {activity.time && <span>{activity.time}</span>}
        {activity.type && <span>{activity.type}</span>}
        {activity.cost && <span>¥{activity.cost}</span>}
        {activity.remindBefore && <span style={styles.remindBadge}>提前{activity.remindBefore}分钟提醒</span>}
      </div>

      {activity.place && (
        <div style={styles.card}>
          <div style={styles.label}>地点</div>
          <p>{activity.place}</p>
        </div>
      )}

      {activity.memo && (
        <div style={styles.card}>
          <div style={styles.label}>备注</div>
          <p style={styles.text}>{activity.memo}</p>
        </div>
      )}

      {(activity.photos || []).length > 0 && (
        <div style={styles.card}>
          <div style={styles.label}>图片</div>
          <div style={styles.photoGrid}>
            {activity.photos.map((p, i) => (
              <img key={i} src={p} alt="" style={styles.photoThumb} />
            ))}
          </div>
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
  label: { fontSize: 13, color: '#666', marginBottom: 8 },
  remindBadge: { fontSize: 12, color: '#666', background: '#eee', padding: '2px 8px', borderRadius: 4 },
  text: { fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' },
  photoGrid: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  photoThumb: { width: 100, height: 100, objectFit: 'cover', borderRadius: 8 }
}
