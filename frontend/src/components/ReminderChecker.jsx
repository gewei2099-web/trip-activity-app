import React, { useEffect, useRef } from 'react'
import { getTrips, getStandaloneActivities } from '../utils/storage'

const NOTIFIED_KEY = 'trip_reminder_notified'

function getNotifiedKey(type, id, date, time) {
  return `${type}_${id}_${date}_${time || ''}`
}

function checkAndNotify() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const now = Date.now()
  const trips = getTrips()
  const activities = getStandaloneActivities()

  const tryNotify = (key, title, body) => {
    try {
      const notified = JSON.parse(localStorage.getItem(NOTIFIED_KEY) || '{}')
      if (notified[key]) return
      new Notification(title, { body })
      notified[key] = now
      localStorage.setItem(NOTIFIED_KEY, JSON.stringify(notified))
    } catch (_) {}
  }

  trips.forEach(trip => {
    trip.days?.forEach(day => {
      (day.activities || []).forEach(a => {
        if (!a.remindBefore || !a.title?.trim()) return
        const mins = parseInt(a.remindBefore, 10)
        if (isNaN(mins) || mins <= 0) return
        const timeStr = a.time || '09:00'
        const [h, m] = timeStr.split(':').map(Number)
        const remindAt = new Date(day.date)
        remindAt.setHours(h, m - mins, 0, 0)
        if (now >= remindAt.getTime()) {
          const key = getNotifiedKey('trip', trip.id, day.date, a.time)
          tryNotify(key, `行程提醒：${a.title}`, `${trip.title} · ${day.date} ${a.time || '全天'}`)
        }
      })
    })
  })

  activities.forEach(a => {
    if (!a.remindBefore || !a.title?.trim()) return
    const mins = parseInt(a.remindBefore, 10)
    if (isNaN(mins) || mins <= 0) return
    const timeStr = a.time || '09:00'
    const [h, m] = timeStr.split(':').map(Number)
    const remindAt = new Date(a.date)
    remindAt.setHours(h, m - mins, 0, 0)
    if (now >= remindAt.getTime()) {
      const key = getNotifiedKey('act', a.id, a.date, a.time)
      tryNotify(key, `活动提醒：${a.title}`, `${a.date} ${a.time || '全天'}`)
    }
  })
}

export default function ReminderChecker() {
  const intervalRef = useRef(null)
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    checkAndNotify()
    intervalRef.current = setInterval(checkAndNotify, 60 * 1000)
    return () => clearInterval(intervalRef.current)
  }, [])
  return null
}
