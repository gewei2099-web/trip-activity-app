import React, { useState, useEffect, useRef } from 'react'
import {
  getApiConfig,
  saveApiConfig,
  getGeocodingConfig,
  saveGeocodingConfig,
  getAppConfig,
  saveAppConfig,
  exportData,
  importData
} from '../utils/storage'
import { searchPlace } from '../utils/geocode'

export default function Settings() {
  const [config, setConfig] = useState(getApiConfig())
  const [geoConfig, setGeoConfig] = useState(getGeocodingConfig())
  const [appConfig, setAppConfig] = useState(getAppConfig())
  const [saved, setSaved] = useState(false)
  const [importMsg, setImportMsg] = useState(null)
  const [geoTestMsg, setGeoTestMsg] = useState(null)
  const [geoTestLoading, setGeoTestLoading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    saveApiConfig(config)
    setSaved(true)
    const t = setTimeout(() => setSaved(false), 1500)
    return () => clearTimeout(t)
  }, [config])

  useEffect(() => {
    saveGeocodingConfig(geoConfig)
  }, [geoConfig])

  useEffect(() => {
    saveAppConfig(appConfig)
  }, [appConfig])

  const update = (k, v) => setConfig(prev => ({ ...prev, [k]: v }))
  const updateGeo = (k, v) => setGeoConfig(prev => ({ ...prev, [k]: v }))

  const addAppConfigItem = (key, val) => {
    const v = (val || '').trim()
    if (!v) return
    const list = appConfig[key] || []
    if (list.includes(v)) return
    setAppConfig(prev => ({ ...prev, [key]: [...list, v] }))
  }
  const removeAppConfigItem = (key, idx) => {
    setAppConfig(prev => ({
      ...prev,
      [key]: (prev[key] || []).filter((_, i) => i !== idx)
    }))
  }

  const handleGeoTest = async () => {
    setGeoTestMsg(null)
    setGeoTestLoading(true)
    try {
      const list = await searchPlace('北京', 1)
      if (list.length > 0) {
        setGeoTestMsg({ type: 'ok', text: `成功：${list[0].display} (${list[0].lat.toFixed(4)}, ${list[0].lng.toFixed(4)})` })
      } else {
        setGeoTestMsg({ type: 'warn', text: '无结果（但请求未报错）' })
      }
    } catch (err) {
      setGeoTestMsg({ type: 'error', text: `失败：${err.message}` })
    } finally {
      setGeoTestLoading(false)
    }
  }

  const handleExport = () => {
    const data = exportData()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const now = new Date()
    const pad = n => String(n).padStart(2, '0')
    const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
    const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
    a.download = `trip-activity-backup-${dateStr}-${timeStr}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const result = importData(reader.result, 'overwrite')
        if (result.ok) {
          setImportMsg({ type: 'ok', text: '导入成功，请刷新页面' })
          setTimeout(() => window.location.reload(), 1000)
        } else {
          setImportMsg({ type: 'error', text: result.error || '导入失败' })
        }
      } catch (err) {
        setImportMsg({ type: 'error', text: err.message || '解析失败' })
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleImportMerge = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const result = importData(reader.result, 'merge')
        if (result.ok) {
          setImportMsg({ type: 'ok', text: '合并成功，请刷新页面' })
          setTimeout(() => window.location.reload(), 1000)
        } else {
          setImportMsg({ type: 'error', text: result.error || '导入失败' })
        }
      } catch (err) {
        setImportMsg({ type: 'error', text: err.message || '解析失败' })
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  /* BUILD_TIME 由 vite define 在构建时注入 */
  const buildTime = typeof __BUILD_TIME__ !== 'undefined' ? String(__BUILD_TIME__) : ''

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>设置</h1>
      {buildTime && (
        <div style={styles.version}>构建：{buildTime}</div>
      )}

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>LLM 配置（可选）</h2>
        <p style={styles.hint}>用于行程建议、游记摘要等。API Key 仅存本机，不上传。</p>
        <div style={styles.field}>
          <label>API Key</label>
          <input
            type="password"
            placeholder="sk-xxx"
            value={config.apiKey ?? ''}
            onChange={e => update('apiKey', e.target.value)}
            autoComplete="off"
          />
        </div>
        <div style={styles.field}>
          <label>接口地址</label>
          <input
            placeholder="https://api.openai.com/v1"
            value={config.baseUrl ?? ''}
            onChange={e => update('baseUrl', e.target.value)}
          />
        </div>
        <div style={styles.field}>
          <label>模型</label>
          <input
            placeholder="gpt-4o-mini"
            value={config.model ?? ''}
            onChange={e => update('model', e.target.value)}
          />
        </div>
        {saved && <div style={styles.saved}>已保存</div>}
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>地点搜索（可选）</h2>
        <p style={styles.hint}>配置高德/Geoapify Key 可提升地点搜索效果。国内优先高德，海外优先 Geoapify。Key 仅存本机。</p>
        <div style={styles.field}>
          <label>使用环境</label>
          <select value={geoConfig.env ?? 'auto'} onChange={e => updateGeo('env', e.target.value)} style={styles.select}>
            <option value="auto">自动（按网络检测）</option>
            <option value="cn">国内优先</option>
            <option value="intl">海外优先</option>
          </select>
        </div>
        <div style={styles.field}>
          <label>高德 Key（国内，约 6000 次/天免费）</label>
          <input
            type="password"
            placeholder="在 lbs.amap.com 申请"
            value={geoConfig.amapKey ?? ''}
            onChange={e => updateGeo('amapKey', e.target.value)}
            autoComplete="off"
          />
        </div>
        <div style={styles.field}>
          <label>高德安全密钥</label>
          <input
            type="password"
            placeholder="Key 开启数字签名时必填"
            value={geoConfig.amapSecurityKey ?? ''}
            onChange={e => updateGeo('amapSecurityKey', e.target.value)}
            autoComplete="off"
          />
          <p style={styles.fieldHint}>若在控制台为该 Key 开启了「数字签名」，需在此填写安全密钥</p>
        </div>
        <div style={styles.field}>
          <label>Geoapify Key（海外，约 3000 次/天免费）</label>
          <input
            type="password"
            placeholder="在 myprojects.geoapify.com 申请"
            value={geoConfig.geoapifyKey ?? ''}
            onChange={e => updateGeo('geoapifyKey', e.target.value)}
            autoComplete="off"
          />
        </div>
        <div style={styles.field}>
          <button type="button" onClick={handleGeoTest} disabled={geoTestLoading} style={styles.btn}>
            {geoTestLoading ? '测试中…' : '测试地点搜索'}
          </button>
          <p style={styles.fieldHint}>使用当前配置搜索「北京」。测试高德请选「国内优先」；测试 Geoapify 请选「海外优先」</p>
          {geoTestMsg && (
            <div style={geoTestMsg.type === 'ok' ? styles.msgOk : geoTestMsg.type === 'warn' ? styles.msgWarn : styles.msgErr}>
              {geoTestMsg.text}
            </div>
          )}
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>活动类型与物品分类</h2>
        <p style={styles.hint}>自定义活动类型（如景点、交通）和携带物品分类，用于行程编辑与携带清单。</p>
        <div style={styles.field}>
          <label>活动类型</label>
          <div style={styles.tagRow}>
            <input
              placeholder="添加类型，回车确认"
              value={appConfig.activityInput ?? ''}
              onChange={e => setAppConfig(prev => ({ ...prev, activityInput: e.target.value }))}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const v = (appConfig.activityInput ?? '').trim()
                  if (v && !(appConfig.activityTypes || []).includes(v)) {
                    setAppConfig(prev => ({ ...prev, activityTypes: [...(prev.activityTypes || []), v], activityInput: '' }))
                  }
                }
              }}
              style={styles.tagInput}
            />
            <button type="button" onClick={() => {
              const v = (appConfig.activityInput ?? '').trim()
              if (v && !(appConfig.activityTypes || []).includes(v)) {
                setAppConfig(prev => ({ ...prev, activityTypes: [...(prev.activityTypes || []), v], activityInput: '' }))
              }
            }} style={styles.tagAddBtn}>添加</button>
          </div>
          <div style={styles.tagList}>
            {(appConfig.activityTypes || []).map((t, i) => (
              <span key={t} style={styles.tag}>
                {t}
                <button type="button" onClick={() => setAppConfig(prev => ({ ...prev, activityTypes: (prev.activityTypes || []).filter((_, j) => j !== i) }))} style={styles.tagDel}>×</button>
              </span>
            ))}
          </div>
        </div>
        <div style={styles.field}>
          <label>携带物品分类</label>
          <div style={styles.tagRow}>
            <input
              placeholder="添加分类，回车确认"
              value={appConfig.packingInput ?? ''}
              onChange={e => setAppConfig(prev => ({ ...prev, packingInput: e.target.value }))}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const v = (appConfig.packingInput ?? '').trim()
                  if (v && !(appConfig.packingCategories || []).includes(v)) {
                    setAppConfig(prev => ({ ...prev, packingCategories: [...(prev.packingCategories || []), v], packingInput: '' }))
                  }
                }
              }}
              style={styles.tagInput}
            />
            <button type="button" onClick={() => {
              const v = (appConfig.packingInput ?? '').trim()
              if (v && !(appConfig.packingCategories || []).includes(v)) {
                setAppConfig(prev => ({ ...prev, packingCategories: [...(prev.packingCategories || []), v], packingInput: '' }))
              }
            }} style={styles.tagAddBtn}>添加</button>
          </div>
          <div style={styles.tagList}>
            {(appConfig.packingCategories || []).map((c, i) => (
              <span key={c} style={styles.tag}>
                {c}
                <button type="button" onClick={() => setAppConfig(prev => ({ ...prev, packingCategories: (prev.packingCategories || []).filter((_, j) => j !== i) }))} style={styles.tagDel}>×</button>
              </span>
            ))}
          </div>
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>数据导入/导出</h2>
        <p style={styles.hint}>数据存于本机，换设备需导出后在新设备导入。</p>
        <div style={styles.btnRow}>
          <button onClick={handleExport} style={styles.btn}>导出 JSON</button>
        </div>
        <div style={styles.btnRow}>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="secondary"
            style={styles.btn}
          >
            覆盖导入
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImport}
          />
          <button
            onClick={() => document.getElementById('import-merge')?.click()}
            className="secondary"
            style={styles.btn}
          >
            合并导入
          </button>
          <input
            id="import-merge"
            type="file"
            accept=".json"
            style={{ display: 'none' }}
            onChange={handleImportMerge}
          />
        </div>
        {importMsg && (
          <div style={importMsg.type === 'ok' ? styles.msgOk : styles.msgErr}>
            {importMsg.text}
          </div>
        )}
      </section>
    </div>
  )
}

const styles = {
  page: { padding: 16, paddingBottom: 80 },
  title: { fontSize: 22, marginBottom: 16, fontWeight: 600 },
  version: { fontSize: 13, color: '#888', marginBottom: 12 },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 16, marginBottom: 8 },
  hint: { fontSize: 14, color: '#666', marginBottom: 12 },
  field: { marginBottom: 16 },
  select: { width: '100%', padding: '10px 12px', fontSize: 16, borderRadius: 8, border: '1px solid #ddd' },
  fieldHint: { fontSize: 12, color: '#888', marginTop: 4 },
  msgWarn: { color: '#b8860b', fontSize: 14, marginTop: 8 },
  saved: { color: '#0a0', fontSize: 14, marginBottom: 8 },
  btnRow: { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 },
  btn: { padding: '10px 16px' },
  msgOk: { color: '#0a0', fontSize: 14, marginTop: 8 },
  msgErr: { color: '#c00', fontSize: 14, marginTop: 8 },
  tagRow: { display: 'flex', gap: 8, marginBottom: 8 },
  tagInput: { flex: 1, minWidth: 0, padding: '10px 12px', fontSize: 15, borderRadius: 8, border: '1px solid #ddd' },
  tagAddBtn: { padding: '10px 16px', fontSize: 14, whiteSpace: 'nowrap' },
  tagList: { display: 'flex', flexWrap: 'wrap', gap: 8 },
  tag: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: '#e9ecef', borderRadius: 6, fontSize: 14 },
  tagDel: { background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#666', padding: 0, lineHeight: 1 }
}
