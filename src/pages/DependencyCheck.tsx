import { useEffect } from 'react'
import { CheckCircle, XCircle, Loader, Download, RefreshCw } from 'lucide-react'
import { PageLayout } from '../components/PageLayout'
import { useAppState, useDispatch } from '../store'
import { DependencyStatus } from '../types'

export function DependencyCheck() {
  const state = useAppState()
  const dispatch = useDispatch()

  const allReady = state.dependencies.every((d) => d.status === 'installed')
  const isChecking = state.dependencies.some((d) => d.status === 'checking')

  useEffect(() => {
    checkAll()
  }, [])

  async function checkAll() {
    for (const dep of state.dependencies) {
      dispatch({ type: 'UPDATE_DEPENDENCY', id: dep.id, payload: { status: 'checking', error: undefined } })
      try {
        const result = await window.electronAPI.checkDependency(dep.id)
        dispatch({
          type: 'UPDATE_DEPENDENCY',
          id: dep.id,
          payload: { status: result.installed ? 'installed' : 'missing', version: result.version },
        })
      } catch {
        dispatch({ type: 'UPDATE_DEPENDENCY', id: dep.id, payload: { status: 'missing' } })
      }
    }
  }

  async function installDep(id: string) {
    dispatch({ type: 'UPDATE_DEPENDENCY', id, payload: { status: 'installing', error: undefined } })
    try {
      const result = await window.electronAPI.installDependency(id, state.useMirror)
      if (result.success) {
        // Re-check after install
        const check = await window.electronAPI.checkDependency(id)
        dispatch({
          type: 'UPDATE_DEPENDENCY',
          id,
          payload: {
            status: check.installed ? 'installed' : 'failed',
            version: check.version,
            error: check.installed ? undefined : '安装完成但检测未通过，请重启安装器后重试',
          },
        })
        // If npm was just installed, re-check claude-cli too
        if (id === 'npm' && check.installed) {
          await checkAll()
        }
      } else {
        dispatch({
          type: 'UPDATE_DEPENDENCY',
          id,
          payload: { status: 'failed', error: result.error },
        })
      }
    } catch (err: any) {
      dispatch({
        type: 'UPDATE_DEPENDENCY',
        id,
        payload: { status: 'failed', error: err.message || '安装失败' },
      })
    }
  }

  function statusIcon(s: DependencyStatus) {
    switch (s) {
      case 'installed': return <CheckCircle size={14} color="var(--color-success)" />
      case 'missing': case 'failed': return <XCircle size={14} color="var(--color-error)" />
      case 'checking': case 'installing': return <Loader size={14} color="var(--color-secondary)" style={{ animation: 'spin 1s linear infinite' }} />
      default: return <div style={{ width: 14, height: 14 }} />
    }
  }

  function statusLabel(s: DependencyStatus) {
    switch (s) {
      case 'checking': return '检测中...'
      case 'installing': return '安装中...'
      default: return null
    }
  }

  return (
    <PageLayout
      title={
        <div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>环境检测</div>
          <div style={{ fontSize: 12, color: 'var(--color-secondary)', marginTop: 4 }}>
            检查必要依赖是否已安装
          </div>
        </div>
      }
      content={
        <div>
          {state.dependencies.map((dep, i) => (
            <div key={dep.id}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {statusIcon(dep.status)}
                  <span style={{ fontSize: 13 }}>{dep.name}</span>
                  {dep.version && (
                    <span style={{ fontSize: 11, color: 'var(--color-tertiary)', fontFamily: 'var(--font-mono)' }}>
                      {dep.version}
                    </span>
                  )}
                  {statusLabel(dep.status) && (
                    <span style={{ fontSize: 11, color: 'var(--color-secondary)' }}>
                      {statusLabel(dep.status)}
                    </span>
                  )}
                </div>
                {(dep.status === 'missing' || dep.status === 'failed') && (
                  <button className="btn-bordered" style={{ fontSize: 11, padding: '3px 10px' }} onClick={() => installDep(dep.id)}>
                    <Download size={10} style={{ marginRight: 4 }} />
                    {dep.status === 'failed' ? '重试' : '安装'}
                  </button>
                )}
              </div>
              {dep.error && (dep.status === 'failed') && (
                <div style={{
                  fontSize: 11, color: 'var(--color-error)', padding: '0 0 8px 24px',
                  lineHeight: 1.4,
                }}>
                  {dep.error}
                </div>
              )}
              {i < state.dependencies.length - 1 && (
                <div style={{ height: 0.5, background: 'var(--color-border)' }} />
              )}
            </div>
          ))}
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      }
      actions={
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button className="btn-secondary" onClick={() => dispatch({ type: 'GO_BACK' })}>上一步</button>
          {!allReady && !isChecking && (
            <button className="btn-bordered" style={{ fontSize: 12 }} onClick={checkAll}>
              <RefreshCw size={11} style={{ marginRight: 4 }} />刷新检测
            </button>
          )}
          {allReady && (
            <button className="btn-primary" onClick={() => dispatch({ type: 'GO_NEXT' })}>
              继续
            </button>
          )}
        </div>
      }
    />
  )
}
