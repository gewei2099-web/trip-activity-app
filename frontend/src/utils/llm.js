import { getApiConfig } from './storage'

export async function callLLM(messages, options = {}) {
  const { apiKey, baseUrl, model } = getApiConfig()
  if (!apiKey?.trim() || !baseUrl?.trim()) {
    throw new Error('请先在设置中配置 API Key 和接口地址')
  }
  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      ...options
    })
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`API 错误: ${res.status} ${errText}`)
  }
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}
