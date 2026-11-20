import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../components/common/Icon'
import { Empty, Section } from '../components/common/Primitives'
import { songs } from '../data/songs'
import { useAuth } from '../store/auth'
import { useUi } from '../store/ui'
import { useUploads, type UploadType } from '../store/uploads'
import { uploadFile } from '../api/client'

const TYPES: { id: UploadType; label: string; hint: string; icon: 'music' | 'video' | 'film' | 'book' }[] = [
  { id: 'song', label: '歌曲', hint: '音频文件，建议 WAV / FLAC，MP3 也可以', icon: 'music' },
  { id: 'mv', label: 'MV 视频', hint: '横屏现场、正式 MV、纪录片段', icon: 'video' },
  { id: 'short', label: '短视频', hint: '竖屏片段、花絮、翻唱，时长 60 秒内', icon: 'film' },
  { id: 'other', label: '其他资源', hint: '曲谱、图片、文献、演出录音等', icon: 'book' },
]

const TYPE_LABEL: Record<UploadType, string> = {
  song: '歌曲',
  mv: 'MV 视频',
  short: '短视频',
  other: '其他资源',
}

export default function Upload() {
  const user = useAuth((s) => s.user)
  const openAuth = useUi((s) => s.openAuth)
  const push = useUi((s) => s.push)
  const items = useUploads((s) => s.items)
  const add = useUploads((s) => s.add)
  const remove = useUploads((s) => s.remove)

  const [type, setType] = useState<UploadType>('song')
  const [title, setTitle] = useState('')
  const [songRef, setSongRef] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [link, setLink] = useState('')
  const [note, setNote] = useState('')
  const [contact, setContact] = useState('')
  const [busy, setBusy] = useState(false)

  const reset = () => {
    setTitle('')
    setSongRef('')
    setFile(null)
    setLink('')
    setNote('')
    setContact('')
  }

  const submit = async () => {
    if (busy) return
    if (!title.trim()) return push('先给这份资源起个名字', 'info')
    if (!file && !link.trim()) return push('请选择文件，或填一个下载链接', 'info')
    if (!user && !contact.trim()) return push('请先登录，或填写联系方式/署名', 'info')

    setBusy(true)
    try {
      let fileUrl: string | undefined
      let fileName: string | undefined
      if (file) {
        const up = await uploadFile(file)
        fileUrl = up.url
        fileName = up.fileName
      }
      const err = await add({
        type,
        title: title.trim(),
        songRef: songRef.trim() || undefined,
        fileName,
        fileUrl,
        link: link.trim() || undefined,
        note: note.trim(),
        contact: contact.trim() || undefined,
        author: user?.name || contact.trim(),
      })
      if (err) {
        push(err, 'info')
        return
      }
      push('已提交，等我们审核后会整理进库里', 'good')
      reset()
    } catch (e) {
      push(e instanceof Error ? e.message : '提交失败，请稍后重试', 'info')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <header className="page-head">
        <h1>水友资源上传</h1>
        <p>把手上的现场录音、MV、短视频或资料交上来，审核通过后会整理进曲库与影像库。</p>
      </header>

      <div className="upload">
        <div className="card upl">
          <div className="upfield">
            <label>
              资源类型 <i className="upreq">*</i>
            </label>
            <div className="uptypes">
              {TYPES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`chip ${type === t.id ? 'is-on' : ''}`}
                  onClick={() => setType(t.id)}
                >
                  <Icon name={t.icon} size={14} /> {t.label}
                </button>
              ))}
            </div>
            <div className="uphint">{TYPES.find((t) => t.id === type)?.hint}</div>
          </div>

          <div className="upfield">
            <label>
              资源名称 <i className="upreq">*</i>
            </label>
            <input
              className="inputlike"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例：2015 西安现场《画》完整录音"
              maxLength={60}
            />
          </div>

          <div className="upfield">
            <label>
              关联曲目 <span className="uphint">（选填，方便归档）</span>
            </label>
            <input
              className="inputlike"
              list="upload-song-titles"
              value={songRef}
              onChange={(e) => setSongRef(e.target.value)}
              placeholder="输入歌名，或从建议里选"
            />
            <datalist id="upload-song-titles">
              {songs.map((s) => (
                <option key={s.id} value={s.title} />
              ))}
            </datalist>
          </div>

          <div className="upfield">
            <label>
              文件 <span className="uphint">（文件与链接至少填一个）</span>
            </label>
            <label className="upfile">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                accept={type === 'song' ? 'audio/*' : type === 'other' ? undefined : 'video/*'}
              />
              <span className="upfile__ic">
                <Icon name="upload" size={16} />
              </span>
              <span className="upfile__text">
                <b>{file ? file.name : '选择本地文件'}</b>
                <span>
                  {file
                    ? `${(file.size / 1048576).toFixed(1)} MB · 点击可重新选择`
                    : '选择后会先上传到服务器，再提交审核'}
                </span>
              </span>
              <span className="spacer" />
              {file && <span className="tag">已选择</span>}
            </label>
            <input
              className="inputlike"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="或填一个网盘 / 直链地址，https://…"
            />
          </div>

          <div className="upfield">
            <label>
              备注 <span className="uphint">（选填，最多 300 字）</span>
            </label>
            <textarea
              className="inputlike"
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              placeholder="录音时间、场地、音质瑕疵、想要的署名方式、剪辑说明……"
            />
            <div className="uphint" style={{ textAlign: 'right' }}>
              {note.length}/300
            </div>
          </div>

          <div className="upfield">
            <label>
              联系方式 <span className="uphint">（选填）</span>
            </label>
            <input
              className="inputlike"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="邮箱或微信，方便审核时联系你"
            />
          </div>

          <div className="upfoot">
            <button className="btn btn--primary" onClick={submit} disabled={busy}>
              <Icon name="upload" size={15} /> {busy ? '提交中…' : '提交资源'}
            </button>
            <button className="btn btn--ghost" onClick={reset} disabled={busy}>
              清空
            </button>
            <div className="spacer" />
            {user ? (
              <span className="uphint">
                将以 <b>@{user.name}</b> 的名义提交
              </span>
            ) : (
              <span className="uphint">
                <button className="linklike" onClick={() => openAuth('login')}>
                  登录
                </button>{' '}
                后会自动带上昵称
              </span>
            )}
          </div>
        </div>

        <aside className="upside">
          <div className="card card--flat">
            <div className="upside__hd">上传须知</div>
            <ul className="upside__list">
              <li>只收与本站内容相关的资源，请确认你有权分享。</li>
              <li>音频优先无损；现场录音请注明日期与城市。</li>
              <li>请勿上传完整商业专辑的盗版资源。</li>
              <li>审核通过后会标注上传者昵称，也可以选择匿名。</li>
            </ul>
          </div>
          <div className="card card--flat">
            <div className="upside__hd">相关入口</div>
            <Link to="/shorts" className="upside__link">
              <Icon name="film" size={15} /> 看看别人的短视频
            </Link>
            <Link to="/videos" className="upside__link">
              <Icon name="video" size={15} /> 影像库
            </Link>
            <Link to="/songs" className="upside__link">
              <Icon name="music" size={15} /> 曲目库
            </Link>
          </div>
        </aside>
      </div>

      <Section title="我提交的记录" subtitle={`${items.length} 条 · 审核结果会在这里更新`}>
        {items.length ? (
          <div className="uplist">
            {items.map((it) => (
              <div className="upitem" key={it.id}>
                <span className="upitem__type">{TYPE_LABEL[it.type]}</span>
                <div className="upitem__main">
                  <b>{it.title}</b>
                  <em className="mono">
                    {it.fileName ?? it.link}
                    {it.songRef ? ` · 关联《${it.songRef}》` : ''} ·{' '}
                    {new Date(it.createdAt).toLocaleDateString('zh-CN')}
                    {it.author ? ` · @${it.author}` : ''}
                  </em>
                  {it.note && <p>{it.note}</p>}
                </div>
                <span className="tag">{it.status}</span>
                <button
                  className="iconbtn"
                  onClick={async () => {
                    const err = await remove(it.id)
                    if (err) push(err, 'info')
                  }}
                  aria-label="撤回这条记录"
                >
                  <Icon name="trash" size={15} />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <Empty text="还没有提交过资源" hint="填上面的表单试试，提交后会出现在这里。" />
        )}
      </Section>
    </div>
  )
}
