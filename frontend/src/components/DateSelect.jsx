/** 年+月+日选择器，替代 type="date" 以兼容无确定按钮的移动端 */
import React from 'react'

const MONTHS = [
  { v: '01', label: '1月' }, { v: '02', label: '2月' }, { v: '03', label: '3月' },
  { v: '04', label: '4月' }, { v: '05', label: '5月' }, { v: '06', label: '6月' },
  { v: '07', label: '7月' }, { v: '08', label: '8月' }, { v: '09', label: '9月' },
  { v: '10', label: '10月' }, { v: '11', label: '11月' }, { v: '12', label: '12月' }
]

function daysInMonth(year, month) {
  if (!year || !month) return 31
  const y = parseInt(year, 10)
  const m = parseInt(month, 10)
  if (m === 2) return (y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0)) ? 29 : 28
  return [1, 3, 5, 7, 8, 10, 12].includes(m) ? 31 : 30
}

export default function DateSelect({ value, onChange, style = {}, min, max }) {
  const [y, m, d] = (value || '').split('-')
  const year = y || ''
  const month = m || ''
  const day = d || ''

  const yearRange = () => {
    const now = new Date().getFullYear()
    const minY = min ? parseInt(min.slice(0, 4), 10) : now - 2
    const maxY = max ? parseInt(max.slice(0, 4), 10) : now + 2
    return Array.from({ length: maxY - minY + 1 }, (_, i) => String(minY + i))
  }

  const dayOpts = () => {
    const n = daysInMonth(year, month)
    return Array.from({ length: n }, (_, i) => String(i + 1).padStart(2, '0'))
  }

  const handleChange = (newY, newM, newD) => {
    const yy = newY !== undefined ? newY : year
    const mm = newM !== undefined ? newM : month
    let dd = newD !== undefined ? newD : day
    if (yy && mm) {
      const maxD = daysInMonth(yy, mm)
      const dNum = parseInt(dd, 10) || 1
      if (dNum > maxD) dd = String(maxD).padStart(2, '0')
      if (dd) onChange(`${yy}-${mm}-${dd}`)
      else onChange(`${yy}-${mm}-01`)
    } else {
      onChange('')
    }
  }

  return (
    <div style={{ ...style }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <select
          value={year}
          onChange={e => handleChange(e.target.value, month, day)}
          style={{ flex: 1, minWidth: 80, minHeight: 44, padding: '10px 12px', fontSize: 16 }}
        >
          <option value="">年</option>
          {yearRange().map(yr => <option key={yr} value={yr}>{yr}</option>)}
        </select>
        <select
          value={month}
          onChange={e => handleChange(year, e.target.value, day)}
          style={{ flex: 1, minWidth: 72, minHeight: 44, padding: '10px 12px', fontSize: 16 }}
        >
          <option value="">月</option>
          {MONTHS.map(x => <option key={x.v} value={x.v}>{x.label}</option>)}
        </select>
        <select
          value={day}
          onChange={e => handleChange(year, month, e.target.value)}
          style={{ flex: 1, minWidth: 72, minHeight: 44, padding: '10px 12px', fontSize: 16 }}
        >
          <option value="">日</option>
          {dayOpts().map(x => <option key={x} value={x}>{x}</option>)}
        </select>
      </div>
      {value && (
        <div style={{ marginTop: 6, fontSize: 15, fontWeight: 600, color: '#0d7377' }}>
          已选：{value}
        </div>
      )}
    </div>
  )
}
