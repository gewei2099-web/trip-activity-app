import React, { useState, useEffect, useRef } from 'react'
import {
  getApiConfig,
  saveApiConfig,
  exportData,
  importData
} from '../utils/storage'

export default function Settings() {
  const [config, setConfig] = useState(getApiConfig())
  const [saved, setSaved] = useState(false)
  const [importMsg, setImportMsg] = useState(null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    saveApiConfig(config)
    setSaved(true)
    const t = setTimeout(() => setSaved(false), 1500)
    return () => clearTimeout(t)
  }, [config])

  const update = (k, v) => setConfig(prev => ({ ...prev, [k]: v }))

  const handleExport = () => {
    const data = exportData()
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trip-activity-backup-${new Date().toISOString().slice(0, 10)}.json`
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

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>设置</h1>

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
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 16, marginBottom: 8 },
  hint: { fontSize: 14, color: '#666', marginBottom: 12 },
  field: { marginBottom: 16 },
  saved: { color: '#0a0', fontSize: 14, marginBottom: 8 },
  btnRow: { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 },
  btn: { padding: '10px 16px' },
  msgOk: { color: '#0a0', fontSize: 14, marginTop: 8 },
  msgErr: { color: '#c00', fontSize: 14, marginTop: 8 }
}
