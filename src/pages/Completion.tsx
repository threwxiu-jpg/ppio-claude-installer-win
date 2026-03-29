import { PartyPopper } from 'lucide-react'
import { PageLayout } from '../components/PageLayout'

const steps = [
  { num: '1', text: '打开 PowerShell' },
  { num: '2', text: '输入', code: 'claude', suffix: '并回车' },
  { num: '3', text: '开始用 AI 写代码吧！' },
]

export function Completion() {
  return (
    <PageLayout
      title={
        <div>
          <div style={{ fontSize: 16, fontWeight: 500 }}>配置完成</div>
          <div style={{ fontSize: 12, color: 'var(--color-secondary)', marginTop: 4 }}>
            Claude Code 已准备就绪
          </div>
        </div>
      }
      content={
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
          <PartyPopper size={36} color="var(--color-secondary)" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {steps.map((s) => (
              <div key={s.num} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--color-secondary)', width: 18, textAlign: 'right' }}>
                  {s.num}.
                </span>
                <span style={{ fontSize: 13 }}>{s.text}</span>
                {s.code && (
                  <span style={{
                    fontSize: 13, fontFamily: 'var(--font-mono)',
                    padding: '2px 6px', borderRadius: 4,
                    background: 'rgba(0,0,0,0.04)',
                  }}>
                    {s.code}
                  </span>
                )}
                {s.suffix && <span style={{ fontSize: 13 }}>{s.suffix}</span>}
              </div>
            ))}
          </div>
        </div>
      }
      actions={
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <button className="btn-secondary" onClick={() => window.electronAPI.quitApp()}>退出</button>
          <button className="btn-primary" onClick={() => window.electronAPI.openPowerShell()}>
            打开 PowerShell
          </button>
        </div>
      }
    />
  )
}
