import { Icon } from '../components/common/Icon'
import { Chips, Section, Toggle } from '../components/common/Primitives'
import { HOTKEYS } from '../hooks/useHotkeys'
import { humanTime } from '../lib/format'
import { useLibrary } from '../store/library'
import { useSettings, resolvedTheme } from '../store/settings'
import type { Accent, LyricSize, ThemeMode } from '../store/settings'
import { useUi } from '../store/ui'

const THEME_ITEMS: { key: ThemeMode; label: string; title: string }[] = [
  { key: 'dark', label: '深色', title: '固定深色，接近现场灯光' },
  { key: 'light', label: '浅色', title: '固定浅色，白天更省力' },
  { key: 'system', label: '跟随系统', title: '跟随 prefers-color-scheme' },
]

const ACCENT_ITEMS: { key: Accent; label: string; title: string }[] = [
  { key: 'gold', label: '黑白', title: '默认：极简黑白' },
  { key: 'teal', label: '青', title: '冷一些，偏江河' },
  { key: 'rust', label: '锈', title: '暖砖红，偏老城' },
  { key: 'violet', label: '紫', title: '舞台紫' },
]

const LYRIC_ITEMS: { key: LyricSize; label: string; title: string }[] = [
  { key: 's', label: '小', title: '适合歌词墙' },
  { key: 'm', label: '中', title: '默认' },
  { key: 'l', label: '大', title: '边弹边看' },
  { key: 'xl', label: '特大', title: '投屏 / 远距离' },
]

const QUALITY_ITEMS: { key: 'low' | 'standard' | 'high' | 'lossless'; label: string; title: string }[] = [
  { key: 'low', label: '流畅', title: '弱网优先' },
  { key: 'standard', label: '标准', title: '默认档位' },
  { key: 'high', label: '高品质', title: '需要后端提供对应码率' },
  { key: 'lossless', label: '母带', title: '需要版权方授权' },
]

const ACCENT_DOT: Record<Accent, string> = {
  gold: '#f2f2f2',
  teal: '#3fa6a6',
  rust: '#c0603c',
  violet: '#8d6fd1',
}

export default function Settings() {
  const st = useSettings()
  const lib = useLibrary()
  const push = useUi((s) => s.push)
  const totalSec = lib.totalSeconds

  return (
    <div>
      <header className="page-head">
        <h1>设置</h1>
        <p>
          外观、播放与快捷键。所有开关立即生效并写进 localStorage，
          当前生效主题：<b className="mono">{resolvedTheme(st)}</b>。
        </p>
      </header>

      {/* ---------------- 外观 ---------------- */}
      <Section title="外观">
        <div className="card">
          <div className="srowform">
            <div className="srowform__label">
              <b>配色模式</b>
              <span>「跟随系统」会监听 prefers-color-scheme，改系统主题即刻切换</span>
            </div>
            <Chips items={THEME_ITEMS} value={st.theme} onChange={(v) => st.set({ theme: v })} />
          </div>

          <div className="srowform">
            <div className="srowform__label">
              <b>强调色</b>
              <span>只影响高亮、进度与按钮，正文对比度保持不变</span>
            </div>
            <div className="chips">
              {ACCENT_ITEMS.map((a) => (
                <button
                  key={a.key}
                  title={a.title}
                  className={`chip ${st.accent === a.key ? 'is-on' : ''}`}
                  onClick={() => st.set({ accent: a.key })}
                >
                  <i
                    style={{
                      display: 'inline-block',
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      background: ACCENT_DOT[a.key],
                      marginRight: 6,
                      verticalAlign: -1,
                    }}
                  />
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          <div className="srowform">
            <div className="srowform__label">
              <b>歌词字号</b>
              <span>同时作用于播放页歌词区、全屏播放器与桌面歌词</span>
            </div>
            <Chips items={LYRIC_ITEMS} value={st.lyricSize} onChange={(v) => st.set({ lyricSize: v })} />
          </div>

          <div className="srowform">
            <div className="srowform__label">
              <b>频谱动画</b>
              <span>播放条与播放台右侧的跳动条；关掉可省一点 CPU</span>
            </div>
            <Toggle on={st.showViz} onChange={(v) => st.set({ showViz: v })} />
          </div>

          <div className="srowform">
            <div className="srowform__label">
              <b>彩蛋与特效</b>
              <span>雨天、生日彩带等纯装饰效果，全部可关</span>
            </div>
            <Toggle on={st.easterEgg} onChange={(v) => st.set({ easterEgg: v })} />
          </div>

          <div className="srowform">
            <div className="srowform__label">
              <b>手动开启生日模式</b>
              <span>演示用：不必等到生日当天，直接看彩带效果</span>
            </div>
            <Toggle on={st.birthdayMode} onChange={(v) => st.set({ birthdayMode: v })} />
          </div>
        </div>
      </Section>

      {/* ---------------- 播放 ---------------- */}
      <Section title="播放">
        <div className="card">
          <div className="srowform">
            <div className="srowform__label">
              <b>使用本地媒体文件</b>
              <span>
                打开后按 <code className="mono">public/media/audio/&#123;id&#125;.mp3</code> 与{' '}
                <code className="mono">public/media/video/&#123;id&#125;.mp4</code> 读取；找不到文件自动回落到模拟播放
              </span>
            </div>
            <Toggle on={st.localMedia} onChange={(v) => st.set({ localMedia: v })} />
          </div>

          <div className="srowform">
            <div className="srowform__label">
              <b>音质档位</b>
              <span>目前只是界面预留，后端接入后对应不同码率地址</span>
            </div>
            <Chips items={QUALITY_ITEMS} value={st.quality} onChange={(v) => st.set({ quality: v })} />
          </div>

          <div className="srowform">
            <div className="srowform__label">
              <b>自动续播</b>
              <span>
                从上次听到的位置继续（每 5 秒记录一次断点）。当前累计收听 {humanTime(totalSec)}
              </span>
            </div>
            <Toggle on={st.autoResume} onChange={(v) => st.set({ autoResume: v })} />
          </div>

          <div className="srowform">
            <div className="srowform__label">
              <b>桌面歌词</b>
              <span>页面内浮层，可拖动；打包成客户端后换成真正的置顶透明窗</span>
            </div>
            <Toggle on={st.desktopLyric} onChange={(v) => { st.set({ desktopLyric: v }); push(v ? '已开启桌面歌词' : '已关闭桌面歌词') }} />
          </div>

          <div className="srowform">
            <div className="srowform__label">
              <b>悬浮球</b>
              <span>滚出内容区后也能控制播放的小圆点</span>
            </div>
            <Toggle on={st.floatingOrb} onChange={(v) => st.set({ floatingOrb: v })} />
          </div>
        </div>
      </Section>

      {/* ---------------- 快捷键 ---------------- */}
      <Section title="快捷键" subtitle="在输入框里打字时不会触发">
        <div className="card">
          <div className="srowform">
            <div className="srowform__label">
              <b>启用全局快捷键</b>
              <span>与浏览器 / 其它网页应用冲突时关掉</span>
            </div>
            <Toggle on={st.hotkeys} onChange={(v) => st.set({ hotkeys: v })} />
          </div>
          <div className="list" style={{ border: 0, background: 'none', marginTop: 8 }}>
            {HOTKEYS.map(([k, d]) => (
              <div className="fact" key={k}>
                <span className="mono">{k}</span>
                <b>{d}</b>
              </div>
            ))}
          </div>
          {!st.hotkeys && (
            <p className="mute" style={{ fontSize: 12, marginTop: 10 }}>
              快捷键已关闭，空格等按键交还给浏览器。
            </p>
          )}
        </div>
      </Section>

    </div>
  )
}
