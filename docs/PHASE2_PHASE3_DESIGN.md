# Phase 2 & Phase 3 详细设计文档

基于计划文件 `c:\Users\huanyu.xu\.cursor\plans\行程活动记录应用设计_4d430f04.plan.md` 与现有实现，对 Phase 2、Phase 3 进行细化设计。

## 与 Plan 对照

| Plan 章节 | 设计决策 | 本文档落实 |
|----------|----------|-----------|
| 二、核心设计决策 | 方案 C（行程内活动 + 单独活动） | 现有 Trip / StandaloneActivity 已实现 |
| 二、使用场景 | 全覆盖：规划 / 执行 / 记录 / 回顾 | Phase 2 日历=执行；Phase 3 地图=回顾 |
| 二、功能范围 | 地图、预算、图片、导入导出、LLM 均必选 | 本设计全覆盖 |
| 三、数据模型 | Trip → Day → Activity；StandaloneActivity 同构 | 数据模型汇总见第四节 |
| 七、页面结构 | 10 个路由 | 路由汇总见第五节 |

---

## 一、Phase 2：预算/花费、日历视图、单独活动

### 1.1 预算/花费

**现状**：Trip 已有 `budget` 字段，Activity 已有 `cost` 字段（表单与 storage 均支持）

**补充设计**：

| 项 | 说明 |
|---|------|
| 数据模型 | 保持不变。Trip.budget 为总预算（元），Activity.cost 为单项花费（元） |
| 行程预算汇总 | 在 TripDetail 增加「预算与花费」卡片：总预算、活动花费合计、差额（预算-实际） |
| 计算公式 | `实际花费 = Σ(day.activities 中 cost 为有效数字的求和)` |
| 展示规则 | budget/cost 为空或非数字视为 0；超支用红色提示 |
| 活动表单 | TripForm 与 ActivityForm 中 cost 已支持，确保输入为 number 类型存储 |

**涉及文件**：
- `TripDetail.jsx`：新增预算汇总区域
- `TripForm.jsx`：活动行增加 cost 输入（当前 emptyActivity 含 cost，TripForm 需在 actRow 中展示）
- `storage.js`：无需改动

**TripForm 活动行补充**：当前 actRow 缺少 cost 输入，需在 TripForm 的活动编辑区域增加「费用」输入框。

**实现规格**：

```
// TripDetail 预算汇总卡片
function calcTripCost(trip) {
  let total = 0
  trip.days?.forEach(day => {
    (day.activities || []).forEach(a => {
      const c = parseFloat(a.cost)
      if (!isNaN(c) && c > 0) total += c
    })
  })
  return total
}
// 展示：总预算、实际花费、差额；超支时差额文字红色
```

---

### 1.2 日历视图

**路由**：`/calendar`

**职责**：按日期展示行程与单独活动（执行场景：出行中查看某日安排）

**交互设计**：

| 元素 | 说明 |
|------|------|
| 月份选择 | 上一个/下一个 或 日期选择器，聚焦当前月 |
| 日期格 | 每月按周排布，点击某日展示该日详情 |
| 日期标记 | 有行程或活动的日期显示小圆点或高亮 |
| 当日详情 | 选中日期下方列出：该日行程内活动 + 当日单独活动，按时间排序 |

**数据来源**：
- 行程：`trips` 中 `startDate <= date <= endDate`，取 `days` 中 `date === selectedDate` 的活动
- 单独活动：`standaloneActivities` 中 `date === selectedDate`
- 合并后按 `time` 字段排序（空时间放末尾）

**涉及文件**：
- 新建 `pages/Calendar.jsx`
- `App.jsx`：增加 `/calendar` 路由，导航增加「日历」入口

**UI 建议**：复用现有 card、item 等样式，保持与 Dashboard / TripList 一致。

**Calendar 组件规格**：

```jsx
// 核心状态
const [viewDate, setViewDate] = useState(() => new Date())  // 当前查看的月份
const [selectedDate, setSelectedDate] = useState(null)      // 选中日期 YYYY-MM-DD

// 工具函数
function getDatesWithData(trips, activities) { ... }  // 返回有活动的日期 Set
function getActivitiesForDate(date, trips, activities) { ... }  // 合并并排序
```

**布局**：顶部月份切换（← 2025年3月 →）→ 日历网格（7列周日~周六）→ 选中日期下方详情列表。

---

### 1.3 单独活动

**现状**：已完成
- `ActivityForm.jsx`：支持新建/编辑，含 `date` 字段
- `TripList.jsx`：展示单独活动区块
- `Dashboard.jsx`：今日活动含单独活动
- `storage.js`：`getStandaloneActivities` / `saveStandaloneActivity` 等
- 导入/导出已包含 `standalone_activities`

**补充**：
- 在 TripList 中单独活动支持「编辑」入口（Link to `/activity/:id/edit`）
- 确保 `ActivityDetail.jsx` 有编辑按钮指向 `/activity/:id/edit`

---

## 二、Phase 3：地图标注、图片、LLM 辅助

### 2.1 地图标注

**技术**：Leaflet + OpenStreetMap（免费、无 API Key）

**依赖**：
```bash
npm install leaflet react-leaflet
```
需在 index.html 或入口引入 Leaflet CSS：
```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
```

**数据模型扩展**：
- Activity / StandaloneActivity 增加 `lat`, `lng`（可选，number）
- 有经纬度则在 map 上显示，无则仅列表展示

**页面**：

| 路由 | 页面 | 说明 |
|------|------|------|
| `/map` | MapView.jsx | 地图视图：展示所有带 lat/lng 的行程内活动 + 单独活动 |

**地图交互**：
- 中心点：有坐标时取第一个，或默认北京（39.9, 116.4）
- 缩放：可调整，初始 zoom 适中（如 10）
-  Marker 点击：显示 title、place、所属行程，可 Link 到详情页
- 署名：地图角落显示 `© OpenStreetMap contributors`

**选点方式**（可选增强）：
- 在 TripForm / ActivityForm 中增加「选点」按钮，打开弹窗地图，点击地图获取 lat/lng 填入表单
- 或提供「从地址搜索」→ 调用免费地理编码（如 Nominatim）获取坐标

**MapView 组件规格**：

```jsx
// 收集所有带坐标的 Marker 数据
function collectMarkers(trips, standaloneActivities) {
  const list = []
  trips.forEach(t => {
    t.days?.forEach(d => {
      (d.activities || []).filter(a => a.lat != null && a.lng != null).forEach(a => {
        list.push({ ...a, tripTitle: t.title, link: `/trip/${t.id}` })
      })
    })
  })
  standaloneActivities.filter(a => a.lat != null && a.lng != null).forEach(a => {
    list.push({ ...a, tripTitle: null, link: `/activity/${a.id}` })
  })
  return list
}
// 默认中心：markers[0] 或 [39.9, 116.4]
```

**涉及文件**：
- 新建 `pages/MapView.jsx`
- `TripForm.jsx`、`ActivityForm.jsx`：活动编辑区增加 lat/lng 输入或选点组件
- `TripDetail.jsx`、`ActivityDetail.jsx`：若有坐标，可嵌入小地图展示

---

### 2.2 图片

**存储**：PWA 环境下使用 base64 存于 Activity.photos（数组），或 IndexedDB 降低 localStorage 体积。初期可用 base64 简化实现。

**数据模型**：
- Activity 增加 `photos: string[]`（base64 或 URL）

**交互**：
- 活动表单/详情：支持上传图片（`<input type="file" accept="image/*">`），多张
- 展示：缩略图网格，点击可放大
- 删除：单张删除

**实现要点**：
- FileReader 转为 base64 后 push 到 photos
- 单张 base64 可能较大，可选压缩（如 canvas 缩放至 max 800px 宽）或限制尺寸
- 导出/导入时 photos 一并包含在 JSON 中

**图片工具函数**（可放在 `utils/image.js`）：

```javascript
export function readAsBase64(file, maxWidth = 800) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width, h = img.height
        if (w > maxWidth) { h = (h * maxWidth) / w; w = maxWidth }
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.8))
      }
      img.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}
```

**涉及文件**：
- `TripForm.jsx`、`ActivityForm.jsx`：活动编辑区增加图片上传
- `ActivityDetail.jsx`、`TripDetail.jsx`：展示活动图片

---

### 2.3 LLM 辅助

**API**：复用 Settings 中的 `apiKey`、`baseUrl`、`model`，调用 OpenAI 兼容接口。

**功能点**：

| 功能 | 入口 | Prompt 思路 | 输出 |
|------|------|-------------|------|
| 行程建议 | 新建/编辑行程时「AI 建议」按钮 | 输入：目的地、日期范围、类型 → 生成推荐景点/餐厅/行程安排 | 文本，可一键填入 memo 或生成日程草案 |
| 游记摘要 | 行程详情中「AI 摘要」按钮 | 输入：diary 全文 → 提炼要点、生成标签 | 文本，可追加到 diary 或另存 |
| 活动推荐 | 某日活动编辑时「附近推荐」（可选） | 输入：目的地、当前活动类型 → 推荐附近同类活动 | 文本列表 |

**调用封装**：

新建 `utils/llm.js`：

```javascript
import { getApiConfig } from './storage'

export async function callLLM(messages, options = {}) {
  const { apiKey, baseUrl, model } = getApiConfig()
  if (!apiKey?.trim() || !baseUrl?.trim()) {
    throw new Error('请先在设置中配置 API Key 和接口地址')
  }
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages,
      temperature: 0.7,
      ...options
    })
  })
  if (!res.ok) throw new Error(`API 错误: ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || ''
}
```

**行程建议 Prompt 示例**：
```
你是一位旅行规划助手。用户将去 {destination}，{startDate} 到 {endDate}，类型：{type}。
请给出 3 天的行程建议，包含每日主要景点、餐厅建议，格式简洁，便于复制到日程中。
```

**游记摘要 Prompt 示例**：
```
请对以下游记进行摘要，提炼 3-5 个要点，并给出 2-3 个情感/主题标签。游记内容：
"""
{diary}
"""
```

**UI**：
- 行程表单：增加「AI 建议」按钮，点击后 loading → 显示结果，提供「应用到备注」或「生成日程」
- 行程详情：有 diary 时显示「AI 摘要」按钮，结果可追加或替换

**涉及文件**：
- 新建 `utils/llm.js`
- `TripForm.jsx`：行程建议
- `TripDetail.jsx`：游记摘要

---

## 三、实施顺序建议

| 阶段 | 任务 | 优先级 |
|------|------|--------|
| Phase 2.1 | TripForm 活动行增加 cost 输入；TripDetail 预算汇总 | 高 |
| Phase 2.2 | 新建 Calendar 页面与路由 | 高 |
| Phase 2.3 | 单独活动编辑入口完善（TripList / ActivityDetail） | 低 |
| Phase 3.1 | Activity 增加 lat/lng；新建 MapView | 高 |
| Phase 3.2 | Activity 增加 photos；表单与详情支持图片 | 高 |
| Phase 3.3 | 新建 llm.js；行程建议、游记摘要 | 中 |

---

## 四、数据模型汇总（含扩展）

```javascript
// Trip
{
  id, title, destination, startDate, endDate,
  type: '旅游'|'出差'|'其他',
  budget, memo, diary,
  days: [{
    date: 'YYYY-MM-DD',
    activities: [{ id, title, time, place, type, memo, cost, lat?, lng?, photos? }]
  }]
}

// StandaloneActivity
{
  id, date, title, time, place, type, memo, cost, lat?, lng?, photos?
}
```

**Phase 3 需更新的默认值**：

- `emptyActivity()` 增加：`lat: undefined, lng: undefined, photos: []`
- `ActivityForm` 初始 form 增加：`lat: '', lng: '', photos: []`

---

## 五、路由汇总（含 Phase 2/3）

| 路由 | 页面 | 阶段 |
|------|------|------|
| `/` | Dashboard | MVP |
| `/trips` | TripList | MVP |
| `/trip/new` | TripForm | MVP |
| `/trip/:id` | TripDetail | MVP |
| `/trip/:id/edit` | TripForm | MVP |
| `/activity/new` | ActivityForm | MVP |
| `/activity/:id` | ActivityDetail | MVP |
| `/activity/:id/edit` | ActivityForm | MVP |
| `/calendar` | Calendar | Phase 2 |
| `/map` | MapView | Phase 3 |
| `/settings` | Settings | MVP |

---

## 六、实施检查清单

### Phase 2

- [ ] **2.1 预算/花费**
  - [ ] TripForm：活动行增加 cost 输入框（`type="number"`）
  - [ ] TripDetail：新增「预算与花费」卡片，含总预算、实际花费、差额，超支红字
  - [ ] 确保 cost 保存为 number 或可解析字符串

- [ ] **2.2 日历视图**
  - [ ] 新建 `pages/Calendar.jsx`
  - [ ] App.jsx：Route `/calendar`，导航增加「日历」
  - [ ] 月份切换、日期格、有数据日期标记、选中日详情列表

- [ ] **2.3 单独活动**
  - [ ] TripList：单独活动项增加「编辑」链接
  - [ ] ActivityDetail：已有编辑按钮，确认可跳转 `/activity/:id/edit`

### Phase 3

- [ ] **3.1 地图**
  - [ ] `npm install leaflet react-leaflet`
  - [ ] index.html 引入 Leaflet CSS
  - [ ] emptyActivity 增加 lat, lng
  - [ ] 新建 `pages/MapView.jsx`，展示所有带坐标的 Marker
  - [ ] TripForm / ActivityForm：活动编辑区增加 lat、lng 输入（或选点）
  - [ ] TripDetail / ActivityDetail：有坐标时可选展示小地图

- [ ] **3.2 图片**
  - [ ] 新建 `utils/image.js`（readAsBase64 压缩）
  - [ ] emptyActivity 增加 photos: []
  - [ ] TripForm / ActivityForm：活动编辑区增加图片上传、预览、删除
  - [ ] TripDetail / ActivityDetail：展示活动图片缩略图
  - [ ] 导入/导出已包含 photos（无需改 storage）

- [ ] **3.3 LLM**
  - [ ] 新建 `utils/llm.js`（callLLM）
  - [ ] TripForm：AI 建议按钮 → 填入 memo 或生成日程
  - [ ] TripDetail：有 diary 时 AI 摘要按钮 → 追加或替换

---

## 七、注意事项与边界情况

| 场景 | 处理方式 |
|------|----------|
| LLM 未配置 | 点击 AI 按钮时提示「请先在设置中配置 API Key」 |
| LLM 调用失败 | 捕获异常，toast/alert 显示错误信息 |
| 地图无 Marker | MapView 显示空地图 + 提示「暂无带坐标的活动」 |
| 图片过大 | readAsBase64 压缩至 max 800px，jpeg 0.8 质量 |
| localStorage 超限 | 图片多时可能触发；可后续考虑 IndexedDB |
| 日期范围变更 | buildDays 重建时保留已有活动的 cost/lat/lng/photos |
| 旧数据兼容 | 读取时 `photos = a.photos || []`，`lat/lng` 可为空 |
