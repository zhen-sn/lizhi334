const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  ipcMain,
  nativeImage,
  session,
  shell,
  dialog,
} = require('electron')
const fs = require('node:fs')
const path = require('node:path')

const devUrl = process.env.VITE_DEV_SERVER_URL
const preload = path.join(__dirname, 'preload.cjs')
const assets = path.join(__dirname, 'assets')
const indexHtml = path.join(__dirname, '..', 'dist', 'index.html')
const userDataDir = () => app.getPath('userData')
const libraryPath = () => path.join(userDataDir(), 'library.json')

let mainWindow = null
let miniWindow = null
let lyricWindow = null
let tray = null
let isQuitting = false
let lastState = null
let lastLyricState = null
let trayPlaying = null

/** 主窗口和迷你窗共用同一份前端产物，只差一个 hash 路由 */
function loadRoute(win, hash) {
  if (devUrl) win.loadURL(`${devUrl}#${hash}`)
  else win.loadFile(indexHtml, { hash })
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: '#0b0b0d',
    title: '叁叁肆',
    autoHideMenuBar: true,
    // 无边框：右上角的最小化/最大化/关闭由前端顶栏自己画
    frame: false,
    icon: path.join(assets, 'icon.png'),
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // 窗口隐藏到托盘后仍要正常走播放计时
      backgroundThrottling: false,
    },
  })

  mainWindow.setMenuBarVisibility(false)
  loadRoute(mainWindow, '/')

  // 最大化状态变化时同步给渲染进程，用于切换最大化/还原图标
  const sendMaxState = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('win:max-state', mainWindow.isMaximized())
    }
  }
  mainWindow.on('maximize', sendMaxState)
  mainWindow.on('unmaximize', sendMaxState)

  // 关闭按钮先收进托盘，真正退出走托盘菜单
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  if (process.platform === 'win32') updateThumbar(false)
}

function createMiniWindow() {
  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.show()
    miniWindow.focus()
    return
  }

  miniWindow = new BrowserWindow({
    width: 400,
    height: 132,
    frame: false,
    transparent: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: false,
    alwaysOnTop: true,
    show: false,
    backgroundColor: '#0b0b0d',
    title: '叁叁肆 · 迷你播放器',
    icon: path.join(assets, 'icon.png'),
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  })

  miniWindow.setAlwaysOnTop(true, 'floating')
  loadRoute(miniWindow, '/mini')

  miniWindow.once('ready-to-show', () => {
    miniWindow.show()
    if (lastState) miniWindow.webContents.send('player:state', lastState)
    if (mainWindow) mainWindow.hide()
  })

  miniWindow.on('closed', () => {
    miniWindow = null
    if (!isQuitting && mainWindow) {
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

function createLyricWindow() {
  if (lyricWindow && !lyricWindow.isDestroyed()) {
    lyricWindow.show()
    lyricWindow.focus()
    return
  }

  lyricWindow = new BrowserWindow({
    width: 640,
    height: 72,
    frame: false,
    transparent: true,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    show: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    title: '叁叁肆 · 桌面歌词',
    webPreferences: {
      preload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  })

  lyricWindow.setAlwaysOnTop(true, 'screen-saver')
  loadRoute(lyricWindow, '/lyric')

  // 渲染进程异常时记日志，方便排查
  lyricWindow.webContents.on('render-process-gone', (_e, details) => {
    console.error('[lyric] render-process-gone:', details.reason, details.exitCode)
  })

  lyricWindow.once('ready-to-show', () => {
    lyricWindow.show()
    lyricWindow.setIgnoreMouseEvents(false, { forward: true })
    if (lastLyricState) lyricWindow.webContents.send('lyric:state', lastLyricState)
  })

  lyricWindow.on('closed', () => {
    lyricWindow = null
  })
}

function closeLyricWindow() {
  if (lyricWindow && !lyricWindow.isDestroyed()) lyricWindow.close()
  // 同步把主窗口里的开关关掉，避免重启应用后又被带起来
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.executeJavaScript(
      `window.dispatchEvent(new CustomEvent('sqy:lyric-close'))`,
      true,
    ).catch(() => {})
  }
}

function showMain() {
  if (miniWindow && !miniWindow.isDestroyed()) miniWindow.close()
  if (!mainWindow) return
  if (mainWindow.isMinimized()) mainWindow.restore()
  mainWindow.show()
  mainWindow.focus()
}

function sendCommand(cmd) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('player:command', cmd)
  }
}

function updateThumbar(playing) {
  if (!mainWindow || mainWindow.isDestroyed() || process.platform !== 'win32') return
  const icon = (name) => nativeImage.createFromPath(path.join(assets, `${name}.png`))
  mainWindow.setThumbarButtons([
    { tooltip: '上一首', icon: icon('prev'), click: () => sendCommand('prev') },
    { tooltip: playing ? '暂停' : '播放', icon: icon(playing ? 'pause' : 'play'), click: () => sendCommand('toggle') },
    { tooltip: '下一首', icon: icon('next'), click: () => sendCommand('next') },
  ])
}

function buildTrayMenu(playing) {
  if (!tray) return
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '显示主窗口', click: showMain },
      { label: '迷你播放器', click: createMiniWindow },
      { label: '桌面歌词', type: 'checkbox', checked: Boolean(lyricWindow && !lyricWindow.isDestroyed()), click: (item) => {
        if (item.checked) createLyricWindow(); else closeLyricWindow()
      }},
      { type: 'separator' },
      { label: playing ? '暂停' : '播放', click: () => sendCommand('toggle') },
      { label: '上一首', click: () => sendCommand('prev') },
      { label: '下一首', click: () => sendCommand('next') },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          isQuitting = true
          app.quit()
        },
      },
    ]),
  )
}

function createTray() {
  const image = nativeImage.createFromPath(path.join(assets, 'tray.png'))
  tray = new Tray(image.resize({ width: 16, height: 16 }))
  tray.setToolTip('叁叁肆')
  buildTrayMenu(false)

  tray.on('click', () => {
    if (!mainWindow) return
    const onlyMainVisible = mainWindow.isVisible() && !miniWindow
    if (onlyMainVisible && mainWindow.isFocused()) mainWindow.hide()
    else showMain()
  })
}

function updateTray(state) {
  if (!tray) return
  const name = state.title ? `${state.title}${state.artist ? ' · ' + state.artist : ''}` : '叁叁肆'
  tray.setToolTip(`${name}${state.playing ? '（播放中）' : '（已暂停）'}`)
  if (state.playing !== trayPlaying) {
    trayPlaying = state.playing
    buildTrayMenu(state.playing)
    updateThumbar(state.playing)
  }
}

// --- 离线曲库 IPC -----------------------------------------------------------

ipcMain.handle('lib:pick-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择本地媒体文件夹',
    properties: ['openDirectory'],
  })
  if (result.canceled || !result.filePaths[0]) return null
  return result.filePaths[0]
})

ipcMain.handle('lib:save', async (_event, payload) => {
  try {
    const dir = userDataDir()
    fs.mkdirSync(dir, { recursive: true })
    fs.writeFileSync(libraryPath(), JSON.stringify(payload, null, 2), 'utf-8')
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
})

ipcMain.handle('lib:load', async () => {
  try {
    const p = libraryPath()
    if (!fs.existsSync(p)) return { ok: true, data: null }
    const text = fs.readFileSync(p, 'utf-8')
    return { ok: true, data: JSON.parse(text) }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
})

ipcMain.handle('lib:clear', async () => {
  try {
    const p = libraryPath()
    if (fs.existsSync(p)) fs.unlinkSync(p)
    return { ok: true }
  } catch (err) {
    return { ok: false, error: String(err) }
  }
})

// --- 窗口切换 IPC -----------------------------------------------------------

ipcMain.on('win:mini', () => createMiniWindow())
ipcMain.on('win:main', () => showMain())
ipcMain.on('win:hide', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide()
})
// 自定义标题栏按钮
ipcMain.on('win:minimize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.minimize()
})
ipcMain.on('win:maximize', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMaximized()) mainWindow.unmaximize()
    else mainWindow.maximize()
  }
})
ipcMain.on('win:lyric', () => createLyricWindow())
ipcMain.on('win:lyric-close', () => closeLyricWindow())
ipcMain.on('win:lyric-lock', () => {
  if (lyricWindow && !lyricWindow.isDestroyed()) {
    lyricWindow.setIgnoreMouseEvents(true, { forward: true })
  }
})
ipcMain.on('win:lyric-unlock', () => {
  if (lyricWindow && !lyricWindow.isDestroyed()) {
    lyricWindow.setIgnoreMouseEvents(false)
  }
})

// --- 播放器状态 IPC ---------------------------------------------------------

ipcMain.on('player:command', (_event, cmd) => sendCommand(cmd))

ipcMain.on('player:state', (_event, state) => {
  lastState = state
  updateTray(state)
  if (miniWindow && !miniWindow.isDestroyed()) miniWindow.webContents.send('player:state', state)
})

ipcMain.on('player:request-state', (event) => {
  if (lastState && !event.sender.isDestroyed()) event.sender.send('player:state', lastState)
})

// 歌词单独一条通道，避免每次都重新解析
ipcMain.on('lyric:state', (_event, state) => {
  lastLyricState = state
  if (lyricWindow && !lyricWindow.isDestroyed()) lyricWindow.webContents.send('lyric:state', state)
})

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', showMain)

  app.whenReady().then(() => {
    // 固定 AppUserModelId，保证任务栏分组和图标正确（便携版不会自动设置）
    if (process.platform === 'win32') app.setAppUserModelId('com.sqy.lizhi334')

    // 调音器需要麦克风，其余权限一律拒绝
    session.defaultSession.setPermissionRequestHandler((_wc, permission, callback) => {
      callback(permission === 'media')
    })

    createMainWindow()
    createTray()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow()
      else showMain()
    })
  })

  app.on('before-quit', () => {
    isQuitting = true
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
