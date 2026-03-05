# 地点搜索增强方案

本文档列出可选的增强方案，供选择最合适的地图搜索实现。

---

## 国内与海外兼顾：推荐做法

### 核心结论

- **没有单一“万能”方案**：国内（高德/百度）和海外（Google/Mapbox 等）在数据、网络可达性上差异大，一个 API 难以同时表现都好。
- **可行做法**：采用 **多源 + 可配置环境** 策略，自动或按场景选择不同数据源。

### 两种实现思路

| 思路 | 说明 | 优缺点 |
|------|------|--------|
| **A. 环境切换** | 用户选择「国内优先 / 海外优先 / 自动」 | 明确、可控；自动检测依赖 IP 接口 |
| **B. 智能串行** | 按配置顺序依次调用，先成功先返回 | 无需环境判断；多试几家，延迟略增 |

### 推荐：环境切换 + 多源配置

1. **设置项**：`地点搜索环境` = `自动` | `国内优先` | `海外优先`
2. **可选 API Keys**（在设置中填写）：
   - 高德 Key（国内效果好）
   - Geoapify / Mapbox / LocationIQ 任选（海外效果好）
3. **调用顺序**（按环境）：
   - **国内优先**：高德(有 key) → Nominatim → Photon → Open-Meteo
   - **海外优先**：Geoapify/Mapbox/…(有 key) → Nominatim → Photon → Open-Meteo
4. **自动检测**：首次搜索前用 ipinfo.io（HTTPS）取 `country`，若为 CN/HK/MO 则视为国内，否则海外。

### 国内 vs 海外 数据源对比

| 数据源 | 国内可用性 | 海外可用性 | 国内数据质量 | 海外数据质量 |
|--------|------------|------------|--------------|--------------|
| 高德 | 很好 | 一般 | 很好 | 一般 |
| Nominatim / Photon | 易受限 | 较好 | 一般 | 较好 |
| Geoapify / LocationIQ | 较好 | 较好 | 较好 | 较好 |
| Google Maps | 通常不可用 | 很好 | - | 很好 |
| Mapbox | 通常不可用 | 很好 | - | 很好 |

---

## 方案总览

| 方案 | 费用 | 需 API Key | 中文支持 | 国内可用性 | 实现复杂度 |
|------|------|------------|----------|------------|------------|
| A. Google Maps | 有免费额度 | ✅ | 优秀 | 需代理 | 低 |
| B. Mapbox | 有免费额度 | ✅ | 良好 | 较好 | 低 |
| C. Geoapify | 3000次/天免费 | ✅ | 良好 | 较好 | 低 |
| D. LocationIQ | 5000次/天免费 | ✅ | 良好 | 较好 | 低 |
| E. geocode.maps.co | 25000次/月免费 | ✅ | 中等 | 较好 | 低 |
| F. 后端代理 | 复用现有 | ❌ | 同 Nominatim | 取决于部署 | 中 |

---

## 方案 A：Google Maps Geocoding API

### 特点
- **质量最佳**：全球覆盖、POI 丰富、中文地名识别好
- **免费额度**：$200/月赠金，约可支持 ~40,000 次地理编码
- **需绑定账单**：需 Google Cloud 账号并启用计费（超额度才扣费）

### 国内可用性
- 国内访问通常需代理或服务器中转

### 实现示意

**1. storage.js 扩展**（在 API_CONFIG 旁增加 GEOCODING_CONFIG）：

```javascript
const GEOCODING_CONFIG_KEY = 'trip_geocoding_config'
export function getGeocodingConfig() {
  try {
    const raw = localStorage.getItem(GEOCODING_CONFIG_KEY)
    return raw ? JSON.parse(raw) : { provider: 'nominatim', googleApiKey: '' }
  } catch { return { provider: 'nominatim', googleApiKey: '' } }
}
export function saveGeocodingConfig(config) { /* ... */ }
```

**2. geocode.js 增加 Google 实现**：

```javascript
async function tryGoogle(q, limit, apiKey) {
  if (!apiKey?.trim()) return []
  const params = new URLSearchParams({ address: q, key: apiKey, language: 'zh-CN' })
  const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`)
  if (!res.ok) return []
  const data = await res.json()
  if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') return []
  return (data.results || []).slice(0, limit).map(r => ({
    display: r.formatted_address,
    lat: r.geometry.location.lat,
    lng: r.geometry.location.lng
  }))
}
```

**3. Settings 增加**：provider 下拉（Nominatim / Google）、Google API Key 输入

**4. 调用顺序**：若配置了 Google 且有效，优先调用 Google；否则沿用现有 Nominatim → Photon → Open-Meteo 链条

---

## 方案 B：Mapbox Geocoding API

### 特点
- **免费额度**：每月约 100,000 次免费请求
- **质量较好**：全球覆盖，POI 和地址质量不错
- **CORS 支持**：可直接从浏览器调用

### 实现示意

```javascript
async function tryMapbox(q, limit, apiKey) {
  if (!apiKey?.trim()) return []
  const params = new URLSearchParams({ q, limit: String(limit), language: 'zh', access_token: apiKey })
  const res = await fetch(`https://api.mapbox.com/search/geocode/v6/forward?${params}`)
  if (!res.ok) return []
  const data = await res.json()
  return (data.features || []).slice(0, limit).map(f => ({
    display: f.properties?.full_address || f.properties?.name || '',
    lat: f.geometry?.coordinates?.[1] ?? 0,
    lng: f.geometry?.coordinates?.[0] ?? 0
  }))
}
```

**注册**：https://account.mapbox.com/ 创建 Access Token（Public 用途）

---

## 方案 C：Geoapify Geocoding API

### 特点
- **免费**：3,000 次/天，无需信用卡
- **注册简单**：https://myprojects.geoapify.com/ 即获 API Key
- **基于 OSM**：数据与 Nominatim 同源，但服务更稳定

### 实现示意

```javascript
async function tryGeoapify(q, limit, apiKey) {
  if (!apiKey?.trim()) return []
  const params = new URLSearchParams({ text: q, limit: String(limit), lang: 'zh', apiKey })
  const res = await fetch(`https://api.geoapify.com/v1/geocode/search?${params}`)
  if (!res.ok) return []
  const data = await res.json()
  return (data.features || []).slice(0, limit).map(f => {
    const p = f.properties
    return {
      display: p.formatted || [p.name, p.street, p.city, p.country].filter(Boolean).join(', '),
      lat: p.lat,
      lng: p.lon
    }
  })
}
```

---

## 方案 D：LocationIQ

### 特点
- **免费**：5,000 次/天
- **基于 Nominatim**：与当前逻辑相近，但托管更稳定、CORS 友好

### 实现示意

```javascript
async function tryLocationIQ(q, limit, apiKey) {
  if (!apiKey?.trim()) return []
  const params = new URLSearchParams({ q, format: 'json', limit: String(limit), 'accept-language': 'zh', key: apiKey })
  const res = await fetch(`https://api.locationiq.com/v1/search?${params}`)
  if (!res.ok) return []
  const data = await res.json()
  if (Array.isArray(data) && data.length > 0 && data[0].error) return []
  return (Array.isArray(data) ? data : []).slice(0, limit).map(r => ({
    display: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon)
  }))
}
```

**注册**：https://my.locationiq.com/register

---

## 方案 E：geocode.maps.co

### 特点
- **免费**：25,000 次/月（Demo 账户）
- **基于 OSM/Nominatim**：数据相同，但通过该服务可减轻 CORS/限速

### 实现示意

```javascript
async function tryGeocodeMapsCo(q, limit, apiKey) {
  if (!apiKey?.trim()) return []
  const params = new URLSearchParams({ q, limit: String(limit), 'accept-language': 'zh', api_key: apiKey })
  const res = await fetch(`https://geocode.maps.co/search?${params}`)
  if (!res.ok) return []
  const data = await res.json()
  return (Array.isArray(data) ? data : []).slice(0, limit).map(r => ({
    display: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon)
  }))
}
```

**注册**：https://geocode.maps.co/join/

---

## 方案 F：后端代理（无新 API Key）

### 特点
- **零额外成本**：复用 Nominatim/Photon 等
- **解决 CORS**：由你的服务器转发请求，规避浏览器跨域
- **需自有后端**：若当前为纯静态 PWA，需新增简单后端或云函数

### 实现示意

**后端（Node/Express 示例）**：

```javascript
app.get('/api/geocode', async (req, res) => {
  const q = req.query.q
  const res2 = await fetch(`https://nominatim.openstreetmap.org/search?${new URLSearchParams({ q, format: 'json', limit: 5 })}`, {
    headers: { 'User-Agent': 'TripActivityApp/1.0' }
  })
  const data = await res2.json()
  res.json(data)
})
```

**前端 geocode.js**：将 `NOMINATIM_URL` 改为你的 `/api/geocode`（或通过环境变量配置 baseUrl）

---

## 方案 G：高德地图（国内专用）

### 特点
- **免费**：约 6000 次/天（个人开发者）
- **国内覆盖好**：中文地名、地标、POI 质量高
- **海外覆盖一般**：主要针对中国大陆、港澳

### 实现示意

```javascript
async function tryAmap(q, limit, apiKey) {
  if (!apiKey?.trim()) return []
  const params = new URLSearchParams({ key: apiKey, address: q, output: 'json' })
  const res = await fetch(`https://restapi.amap.com/v3/geocode/geo?${params}`)
  if (!res.ok) return []
  const data = await res.json()
  if (data.status !== '1' || !data.geocodes?.length) return []
  return data.geocodes.slice(0, limit).map(r => {
    const [lng, lat] = (r.location || '').split(',').map(Number)
    return { display: r.formatted_address, lat, lng }
  })
}
```

**注册**：https://lbs.amap.com/ 创建应用，获取 Web 服务 Key

---

## 推荐选择

| 场景 | 推荐 |
|------|------|
| 希望效果最好、可接受 Google 生态 | **A. Google Maps** |
| **国内为主**、要中文地名 | **G. 高德** |
| **国内+海外都需兼顾** | **环境切换 + 高德 + Geoapify/LocationIQ** |
| 海外直连、免费、实现简单 | **C. Geoapify** 或 **D. LocationIQ** |
| 已有 Mapbox 或喜欢 Mapbox 生态 | **B. Mapbox** |
| 完全不想新增 API Key | **F. 后端代理** 或 继续优化当前免费链 |

---

## 国内海外兼顾的实现建议

### 设置项设计

```
地点搜索
├── 使用环境：[自动] [国内优先] [海外优先]
├── 高德 Key（国内）：[________]（可选）
└── 海外 Key（Geoapify / Mapbox / LocationIQ）：[________]（可选）
```

### 调用逻辑（伪代码）

```
function getGeocodeChain() {
  const env = config.geocodingEnv  // 'auto' | 'cn' | 'intl'
  const region = env === 'auto' ? await detectRegion() : env
  
  if (region === 'cn') {
    return [tryAmap, tryNominatim, tryPhoton, tryOpenMeteo]
  } else {
    return [tryGeoapify, tryMapbox, tryNominatim, tryPhoton, tryOpenMeteo]
  }
}

async function detectRegion() {
  try {
    const r = await fetch('https://ipinfo.io/json').then(x => x.json())
    return ['CN','HK','MO','TW'].includes(r?.country) ? 'cn' : 'intl'
  } catch { return 'intl' }  // 检测失败时默认海外链
}
```

### 智能串行（不判断环境）

若不想做环境判断，可用 **纯串行**：按「国内优先数据源 + 海外优先数据源」依次尝试，谁先返回有效结果就用谁。配合短超时（如 3 秒），避免在不可达的接口上久等。

---

## 通用实现建议（可配置 Provider）

1. **storage.js**：新增 `geocodingConfig: { provider, apiKey }`，与 LLM 配置类似
2. **Settings.jsx**：增加「地点搜索」区块：Provider 下拉 + API Key 输入
3. **geocode.js**：按 `provider` 决定优先调用顺序，例如：
   - `google` → 仅用 Google（若有 key）
   - `mapbox` → 仅用 Mapbox（若有 key）
   - `nominatim`（默认）→ 当前 Nominatim → Photon → Open-Meteo
   - 可选：在 `nominatim` 模式下，若配置了 `geoapify`、`locationiq` 等 key，作为优先/备用链插入

这样用户可在设置中选择并配置一种增强方案，无需改代码。
