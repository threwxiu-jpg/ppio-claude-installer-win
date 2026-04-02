import { app, BrowserWindow, ipcMain } from 'electron'
import path from 'node:path'
import { runCommand } from './services/shell'
import { checkDependency, installDependency, checkNetworkSpeed } from './services/dependency'
import { writeConfig, detectConflicts } from './services/config-writer'
import { validateAPI } from './services/validator'
import { runDiagnostics } from './services/doctor'

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    width: 600,
    height: 480,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()

  // IPC handlers
  ipcMain.handle('run-command', async (_e, command: string) => {
    return runCommand(command)
  })

  ipcMain.handle('check-dependency', async (_e, id: string) => {
    return checkDependency(id)
  })

  ipcMain.handle('install-dependency', async (_e, id: string, useMirror: boolean) => {
    return installDependency(id, useMirror, (line: string) => {
      win?.webContents.send('install-progress', { id, line })
    })
  })

  ipcMain.handle('check-network-speed', async () => {
    return checkNetworkSpeed()
  })

  ipcMain.handle('validate-api', async (_e, apiKey: string, modelID: string) => {
    return validateAPI(apiKey, modelID)
  })

  ipcMain.handle('write-config', async (_e, apiKey: string, modelID: string) => {
    return writeConfig(apiKey, modelID)
  })

  ipcMain.handle('detect-conflicts', async () => {
    return detectConflicts()
  })

  ipcMain.handle('run-diagnostics', async (_e, apiKey: string, modelID: string) => {
    return runDiagnostics(apiKey, modelID)
  })

  ipcMain.handle('open-powershell', async () => {
    const { exec } = require('child_process')
    exec('start powershell.exe -ExecutionPolicy Bypass -NoExit -Command "Write-Host \'Claude Code 环境已加载，输入 claude 开始使用\' -ForegroundColor Green"')
    return true
  })

  ipcMain.handle('quit-app', () => {
    app.quit()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})
