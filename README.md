# 行程活动记录

纯前端 PWA：行程规划、日程管理、单独活动、导入导出。**无需电脑常开**，部署一次后手机直接使用。

## 技术栈

- 前端：React + Vite + PWA
- 存储：localStorage（全部在本机）
- LLM：可选，用于行程建议、游记摘要（手机浏览器直接调用第三方 OpenAI 兼容 API）

## 功能

- **行程**：多天行程，按日期自动生成日程，每日可添加多个活动（景点、餐厅、交通、住宿等）
- **单独活动**：不归属行程的活动（演唱会、展览等）
- **首页**：今日活动、即将开始的行程
- **导入/导出**：JSON 格式，支持覆盖或合并，便于设备间迁移数据

## 推送到 GitHub

首次将代码推送到 GitHub 的步骤：

**1. 在 GitHub 创建仓库**

- 打开 [github.com/new](https://github.com/new)
- 仓库名填 `trip-activity-app`（或自定义）
- 选择 Public，不勾选「Add a README」，创建

**2. 本地初始化并推送**

在项目根目录 `trip-activity-app/` 下执行：

```bash
git init
git add .
git commit -m "init"
git branch -M main
git remote add origin https://github.com/你的用户名/trip-activity-app.git
git push -u origin main
```

若项目已在其他目录用 git 管理过，只需添加 remote 并推送：

```bash
git remote add origin https://github.com/你的用户名/trip-activity-app.git
git push -u origin main
```

---

## 开发

```bash
cd frontend
npm install
npm run dev
```

访问 http://localhost:5174

---

## 部署

### 方式一：GitHub Pages（推荐，push 即部署）

**前提**：项目已推送到 GitHub，仓库名为 `trip-activity-app`。

**步骤 1**：开启 Pages 并选择 Actions 部署

在仓库 **Settings → Pages**：
- **Build and deployment** → **Source** 选 **GitHub Actions**（不要选 Jekyll 或 Static HTML 模板）

**步骤 2**：确认工作流已推送

确保 `.github/workflows/deploy-pages.yml` 已提交并 push：

```bash
git add .github/
git commit -m "add deploy workflow"
git push
```

**步骤 3**：验证部署

推送后打开仓库 **Actions** 标签页，应看到「Deploy to GitHub Pages」工作流在运行。若失败可点进去查看日志。

1～2 分钟后访问 `https://你的用户名.github.io/trip-activity-app/`。

---

### 方式二：手动构建后推送（备用）

若暂未使用 GitHub Actions，可手动构建并提交 `docs/`：

```bash
cd frontend
npm install
npm run build:pages
cd ..
git add docs
git commit -m "deploy"
git push
```

仓库 **Settings → Pages**：Source 选 **Deploy from a branch**，Branch 选 `main`，Folder 选 **`/docs`**。

### 方式二：Vercel / Netlify

```bash
cd frontend
npm install
npm run build
```

在 Vercel / Netlify 中导入项目，构建目录设为 `frontend`，输出目录设为 `dist`。

## 数据说明

- 所有数据保存在**本机浏览器** localStorage，不经过服务器
- 换设备、换浏览器、清除网站数据后，记录会丢失
- 建议定期在「设置」中导出备份

## 常见问题

### 添加主屏幕后打开到错误页面

**现象**：点击主屏幕图标后打开的是 `xxx.github.io/` 根页面，而不是应用。

**原因**：添加时保存的是当前页面的 URL。若你在根地址添加，快捷方式会指向根页面。

**做法**：先打开 `xxx.github.io/trip-activity-app/`，确认地址栏正确，再在此页面添加主屏幕。若加错了，删除旧图标后重新添加。

## 数据与安全

- 所有数据仅存储在浏览器 localStorage，不上传服务器
- API Key 仅存于本机，仅在调用时用于请求你配置的 API 地址
- 部分 API 可能因 CORS 限制无法在浏览器直接调用，需选择支持跨域的服务商
