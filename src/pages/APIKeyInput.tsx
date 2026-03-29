import { useRef, useEffect } from 'react'
import { PageLayout } from '../components/PageLayout'
import { useAppState, useDispatch } from '../store'

export function APIKeyInput() {
  const state = useAppState()
  const dispatch = useDispatch()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const isValid = state.apiKey.startsWith('sk_') && state.apiKey.length >= 20

  return (
    <PageLayout
      title={
        <div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>PP API Key</div>
          <div style={{ fontSize: 12, color: 'var(--color-secondary)', marginTop: 4 }}>
            输入你的 API Key 以连接 Claude Code
          </div>
        </div>
      }
      content={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <input
            ref={inputRef}
            type="password"
            placeholder="sk_..."
            value={state.apiKey}
            onChange={(e) => dispatch({ type: 'UPDATE', payload: { apiKey: e.target.value } })}
            style={{
              width: '100%', padding: '8px 12px', fontSize: 14,
              fontFamily: 'var(--font-mono)', borderRadius: 6,
              border: '0.5px solid var(--color-border)',
              background: 'var(--color-surface)',
            }}
          />
          {state.apiKey && !isValid && (
            <div style={{ fontSize: 11, color: 'rgba(239,68,68,0.8)' }}>
              API Key 需以 "sk_" 开头，且长度不少于 20 位
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--color-tertiary)' }}>
            可在 PP 控制台获取 API Key
          </div>
        </div>
      }
      actions={
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <button className="btn-secondary" onClick={() => dispatch({ type: 'GO_BACK' })}>上一步</button>
          <button className="btn-primary" disabled={!isValid} onClick={() => dispatch({ type: 'GO_NEXT' })}>
            继续
          </button>
        </div>
      }
    />
  )
}
