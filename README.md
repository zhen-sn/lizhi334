# 李志 · 叁叁肆

> 为南京及李志歌迷（“叁叁肆”）创建的非官方个人音乐站，在 **网页 / H5 / APP / PC 桌面端** 提供一体化服务。

一个前端优先、数据本地写死的音乐播放器：集曲库、专辑、MV、短视频、歌词、可视化与一系列音乐创作工具于一体，并通过 Electron 打包为可离线使用的 Windows 便携版桌面应用。

---

## ✨ 功能特性

### 🎵 音乐播放
- 曲目库与专辑浏览、歌曲详情页
- 完整播放控制：播放/暂停、上一首/下一首、进度条、音量、播放模式
- 播放队列抽屉、全屏播放器、迷你窗
- 实时音频可视化（Visualizer）
- 逐行歌词（LRC）同步，支持桌面悬浮歌词窗口

### 🎬 视频
- MV / 现场 / 纪实视频列表与详情
- 竖屏短视频（水友片段）流

### 🛠 音乐工具
- 和弦库与和弦图（Chords）
- 节拍器（Metronome）
- 调音器（Tuner）
- 变调夹计算器（Capo）

### 📚 内容
- 人物百科 / 年表（Biography）
- 叁叁肆巡演信息（Tour）
- 收听统计报告（Stats）
- 赞助者与赞助墙（Sponsor / Sponsor Wall）

### 👤 个人与体验
- 本地账号体系、我喜欢、最近播放、播放历史
- 自建歌单、上传入口
- 全局搜索
- 主题（浅色 / 深色 / 跟随系统）、强调色、歌词字号设置
- 成就徽章与彩蛋（含深夜收听计数、生日模式等）
- 快捷键支持（可在设置中关闭，避免与浏览器冲突）

### 🖥 桌面端（Electron）
- Windows 便携版（portable）打包
- 系统托盘播放控制、迷你窗 / 歌词独立窗口
- 与网页端共享同一套前端代码

---

## 🧱 技术栈

| 分类 | 选型 |
| --- | --- |
| 框架 | [React 18](https://react.dev/) |
| 构建 | [Vite 5](https://vitejs.dev/) |
| 语言 | [TypeScript 5](https://www.typescriptlang.org/) |
| 路由 | [react-router-dom 6](https://reactrouter.com/)（HashRouter） |
| 状态管理 | [Zustand 4](https://github.com/pmndrs/zustand) |
| 桌面端 | [Electron](https://www.electronjs.org/) + [electron-builder](https://www.electron.build/) |

数据层为本地写死的静态数据（`src/data`），无需后端即可运行。

---

## 📦 项目结构

```
.
├─ electron/          # Electron 主进程 / preload / 桌面资源
├─ src/
│  ├─ components/     # UI 组件（layout / player / lyrics / tools 等）
│  ├─ data/           # 本地静态数据（歌曲、专辑、视频、和弦等）
│  ├─ hooks/          # 组合式逻辑（快捷键、桌面桥接、离线库等）
│  ├─ lib/            # 工具函数（格式化、LRC、媒体、音高等）
│  ├─ pages/          # 路由页面
│  ├─ player/         # 播放引擎
│  ├─ store/          # Zustand 状态（player / library / settings 等）
│  ├─ styles/         # 样式（tokens / base / 各模块 CSS）
│  ├─ App.tsx         # 应用与路由入口
│  └─ main.tsx        # React 挂载入口
├─ index.html
├─ package.json
├─ tsconfig.json
└─ vite.config.ts
```

---

## 🚀 快速开始

> 环境要求：Node.js 18+，npm 9+。

```bash
# 1. 安装依赖
npm install

# 2. 启动开发服务器（默认 http://localhost:5173 自动打开）
npm run dev

# 3. 类型检查
npm run typecheck

# 4. 构建生产版本（输出到 dist/）
npm run build

# 5. 本地预览构建产物
npm run preview
```

### 🖥 桌面端

```bash
# 直接以 Electron 打开已构建的前端
npm run desktop

# 打包为 Windows 便携版（输出到 release/，不产出安装包）
npm run desktop:dist
```

---

## ⌨️ 快捷键

应用内置常用媒体快捷键（播放/暂停、切换歌曲等），可在 **设置** 中关闭，以避免与浏览器快捷键冲突。进入应用后按提示可查看完整快捷键列表。

---

## 🌐 部署

前端为纯静态产物（`base: './'`，HashRouter），可直接部署到任意静态托管：

```bash
npm run build
# 将 dist/ 目录上传/托管即可（GitHub Pages、Vercel、Netlify、Nginx 等）
```

---

## 📄 License

本项目为面向 “叁叁肆” 歌迷社群的非官方个人站点，音乐及相关内容版权归原始权利人所有，仅供学习交流使用，不作商业用途。

---

<p align="center">南京 · 叁叁肆 · 用爱发电 ❤️</p>
