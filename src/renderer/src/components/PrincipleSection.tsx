import { useState, useCallback, useEffect, useRef } from 'react'
import type { PrincipleData } from '../types'
import type { PrincipleMeta } from '../utils/defaults'
import { getPrincipleScore, getStatus } from '../utils/markdown'

interface Props {
  meta: PrincipleMeta
  data: PrincipleData
  onChange: (data: PrincipleData) => void
  forceOpen?: boolean        // true = open externally
  onOpenChange?: () => void  // called when user manually toggles
  staleReview?: boolean      // true if not reviewed in 7+ days
}

export function PrincipleSection({ meta, data, onChange, forceOpen, onOpenChange, staleReview }: Props) {
  const [open, setOpen] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)

  // Sync forceOpen
  useEffect(() => {
    if (forceOpen !== undefined) setOpen(forceOpen)
  }, [forceOpen])

  const score = getPrincipleScore(data)
  const status = getStatus(score)
  const checkedCount = data.checklist.filter((c) => c.checked).length

  const toggle = () => {
    setOpen((o) => !o)
    onOpenChange?.()
  }

  const toggleItem = useCallback((id: string) => {
    onChange({
      ...data,
      checklist: data.checklist.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    })
  }, [data, onChange])

  const markReviewed = useCallback(() => {
    const today = new Date().toISOString().split('T')[0]
    onChange({ ...data, lastReviewed: today })
  }, [data, onChange])

  const scoreClass = status === 'following' ? 'good' : status === 'in-progress' ? 'warn' : ''

  return (
    <div className={`principle-card status-${status}`} ref={cardRef}>
      <div className="principle-header" onClick={toggle}>
        <span className="principle-number">{String(meta.number).padStart(2, '0')}</span>
        <span className="principle-name">{meta.name}</span>

        {/* Stale review warning */}
        {staleReview && !open && (
          <span className="principle-stale-badge" title="Não revisado recentemente">!</span>
        )}

        <span className={`principle-progress ${scoreClass}`}>
          {checkedCount}/{data.checklist.length}
        </span>

        {/* Mini bar */}
        <div className="principle-mini-bar">
          <div className={`principle-mini-fill bar-${status}`} style={{ width: `${score}%` }} />
        </div>

        <span className={`principle-toggle ${open ? 'open' : ''}`}>▶</span>
      </div>

      {open && (
        <div className="principle-body">
          {/* Guide question */}
          <p className="principle-guide-q">{meta.guideQuestion}</p>

          {/* Checklist */}
          <div className="checklist">
            {data.checklist.map((item) => (
              <div
                key={item.id}
                className={`checklist-item ${item.checked ? 'checked' : ''}`}
                onClick={() => toggleItem(item.id)}
              >
                <div className="checklist-box">
                  {item.checked && <span className="checklist-check-icon">✓</span>}
                </div>
                <span className="checklist-text">{item.text}</span>
              </div>
            ))}
          </div>

          {/* Progress bar */}
          <div className="principle-bar-row">
            <div className="overall-bar" style={{ flex: 1 }}>
              <div className={`overall-bar-fill bar-${status}`} style={{ width: `${score}%` }} />
            </div>
            <span className={`pb-score ${scoreClass}`}>{score}%</span>
          </div>

          {/* Notes */}
          <div className="principle-notes-section">
            <div className="principle-notes-label">Observações</div>
            <textarea
              className="principle-notes"
              placeholder="O que observei, o que funciona, próximos passos..."
              value={data.notes}
              onChange={(e) => onChange({ ...data, notes: e.target.value })}
            />
          </div>

          {/* Footer */}
          <div className="principle-footer">
            <span className="last-reviewed">
              {data.lastReviewed
                ? `Revisado em ${data.lastReviewed}`
                : <span style={{ color: 'var(--amber)' }}>Ainda não revisado</span>}
            </span>
            <button className="review-btn" onClick={markReviewed}>
              ✓ Revisado hoje
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
