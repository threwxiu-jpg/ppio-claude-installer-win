import fs from 'fs'
import path from 'path'
import os from 'os'
import { validateAPI } from './validator'
import { runCommand } from './shell'

export interface DiagnosticResult {
  name: string
  level: 'critical' | 'optional'
  status: 'pass' | 'fail' | 'warn'
  message: string
}

export async function runDiagnostics(apiKey: string, modelID: string): Promise<DiagnosticResult[]> {
  const results: DiagnosticResult[] = []
  const claudeDir = path.join(os.homedir(), '.claude')
  const envFile = path.join(claudeDir, '.env')
  const settingsFile = path.join(claudeDir, 'settings.json')

  // 1. Claude CLI installed — CRITICAL
  const cliResult = await runCommand('where claude 2>$null')
  if (cliResult.exitCode === 0 && cliResult.output.trim()) {
    results.push({ name: 'Claude CLI', level: 'critical', status: 'pass', message: 'Found in PATH' })
  } else {
    results.push({ name: 'Claude CLI', level: 'critical', status: 'fail', message: 'Not found in PATH' })
  }

  // 2. .env file exists — CRITICAL
  if (fs.existsSync(envFile)) {
    const content = fs.readFileSync(envFile, 'utf-8')

    // Check ANTHROPIC_AUTH_TOKEN
    const tokenMatch = content.match(/ANTHROPIC_AUTH_TOKEN=(.+)/)
    if (tokenMatch && tokenMatch[1].startsWith('sk_')) {
      const masked = tokenMatch[1].slice(0, 6) + '...' + tokenMatch[1].slice(-4)
      results.push({ name: 'ANTHROPIC_AUTH_TOKEN', level: 'critical', status: 'pass', message: masked })
    } else {
      results.push({ name: 'ANTHROPIC_AUTH_TOKEN', level: 'critical', status: 'fail', message: 'Missing or invalid' })
    }

    // Check wrong var name
    if (content.includes('ANTHROPIC_API_KEY=')) {
      results.push({ name: 'Wrong var name', level: 'critical', status: 'fail', message: 'Found ANTHROPIC_API_KEY (should be AUTH_TOKEN)' })
    }

    // Check BASE_URL
    const urlMatch = content.match(/ANTHROPIC_BASE_URL=(.+)/)
    if (urlMatch && urlMatch[1].includes('api.ppio.com/anthropic') && !urlMatch[1].endsWith('/v1')) {
      results.push({ name: 'ANTHROPIC_BASE_URL', level: 'critical', status: 'pass', message: urlMatch[1] })
    } else {
      results.push({ name: 'ANTHROPIC_BASE_URL', level: 'critical', status: 'fail', message: urlMatch?.[1] || 'Not set' })
    }

    // Check SKIP_AUTH_LOGIN
    if (content.includes('CLAUDE_CODE_SKIP_AUTH_LOGIN=1')) {
      results.push({ name: 'SKIP_AUTH_LOGIN', level: 'critical', status: 'pass', message: '=1' })
    } else {
      results.push({ name: 'SKIP_AUTH_LOGIN', level: 'critical', status: 'fail', message: 'Not set' })
    }

    // OPTIONAL: ANTHROPIC_MODEL
    const modelMatch = content.match(/ANTHROPIC_MODEL=(.+)/)
    if (modelMatch && modelMatch[1].includes('/')) {
      results.push({ name: 'ANTHROPIC_MODEL', level: 'optional', status: 'pass', message: modelMatch[1] })
    } else {
      results.push({ name: 'ANTHROPIC_MODEL', level: 'optional', status: 'warn', message: modelMatch?.[1] || 'Not set' })
    }
  } else {
    results.push({ name: '.env file', level: 'critical', status: 'fail', message: '~/.claude/.env not found' })
  }

  // 3. settings.json — CRITICAL (model field)
  if (fs.existsSync(settingsFile)) {
    try {
      const settings = JSON.parse(fs.readFileSync(settingsFile, 'utf-8'))
      if (settings.model && String(settings.model).includes('/')) {
        results.push({ name: 'settings.json model', level: 'critical', status: 'pass', message: settings.model })
      } else {
        results.push({ name: 'settings.json model', level: 'critical', status: 'fail', message: 'Missing or invalid model ID' })
      }
      if (settings.smallModel && String(settings.smallModel).includes('/')) {
        results.push({ name: 'settings.json smallModel', level: 'optional', status: 'pass', message: settings.smallModel })
      } else {
        results.push({ name: 'settings.json smallModel', level: 'optional', status: 'warn', message: 'Not set' })
      }
    } catch {
      results.push({ name: 'settings.json', level: 'critical', status: 'fail', message: 'Invalid JSON' })
    }
  } else {
    results.push({ name: 'settings.json', level: 'critical', status: 'fail', message: 'File not found' })
  }

  // 4. API validation — CRITICAL
  if (apiKey) {
    const { success, error } = await validateAPI(apiKey, modelID)
    if (success) {
      results.push({ name: 'API validation', level: 'critical', status: 'pass', message: 'Request succeeded' })
    } else {
      results.push({ name: 'API validation', level: 'critical', status: 'fail', message: error || 'Unknown error' })
    }
  } else {
    results.push({ name: 'API validation', level: 'critical', status: 'fail', message: 'No API key' })
  }

  return results
}
