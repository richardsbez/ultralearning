import { useT } from './LangContext'
import { getPrincipleMeta } from '../utils/defaults'
import type { SubjectFile } from '../types'
import { getOverallScore, getPrincipleScore, getStatus } from '../utils/markdown'

interface Props {
  subjects: SubjectFile[]
  onSelect: (filePath: string) => void
  onNew: () => void
}

function daysSince(d: string | null) {
  if (!d) return null
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
}
function stalePrinciples(s: SubjectFile) {
  return Object.values(s.data.principles).filter(p => {
    const d = daysSince(p.lastReviewed); return d === null || d > 7
  }).length
}

export function Dashboard({ subjects, onSelect, onNew }: Props) {
  const { t } = useT()
  const PRINCIPLE_META = getPrincipleMeta(t)

  const totalItems    = subjects.reduce((a, s) => a + Object.values(s.data.principles).reduce((b, p) => b + p.checklist.length, 0), 0)
  const totalChecked  = subjects.reduce((a, s) => a + Object.values(s.data.principles).reduce((b, p) => b + p.checklist.filter(c => c.checked).length, 0), 0)
  const totalFollowing = subjects.reduce((a, s) => a + Object.values(s.data.principles).filter(p => {
    const tot = p.checklist.length; return tot && p.checklist.filter(c => c.checked).length / tot >= 0.8
  }).length, 0)
  const needsAttention = subjects.filter(s => stalePrinciples(s) > 3)

  return (
    <div className="dashboard">
      {subjects.length > 0 && (
        <div className="dash-kpis">
          <div className="dash-kpi"><span className="dash-kpi-val">{subjects.length}</span><span className="dash-kpi-lbl">{t.subjects}</span></div>
          <div className="dash-kpi"><span className="dash-kpi-val">{totalChecked}</span><span className="dash-kpi-lbl">{t.markedItems}</span></div>
          <div className="dash-kpi">
            <span className="dash-kpi-val" style={{ color: 'var(--accent)' }}>{totalItems > 0 ? Math.round((totalChecked / totalItems) * 100) : 0}%</span>
            <span className="dash-kpi-lbl">{t.overallAdherence}</span>
          </div>
          <div className="dash-kpi">
            <span className="dash-kpi-val" style={{ color: 'var(--accent)' }}>{totalFollowing}</span>
            <span className="dash-kpi-lbl">{t.principlesFollowed}</span>
          </div>
        </div>
      )}

      {needsAttention.length > 0 && (
        <div className="dash-alert">
          ⚠ {needsAttention.map(s => s.data.title).join(', ')} — {t.needsReviewAlert}
        </div>
      )}

      <div className="dash-grid-wrap">
        {subjects.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:14, color:'var(--muted)', padding:40 }}>
            <span style={{ fontSize:28, opacity:0.2 }}>◎</span>
            <span style={{ fontSize:15, fontWeight:600, color:'var(--text)' }}>{t.noSubjectsYet}</span>
            <span style={{ fontSize:12, textAlign:'center', maxWidth:280, lineHeight:1.7 }}>{t.noSubjectsDesc}</span>
            <button className="btn btn-primary" onClick={onNew}>{t.createFirst}</button>
          </div>
        ) : (
          <div className="dash-grid">
            {subjects.map(s => {
              const score    = getOverallScore(s.data.principles)
              const status   = getStatus(score)
              const stale    = stalePrinciples(s)
              const hp       = s.data.targetHours > 0 ? Math.min(100, Math.round((s.data.hoursSpent / s.data.targetHours) * 100)) : 0
              const barColor = status === 'following' ? 'var(--accent)' : status === 'in-progress' ? 'var(--amber)' : 'var(--dim)'
              return (
                <div key={s.filePath} className="dash-card" onClick={() => onSelect(s.filePath)}>
                  <div className="dash-card-top">
                    <span className="dash-card-title">{s.data.title}</span>
                    <div className="dash-card-badges">
                      <span className={`dash-badge ${s.data.motivation === 'instrumental' ? 'instr' : 'intr'}`}>
                        {s.data.motivation === 'instrumental' ? t.instr.toLowerCase() : t.intrin.toLowerCase()}
                      </span>
                      {stale > 3 && <span className="dash-badge stale">⚠ {stale}</span>}
                    </div>
                  </div>
                  {s.data.why && <span className="dash-card-why">{s.data.why}</span>}
                  <div className="dash-card-score-row">
                    <div className="dash-card-bar"><div className="dash-card-bar-fill" style={{ width:`${score}%`, background:barColor }}/></div>
                    <span className={`dash-card-score ${status==='following'?'good':status==='in-progress'?'warn':''}`}>{score}%</span>
                  </div>
                  <div className="dash-card-dots">
                    {PRINCIPLE_META.map(pm => {
                      const ps = getPrincipleScore(s.data.principles[pm.key])
                      const st = getStatus(ps)
                      return <div key={pm.key} className="dash-card-dot" style={{ background: st==='following'?'var(--accent)':st==='in-progress'?'var(--amber)':'var(--dim)' }} title={`${pm.name}: ${ps}%`}/>
                    })}
                  </div>
                  {s.data.hoursSpent > 0 && (
                    <div className="dash-card-score-row">
                      <div className="dash-card-bar"><div className="dash-card-bar-fill" style={{ width:`${hp}%`, background:'var(--blue)' }}/></div>
                      <span className="dash-card-score">{s.data.hoursSpent}h/{s.data.targetHours}h</span>
                    </div>
                  )}
                </div>
              )
            })}
            <div className="dash-card dash-card--new" onClick={onNew}>
              <span className="dash-card-new-plus">+</span>
              <span className="dash-card-new-lbl">{t.newSubjectCard}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
