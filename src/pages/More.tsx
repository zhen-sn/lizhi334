import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../components/common/Icon'
import { Cover } from '../components/common/Cover'
import { Modal } from '../components/common/Overlays'
import { Section, Stat, DemoNotice } from '../components/common/Primitives'
import { profile, facts, faqs } from '../data/bio'
import { TOUR_TARGET, tourDoneCount, tourProgress } from '../data/tour'
import { songs, albums } from '../data'
import { achievements, easterEggs } from '../data/achievements'
import { quotes } from '../data/quotes'
import { pct } from '../lib/format'
import { copyText } from '../lib/share'
import { pickBySeed, hash32 } from '../lib/hash'
import { useLibrary } from '../store/library'
import { useUi } from '../store/ui'
import { useOfflineLibrary } from '../hooks/useOfflineLibrary'
import { useSettings } from '../store/settings'

/** 「更多」下的子页面入口；同时把「我的」相关入口收在同一张卡里 */
const ENTRIES = [
  {
    to: '/more/biography',
    icon: 'book',
    title: '李志百科',
    desc: '资料卡 · 分期长文 · 乐队成员 · 问答',
  },
  {
    to: '/more/tour',
    icon: 'map',
    title: '叁叁肆巡演',
    desc: '334 城地图 · 按年推进度 · 大事记',
  },
  {
    to: '/videos',
    icon: 'video',
    title: '现场视频',
    desc: 'MV · 现场 · 纪录片段',
  },
  {
    to: '/tools',
    icon: 'guitar',
    title: '工具',
    desc: '和弦谱 · 节拍器 · 调音 · 变调夹',
  },
  {
    to: '/more/stats',
    icon: 'star',
    title: '听歌报告',
    desc: '本地播放统计 · 徽章收集',
  },
  {
    to: '/sponsor',
    icon: 'crown',
    title: '赞助支持',
    desc: '按次自愿赞助 · 资金去向 · 赞助墙',
  },
  {
    to: '/sponsor/wall',
    icon: 'star',
    title: '赞助墙',
    desc: '滚动墙 · 全部署名',
  },
  {
    to: '/playlist/fav',
    icon: 'heart',
    title: '我喜欢',
    desc: '收藏过的曲目',
  },
  {
    to: '/history',
    icon: 'clock',
    title: '最近播放',
    desc: '按天分组的历史记录',
  },
  {
    to: '/random',
    icon: 'dice',
    title: '命运模式',
    desc: '按条件随机抽一首',
  },
  {
    to: null,
    icon: 'download',
    title: '离线曲库',
    desc: '选择本地文件夹 · 导入 songs.json（仅桌面端）',
  },
  {
    to: '/settings',
    icon: 'gear',
    title: '设置',
    desc: '主题 · 媒体 · 数据导入导出',
  },
]

export default function More() {
  const nav = useNavigate()
  const push = useUi((s) => s.push)
  const unlocked = useLibrary((s) => s.unlocked)
  const daily = useLibrary((s) => s.daily)
  const [quoteSeed, setQuoteSeed] = useState(() => hash32(String(Date.now())))
  const [offlineOpen, setOfflineOpen] = useState(false)
  const { desktop, payload, offlineLibrary, status, pickFolder, saveFromFolder, clear: clearLib } = useOfflineLibrary()
  const setSettings = useSettings((s) => s.set)
  const [folder, setFolder] = useState('')
  const [jsonText, setJsonText] = useState('')

  const quote = useMemo(() => pickBySeed(quotes, quoteSeed), [quoteSeed])
  const days = Object.keys(daily).filter((k) => !k.startsWith('night')).length

  const onSave = async () => {
    if (!folder) { push('请先选择本地文件夹', 'info'); return }
    if (!jsonText.trim()) { push('请粘贴 songs.json 内容', 'info'); return }
    await saveFromFolder(folder, jsonText)
  }

  const onPickFolder = async () => {
    const p = await pickFolder()
    if (p) setFolder(p)
  }

  const entries = ENTRIES.map((e) =>
    e.to ? (
      <Link key={e.to} to={e.to} className="toolcard">
        <span className="toolcard__ic"><Icon name={e.icon} size={20} /></span>
        <span style={{ minWidth: 0 }}>
          <h3>{e.title}</h3><p>{e.desc}</p>
        </span>
      </Link>
    ) : (
      <button key={e.title} className="toolcard" onClick={() => setOfflineOpen(true)} style={{ textAlign: 'left' }}>
        <span className="toolcard__ic"><Icon name={e.icon} size={20} /></span>
        <span style={{ minWidth: 0 }}>
          <h3>{e.title}</h3><p>{e.desc}</p>
        </span>
      </button>
    ),
  )

  return (
    <div>
      <header className="page-head">
        <h1>更多</h1>
        <p>播放器之外的一切：人、现场、统计与支持方式。</p>
      </header>

      {/* 资料卡摘要 */}
      <div className="card" style={{ marginBottom: 26 }}>
        <div className="row" style={{ gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <Cover seed={profile.name} title={profile.name} size={96} glyphSize={40} />
          <div style={{ minWidth: 240, flex: 1 }}>
            <div className="serif" style={{ fontSize: 26 }}>
              {profile.name}
              <span className="mute" style={{ fontSize: 13, marginLeft: 10 }}>
                {profile.alias}
              </span>
            </div>
            <div className="mute" style={{ fontSize: 12, marginTop: 4 }}>
              {profile.base} · {profile.activeSince} 年起活跃 · {profile.label}
            </div>
            <p className="mute" style={{ fontSize: 13, margin: '10px 0 0', maxWidth: 640 }}>
              {profile.intro}
            </p>
            <div className="chips" style={{ marginTop: 12 }}>
              {[...profile.roles, ...profile.genres].map((t) => (
                <span className="tag" key={t}>
                  {t}
                </span>
              ))}
            </div>
          </div>
          <div style={{ minWidth: 190 }}>
            {facts.slice(0, 4).map((f) => (
              <div className="fact" key={f.label}>
                <span>{f.label}</span>
                <b>{f.value}</b>
              </div>
            ))}
            <button className="btn" style={{ marginTop: 12 }} onClick={() => nav('/more/biography')}>
              完整资料 <Icon name="right" size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 入口 */}
      <Section title="子页面" subtitle="每个页面都可以单独验收">
        <div className="grid grid--tools">
          {entries}
        </div>
      </Section>

      {/* 数字概览 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14, marginBottom: 30 }}>
        <Stat value={`${tourDoneCount}/${TOUR_TARGET}`} label={`巡演城市 · ${pct(tourProgress)}`} />
        <Stat value={`${songs.length} / ${albums.length}`} label="曲目 / 专辑" />
        <Stat value={`${unlocked.length}/${achievements.length}`} label="已解锁徽章" />
        <Stat value={days} label="有收听记录的天数" />
      </div>

      {/* 语录池 */}
      <Section
        title="语录"
        subtitle="演示文案，正式内容需授权"
        actions={
          <button className="btn" onClick={() => setQuoteSeed((s) => s + 1)}>
            <Icon name="shuffle" size={15} /> 换一条
          </button>
        }
      >
        <div className="card card--flat">
          <div className="serif" style={{ fontSize: 20, lineHeight: 1.7 }}>
            「{quote.text}」
          </div>
          <div className="row" style={{ marginTop: 12 }}>
            <span className="mute" style={{ fontSize: 12 }}>
              —— {quote.source}
            </span>
            <div className="spacer" />
            <button
              className="btn"
              style={{ height: 30 }}
              onClick={() =>
                copyText(`「${quote.text}」—— ${profile.name}`).then((ok) =>
                  push(ok ? '已复制到剪贴板' : '复制失败，请手动选取', ok ? 'good' : 'info'),
                )
              }
            >
              <Icon name="share" size={14} /> 复制
            </button>
          </div>
        </div>
      </Section>

      {/* 彩蛋说明 */}
      <Section title="彩蛋" subtitle="全部由前端判定，可在设置里关掉">
        <div className="card card--flat">
          <div className="fact">
            <span>雨天场景</span>
            <b>
              播放 {easterEggs.rainSongIds.length} 首「南京」相关曲目时下雨
            </b>
          </div>
          <div className="fact">
            <span>生日模式</span>
            <b>{easterEggs.birthdayNote}</b>
          </div>
          <div className="fact">
            <span>深夜听众</span>
            <b>23 点—5 点之间播放会累计「深夜收听」次数</b>
          </div>
        </div>
      </Section>

      {/* 常见问题 */}
      <Section title="常见问题" more="看全部" onMore={() => nav('/more/biography')}>
        <div className="list" style={{ padding: '4px 0' }}>
          {faqs.slice(0, 3).map((f) => (
            <div key={f.q} style={{ padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
              <div style={{ fontSize: 13.5, fontWeight: 550, marginBottom: 4 }}>{f.q}</div>
              <div className="mute" style={{ fontSize: 12.5, lineHeight: 1.7 }}>
                {f.a}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="关于本项目">
        <div className="card card--flat">
          <ul style={{ display: 'grid', gap: 8, fontSize: 13, color: 'var(--fg-2)', paddingLeft: 18 }}>
            <li>纯前端可运行：不放任何音视频素材也能完整体验 —— 音频走模拟时钟，视频用 Canvas 模拟放映机，歌词为结构占位。</li>
            <li>想听真实声音：把文件放到 <code className="mono">public/media/audio/&#123;曲目id&#125;.mp3</code>、视频放到 <code className="mono">public/media/video/&#123;视频id&#125;.mp4</code>，并在设置里打开「读取本地媒体」。</li>
            <li>数据结构即后端契约：<code className="mono">src/data/*</code> 的字段与接口一致，替换成 fetch 即可，页面层不用改。</li>
            <li>网页与客户端共用同一套代码：后续可用 Tauri / Electron 包壳，仅新增窗口与文件系统集成。</li>
            <li>所有个人数据只存在浏览器 localStorage（命名空间 lz334:），设置页可一键导出或清空。</li>
          </ul>
        </div>
      </Section>

      <DemoNotice>
        本页人物资料、语录、巡演进度、荣誉均为演示占位内容，正式发布前须逐条校订或替换为官方接口数据。
      </DemoNotice>

      {offlineOpen && (
        <Modal title="离线曲库" onClose={() => setOfflineOpen(false)} width={520}>
          {!desktop ? (
            <p className="mute" style={{ fontSize: 13, lineHeight: 1.8 }}>
              此功能仅在桌面客户端（Electron）中可用。当前为浏览器环境，无法访问本地文件系统。
              打包成桌面客户端后，此处可选择一个本地文件夹作为曲库目录，并导入
              <code className="mono"> songs.json </code>
              来映射曲目 ID 与文件名。
            </p>
          ) : (
            <>
              <div className="fact">
                <span>当前状态</span>
                <b>{offlineLibrary ? '已启用' : '已停用'}</b>
              </div>
              <div className="fact">
                <span>文件夹</span>
                <b className="mono" style={{ fontSize: 11, wordBreak: 'break-all' }}>
                  {payload?.folder ?? '（未设置）'}
                </b>
              </div>
              <div className="fact">
                <span>曲目数</span>
                <b>{payload ? Object.keys(payload.songs ?? {}).length : 0}</b>
              </div>

              <div style={{ marginTop: 16 }}>
                <label className="mute" style={{ fontSize: 12 }}>1. 选择本地文件夹（存放 mp3 / mp4 的目录）</label>
                <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                  <input
                    value={folder}
                    onChange={(e) => setFolder(e.target.value)}
                    placeholder="例如 D:\music\songs"
                    readOnly
                    style={{ flex: 1, padding: '6px 10px', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 6, color: 'var(--fg-1)', fontSize: 12 }}
                  />
                  <button className="btn" onClick={onPickFolder}>
                    <Icon name="folder" size={14} /> 选择
                  </button>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <label className="mute" style={{ fontSize: 12 }}>
                  2. 粘贴 <code className="mono">songs.json</code> 内容
                </label>
                <textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  placeholder='{"v01": {"id":"v01","audioFileName":"关于郑州的记忆.mp3"}, "v02": {...}}'
                  style={{ width: '100%', minHeight: 110, padding: '6px 10px', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 6, color: 'var(--fg-1)', fontSize: 11, fontFamily: 'monospace', resize: 'vertical', marginTop: 6 }}
                />
                <p className="mute" style={{ fontSize: 11, marginTop: 4, lineHeight: 1.6 }}>
                  每条只需 <code className="mono">id</code> + <code className="mono">audioFileName</code>（或 <code className="mono">videoFileName</code>）。
                  数组和对象两种格式都支持。ID 须与前端 data/songs.ts 中的曲目 ID 一一对应。
                </p>
              </div>

              {status && (
                <p className="mute" style={{ fontSize: 12, marginTop: 8, color: 'var(--gold)' }}>{status}</p>
              )}

              <div style={{ display: 'flex', gap: 8, marginTop: 14, alignItems: 'center' }}>
                <button className="btn" onClick={onSave}>导入并启用</button>
                <button className="btn" onClick={() => setSettings({ offlineLibrary: !offlineLibrary })} disabled={!payload}>
                  {offlineLibrary ? '停用' : '启用'}
                </button>
                <button className="btn" onClick={clearLib} disabled={!payload} style={{ background: 'transparent', borderColor: '#5a2a2a', color: '#e38b8b' }}>
                  <Icon name="trash" size={13} /> 清空
                </button>
                <div className="spacer" />
                <button className="btn" onClick={() => setOfflineOpen(false)}>关闭</button>
              </div>
            </>
          )}
        </Modal>
      )}
    </div>
  )
}
