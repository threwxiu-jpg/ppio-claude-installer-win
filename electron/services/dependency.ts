import { runCommand } from './shell'

export async function checkDependency(id: string): Promise<{ installed: boolean; version?: string }> {
  switch (id) {
    case 'nodejs': {
      const result = await runCommand('node --version')
      if (result.exitCode === 0) {
        const ver = result.output.replace('v', '').trim()
        const major = parseInt(ver.split('.')[0], 10)
        if (major >= 18) return { installed: true, version: ver }
      }
      return { installed: false }
    }
    case 'npm': {
      const result = await runCommand('npm --version')
      if (result.exitCode === 0) return { installed: true, version: result.output.trim() }
      return { installed: false }
    }
    case 'claude-cli': {
      const result = await runCommand('claude --version')
      if (result.exitCode === 0) return { installed: true, version: result.output.trim() }
      return { installed: false }
    }
    default:
      return { installed: false }
  }
}

export async function installDependency(id: string, useMirror: boolean): Promise<{ success: boolean; error?: string }> {
  switch (id) {
    case 'nodejs': {
      const result = await runCommand('winget install OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements')
      if (result.exitCode === 0) return { success: true }
      return { success: false, error: result.error || 'Node.js 安装失败，请手动从 https://nodejs.org 下载安装' }
    }
    case 'npm': {
      return { success: false, error: 'npm 随 Node.js 一起安装，请先安装 Node.js' }
    }
    case 'claude-cli': {
      const mirror = useMirror ? 'npm config set registry https://registry.npmmirror.com && ' : ''
      const result = await runCommand(`${mirror}npm install -g @anthropic-ai/claude-code`)
      if (result.exitCode === 0) return { success: true }
      return { success: false, error: result.error || 'Claude CLI 安装失败' }
    }
    default:
      return { success: false, error: '未知依赖' }
  }
}

export async function checkNetworkSpeed(): Promise<boolean> {
  try {
    const result = await runCommand(
      `$sw = [System.Diagnostics.Stopwatch]::StartNew(); ` +
      `try { (Invoke-WebRequest -Uri 'https://registry.npmjs.org' -Method HEAD -TimeoutSec 5 -UseBasicParsing).StatusCode } ` +
      `catch { 0 }; ` +
      `$sw.Stop(); $sw.ElapsedMilliseconds`
    )
    const ms = parseInt(result.output.split('\n').pop()?.trim() || '9999', 10)
    return ms > 3000 // true = slow
  } catch {
    return true
  }
}
