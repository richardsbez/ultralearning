import { useState, useEffect } from 'react'
import { useT } from './LangContext'

interface Props {
  onConfirm: (title: string, motivation: 'instrumental' | 'intrinsic', why: string) => void
  onClose: () => void
}

export function CreateSubjectModal({ onConfirm, onClose }: Props) {
  const { t } = useT()
  const [title,      setTitle]      = useState('')
  const [motivation, setMotivation] = useState<'instrumental' | 'intrinsic'>('instrumental')
  const [why,        setWhy]        = useState('')

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && title.trim())
        onConfirm(title.trim(), motivation, why)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [title, motivation, why, onClose, onConfirm])

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{t.createModalTitle}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span className="modal-lbl">{t.whatLearn}</span>
          <input className="modal-input" placeholder={t.whatLearnPlaceholder} value={title} onChange={e => setTitle(e.target.value)} autoFocus />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span className="modal-lbl">{t.motivationType}</span>
          <div className="mot-toggle">
            <button className={`mot-btn ${motivation === 'instrumental' ? 'ai' : ''}`} onClick={() => setMotivation('instrumental')}>
              {t.instrumental}<br/>
              <span style={{ fontSize: 9, opacity: 0.6, fontFamily: 'var(--mono)' }}>{t.instrDesc}</span>
            </button>
            <button className={`mot-btn ${motivation === 'intrinsic' ? 'at' : ''}`} onClick={() => setMotivation('intrinsic')}>
              {t.intrinsic}<br/>
              <span style={{ fontSize: 9, opacity: 0.6, fontFamily: 'var(--mono)' }}>{t.intrinDesc}</span>
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <span className="modal-lbl">{t.whyLearnLabel}</span>
          <input className="modal-input" placeholder={t.whyLearnPlaceholder} value={why} onChange={e => setWhy(e.target.value)} />
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>{t.cancel}</button>
          <button className="btn btn-primary" onClick={() => title.trim() && onConfirm(title.trim(), motivation, why)} disabled={!title.trim()}>
            {t.createBtn}
          </button>
        </div>
      </div>
    </div>
  )
}
