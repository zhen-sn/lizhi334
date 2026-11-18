import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/index.css'

/**
 * 说明：这里刻意不开 StrictMode。
 * 播放引擎、节拍器、麦克风分析都持有真实定时器 / AudioContext，
 * StrictMode 的开发期双调用会造成重复计时与重复授权弹窗。
 */
const el = document.getElementById('root')
if (el) createRoot(el).render(<App />)
