import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/index.css'
import { loadContent } from './api/content'
import { useAuth } from './store/auth'
import { useLibrary } from './store/library'
import { useShorts } from './store/shorts'
import { useUploads } from './store/uploads'

/**
 * 说明：这里刻意不开 StrictMode。
 * 播放引擎、节拍器、麦克风分析都持有真实定时器 / AudioContext，
 * StrictMode 的开发期双调用会造成重复计时与重复授权弹窗。
 *
 * 启动流程：先拉后端内容（失败则沿用静态种子数据）→ 再挂载页面，
 * 避免「先渲染静态数据、再被接口覆盖」造成闪动。
 */
async function bootstrap() {
  await loadContent(3000)
  const el = document.getElementById('root')
  if (el) createRoot(el).render(<App />)
  // 渲染后同步服务器会话与云端「我的库」（离线自动降级为本地数据）
  void useAuth
    .getState()
    .refresh()
    .then(() =>
      Promise.all([
        useLibrary.getState().syncFromServer(),
        useShorts.getState().syncFromServer(),
        useUploads.getState().syncFromServer(),
      ]),
    )
    .catch(() => undefined)
}

void bootstrap()