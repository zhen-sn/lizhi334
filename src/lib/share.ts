import type { Song } from '../data/types'
import { coverPalette } from './hash'
import { mmss } from './format'

/** 生成「正在播放」分享卡（纯 Canvas，无外部依赖） */
export function renderShareCard(
  song: Song,
  albumName: string,
  lyricLine: string,
): string {
  const W = 900
  const H = 500
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  if (!g) return ''

  const p = coverPalette(song.title)
  const bg = g.createLinearGradient(0, 0, W, H)
  bg.addColorStop(0, p.from)
  bg.addColorStop(1, p.to)
  g.fillStyle = bg
  g.fillRect(0, 0, W, H)

  // 斜向纹理
  g.globalAlpha = 0.07
  g.strokeStyle = '#fff'
  g.lineWidth = 1
  for (let x = -H; x < W; x += 9) {
    g.beginPath()
    g.moveTo(x, 0)
    g.lineTo(x + H, H)
    g.stroke()
  }
  g.globalAlpha = 1

  // 左侧封面块
  g.fillStyle = 'rgba(0,0,0,0.28)'
  g.fillRect(64, 64, 190, 190)
  g.fillStyle = 'rgba(255,255,255,0.94)'
  g.font = '700 84px "Songti SC", serif'
  g.textBaseline = 'middle'
  g.fillText(song.title.replace(/[（(].*$/, '').slice(0, 1) || '李', 128, 158)

  const tx = 296
  g.fillStyle = 'rgba(255,255,255,0.6)'
  g.font = '500 16px system-ui, sans-serif'
  g.fillText(`NOW PLAYING · ${albumName} · ${song.year}`, tx, 108)

  g.fillStyle = '#fff'
  g.font = '700 46px "Songti SC", Georgia, serif'
  const title = song.title.length > 16 ? song.title.slice(0, 16) + '…' : song.title
  g.fillText(title, tx, 158)

  g.strokeStyle = 'rgba(255,255,255,0.35)'
  g.beginPath()
  g.moveTo(tx, 208)
  g.lineTo(W - 64, 208)
  g.stroke()

  g.fillStyle = 'rgba(255,255,255,0.88)'
  g.font = '400 24px "Songti SC", Georgia, serif'
  const line = (lyricLine || '（结构占位歌词）').slice(0, 26)
  g.fillText(line, tx, 252)

  // 进度示意
  const barY = 320
  g.fillStyle = 'rgba(255,255,255,0.22)'
  g.fillRect(tx, barY, W - tx - 64, 4)
  g.fillStyle = '#fff'
  g.fillRect(tx, barY, (W - tx - 64) * 0.34, 4)
  g.font = '500 14px ui-monospace, monospace'
  g.fillStyle = 'rgba(255,255,255,0.65)'
  g.fillText(`0:00 / ${mmss(song.duration)}`, tx, barY + 26)

  // 参数
  const facts = [
    ['BPM', String(song.bpm)],
    ['原调', song.key],
    ['Capo', song.capo ? `${song.capo} 品` : '不夹'],
    ['时长', mmss(song.duration)],
  ]
  facts.forEach(([k, v], i) => {
    const x = tx + i * 140
    g.fillStyle = 'rgba(255,255,255,0.5)'
    g.font = '500 12px system-ui, sans-serif'
    g.fillText(k.toUpperCase(), x, 384)
    g.fillStyle = '#fff'
    g.font = '700 22px ui-monospace, monospace'
    g.fillText(v, x, 410)
  })

  g.fillStyle = 'rgba(255,255,255,0.5)'
  g.font = '500 14px system-ui, sans-serif'
  g.fillText('李志 · 叁叁肆', W - 176, 452)

  return c.toDataURL('image/png')
}

export function download(url: string, filename: string) {
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}

/** 复制文本到剪贴板，失败时回落为临时 textarea */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    try {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      const ok = document.execCommand('copy')
      ta.remove()
      return ok
    } catch {
      return false
    }
  }
}
