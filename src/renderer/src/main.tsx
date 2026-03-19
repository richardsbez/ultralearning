import React, { useEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { LangProvider, useLang } from './components/LangContext'

// ── Loading screen ────────────────────────────────────────────────────────────
const BOOT_LINES = [
  'metalearning.init',
  'focus.calibrate',
  'direct_practice.link',
  'drilling.isolate',
  'retrieval.index',
  'feedback.connect',
  'retention.encode',
  'intuition.derive',
  'experimentation.expand',
]

function LoadingScreen() {
  const [lines,    setLines]    = useState<number>(0)
  const [bar,      setBar]      = useState(0)
  const [blink,    setBlink]    = useState(true)

  useEffect(() => {
    // Stagger lines appearing
    const timers: ReturnType<typeof setTimeout>[] = []
    BOOT_LINES.forEach((_, i) => {
      timers.push(setTimeout(() => setLines(i + 1), 80 + i * 95))
    })
    // Progress bar
    timers.push(setTimeout(() => setBar(100), 80 + BOOT_LINES.length * 95 + 80))
    // Cursor blink
    const blinker = setInterval(() => setBlink(b => !b), 530)
    return () => { timers.forEach(clearTimeout); clearInterval(blinker) }
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: '#0a0a0a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'JetBrains Mono','Fira Code','SF Mono',monospace",
      overflow: 'hidden',
    }}>
      {/* Subtle scanlines */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.18) 2px,rgba(0,0,0,0.18) 4px)',
        zIndex: 0,
      }}/>

      {/* Subtle radial glow */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(163,230,53,0.04) 0%, transparent 70%)',
        zIndex: 0,
      }}/>

      <div style={{ position: 'relative', zIndex: 1, width: 340 }}>
        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'baseline', gap: 10,
          marginBottom: 32,
        }}>
          <span style={{
            fontSize: 11, letterSpacing: '0.28em', color: '#a3e635',
            textTransform: 'uppercase', fontWeight: 700,
            animation: 'ul-fadein 400ms ease forwards',
          }}>UltraLearn</span>
          <span style={{
            fontSize: 9, letterSpacing: '0.12em', color: '#333',
            textTransform: 'uppercase',
            animation: 'ul-fadein 600ms ease forwards',
          }}>v1.0.0</span>
        </div>

        {/* Boot lines */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 22 }}>
          {BOOT_LINES.map((line, i) => {
            const visible = i < lines
            return (
              <div key={line} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateX(0)' : 'translateX(-6px)',
                transition: 'opacity 200ms ease, transform 200ms ease',
              }}>
                <span style={{
                  fontSize: 9, color: '#a3e635', letterSpacing: '0.04em',
                  minWidth: 12,
                }}>{'>'}</span>
                <span style={{
                  fontSize: 9, color: '#2a2a2a', letterSpacing: '0.06em',
                }}>{'['}</span>
                <span style={{
                  fontSize: 9, color: '#a3e635', letterSpacing: '0.06em',
                  fontWeight: 600,
                }}>{String(i + 1).padStart(2, '0')}</span>
                <span style={{
                  fontSize: 9, color: '#2a2a2a', letterSpacing: '0.06em',
                }}>{'   '}</span>
                <span style={{
                  fontSize: 9, color: '#3a3a3a', letterSpacing: '0.08em',
                }}>{line}</span>
                <span style={{
                  fontSize: 9, color: '#a3e635', marginLeft: 'auto',
                  opacity: visible ? 1 : 0,
                  transition: 'opacity 300ms 150ms',
                }}>OK</span>
              </div>
            )
          })}
        </div>

        {/* Progress bar */}
        <div style={{
          height: 1, background: '#1a1a1a',
          borderRadius: 1, overflow: 'hidden',
          marginBottom: 10,
        }}>
          <div style={{
            height: '100%',
            width: `${bar}%`,
            background: 'linear-gradient(90deg, #4a7c17, #a3e635)',
            transition: 'width 600ms cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: '0 0 8px rgba(163,230,53,0.6)',
          }}/>
        </div>

        {/* Status line */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          opacity: 0.5,
        }}>
          <span style={{ fontSize: 8, color: '#444', letterSpacing: '0.1em' }}>
            {lines < BOOT_LINES.length ? 'LOADING' : 'READY'}
          </span>
          <span style={{
            fontSize: 9, color: '#a3e635',
            opacity: blink ? 1 : 0,
            transition: 'opacity 80ms',
          }}>▌</span>
        </div>
      </div>

      <style>{`
        @keyframes ul-fadein {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  )
}

// ── Shell — waits for translations ───────────────────────────────────────────
function AppShell() {
  const { t } = useLang()
  const [minDone, setMinDone] = useState(false)

  // Minimum display time so the animation plays through fully
  useEffect(() => {
    const timer = setTimeout(() => setMinDone(true), 80 + 9 * 95 + 300)
    return () => clearTimeout(timer)
  }, [])

  if (!t || !minDone) return <LoadingScreen />
  return <App />
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <LangProvider>
      <AppShell />
    </LangProvider>
  </React.StrictMode>
)
