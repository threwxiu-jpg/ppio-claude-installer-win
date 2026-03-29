import fs from 'fs'
import path from 'path'
import os from 'os'
import { runCommand } from './shell'

const CLAUDE_DIR = path.join(os.homedir(), '.claude')
const ENV_FILE = path.join(CLAUDE_DIR, '.env')
const SETTINGS_FILE = path.join(CLAUDE_DIR, 'settings.json')

export interface ConflictingExport {
  variable: string
  source: string
}

export async function writeConfig(apiKey: string, modelID: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!fs.existsSync(CLAUDE_DIR)) {
      fs.mkdirSync(CLAUDE_DIR, { recursive: true })
    }

    // Backup existing .env
    if (fs.existsSync(ENV_FILE)) {
      fs.copyFileSync(ENV_FILE, ENV_FILE + '.backup')
    }

    const envContent = [
      `ANTHROPIC_BASE_URL=https://api.ppio.com/anthropic`,
      `ANTHROPIC_API_KEY=${apiKey}`,
      `ANTHROPIC_MODEL=${modelID}`,
      `ANTHROPIC_SMALL_FAST_MODEL=${modelID}`,
      `CLAUDE_CODE_SKIP_AUTH_LOGIN=1`,
    ].join('\n') + '\n'

    fs.writeFileSync(ENV_FILE, envContent, 'utf-8')

    // Only write settings.json if it doesn't exist
    if (!fs.existsSync(SETTINGS_FILE)) {
      fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ skipDangerousModePermissionPrompt: true }, null, 2) + '\n', 'utf-8')
    }

    return { success: true }
  } catch (err: any) {
    return { success: false, error: err.message }
  }
}

export async function detectConflicts(): Promise<ConflictingExport[]> {
  const conflicts: ConflictingExport[] = []
  const vars = [
    'ANTHROPIC_BASE_URL',
    'ANTHROPIC_API_KEY',
    'ANTHROPIC_AUTH_TOKEN',
    'ANTHROPIC_MODEL',
    'ANTHROPIC_SMALL_FAST_MODEL',
    'CLAUDE_CODE_SKIP_AUTH_LOGIN',
  ]

  // Check Windows user environment variables
  const result = await runCommand('reg query "HKCU\\Environment" 2>$null')
  if (result.exitCode === 0) {
    for (const v of vars) {
      if (result.output.includes(v)) {
        conflicts.push({ variable: v, source: 'Windows 用户环境变量' })
      }
    }
  }

  // Check system environment variables
  const sysResult = await runCommand('reg query "HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment" 2>$null')
  if (sysResult.exitCode === 0) {
    for (const v of vars) {
      if (sysResult.output.includes(v)) {
        conflicts.push({ variable: v, source: 'Windows 系统环境变量' })
      }
    }
  }

  return conflicts
}
