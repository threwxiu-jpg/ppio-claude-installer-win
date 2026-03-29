import { spawn } from 'child_process'

export interface ShellResult {
  exitCode: number
  output: string
  error: string
}

export function runCommand(command: string): Promise<ShellResult> {
  return new Promise((resolve) => {
    const proc = spawn('powershell.exe', ['-NoProfile', '-Command', command], {
      windowsHide: true,
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
