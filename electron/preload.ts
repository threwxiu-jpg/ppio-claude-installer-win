import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  runCommand: (command: string) => ipcRenderer.invoke('run-command', command),
  checkDependency: (id: string) => ipcRenderer.invoke('check-dependency', id),
  installDependency: (id: string, useMirror: boolean) => ipcRenderer.invoke('install-dependency', id, useMirror),
  checkNetworkSpeed: () => ipcRenderer.invoke('check-network-speed'),
  validateAPI: (apiKey: string, modelID: string) => ipcRenderer.invoke('validate-api', apiKey, modelID),
  writeConfig: (apiKey: string, modelID: string) => ipcRenderer.invoke('write-config', apiKey, modelID),
  detectConflicts: () => ipcRenderer.invoke('detect-conflicts'),
  openPowerShell: () => ipcRenderer.invoke('open-powershell'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
})
