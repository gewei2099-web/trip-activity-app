import React from 'react'
import { HashRouter, Routes, Route, Link } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import TripList from './pages/TripList'
import TripForm from './pages/TripForm'
import TripDetail from './pages/TripDetail'
import ActivityForm from './pages/ActivityForm'
import ActivityDetail from './pages/ActivityDetail'
import Settings from './pages/Settings'

export default function App() {
  return (
    <HashRouter>
      <div style={styles.app}>
        <header style={styles.header}>
          <Link to="/" style={styles.logo}>行程</Link>
          <nav style={styles.nav}>
            <Link to="/" style={styles.navA}>首页</Link>
            <Link to="/trips" style={styles.navA}>行程</Link>
            <Link to="/trip/new" style={styles.navA}>新建行程</Link>
            <Link to="/activity/new" style={styles.navA}>新建活动</Link>
            <Link to="/settings" style={styles.navA}>设置</Link>
          </nav>
        </header>
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
  nav: { display: 'flex', gap: 16, fontSize: 14 },
  navA: { color: 'rgba(255,255,255,0.9)' },
  main: { flex: 1, padding: 0 }
}
