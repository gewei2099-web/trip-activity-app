/** 时+分选择器，替代 type="time" 以兼容无确定按钮的移动端 */
import React from 'react'

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

export default function TimeSelect({ value, onChange, style = {} }) {
  const [h, m] = (value || '').split(':')
  const hour = h || ''
  const minute = m || ''

  const handleChange = (newH, newM) => {
    if (newH && newM) onChange(`${newH}:${newM}`)
    else if (newH) onChange(`${newH}:00`)
    else onChange(newM ? `00:${newM}` : '')
  }

  return (
    <div style={{ display: 'flex', gap: 6, ...style }}>
      <select
        value={hour}
        onChange={e => handleChange(e.target.value, minute)}
        style={{ flex: 1 }}
      >
        <option value="">时</option>
        {HOURS.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
      <select
        value={minute}
        onChange={e => handleChange(hour, e.target.value)}
        style={{ flex: 1 }}
      >
        <option value="">分</option>
        {MINUTES.map(m => <option key={m} value={m}>{m}</option>)}
      </select>
    </div>
  )
}
