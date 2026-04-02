import { useEffect, useState, useRef } from 'react'
import { CheckCircle, XCircle, Loader, Download, RefreshCw } from 'lucide-react'
import { PageLayout } from '../components/PageLayout'
import { useAppState, useDispatch } from '../store'
import { DependencyStatus } from '../types'

export function DependencyCheck() {
  const state = useAppState()
  const dispatch = useDispatch()

  const [progressMap, setProgressMap] = useState<Record<string, string>>({})
  const [elapsedMap, setElapsedMap] = useState<Record<string, number>>({})
  const timersRef = useRef<Record<string, ReturnType<typeof setInterval>>>({})

  const allReady = state.dependencies.every((d) => d.status === 'installed')
  const isChecking = state.dependencies.some((d) => d.status === 'checking')

  useEffect(() => {
    checkAll()
  }, [])

  // Listen for install progress events
  useEffect(() => {
    const cleanup = window.electronAPI.onInstallProgress(({ id, line }) => {
      setProgressMap((prev) => ({ ...prev, [id]: line }))
    })
    return cleanup
  }, [])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(timersRef.current).forEach(clearInterval)
    }
  }, [])

  function startTimer(id: string) {
    setElapsedMap((prev) => ({ ...prev, [id]: 0 }))
    timersRef.current[id] = setInterval(() => {
      setElapsedMap((prev) => ({ ...prev, [id]: (prev[id] || 0) + 1 }))
    }, 1000)
  }

  function stopTimer(id: string) {
    if (timersRef.current[id]) {
      clearInterval(timersRef.current[id])
      delete timersRef.current[id]
    }
  }

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
    setProgressMap((prev) => ({ ...prev, [id]: '' }))
    startTimer(id)
    try {
      const result = await window.electronAPI.installDependency(id, state.useMirror)
      stopTimer(id)
      if (result.success) {
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
        // After any successful install, re-check all dependencies
        await checkAll()
      } else {
        dispatch({
          type: 'UPDATE_DEPENDENCY',
          id,
          payload: { status: 'failed', error: result.error },
        })
      }
    } catch (err: any) {
      stopTimer(id)
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

  function formatElapsed(s: number): string {
    if (s < 60) return `${s}s`
    return `${Math.floor(s / 60)}m${s % 60}s`
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
                  {dep.status === 'checking' && (
                    <span style={{ fontSize: 11, color: 'var(--color-secondary)' }}>检测中...</span>
                  )}
                  {dep.status === 'installing' && (
                    <span style={{ fontSize: 11, color: 'var(--color-secondary)' }}>
                      安装中... {formatElapsed(elapsedMap[dep.id] || 0)}
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
              {dep.status === 'installing' && progressMap[dep.id] && (
                <div style={{
                  fontSize: 10, color: 'var(--color-tertiary)', padding: '0 0 6px 24px',
                  fontFamily: 'var(--font-mono)', overflow: 'hidden',
                  textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400,
                }}>
                  {progressMap[dep.id].slice(0, 80)}
                </div>
              )}
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
