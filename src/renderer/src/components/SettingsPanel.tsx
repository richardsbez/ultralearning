import { useState } from 'react'
import { useT, LANG_LABELS } from './LangContext'
import { type Lang } from '../i18n'

interface Props {
  folderPath: string | null
  onClose: () => void
  onOpenFolder: () => void
}

const VERSION = '1.0.0'
const LANGS = Object.keys(LANG_LABELS) as Lang[]

export function SettingsPanel({ folderPath, onClose, onOpenFolder }: Props) {
  const { t, lang, setLang, pendingLang, restart } = useT()
  const [saveDelay, setSaveDelay] = useState(() => {
    try { return Number(localStorage.getItem('ul-save-delay') ?? 300) } catch { return 300 }
  })

  const handleSaveDelay = (v: number) => {
    const clamped = Math.max(100, Math.min(2000, v))
    setSaveDelay(clamped)
    try { localStorage.setItem('ul-save-delay', String(clamped)) } catch {}
  }

  const sections = [
    {
      key: 'lang',
      icon: '◈',
      label: t.settingsLang,
    },
    {
      key: 'appearance',
      icon: '◎',
      label: t.settingsAppearance,
    },
    {
      key: 'data',
      icon: '≡',
      label: t.settingsData,
    },
    {
      key: 'about',
      icon: '·',
      label: t.settingsAbout,
    },
  ] as const

  const [activeSection, setActiveSection] = useState<typeof sections[number]['key']>('lang')

  return (
    <div className="settings-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="settings-panel" onClick={e => e.stopPropagation()}>

        {/* ── Sidebar ── */}
        <div className="settings-sidebar">
          <div className="settings-sidebar-title">{t.settingsTitle}</div>
          {sections.map(s => (
            <button
              key={s.key}
              className={`settings-nav-item ${activeSection === s.key ? 'active' : ''}`}
              onClick={() => setActiveSection(s.key)}
            >
              <span className="settings-nav-icon">{s.icon}</span>
              {s.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <button className="settings-close-btn" onClick={onClose}>{t.settingsClose}</button>
        </div>

        {/* ── Content ── */}
        <div className="settings-content">

          {/* ── Language ── */}
          {activeSection === 'lang' && (
            <div className="settings-section">
              <div className="settings-section-header">
                <span className="settings-section-icon">◈</span>
                <h2 className="settings-section-title">{t.settingsLang}</h2>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-label">{t.settingsLang}</span>
                  <span className="settings-row-desc">{t.settingsLangDesc}</span>
                </div>
                <select
                  className="settings-lang-select"
                  value={pendingLang ?? lang}
                  onChange={e => setLang(e.target.value as Lang)}
                >
                  {LANGS.map(l => (
                    <option key={l} value={l}>{LANG_LABELS[l]}</option>
                  ))}
                </select>
              </div>

              {pendingLang && (
                <div className="settings-restart-banner">
                  <span>{t.settingsRestartNeeded} — {LANG_LABELS[pendingLang]}</span>
                  <button className="settings-restart-btn" onClick={restart}>
                    {t.settingsRestart}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Appearance ── */}
          {activeSection === 'appearance' && (
            <div className="settings-section">
              <div className="settings-section-header">
                <span className="settings-section-icon">◎</span>
                <h2 className="settings-section-title">{t.settingsAppearance}</h2>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-label">{t.settingsTheme}</span>
                  <span className="settings-row-desc">{t.settingsDark}</span>
                </div>
                <div className="settings-theme-preview">
                  <div className="settings-theme-dot active" />
                  <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--muted)' }}>Dark</span>
                </div>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-label">{t.settingsDebounce}</span>
                  <span className="settings-row-desc">{t.settingsDebounceDesc}</span>
                </div>
                <div className="settings-debounce-control">
                  <input
                    type="range" min={100} max={2000} step={100}
                    value={saveDelay}
                    onChange={e => handleSaveDelay(Number(e.target.value))}
                    className="settings-slider"
                  />
                  <span className="settings-slider-val">{saveDelay}ms</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Data ── */}
          {activeSection === 'data' && (
            <div className="settings-section">
              <div className="settings-section-header">
                <span className="settings-section-icon">≡</span>
                <h2 className="settings-section-title">{t.settingsData}</h2>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-label">{t.settingsOpenFolder}</span>
                  <span className="settings-row-desc settings-folder-path">
                    {folderPath ?? '—'}
                  </span>
                </div>
                <button className="settings-action-btn" onClick={() => { onOpenFolder(); onClose() }}>
                  {t.openFolder} →
                </button>
              </div>

              <div className="settings-row">
                <div className="settings-row-info">
                  <span className="settings-row-label">{t.settingsExport}</span>
                  <span className="settings-row-desc">{t.settingsExportDesc}</span>
                </div>
                <button className="settings-action-btn" onClick={async () => {
                  if (!folderPath) return
                  const dest = await window.api.openFolderDialog()
                  if (!dest) return
                  const files = await window.api.listSubjects(folderPath)
                  for (const f of files) {
                    const content = await window.api.readFile(f.filePath)
                    if (content) await window.api.writeFile(dest + '/' + f.fileName, content)
                  }
                }}>
                  {t.settingsExport} →
                </button>
              </div>
            </div>
          )}

          {/* ── About ── */}
          {activeSection === 'about' && (
            <div className="settings-section">
              <div className="settings-section-header">
                <span className="settings-section-icon">·</span>
                <h2 className="settings-section-title">{t.settingsAbout}</h2>
              </div>

              <div className="settings-about-card">
                <div className="settings-about-logo">UL</div>
                <div className="settings-about-name">UltraLearn</div>
                <div className="settings-about-version">{t.settingsVersion} {VERSION}</div>
                <div className="settings-about-tagline">{t.settingsMadeBy}</div>

                <div className="settings-about-principles">
                  {['01','02','03','04','05','06','07','08','09'].map(n => (
                    <span key={n} className="settings-about-num">{n}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
