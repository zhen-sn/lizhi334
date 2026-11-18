import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '../common/Icon'
import { Section } from '../common/Primitives'
import { useAuth } from '../../store/auth'
import { useComments } from '../../store/comments'
import type { CommentItem } from '../../store/comments'
import { useUi } from '../../store/ui'

const MAX_LEN = 500

const timeAgo = (t: number) => {
  const diff = Date.now() - t
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)} 天前`
  const d = new Date(t)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')}`
}

export function CommentSection({ target, title = '评论' }: { target: string; title?: string }) {
  const user = useAuth((s) => s.user)
  const openAuth = useUi((s) => s.openAuth)
  const push = useUi((s) => s.push)
  const list = useComments((s) => s.byTarget[target]) ?? []
  const add = useComments((s) => s.add)
  const remove = useComments((s) => s.remove)
  const toggleLike = useComments((s) => s.toggleLike)

  const [text, setText] = useState('')
  const [reply, setReply] = useState<CommentItem | null>(null)

  const roots = useMemo(
    () => list.filter((c) => !c.parentId).sort((a, b) => b.createdAt - a.createdAt),
    [list],
  )
  const replies = useMemo(() => {
    const map: Record<string, CommentItem[]> = {}
    for (const c of list) {
      if (!c.parentId) continue
      ;(map[c.parentId] ??= []).push(c)
    }
    for (const key of Object.keys(map)) map[key].sort((a, b) => a.createdAt - b.createdAt)
    return map
  }, [list])

  const requireLogin = () => {
    push('请先登录后再评论')
    openAuth('login')
  }

  const onLike = (c: CommentItem) => {
    if (!user) return requireLogin()
    toggleLike(target, c.id, user.id)
  }

  const onReply = (c: CommentItem) => {
    if (!user) return requireLogin()
    setReply(c)
  }

  const onDelete = (c: CommentItem) => {
    if (!window.confirm('删除这条评论？')) return
    remove(target, c.id)
    if (reply?.id === c.id) setReply(null)
    push('评论已删除')
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!user) return requireLogin()
    const body = text.trim()
    if (!body) return
    add(target, user, body, reply ? (reply.parentId ?? reply.id) : undefined, reply?.userName)
    setText('')
    setReply(null)
    push('评论已发布', 'good')
  }

  const liked = (c: CommentItem) => Boolean(user && c.likes.includes(user.id))

  const renderItem = (c: CommentItem, isReply = false) => (
    <div className={`comment ${isReply ? 'comment--reply' : ''}`} key={c.id}>
      <div className="comment__avatar">{c.userName.slice(0, 1)}</div>
      <div className="comment__main">
        <div className="comment__meta">
          <b>{c.userName}</b>
          {c.replyToName && <span className="comment__to">回复 @{c.replyToName}</span>}
          <span className="comment__time">{timeAgo(c.createdAt)}</span>
        </div>
        <p className="comment__text">{c.text}</p>
        <div className="comment__acts">
          <button className={`comment__act ${liked(c) ? 'is-on' : ''}`} onClick={() => onLike(c)}>
            <Icon name={liked(c) ? 'heart' : 'heartLine'} size={14} />
            {c.likes.length > 0 ? c.likes.length : '点赞'}
          </button>
          <button className="comment__act" onClick={() => onReply(c)}>
            <Icon name="chat" size={14} />
            回复
          </button>
          {user?.id === c.userId && (
            <button className="comment__act" onClick={() => onDelete(c)}>
              <Icon name="trash" size={14} />
              删除
            </button>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <Section title={`${title} · ${list.length}`}>
      <div className="comments">
        {user ? (
          <form className="comment-editor" onSubmit={submit}>
            <div className="comment__avatar">{user.name.slice(0, 1)}</div>
            <div className="comment-editor__body">
              {reply && (
                <div className="comment-editor__reply">
                  <span>回复 @{reply.userName}</span>
                  <button type="button" className="comment__act" onClick={() => setReply(null)}>
                    取消
                  </button>
                </div>
              )}
              <textarea
                className="inputlike comment-editor__input"
                rows={3}
                maxLength={MAX_LEN}
                placeholder="说点什么…"
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <div className="comment-editor__foot">
                <span className="comment-editor__count">
                  {text.trim().length}/{MAX_LEN}
                </span>
                <button className="btn btn--primary" type="submit" disabled={!text.trim()}>
                  发布评论
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="comments__gate">
            <Icon name="chat" size={20} />
            <div className="comments__gate-text">
              <b>登录后参与评论</b>
              <span>发表评论、点赞和回复都需要先登录或注册。</span>
            </div>
            <div className="comments__gate-acts">
              <button className="btn btn--primary" onClick={() => openAuth('login')}>
                登录
              </button>
              <button className="btn" onClick={() => openAuth('register')}>
                注册
              </button>
            </div>
          </div>
        )}

        {roots.length === 0 ? (
          <p className="dim comments__empty">还没有评论，来写下第一条吧。</p>
        ) : (
          <div className="comments__list">
            {roots.map((c) => (
              <div className="comments__thread" key={c.id}>
                {renderItem(c)}
                {replies[c.id]?.length > 0 && (
                  <div className="comments__replies">
                    {replies[c.id].map((r) => renderItem(r, true))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Section>
  )
}
