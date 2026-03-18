import { useState, useCallback } from 'react'
import type { Resource, ResourceType, ResourceStatus } from '../types'
import { useT } from './LangContext'
import type { Translations } from '../i18n'

interface Props {
  resources: Resource[]
  onChange: (resources: Resource[]) => void
}

const TYPE_ICON: Record<ResourceType, string> = {
  livro: '📖', curso: '🎓', video: '▶', artigo: '📄', link: '🔗', outro: '·',
}
const TYPE_LABELS: ResourceType[] = ['livro', 'curso', 'video', 'artigo', 'link', 'outro']

// Status style built at render time so it can use translations
function getStatusStyle(t: Translations): Record<ResourceStatus, { label: string; color: string; bg: string }> {
  return {
    'na-fila':  { label: t.inQueue,  color: '#555',    bg: 'transparent' },
    'em-uso':   { label: t.inUse,    color: '#fbbf24', bg: 'rgba(251,191,36,0.08)' },
    'concluido':{ label: t.done,     color: '#a3e635', bg: 'rgba(163,230,53,0.08)' },
  }
}

const STATUS_CYCLE: Record<ResourceStatus, ResourceStatus> = {
  'na-fila': 'em-uso', 'em-uso': 'concluido', 'concluido': 'na-fila',
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
}

export function ResourceList({ resources, onChange }: Props) {
  const { t } = useT()
  const STATUS_STYLE = getStatusStyle(t)

  const [newTitle,  setNewTitle]  = useState('')
  const [newUrl,    setNewUrl]    = useState('')
  const [newType,   setNewType]   = useState<ResourceType>('link')
  const [showForm,  setShowForm]  = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const add = useCallback(() => {
    if (!newTitle.trim()) return
    const r: Resource = { id: genId(), title: newTitle.trim(), url: newUrl.trim(), type: newType, status: 'na-fila' }
    onChange([...resources, r])
    setNewTitle(''); setNewUrl(''); setNewType('link'); setShowForm(false)
  }, [newTitle, newUrl, newType, resources, onChange])

  const remove = useCallback((id: string) => onChange(resources.filter(r => r.id !== id)), [resources, onChange])

  const cycleStatus = useCallback((id: string) => {
    onChange(resources.map(r => r.id === id ? { ...r, status: STATUS_CYCLE[r.status] } : r))
  }, [resources, onChange])

  const updateTitle = useCallback((id: string, title: string) => {
    onChange(resources.map(r => r.id === id ? { ...r, title } : r))
  }, [resources, onChange])

  const updateUrl = useCallback((id: string, url: string) => {
    onChange(resources.map(r => r.id === id ? { ...r, url } : r))
  }, [resources, onChange])

  const updateType = useCallback((id: string, type: ResourceType) => {
    onChange(resources.map(r => r.id === id ? { ...r, type } : r))
  }, [resources, onChange])

  return (
    <div className="rl-wrapper" style={{ height: '100%' }}>
      <div className="rl-toolbar">
        <span className="rl-lbl">{t.studyResources}</span>
        <div className="rl-toolbar-right">
          {resources.length > 0 && (
            <span className="rl-stat">
              {resources.filter(r => r.status === 'concluido').length > 0 && (
                <span style={{ color: 'var(--accent)' }}>{resources.filter(r => r.status === 'concluido').length} ✓</span>
              )}
              {resources.filter(r => r.status === 'em-uso').length > 0 && (
                <span style={{ color: 'var(--amber)', marginLeft: 6 }}>{resources.filter(r => r.status === 'em-uso').length} ◉</span>
              )}
              <span style={{ color: 'var(--dim)', marginLeft: 6 }}>/ {resources.length}</span>
            </span>
          )}
          <button className="rl-add-btn" onClick={() => setShowForm(s => !s)}>
            {showForm ? '✕' : t.addResource}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rl-form">
          <input className="rl-input" placeholder={t.resourceTitle} value={newTitle}
            onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} autoFocus />
          <div className="rl-form-row">
            <input className="rl-input rl-input-url" placeholder={t.resourceUrl} value={newUrl}
              onChange={e => setNewUrl(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
            <select className="rl-select" value={newType} onChange={e => setNewType(e.target.value as ResourceType)}>
              {TYPE_LABELS.map(tp => <option key={tp} value={tp}>{TYPE_ICON[tp]} {tp}</option>)}
            </select>
          </div>
          <div className="rl-form-actions">
            <button className="rl-confirm" onClick={add} disabled={!newTitle.trim()}>{t.confirmAdd}</button>
          </div>
        </div>
      )}

      {resources.length === 0 && !showForm && (
        <div className="rl-empty">{t.noResources}</div>
      )}

      {resources.length > 0 && (
        <div className="rl-list">
          {resources.map(r => {
            const ss = STATUS_STYLE[r.status]
            const isEditing = editingId === r.id
            return (
              <div key={r.id} className="rl-item" style={{ borderLeft: `2px solid ${ss.color}`, background: ss.bg }}>
                <button className="rl-status-btn" title={ss.label} onClick={() => cycleStatus(r.id)} style={{ color: ss.color }}>
                  {TYPE_ICON[r.type]}
                </button>
                <div className="rl-item-body">
                  {isEditing ? (
                    <div className="rl-edit-fields">
                      <input className="rl-edit-input" value={r.title} onChange={e => updateTitle(r.id, e.target.value)} placeholder={t.resourceTitle} />
                      <input className="rl-edit-input rl-edit-url" value={r.url} onChange={e => updateUrl(r.id, e.target.value)} placeholder={t.resourceUrl} />
                      <select className="rl-select" value={r.type} onChange={e => updateType(r.id, e.target.value as ResourceType)}>
                        {TYPE_LABELS.map(tp => <option key={tp} value={tp}>{TYPE_ICON[tp]} {tp}</option>)}
                      </select>
                    </div>
                  ) : (
                    <>
                      <span className="rl-item-title" style={{
                        color: r.status === 'concluido' ? 'var(--muted)' : 'var(--text)',
                        textDecoration: r.status === 'concluido' ? 'line-through' : 'none',
                        textDecorationColor: 'var(--dim)',
                      }}>{r.title}</span>
                      {r.url && (
                        <a className="rl-item-url" href={r.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>
                          {r.url}
                        </a>
                      )}
                    </>
                  )}
                </div>
                <span className="rl-badge" style={{ color: ss.color, borderColor: `${ss.color}40` }}>{ss.label}</span>
                <div className="rl-actions">
                  <button className="rl-action-btn" onClick={() => setEditingId(isEditing ? null : r.id)}>{isEditing ? '✓' : '✎'}</button>
                  <button className="rl-action-btn rl-action-del" onClick={() => remove(r.id)}>×</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
