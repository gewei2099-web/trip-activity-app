import React, { useState, useRef, useEffect } from 'react'
import { HashRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import TripList from './pages/TripList'
import TripForm from './pages/TripForm'
import TripDetail from './pages/TripDetail'
import ActivityForm from './pages/ActivityForm'
import ActivityDetail from './pages/ActivityDetail'
import Calendar from './pages/Calendar'
import MapView from './pages/MapView'
import Settings from './pages/Settings'
import ReminderChecker from './components/ReminderChecker'

function Nav() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const loc = useLocation()
  useEffect(() => setOpen(false), [loc.pathname])
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('click', h)
    return () => document.removeEventListener('click', h)
  }, [])
  return (
    <header style={styles.header}>
      <Link to="/" style={styles.logo}>行程</Link>
      <nav style={styles.nav} ref={ref}>
        <Link to="/" style={styles.navA}>首页</Link>
        <Link to="/trips" style={styles.navA}>行程</Link>
        <Link to="/trip/new" style={styles.navA}>新建</Link>
        <Link to="/activity/new" style={styles.navA}>活动</Link>
        <div style={styles.moreWrap}>
          <button type="button" onClick={() => setOpen(o => !o)} style={styles.moreBtn}>
            更多 ▾
          </button>
          {open && (
            <div style={styles.dropdown}>
              <Link to="/calendar" className="nav-drop-a" style={styles.dropA}>日历</Link>
              <Link to="/map" className="nav-drop-a" style={styles.dropA}>地图</Link>
              <Link to="/settings" className="nav-drop-a" style={styles.dropA}>设置</Link>
            </div>
          )}
        </div>
      </nav>
    </header>
  )
}

export default function App() {
  return (
    <HashRouter>
      <ReminderChecker />
      <div style={styles.app}>
        <Nav />
        <main style={styles.main}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/trips" element={<TripList />} />
            <Route path="/trip/new" element={<TripForm />} />
            <Route path="/trip/:id" element={<TripDetail />} />
            <Route path="/trip/:id/edit" element={<TripForm />} />
            <Route path="/activity/new" element={<ActivityForm />} />
            <Route path="/activity/:id" element={<ActivityDetail />} />
            <Route path="/activity/:id/edit" element={<ActivityForm />} />
            <Route path="/calendar" element={<Calendar />} />
            <Route path="/map" element={<MapView />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}

const styles = {
  app: { minHeight: '100%', display: 'flex', flexDirection: 'column' },
  header: {
    background: '#0d7377',
    color: '#fff',
    padding: '12px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 10
  },
  logo: { color: '#fff', fontWeight: 600, fontSize: 18 },
  nav: { display: 'flex', gap: 12, fontSize: 14, alignItems: 'center' },
  navA: { color: 'rgba(255,255,255,0.95)' },
  moreWrap: { position: 'relative' },
  moreBtn: {
    background: 'transparent',
    border: 'none',
    color: 'rgba(255,255,255,0.9)',
    cursor: 'pointer',
    fontSize: 14,
    padding: 0
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 4,
    background: '#fff',
    borderRadius: 8,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    padding: '8px 0',
    minWidth: 100
  },
  dropA: { display: 'block', padding: '8px 16px', color: '#333', fontSize: 14, textDecoration: 'none' },
  main: { flex: 1, padding: 0 }
}
