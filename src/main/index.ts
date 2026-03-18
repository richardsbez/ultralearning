import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, unlinkSync } from 'fs'

let mainWindow: BrowserWindow | null = null
const CONFIG_PATH = join(app.getPath('userData'), 'config.json')

function getConfig(): { folderPath: string | null } {
  if (existsSync(CONFIG_PATH)) {
    try {
      return JSON.parse(readFileSync(CONFIG_PATH, 'utf-8'))
    } catch {
      return { folderPath: null }
    }
  }
  return { folderPath: null }
}

function saveConfig(config: { folderPath: string | null }): void {
  const dir = join(app.getPath('userData'))
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8')
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 720,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: '#111111',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 14, y: 14 },
    frame: process.platform !== 'darwin',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.setMenuBarVisibility(false)

  // Give renderer 400ms to flush pending debounced saves before closing
  let allowClose = false
  mainWindow.on('close', (e) => {
    if (!allowClose) {
      e.preventDefault()
      allowClose = true
      setTimeout(() => mainWindow?.close(), 400)
    }
  })

  if (!app.isPackaged && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─── IPC Handlers ──────────────────────────────────────────────────────────

ipcMain.handle('get-config', () => getConfig())

ipcMain.handle('open-folder-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
    title: 'Select your study vault folder',
    ...(process.platform === 'linux' ? { buttonLabel: 'Select' } : {})
  })
  if (result.canceled || result.filePaths.length === 0) return null
  const folderPath = result.filePaths[0]
  saveConfig({ folderPath })
  return folderPath
})

ipcMain.handle('set-folder', (_event, folderPath: string) => {
  saveConfig({ folderPath })
  return true
})

ipcMain.handle('list-subjects', (_event, folderPath: string) => {
  if (!existsSync(folderPath)) return []
  const files = readdirSync(folderPath)
  return files
    .filter((f) => f.endsWith('.ul.md'))
    .map((f) => ({ fileName: f, filePath: join(folderPath, f) }))
})

ipcMain.handle('read-file', (_event, filePath: string) => {
  if (!existsSync(filePath)) return null
  return readFileSync(filePath, 'utf-8')
})

ipcMain.handle('write-file', (_event, filePath: string, content: string) => {
  const dir = filePath.substring(0, filePath.lastIndexOf('/'))
  if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(filePath, content, 'utf-8')
  return true
})

// Synchronous version used during beforeunload to guarantee flush
ipcMain.on('write-file-sync', (event, filePath: string, content: string) => {
  try {
    const dir = filePath.substring(0, filePath.lastIndexOf('/'))
    if (dir && !existsSync(dir)) mkdirSync(dir, { recursive: true })
    writeFileSync(filePath, content, 'utf-8')
    event.returnValue = true
  } catch {
    event.returnValue = false
  }
})

ipcMain.handle('create-subject', (_event, folderPath: string, title: string) => {
  const slug = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    || 'subject'
  const fileName = `${slug}.ul.md`
  const filePath = join(folderPath, fileName)
  return { filePath, fileName }
})

ipcMain.handle('reveal-file', (_event, filePath: string) => {
  shell.showItemInFolder(filePath)
})

ipcMain.handle('delete-file', (_event, filePath: string) => {
  if (existsSync(filePath)) {
    unlinkSync(filePath)
    return true
  }
  return false
})

ipcMain.handle('restart-app', () => {
  if (mainWindow) mainWindow.reload()
})
