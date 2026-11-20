# 李志 · 叁叁肆 播放器 —— 运行与开发说明

前端优先的可跑版本：**没有任何音频/视频/图片素材也能完整体验**，数据全部写死在 `src/data`，
个人数据（收藏、歌单、历史、统计、成就）只写本机 localStorage。产品设计见
[`player-design.md`](./player-design.md)，待校订数据见 [`data-checklist.md`](./data-checklist.md)。

---

## 1. 环境要求

| 项 | 要求 |
| --- | --- |
| Node.js | 18.18 及以上（建议 20 LTS） |
| 包管理器 | npm（仓库未锁 pnpm/yarn） |
| 浏览器 | 支持 WebAudio + `aspect-ratio` + Pointer Events 的现代内核；调音器需要 `getUserMedia`（须 https 或 localhost） |

## 2. 启动

PowerShell 不支持 `&&`，多条命令用 `;` 分隔，或逐条执行。

```powershell
npm install        # 首次
npm run dev        # 开发：http://localhost:5173 （vite 配置里 open:true，会自动开浏览器）
npm run typecheck  # tsc --noEmit，全量类型检查
npm run build      # 产物在 dist/
npm run preview    # 本地起静态服务验证 build 结果
```

`vite.config.ts` 里 `base: './'` + 路由用 **HashRouter**，因此 `dist/` 可以直接双击 `index.html`
打开，也能丢进任意子目录静态托管（GitHub Pages、Nginx 子路径）而不需要 rewrite 规则。

## 3. 目录结构

```
src/
  main.tsx             挂载入口（刻意不开 StrictMode：引擎/节拍器持有真实定时器）
  App.tsx              路由表 + 主题属性落 <html> + 彩蛋判定 + 快捷键面板
  styles/              tokens / base / shell / ui / pages / effects，全部手写，无 UI 库、无 Tailwind
  data/                静态数据层 = 未来后端接口契约（types.ts 是唯一真相）
  lib/                 storage / format / hash / music / lrc / click / pitch / share / media
  player/engine.ts     音频引擎：real(<audio>) 与 sim(虚拟时钟) 双模式，对外同一套 API
  store/               zustand：player / library / settings / ui（无 persist 中间件，手写防抖落盘）
  hooks/               useSongActions（播放/收藏/加歌单/队列）  useHotkeys（全局快捷键）
  components/
    layout/            SideNav / TopBar / TabBar / ThemeToggle
    common/            Icon / Cover / Slider / Primitives / Overlays / PlaylistPicker
    music/ lyrics/     SongList / Lyrics(+useSongLyric)
    player/            PlayerBar / FullPlayer / QueueDrawer / Visualizer
    tools/             ChordDiagram / ChordChip
    video/             Stage（无 mp4 时的 Canvas 模拟放映机）
    fx/                Grain / Rain / Confetti / DesktopLyric / FloatingOrb
  pages/               25 个页面文件，与 App.tsx 路由一一对应
```

## 4. 路由清单

| 路径 | 页面 | 说明 |
| --- | --- | --- |
| `/` | Home | 问候、每日推荐、续播、榜单、巡演进度、快捷入口 |
| `/songs` | Songs | 曲库：分类 / 标签 / 城市 / 排序 / 视图切换 |
| `/songs/album/:id` | AlbumDetail | 专辑详情、上下张、曲目表 |
| `/songs/:id` | SongDetail | 曲目详情 + 歌词 + 谱 + 关联影像 |
| `/player` | PlayerPage | 页面级播放台（控制 / 歌词 / 和弦 / 队列 四视图） |
| `/videos`、`/videos/:id` | Videos / VideoDetail | 影像列表与放映页 |
| `/tools` | Tools | 工具专区入口 |
| `/tools/chords`、`/tools/chords/:songId` | Chords / ChordDetail | 谱库与完整谱面（和弦走向，不含歌词） |
| `/tools/metronome` | Metronome | 节拍器（lookahead 计时 + 重音 + 根音试听） |
| `/tools/tuner` | Tuner | 调音器（ACF 音高检测，需麦克风授权） |
| `/tools/capo` | Capo | 变调夹 / 调性换算器 |
| `/tools/songs-info` | SongInfo | 参数速查表（BPM、原调、难度、城市） |
| `/more` | More | 更多入口、语录、成就说明、关于本项目 |
| `/more/biography` | Biography | 简介 / 年表 / 乐队 / FAQ / 获奖 / 唱片目录 |
| `/more/tour` | Tour334 | 334 巡演：地图、清单、按年、日志、想去城市 |
| `/more/stats` | Stats | 听歌报告（本地统计） |
| `/sponsor` | Sponsor | 支持档位、资金去向、支持记录、留言墙 |
| `/search` | Search | 全站搜索，结果同步到 `?q=` |
| `/playlist/:id` | PlaylistPage | `:id = fav` 是「我喜欢」，其余为自建歌单 |
| `/history` | History | 最近播放（按天分组 / 去重） |
| `/random` | Random | 命运模式（条件收窄 + 摇号 + 今日一签） |
| `/settings` | Settings | 外观 / 播放 / 快捷键 / 本机数据导入导出 |
| `*` | NotFound | 兜底页，给回主菜单的入口 |

## 5. 零素材也能跑：怎么把真实素材接进来

1. **音频**：把文件放到 `public/media/audio/{songId}.mp3`（例如 `s09.mp3`），
   在「设置 → 播放 → 使用本地媒体文件」打开开关即可走真实 `<audio>`；
   文件不存在时引擎自动回落到 **模拟时钟**，进度、歌词、结束、队列逻辑完全一致。
   若某首歌已有正式地址，直接填 `src/data/songs.ts` 里该曲目的 `audioUrl`。
2. **视频**：放到 `public/media/video/{videoId}.mp4`，或填 `videos.ts` 的 `videoUrl`。
   没有视频文件时用 `components/video/Stage.tsx` 的 Canvas 放映机动画代替，
   同样有播放/暂停/进度/结束事件。
3. **封面**：不需要图片。`lib/hash.ts` 用标题哈希生成固定渐变 + 首字，
   同一首歌在任何位置颜色一致。接入真实封面后只需在 `Cover.tsx` 内优先渲染 `<img>`。
4. **歌词**：`songs.ts` 的 `lyrics` 字段填 LRC 文本即可；留空时 `lib/lrc.ts` 生成
   **结构占位歌词**（只有段落与时间，不含任何受版权保护的词）。
5. **和弦谱**：`data/chords.ts` 的 `sheets` 只记录定弦、速度、段落与和弦走向，
   歌词行以 `lines: 数量` 表示，由用户自行绑定已授权文本。

## 6. 本地存储

命名空间 `lz334:`，全部值都是 JSON。

| key | 内容 |
| --- | --- |
| `lz334:library` | 收藏、歌单、播放记录、每曲次数与断点、每日时长、完整听完、成就、活跃天数 |
| `lz334:player` | 队列、当前序号、音量、静音、播放模式、倍速 |
| `lz334:settings` | 主题、强调色、歌词字号、本地媒体、音质、频谱、快捷键、续播、桌面歌词、彩蛋、悬浮球 |
| `lz334:tourWishlist` | 「想去的城市」 |
| `lz334:sponsor.records` / `lz334:sponsor.nick` | 支持记录与署名 |
| `lz334:random.rolls` | 命运模式累计次数 |

写入统一 260ms 防抖（`store/library.ts`）。**设置页**可一键导出/导入/清空，
换电脑前先导出备份。

## 7. 快捷键

`空格` 播放暂停 · `←/→` ±5 秒 · `↑/↓` 音量 ±5% · `N/P` 上下首 · `M` 静音 ·
`L` 全屏播放器 · `Q` 队列 · `D` 播放模式 · `R` 随机一首 · `/` 或 `Ctrl+K` 聚焦搜索 · `?` 帮助。
在输入框内不触发；可在「设置 → 快捷键」整体关闭。

## 8. 已知边界

- **没有后端**：登录、云同步、播放量真实值、支付、评论均未实现，只有对应界面与数据契约。
- **版权**：不内置任何歌词、语录原文、人物真实资料、演出照片；相关位置都是结构占位与说明。
- **演示数据**：专辑年份、BPM、调性、难度、巡演城市进度、赞助价格等均需按官方资料校订，
  逐条清单见 [`data-checklist.md`](./data-checklist.md)。
- **调音器**依赖麦克风权限，`file://` 打开时不可用（其余功能不受影响）。

## 9. 下一步接后端

1. `src/data` 各模块换成 fetch，保持导出的名字与类型不变（页面层零改动）。
2. 播放量、进度、收藏改为服务端接口；`store/library.ts` 的 `persist` 改为「本地优先 + 后台同步」。
3. 搜索改为 `GET /search?q=`；随机改为 `GET /songs/random?...`；历史改为游标分页。
4. 赞助页接支付前先只做「意向记录」，二维码与金额档位需替换为真实渠道。
5. 客户端：Tauri 套壳（桌面歌词 → 透明置顶窗、本地媒体目录 → 用户自选文件夹、快捷键 → 全局热键）。
