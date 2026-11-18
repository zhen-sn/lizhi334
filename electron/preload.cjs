const { contextBridge, ipcRenderer } = require('electron')

// 渲染进程唯一可用的桌面能力入口，只暴露白名单方法
contextBridge.exposeInMainWorld('desktop', {
  isDesktop: true,
  platform: process.platform,

  openMini: () => ipcRenderer.send('win:mini'),
  closeMini: () => ipcRenderer.send('win:main'),
  hideMain: () => ipcRenderer.send('win:hide'),

  // 自定义标题栏：最小化 / 最大化切换 / 关闭（收进托盘）
  minimize: () => ipcRenderer.send('win:minimize'),
  maximize: () => ipcRenderer.send('win:maximize'),
  closeWindow: () => ipcRenderer.send('win:hide'),
  onMaxState: (cb) => {
    const handler = (_event, maxed) => cb(maxed)
    ipcRenderer.on('win:max-state', handler)
    return () => ipcRenderer.removeListener('win:max-state', handler)
  },

  openLyric: () => ipcRenderer.send('win:lyric'),
  closeLyric: () => ipcRenderer.send('win:lyric-close'),
  lyricLock: () => ipcRenderer.send('win:lyric-lock'),
  lyricUnlock: () => ipcRenderer.send('win:lyric-unlock'),

  pickLibraryFolder: () => ipcRenderer.invoke('lib:pick-folder'),
  saveLibrary: (payload) => ipcRenderer.invoke('lib:save', payload),
  loadLibrary: () => ipcRenderer.invoke('lib:load'),
  clearLibrary: () => ipcRenderer.invoke('lib:clear'),

  sendCommand: (cmd) => ipcRenderer.send('player:command', cmd),
  sendState: (state) => ipcRenderer.send('player:state', state),
  sendLyricState: (state) => ipcRenderer.send('lyric:state', state),
  requestState: () => ipcRenderer.send('player:request-state'),

  onCommand: (cb) => {
    const handler = (_event, cmd) => cb(cmd)
    ipcRenderer.on('player:command', handler)
    return () => ipcRenderer.removeListener('player:command', handler)
  },
  onState: (cb) => {
    const handler = (_event, state) => cb(state)
    ipcRenderer.on('player:state', handler)
    return () => ipcRenderer.removeListener('player:state', handler)
  },
  onLyricState: (cb) => {
    const handler = (_event, state) => cb(state)
    ipcRenderer.on('lyric:state', handler)
    return () => ipcRenderer.removeListener('lyric:state', handler)
  },
})
