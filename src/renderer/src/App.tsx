import { useState, useEffect, useCallback, useRef } from 'react'
import './App.css'
import type { SubjectFile, SubjectData } from './types'
import { parseSubjectFile, serializeSubjectFile, getOverallScore, getStatus } from './utils/markdown'
import { createDefaultSubject } from './utils/defaults'
import { SubjectDetail } from './components/SubjectDetail'
import { CreateSubjectModal } from './components/CreateSubjectModal'
import { Dashboard } from './components/Dashboard'
import { useT, LANG_LABELS } from './components/LangContext'
import { SettingsPanel } from './components/SettingsPanel'

type SaveState = 'idle' | 'saving' | 'saved'

// ── Off-thread serialization via Web Worker ───────────────────────────────────
const serializeWorker = new Worker(
  new URL('./workers/serialize.worker.ts', import.meta.url),
  { type: 'module' }
)
const pendingSerialize = new Map<string, (yaml: string) => void>()
serializeWorker.onmessage = (e: MessageEvent<{ id: string; result?: string; error?: string }>) => {
  const cb = pendingSerialize.get(e.data.id)
  if (cb) { pendingSerialize.delete(e.data.id); cb(e.data.result ?? '') }
}

function serializeAsync(data: SubjectData): Promise<string> {
  return new Promise(resolve => {
    const id = Math.random().toString(36).slice(2)
    pendingSerialize.set(id, resolve)
    serializeWorker.postMessage({ id, data })
  })
}

export default function App() {
  const { t, lang, setLang, pendingLang, restart } = useT()
  const [folderPath,       setFolderPath]      = useState<string | null>(null)
  const [subjects,         setSubjects]         = useState<SubjectFile[]>([])
  const [selectedPath,     setSelectedPath]     = useState<string | null>(null)
  const [showCreateModal,  setShowCreateModal]  = useState(false)
  const [loading,          setLoading]          = useState(true)
  const [saveState,        setSaveState]        = useState<SaveState>('idle')
  const [confirmDelete,    setConfirmDelete]    = useState<string | null>(null)
  const [showSettings,     setShowSettings]     = useState(false)
  const [showLangMenu,     setShowLangMenu]     = useState(false)
  const saveTimeout  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const savedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Track pending unsaved data to flush before unload
  const pendingSaveR = useRef<{ filePath: string; data: SubjectData } | null>(null)

  // Flush any pending save immediately (synchronous — safe for beforeunload)
  const flushSave = useCallback(() => {
    if (saveTimeout.current) { clearTimeout(saveTimeout.current); saveTimeout.current = null }
    if (pendingSaveR.current) {
      const { filePath, data } = pendingSaveR.current
      pendingSaveR.current = null
      // Use synchronous IPC so the write completes before the window closes
      window.api.writeFileSync(filePath, serializeSubjectFile(data))
    }
  }, [])

  // Flush on window close / reload
  useEffect(() => {
    window.addEventListener('beforeunload', flushSave)
    return () => window.removeEventListener('beforeunload', flushSave)
  }, [flushSave])

  useEffect(() => {
    window.api.getConfig().then(({ folderPath }) => {
      if (folderPath) setFolderPath(folderPath)
      setLoading(false)
    })
  }, [])

  const loadSubjects = useCallback(async (fp: string) => {
    const list = await window.api.listSubjects(fp)
    const loaded: SubjectFile[] = []
    for (const { fileName, filePath } of list) {
      const raw = await window.api.readFile(filePath)
      if (raw) loaded.push({ filePath, fileName, data: parseSubjectFile(raw) })
    }
    loaded.sort((a, b) => a.data.title.localeCompare(b.data.title))
    setSubjects(loaded)
  }, [])

  useEffect(() => { if (folderPath) loadSubjects(folderPath) }, [folderPath, loadSubjects])

  const handleOpenFolder = async () => {
    const fp = await window.api.openFolderDialog()
    if (fp) { setFolderPath(fp); setSelectedPath(null) }
  }

  const handleSubjectChange = useCallback((filePath: string, data: SubjectData) => {
    setSubjects(prev => prev.map(s => s.filePath === filePath ? { ...s, data } : s))
    setSaveState('saving')
    pendingSaveR.current = { filePath, data }
    if (saveTimeout.current)  clearTimeout(saveTimeout.current)
    if (savedTimeout.current) clearTimeout(savedTimeout.current)

    // Wait 800ms of inactivity, then serialize off-thread via Worker
    saveTimeout.current = setTimeout(async () => {
      const snapshot = pendingSaveR.current
      if (!snapshot) return
      pendingSaveR.current = null

      try {
        // serializeAsync runs yaml.dump in a Web Worker — never blocks the UI thread
        const content = await serializeAsync(snapshot.data)
        await window.api.writeFile(snapshot.filePath, content)
        setSaveState('saved')
        savedTimeout.current = setTimeout(() => setSaveState('idle'), 1800)
      } catch {
        setSaveState('idle')
      }
    }, 800)
  }, [])

  const handleCreateSubject = async (
    title: string, motivation: 'instrumental' | 'intrinsic', why: string
  ) => {
    if (!folderPath) return
    const { filePath, fileName } = await window.api.createSubject(folderPath, title)
    const data = createDefaultSubject(title, t)
    data.motivation = motivation; data.why = why
    await window.api.writeFile(filePath, await serializeAsync(data))
    const newSubject: SubjectFile = { filePath, fileName, data }
    setSubjects(prev => [...prev, newSubject].sort((a, b) => a.data.title.localeCompare(b.data.title)))
    setSelectedPath(filePath)
    setShowCreateModal(false)
  }

  const handleDeleteSubject = async (filePath: string) => {
    await window.api.deleteFile(filePath)
    setSubjects(prev => prev.filter(s => s.filePath !== filePath))
    if (selectedPath === filePath) setSelectedPath(null)
    setConfirmDelete(null)
  }

  // Flush pending save then reload for language change
  const handleRestart = useCallback(async () => {
    await flushSave()
    restart()
  }, [flushSave, restart])
  const selectedSubject = subjects.find(s => s.filePath === selectedPath)
  const folderName = folderPath ? (folderPath.split('/').pop() || folderPath) : null

  if (loading) return <div className="app"><div className="welcome"><span className="welcome-logo">ultralearn</span></div></div>

  if (!folderPath) return (
    <div className="app">
      <div className="welcome">
        <span className="welcome-logo">ultralearn</span>
        <h1 className="welcome-title">{t.welcomeTitle}</h1>
        <p className="welcome-desc">{t.welcomeDesc}</p>
        <button className="btn btn-primary" onClick={handleOpenFolder}>{t.openStudyFolder}</button>
        {/* Language picker on welcome screen */}
        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
          {(Object.keys(LANG_LABELS) as Lang[]).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              style={{
                background: lang === l ? 'var(--ac-dim)' : 'transparent',
                border: `1px solid ${lang === l ? 'var(--accent)' : 'var(--line2)'}`,
                color: lang === l ? 'var(--accent)' : 'var(--muted)',
                padding: '4px 10px', borderRadius: 4, cursor: 'pointer',
                fontSize: 11, fontFamily: 'var(--mono)',
              }}
            >{LANG_LABELS[l]}</button>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="app" onClick={() => setShowLangMenu(false)}>
      {/* ── Top Bar ── */}
      <div className="topbar">
        <span className="topbar-brand">UL</span>
        <div className="topbar-sep" />

        <div className="topbar-tabs">
          <div
            className={`tab tab-overview ${!selectedPath ? 'active' : ''}`}
            onClick={() => setSelectedPath(null)}
          >
            <span>{t.overview}</span>
          </div>

          {subjects.map(s => {
            const score  = getOverallScore(s.data.principles)
            const status = getStatus(score)
            const dotColor = status === 'following' ? 'var(--accent)' : status === 'in-progress' ? 'var(--amber)' : 'var(--dim)'
            return (
              <div
                key={s.filePath}
                className={`tab ${s.filePath === selectedPath ? 'active' : ''}`}
                onClick={() => setSelectedPath(s.filePath)}
              >
                <div className="tab-dot" style={{ background: dotColor }} />
                <span>{s.data.title}</span>
                <span className="tab-score">{score}%</span>
                <button className="tab-del" onClick={e => { e.stopPropagation(); setConfirmDelete(s.filePath) }}>×</button>
              </div>
            )
          })}
        </div>

        <div className="topbar-right">
          {saveState === 'saving' && <span className="topbar-save saving">{t.saving}</span>}
          {saveState === 'saved'  && <span className="topbar-save saved">{t.saved}</span>}
          {pendingLang && (
            <button className="btn-restart" onClick={handleRestart}>
              {t.settingsRestart}
            </button>
          )}
          <button className="btn-new" onClick={() => setShowCreateModal(true)}>{t.newSubject}</button>
          <button className="btn-settings" onClick={() => setShowSettings(true)} title={t.settingsTitle}>⚙</button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="body">
        {!selectedPath || !selectedSubject ? (
          <Dashboard subjects={subjects} onSelect={setSelectedPath} onNew={() => setShowCreateModal(true)} />
        ) : (
          <SubjectDetail
            key={selectedSubject.filePath}
            data={selectedSubject.data}
            filePath={selectedSubject.filePath}
            onChange={data => handleSubjectChange(selectedSubject.filePath, data)}
          />
        )}
      </div>

      {showCreateModal && (
        <CreateSubjectModal onConfirm={handleCreateSubject} onClose={() => setShowCreateModal(false)} />
      )}

      {confirmDelete && (() => {
        const s = subjects.find(x => x.filePath === confirmDelete)
        return (
          <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-title">{t.deleteSubject}</div>
              <p className="confirm-desc">
                <strong style={{ color: 'var(--text)' }}>{s?.fileName}</strong> {t.deleteDesc}
              </p>
              <div className="modal-actions">
                <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>{t.cancel}</button>
                <button className="btn btn-danger" onClick={() => handleDeleteSubject(confirmDelete)}>{t.delete}</button>
              </div>
            </div>
          </div>
        )
      })()}
      {showSettings && (
        <SettingsPanel
          folderPath={folderPath}
          onClose={() => setShowSettings(false)}
          onOpenFolder={handleOpenFolder}
        />
      )}
    </div>
  )
}
