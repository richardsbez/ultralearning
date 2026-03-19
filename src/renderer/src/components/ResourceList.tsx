import { useState, useCallback, useRef } from 'react'
import type { Resource, ResourceType, ResourceStatus, ResourceAttachment } from '../types'
import { useT } from './LangContext'
import type { Translations } from '../i18n'

interface Props {
  resources: Resource[]
  onChange: (resources: Resource[]) => void
}

const TYPE_META: Record<ResourceType, { icon: string; accent: string; short: string }> = {
  livro:  { icon: '◎', accent: '#f59e0b', short: 'LVR' },
  curso:  { icon: '◈', accent: '#60a5fa', short: 'CRS' },
  video:  { icon: '▶', accent: '#f87171', short: 'VID' },
  artigo: { icon: '≡', accent: '#a78bfa', short: 'ART' },
  link:   { icon: '⌁', accent: '#34d399', short: 'URL' },
  pdf:    { icon: '⬜', accent: '#fb923c', short: 'PDF' },
  imagem: { icon: '◧', accent: '#e879f9', short: 'IMG' },
  audio:  { icon: '♫', accent: '#22d3ee', short: 'AUD' },
  outro:  { icon: '·', accent: '#6b7280', short: 'OTR' },
}
const TYPE_LABELS = Object.keys(TYPE_META) as ResourceType[]

function getLabels(t: Translations): Record<ResourceType, string> {
  return {
    livro: t.rlTypeLivro, curso: t.rlTypeCurso, video: t.rlTypeVideo,
    artigo: t.rlTypeArtigo, link: t.rlTypeLink, pdf: t.rlTypePdf,
    imagem: t.rlTypeImagem, audio: t.rlTypeAudio ?? 'Audio', outro: t.rlTypeOutro,
  }
}

const STATUS_CFG: Record<ResourceStatus, { dot: string; line: string }> = {
  'na-fila':  { dot: '#2a2a2a', line: '#1a1a1a' },
  'em-uso':   { dot: '#f59e0b', line: 'rgba(245,158,11,0.25)' },
  'concluido':{ dot: '#a3e635', line: 'rgba(163,230,53,0.25)' },
}
const STATUS_CYCLE: Record<ResourceStatus, ResourceStatus> = {
  'na-fila': 'em-uso', 'em-uso': 'concluido', 'concluido': 'na-fila',
}

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 5) }
async function toBase64(file: File): Promise<string> {
  return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file) })
}
function attIcon(mime: string) {
  if (mime === 'application/pdf') return '⬜'
  if (mime.startsWith('image/')) return '◧'
  if (mime.startsWith('audio/')) return '♫'
  return '·'
}
function attColor(mime: string) {
  if (mime === 'application/pdf') return '#fb923c'
  if (mime.startsWith('image/')) return '#e879f9'
  if (mime.startsWith('audio/')) return '#22d3ee'
  return '#6b7280'
}
function getAttachments(r: Resource): ResourceAttachment[] {
  const atts = r.attachments ?? []
  if (r.fileData && atts.length === 0) {
    const mime = r.type === 'pdf' ? 'application/pdf' : r.type === 'imagem' ? 'image/png' : r.type === 'audio' ? 'audio/mpeg' : 'application/octet-stream'
    return [{ id: 'legacy', name: r.title, mimeType: mime, data: r.fileData }]
  }
  return atts
}

export function ResourceList({ resources, onChange }: Props) {
  const { t } = useT()
  const LABELS = getLabels(t)

  const [showForm,   setShowForm]   = useState(false)
  const [newTitle,   setNewTitle]   = useState('')
  const [newUrl,     setNewUrl]     = useState('')
  const [newType,    setNewType]    = useState<ResourceType>('link')
  const [newNotes,   setNewNotes]   = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [filter,     setFilter]     = useState<ResourceType | 'all'>('all')
  const [viewImg,    setViewImg]    = useState<{ src: string; name: string } | null>(null)
  const [viewAudio,  setViewAudio]  = useState<{ src: string; name: string } | null>(null)
  const [search,     setSearch]     = useState('')

  const update = useCallback((id: string, patch: Partial<Resource>) =>
    onChange(resources.map(r => r.id === id ? { ...r, ...patch } : r)), [resources, onChange])
  const remove = useCallback((id: string) =>
    onChange(resources.filter(r => r.id !== id)), [resources, onChange])
  const cycle  = useCallback((id: string) =>
    onChange(resources.map(r => r.id === id ? { ...r, status: STATUS_CYCLE[r.status] } : r)), [resources, onChange])

  const add = useCallback(() => {
    if (!newTitle.trim()) return
    onChange([...resources, { id: genId(), title: newTitle.trim(), url: newUrl.trim(), type: newType, status: 'na-fila', notes: newNotes.trim(), attachments: [] }])
    setNewTitle(''); setNewUrl(''); setNewType('link'); setNewNotes(''); setShowForm(false)
  }, [newTitle, newUrl, newType, newNotes, resources, onChange])

  const addAttachments = useCallback(async (id: string, files: FileList) => {
    const r = resources.find(x => x.id === id); if (!r) return
    const newAtts: ResourceAttachment[] = []
    for (const file of Array.from(files)) {
      const data = await toBase64(file)
      newAtts.push({ id: genId(), name: file.name, mimeType: file.type || 'application/octet-stream', data })
    }
    update(id, { attachments: [...(r.attachments ?? []), ...newAtts] })
  }, [resources, update])

  const removeAttachment = useCallback((resourceId: string, attId: string) => {
    const r = resources.find(x => x.id === resourceId); if (!r) return
    update(resourceId, { attachments: (r.attachments ?? []).filter(a => a.id !== attId) })
  }, [resources, update])

  const openAttachment = useCallback(async (att: ResourceAttachment) => {
    if (att.mimeType === 'application/pdf') { await window.api.openTempFile(att.data, att.name) }
    else if (att.mimeType.startsWith('image/')) { setViewImg({ src: att.data, name: att.name }) }
    else if (att.mimeType.startsWith('audio/')) { setViewAudio({ src: att.data, name: att.name }) }
    else { await window.api.openTempFile(att.data, att.name) }
  }, [])

  const filtered = resources
    .filter(r => filter === 'all' || r.type === filter)
    .filter(r => !search || r.title.toLowerCase().includes(search.toLowerCase()) || (r.notes ?? '').toLowerCase().includes(search.toLowerCase()))

  const doneC   = resources.filter(r => r.status === 'concluido').length
  const activeC = resources.filter(r => r.status === 'em-uso').length
  const typeCounts = TYPE_LABELS.reduce((acc, tp) => { const c = resources.filter(r => r.type === tp).length; if (c > 0) acc[tp] = c; return acc }, {} as Record<string, number>)

  return (
    <div className="rl3-root">

      {/* ══ Top bar ══ */}
      <div className="rl3-topbar">
        <div className="rl3-topbar-left">
          <span className="rl3-title-label">{t.studyResources}</span>
          {resources.length > 0 && (
            <div className="rl3-kpis">
              <span className="rl3-kpi"><span style={{color:'#a3e635'}}>{doneC}</span> ✓</span>
              <span className="rl3-kpi-sep">/</span>
              <span className="rl3-kpi"><span style={{color:'#f59e0b'}}>{activeC}</span> ◉</span>
              <span className="rl3-kpi-sep">/</span>
              <span className="rl3-kpi"><span style={{color:'var(--muted)'}}>{resources.length}</span> {t.rlTotal}</span>
            </div>
          )}
        </div>
        <div className="rl3-topbar-right">
          {resources.length > 2 && (
            <input className="rl3-search" placeholder={t.rlSearch} value={search}
              onChange={e => setSearch(e.target.value)} spellCheck={false} />
          )}
          <button className={`rl3-add-btn ${showForm ? 'open' : ''}`}
            onClick={() => { setShowForm(s => !s); setExpandedId(null) }}>
            <span className="rl3-add-icon">{showForm ? '×' : '+'}</span>
            {showForm ? t.rlCancelBtn : t.rlNewBtn}
          </button>
        </div>
      </div>

      {/* ══ Type filter strip ══ */}
      {Object.keys(typeCounts).length > 1 && (
        <div className="rl3-filterstrip">
          <button className={`rl3-fs-pill ${filter === 'all' ? 'on' : ''}`} onClick={() => setFilter('all')}>
            ALL <span>{resources.length}</span>
          </button>
          {(Object.entries(typeCounts) as [ResourceType, number][]).map(([tp, n]) => (
            <button key={tp} className={`rl3-fs-pill ${filter === tp ? 'on' : ''}`}
              style={filter === tp ? { '--pill-color': TYPE_META[tp].accent } as React.CSSProperties : {}}
              onClick={() => setFilter(tp)}>
              {TYPE_META[tp].short} <span>{n}</span>
            </button>
          ))}
        </div>
      )}

      {/* ══ Add form ══ */}
      {showForm && (
        <div className="rl3-form">
          {/* Type selector */}
          <div className="rl3-form-types">
            {TYPE_LABELS.map(tp => (
              <button key={tp} className={`rl3-form-type ${newType === tp ? 'sel' : ''}`}
                style={newType === tp ? { '--ta': TYPE_META[tp].accent } as React.CSSProperties : {}}
                onClick={() => setNewType(tp)}>
                <span style={newType === tp ? { color: TYPE_META[tp].accent } : {}}>{TYPE_META[tp].icon}</span>
                <span>{LABELS[tp]}</span>
              </button>
            ))}
          </div>
          <div className="rl3-form-row">
            <input className="rl3-finput" placeholder={t.rlTitleField} value={newTitle} autoFocus
              onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
            <input className="rl3-finput rl3-finput-url" placeholder={t.rlUrlField} value={newUrl}
              onChange={e => setNewUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
          </div>
          <div className="rl3-form-row">
            <input className="rl3-finput" placeholder={t.rlNoteField} value={newNotes}
              onChange={e => setNewNotes(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
            <button className="rl3-form-submit" onClick={add} disabled={!newTitle.trim()}>
              <span>↵</span> {t.rlAddBtn}
            </button>
          </div>
        </div>
      )}

      {/* ══ Empty ══ */}
      {resources.length === 0 && !showForm && (
        <div className="rl3-empty">
          <div className="rl3-empty-art">
            {['LVR','CRS','PDF','AUD','IMG'].map((s, i) => (
              <span key={s} className="rl3-empty-chip" style={{ animationDelay: `${i * 120}ms` }}>{s}</span>
            ))}
          </div>
          <p className="rl3-empty-msg">{t.noResources}</p>
          <button className="rl3-add-btn" onClick={() => setShowForm(true)}>
            <span className="rl3-add-icon">+</span> {t.rlNewResource}
          </button>
        </div>
      )}

      {/* ══ List ══ */}
      {filtered.length > 0 && (
        <div className="rl3-list">
          {filtered.map((r, idx) => {
            const meta  = TYPE_META[r.type]
            const scfg  = STATUS_CFG[r.status]
            const atts  = getAttachments(r)
            const isExp = expandedId === r.id

            return (
              <div key={r.id} className={`rl3-row ${isExp ? 'expanded' : ''} status-${r.status}`}
                style={{ '--ra': meta.accent, '--rl': scfg.line, animationDelay: `${idx * 30}ms` } as React.CSSProperties}>

                {/* Left accent stripe */}
                <div className="rl3-stripe" style={{ background: meta.accent }} />

                {/* Status dot */}
                <button className="rl3-sdot" style={{ background: scfg.dot, boxShadow: `0 0 0 2px ${scfg.dot}40` }}
                  title={t.rlCycleStatus} onClick={() => cycle(r.id)} />

                {/* Type badge */}
                <span className="rl3-type-tag" style={{ color: meta.accent, borderColor: `${meta.accent}28`, background: `${meta.accent}0d` }}>
                  {meta.short}
                </span>

                {/* Main content */}
                <div className="rl3-content" onClick={() => setExpandedId(isExp ? null : r.id)}>
                  <span className={`rl3-row-title ${r.status === 'concluido' ? 'done' : ''}`}>{r.title}</span>
                  {r.notes && !isExp && <span className="rl3-row-note">{r.notes}</span>}
                  {r.url && !isExp && <span className="rl3-row-url">{r.url.replace(/^https?:\/\//, '').slice(0, 32)}{r.url.length > 36 ? '…' : ''}</span>}
                </div>

                {/* Attachment chips (collapsed view) */}
                {atts.length > 0 && !isExp && (
                  <div className="rl3-att-chips">
                    {atts.slice(0, 3).map(att => (
                      <button key={att.id} className="rl3-att-chip"
                        style={{ color: attColor(att.mimeType), borderColor: `${attColor(att.mimeType)}30`, background: `${attColor(att.mimeType)}0a` }}
                        onClick={e => { e.stopPropagation(); openAttachment(att) }}>
                        {attIcon(att.mimeType)}
                      </button>
                    ))}
                    {atts.length > 3 && <span className="rl3-att-more">+{atts.length - 3}</span>}
                  </div>
                )}

                {/* Row actions */}
                <div className="rl3-row-actions">
                  <button className="rl3-ra-btn" onClick={() => setExpandedId(isExp ? null : r.id)}>
                    {isExp ? '↑' : '↓'}
                  </button>
                  <button className="rl3-ra-btn del" onClick={() => remove(r.id)}>×</button>
                </div>

                {/* ══ Expanded panel ══ */}
                {isExp && (
                  <div className="rl3-expand-panel">
                    <div className="rl3-expand-grid">
                      <div className="rl3-eg-col">
                        <label className="rl3-eg-lbl">{t.rlFieldTitle}</label>
                        <input className="rl3-eg-input" value={r.title}
                          onChange={e => update(r.id, { title: e.target.value })} />
                      </div>
                      <div className="rl3-eg-col">
                        <label className="rl3-eg-lbl">{t.rlFieldUrl}</label>
                        <input className="rl3-eg-input" value={r.url || ''}
                          onChange={e => update(r.id, { url: e.target.value })} placeholder="https://..." />
                      </div>
                      <div className="rl3-eg-col rl3-eg-col-full">
                        <label className="rl3-eg-lbl">{t.rlFieldNote}</label>
                        <input className="rl3-eg-input" value={r.notes || ''}
                          onChange={e => update(r.id, { notes: e.target.value })} placeholder="Observação rápida..." />
                      </div>
                      <div className="rl3-eg-col">
                        <label className="rl3-eg-lbl">{t.rlFieldType}</label>
                        <div className="rl3-eg-types">
                          {TYPE_LABELS.map(tp => (
                            <button key={tp} className={`rl3-eg-type ${r.type === tp ? 'sel' : ''}`}
                              style={r.type === tp ? { color: TYPE_META[tp].accent, borderColor: `${TYPE_META[tp].accent}50`, background: `${TYPE_META[tp].accent}12` } : {}}
                              onClick={() => update(r.id, { type: tp })}>
                              {TYPE_META[tp].icon} {LABELS[tp]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Attachments */}
                    <div className="rl3-att-area">
                      <div className="rl3-att-area-header">
                        <span className="rl3-eg-lbl">{t.rlAttachedFiles} — {atts.length}</span>
                        <label className="rl3-att-upload">
                          {t.rlAddFiles}
                          <input type="file" multiple accept=".pdf,image/*,audio/*,.mp3,.wav,.ogg,.m4a"
                            style={{ display: 'none' }}
                            onChange={e => { if (e.target.files) addAttachments(r.id, e.target.files); e.target.value = '' }} />
                        </label>
                      </div>
                      {atts.length > 0 && (
                        <div className="rl3-att-grid">
                          {atts.map(att => (
                            <div key={att.id} className="rl3-att-card"
                              style={{ '--ac': attColor(att.mimeType) } as React.CSSProperties}>
                              <div className="rl3-att-card-preview" onClick={() => openAttachment(att)}
                                style={{ background: `${attColor(att.mimeType)}0f`, cursor: 'pointer' }}>
                                {att.mimeType.startsWith('image/') ? (
                                  <img src={att.data} alt={att.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                ) : (
                                  <span style={{ fontSize: 22, color: attColor(att.mimeType) }}>{attIcon(att.mimeType)}</span>
                                )}
                              </div>
                              <div className="rl3-att-card-body">
                                <span className="rl3-att-card-name" onClick={() => openAttachment(att)}>{att.name}</span>
                                {att.id !== 'legacy' && (
                                  <button className="rl3-att-card-del" onClick={() => removeAttachment(r.id, att.id)}>×</button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* no results */}
      {resources.length > 0 && filtered.length === 0 && (
        <div className="rl3-empty" style={{ paddingTop: 40 }}>
          <p className="rl3-empty-msg" style={{ opacity: 0.4 }}>{t.rlNoResults}</p>
        </div>
      )}

      {/* ══ Image viewer ══ */}
      {viewImg && (
        <div className="rl2-modal-overlay" onClick={() => setViewImg(null)}>
          <div className="rl2-modal-img" onClick={e => e.stopPropagation()}>
            <button className="rl2-modal-close" onClick={() => setViewImg(null)}>✕</button>
            <img src={viewImg.src} alt={viewImg.name} style={{ maxWidth: '90vw', maxHeight: '85vh', objectFit: 'contain', borderRadius: 6 }} />
            <span className="rl2-modal-caption">{viewImg.name}</span>
          </div>
        </div>
      )}

      {/* ══ Audio player ══ */}
      {viewAudio && (
        <div className="rl2-modal-overlay" onClick={() => setViewAudio(null)}>
          <div className="rl2-modal-audio" onClick={e => e.stopPropagation()}>
            <button className="rl2-modal-close" style={{ position: 'static', marginLeft: 'auto' }} onClick={() => setViewAudio(null)}>✕</button>
            <span style={{ fontSize: 36, color: '#22d3ee' }}>♫</span>
            <span className="rl2-modal-caption" style={{ fontSize: 13 }}>{viewAudio.name}</span>
            <audio controls autoPlay src={viewAudio.src} style={{ width: '100%', marginTop: 8, accentColor: '#22d3ee' }} />
          </div>
        </div>
      )}
    </div>
  )
}
