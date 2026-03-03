# 更新记录

格式：`## [日期] 标题` +  bullet 列表。每次功能性修改后，在**本文件最顶部**（此段说明下方）添加一条记录。

---

## [2025-03-03] 中文地名与地图瓦片

- **地理编码**：Nominatim / Photon / 反向地理编码 增加 `accept-language: zh-CN,zh`，国内外地点均优先显示中文
- **地图瓦片**：默认改用 Carto Light（全球 CDN，国内可访问性更好），OSM 官方瓦片在国内可能无法加载
- **Leaflet CSS**：改为从 cdnjs (Cloudflare) 加载，提升国内加载成功率

## [2025-03-03] 地图选点

- **MapPicker**：新增地图选点弹窗，在地图上点击即可选择经纬度，无需手动输入
- **反向地理编码**：选点后自动调用 Nominatim 获取地点名，国内外均可用（国外反向解析更准）
- **TripForm / ActivityForm**：地点行增加「地图选点」按钮，搜不到地点时可在地图上直接选点
- 地点搜索失败时的提示改为「请点击『地图选点』在地图上选位置」

## [2025-03-03] GitHub Pages 工作流修复

- 增加 `environment: github-pages`，升级 `upload-pages-artifact@v4`
- 支持 `main` 与 `master` 分支
- README 补充：不选 Jekyll/Static HTML、确认工作流已推送、如何查看 Actions

## [2025-03-03] 时间选择与地点搜索修复

- **时间选择**：改用「时」+「分」两个下拉框，替代 `type="time"`，解决部分手机无确定按钮的问题
- **地点搜索**：Nominatim 失败时自动改用 Photon API，并优化错误提示（建议手动输入经纬度）
- 设置页构建时间改为北京时间（UTC+8）显示，并标注「北京」

## [2025-03-03] GitHub Actions 自动部署

- 新增 `.github/workflows/deploy-pages.yml`，push 到 main 自动构建并部署到 GitHub Pages
- 需在仓库 Settings → Pages 将 Source 改为 **GitHub Actions**

## [2025-03-03] 版本提示与移动端日程

- **版本提示**：设置页显示构建时间（由 vite define 注入），便于确认部署是否更新
- **日程编辑**：移动端优先布局，单列+卡片，触摸目标≥44px，基于一加13 Chrome 设计
- **日程展示**：TripDetail 活动改为卡片式，时间/标题/地点分行，标签更清晰

## [2025-03-03] 跨浏览器兼容与活动时间

- **跨浏览器**：移除 select 的 appearance:none，避免 Android Chrome 文字不显示
- **字体**：增加 system-ui 与 Arial 作为后备，补充 -webkit-text-size-adjust
- **图标**：「更多 ▾」改为 CSS 绘制三角形，避免特殊字符在部分设备不渲染
- **input/select**：显式设置 color 与 option 样式
- **活动时间**：标签改为「时间（可选，时:分）」，说明格式

## [2025-03-03] 优化：导航、日程、地点搜索、闹钟

- **导航**：首页/行程/新建/活动 保留顶部，日历/地图/设置 收起到「更多」下拉
- **日程布局**：活动卡片化，每个字段加标签（活动标题、类型、时间、费用、地点、图片）
- **时间**：改为 `type="time"` 选择器，可选
- **地点搜索**：新增 Nominatim 地理编码，「选地点」自动填充经纬度，支持手动修改
- **图片**：增加「图片」标签，添加按钮改为「+ 添加图片」
- **闹钟提醒**：活动支持「提前 N 分钟提醒」，ReminderChecker 定时检查并推送浏览器通知
