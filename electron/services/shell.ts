import { spawn } from 'child_process'
import path from 'path'
import os from 'os'

export interface ShellResult {
  exitCode: number
  output: string
  error: string
}

const EXTRA_PATHS = [
  path.join(os.homedir(), 'AppData', 'Roaming', 'npm'),
  'C:\\Program Files\\nodejs',
  'C:\\Program Files (x86)\\nodejs',
  path.join(os.homedir(), '.npm-global'),
  path.join(os.homedir(), '.npm-global', 'bin'),
]

export function runCommand(command: string): Promise<ShellResult> {
  return new Promise((resolve) => {
    const env = { ...process.env }
    const currentPath = env.PATH || env.Path || ''
    const missing = EXTRA_PATHS.filter(p => !currentPath.includes(p))
    if (missing.length > 0) {
      env.PATH = missing.join(';') + ';' + currentPath
    }

    const proc = spawn('powershell.exe', ['-NoProfile', '-Command', command], {
      windowsHide: true,
      env,
    })

    let stdout = ''
    let stderr = ''

    proc.stdout.on('data', (data) => { stdout += data.toString() })
    proc.stderr.on('data', (data) => { stderr += data.toString() })

    proc.on('close', (code) => {
      resolve({
        exitCode: code ?? 1,
        output: stdout.trim(),
        error: stderr.trim(),
      })
    })

    proc.on('error', (err) => {
      resolve({ exitCode: 1, output: '', error: err.message })
    })
  })
}
