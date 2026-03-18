import { useState, useCallback } from 'react'
import type { SubjectData, PrincipleKey, RoadmapNode, Resource } from '../types'
import { getPrincipleMeta } from '../utils/defaults'
import { getOverallScore, getPrincipleScore, getStatus } from '../utils/markdown'
import { Roadmap } from './Roadmap'
import { ResourceList } from './ResourceList'
import { useT } from './LangContext'

interface Props {
  data: SubjectData
  filePath: string
  onChange: (data: SubjectData) => void
}

type RightTab = 'roadmap' | 'recursos' | 'notas'

function daysSince(d: string | null): number | null {
  if (!d) return null
  return Math.floor((Date.now() - new Date(d).getTime()) / 86400000)
}

export function SubjectDetail({ data, onChange }: Props) {
  const { t } = useT()
  const PRINCIPLE_META = getPrincipleMeta(t)
  const [activePrinciple, setActivePrinciple] = useState<PrincipleKey>('meta')
  const [rightTab, setRightTab] = useState<RightTab>('roadmap')

  const update = useCallback((partial: Partial<SubjectData>) => onChange({ ...data, ...partial }), [data, onChange])

  const updatePrinciple = useCallback((key: PrincipleKey, pd: SubjectData['principles'][typeof key]) => {
    onChange({ ...data, principles: { ...data.principles, [key]: pd } })
  }, [data, onChange])

  const overall = getOverallScore(data.principles)
  const overallSt = getStatus(overall)
  const overallColor = overallSt === 'following' ? 'var(--accent)' : overallSt === 'in-progress' ? 'var(--amber)' : 'var(--dim)'
  const hp = data.targetHours > 0 ? Math.min(100, Math.round((data.hoursSpent / data.targetHours) * 100)) : 0

  const active = data.principles[activePrinciple]
  const activeMeta = PRINCIPLE_META.find(p => p.key === activePrinciple)!
  const activeScore = getPrincipleScore(active)
  const activeSt = getStatus(activeScore)
  const activeColor = activeSt === 'following' ? 'var(--accent)' : activeSt === 'in-progress' ? 'var(--amber)' : 'var(--dim)'

  // Show i18n text only when item.text is empty (default unedited state).
  const getChecklistText = useCallback((key: PrincipleKey, itemId: string, storedText: string) => {
    if (storedText && storedText.trim() !== '') return storedText
    const idx = parseInt(itemId, 10) - 1
    const items = t.principles[key]?.checklist
    if (items && idx >= 0 && idx < items.length) return items[idx]
    return storedText
  }, [t])

  // Callback ref: resize all checklist textareas to fit content on mount/change
  const checklistRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    node.querySelectorAll<HTMLTextAreaElement>('.cl-input').forEach(ta => {
      ta.style.height = 'auto'
      ta.style.height = ta.scrollHeight + 'px'
    })
  }, [active.checklist])

  const tabLabels: Record<RightTab, string> = {
    roadmap: t.roadmapTab,
    recursos: t.resourcesTab,
    notas: t.notesTab,
  }

  return (
    <div className="body" style={{ overflow: 'hidden' }}>
      {/* Panel 1 */}
      <div className="panel-principles">
        <div className="pp-header">
          <input style={{ background:'transparent',border:'none',outline:'none',fontSize:13,fontWeight:600,color:'var(--text)',width:'100%',padding:0 }}
            defaultValue={data.title}
            onBlur={e => { if (e.target.value.trim()) update({ title: e.target.value.trim() }) }}
          />
          <input className="pp-why" style={{ background:'transparent',border:'none',outline:'none',width:'100%',padding:0 }}
            placeholder={t.whyPlaceholder} value={data.why} onChange={e => update({ why: e.target.value })}
          />
          <div className="pp-meta-row">
            <button className={`pp-mot-btn ${data.motivation==='instrumental'?'active-instr':''}`} onClick={()=>update({motivation:'instrumental'})}>{t.instr}</button>
            <button className={`pp-mot-btn ${data.motivation==='intrinsic'?'active-intr':''}`} onClick={()=>update({motivation:'intrinsic'})}>{t.intrin}</button>
            <div className="pp-hours">
              <input type="number" min={0} value={data.hoursSpent} onChange={e=>update({hoursSpent:Number(e.target.value)})}/>
              <span style={{color:'var(--dim)'}}>/</span>
              <input type="number" min={1} value={data.targetHours} onChange={e=>update({targetHours:Number(e.target.value)})}/>
              <span style={{color:'var(--dim)'}}>{t.hours}</span>
            </div>
          </div>
          <div className="pp-bars">
            <div className="pp-bar-row">
              <span className="pp-bar-lbl">{t.principlesLabel}</span>
              <div className="pp-bar"><div className="pp-bar-fill" style={{width:`${overall}%`,background:overallColor}}/></div>
              <span className="pp-bar-val" style={{color:overallColor}}>{overall}%</span>
            </div>
            <div className="pp-bar-row">
              <span className="pp-bar-lbl">{t.hoursLabel}</span>
              <div className="pp-bar"><div className="pp-bar-fill fill-blue" style={{width:`${hp}%`}}/></div>
              <span className="pp-bar-val" style={{color:'var(--muted)'}}>{hp}%</span>
            </div>
          </div>
        </div>

        <div className="pp-list">
          {PRINCIPLE_META.map(pm => {
            const s = data.principles[pm.key]
            const score = getPrincipleScore(s)
            const st = getStatus(score)
            const color = st==='following'?'var(--accent)':st==='in-progress'?'var(--amber)':'var(--dim)'
            const days = daysSince(s.lastReviewed)
            const stale = days===null||days>7
            return (
              <div key={pm.key} className={`pp-item ${activePrinciple===pm.key?'active':''}`} onClick={()=>setActivePrinciple(pm.key)}>
                <span className="pp-item-num">{String(pm.number).padStart(2,'0')}</span>
                <span className="pp-item-name">{pm.name}</span>
                {stale && <span className="pp-item-stale">!</span>}
                <div className="pp-item-bar"><div className="pp-item-bar-fill" style={{width:`${score}%`,background:color}}/></div>
                <span className="pp-item-score" style={{color}}>{score}%</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Panel 2 */}
      <div className="panel-detail">
        <div className="pd-header">
          <span className="pd-principle-num">{t.principlesLabel.toUpperCase()} {String(activeMeta.number).padStart(2,'0')}</span>
          <span className="pd-principle-name">{activeMeta.name}</span>
          <span className="pd-guide-q">{activeMeta.guideQuestion}</span>
        </div>
        <div className="pd-body">
          <div className="checklist" ref={checklistRef}>
            {active.checklist.map((item, idx) => {
              const displayText = getChecklistText(activePrinciple, item.id, item.text)
              return (
                <div key={item.id} className={`cl-item ${item.checked ? 'checked' : ''}`}>
                  {/* Checkbox */}
                  <div
                    className="cl-box"
                    onClick={() => updatePrinciple(activePrinciple, {
                      ...active,
                      checklist: active.checklist.map(c => c.id === item.id ? { ...c, checked: !c.checked } : c)
                    })}
                    style={{ cursor: 'pointer', flexShrink: 0 }}
                  >
                    {item.checked && <span className="cl-tick">✓</span>}
                  </div>

                  {/* Editable text — auto-resize textarea */}
                  <textarea
                    className="cl-input"
                    value={displayText}
                    rows={1}
                    spellCheck={false}
                    style={{
                      textDecoration: item.checked ? 'line-through' : 'none',
                      color: item.checked ? 'var(--muted)' : 'var(--text)',
                      textDecorationColor: 'var(--dim)',
                    }}
                    onChange={e => {
                      // auto-resize
                      e.target.style.height = 'auto'
                      e.target.style.height = e.target.scrollHeight + 'px'
                      const newText = e.target.value.replace(/\n/g, '')
                      updatePrinciple(activePrinciple, {
                        ...active,
                        checklist: active.checklist.map(c => c.id === item.id ? { ...c, text: newText } : c)
                      })
                    }}
                    onFocus={e => {
                      e.target.style.height = 'auto'
                      e.target.style.height = e.target.scrollHeight + 'px'
                    }}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const newId = String(Date.now())
                        const newList = [...active.checklist]
                        newList.splice(idx + 1, 0, { id: newId, text: '', checked: false })
                        updatePrinciple(activePrinciple, { ...active, checklist: newList })
                        setTimeout(() => {
                          const inputs = document.querySelectorAll<HTMLTextAreaElement>('.cl-input')
                          inputs[idx + 1]?.focus()
                        }, 30)
                      }
                      if (e.key === 'Backspace' && displayText === '') {
                        e.preventDefault()
                        if (active.checklist.length > 1) {
                          const newList = active.checklist.filter(c => c.id !== item.id)
                          updatePrinciple(activePrinciple, { ...active, checklist: newList })
                          setTimeout(() => {
                            const inputs = document.querySelectorAll<HTMLTextAreaElement>('.cl-input')
                            inputs[Math.max(0, idx - 1)]?.focus()
                          }, 30)
                        }
                      }
                    }}
                  />

                  {/* Delete button */}
                  <button
                    className="cl-del"
                    onClick={() => {
                      if (active.checklist.length > 1) {
                        updatePrinciple(activePrinciple, {
                          ...active,
                          checklist: active.checklist.filter(c => c.id !== item.id)
                        })
                      }
                    }}
                    title="Remover item"
                  >×</button>
                </div>
              )
            })}

            {/* Add item button */}
            <button
              className="cl-add-btn"
              onClick={() => {
                const newId = String(Date.now())
                const newList = [...active.checklist, { id: newId, text: '', checked: false }]
                updatePrinciple(activePrinciple, { ...active, checklist: newList })
                setTimeout(() => {
                  const inputs = document.querySelectorAll<HTMLInputElement>('.cl-input')
                  inputs[inputs.length - 1]?.focus()
                }, 30)
              }}
            >+ item</button>
          </div>
          <div className="pd-progress">
            <div className="pd-prog-bar"><div className="pd-prog-fill" style={{width:`${activeScore}%`,background:activeColor}}/></div>
            <span className={`pd-prog-score ${activeSt==='following'?'good':activeSt==='in-progress'?'warn':''}`}>{activeScore}%</span>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:4}}>
            <span className="pd-notes-lbl">{t.observations}</span>
            <textarea className="pd-notes" spellCheck={false} placeholder={t.observationsPlaceholder}
              value={active.notes} onChange={e=>updatePrinciple(activePrinciple,{...active,notes:e.target.value})}/>
          </div>
          <div className="pd-footer">
            <span className="pd-reviewed">
              {active.lastReviewed
                ? `${t.reviewedOn} ${active.lastReviewed}`
                : <span style={{color:'var(--amber)'}}>{t.neverReviewed}</span>}
            </span>
            <button className="pd-rev-btn" onClick={()=>updatePrinciple(activePrinciple,{...active,lastReviewed:new Date().toISOString().split('T')[0]})}>
              {t.reviewedToday}
            </button>
          </div>
        </div>
      </div>

      {/* Panel 3 */}
      <div className="panel-right">
        <div className="pr-tabs">
          {(['roadmap','recursos','notas'] as RightTab[]).map(tab => (
            <button key={tab} className={`pr-tab ${rightTab===tab?'active':''}`} onClick={()=>setRightTab(tab)}>
              {tabLabels[tab]}
            </button>
          ))}
        </div>
        <div className="pr-body">
          {rightTab==='roadmap'&&(
            <Roadmap nodes={data.principles.meta.roadmap??[]}
              onChange={(roadmap:RoadmapNode[])=>onChange({...data,principles:{...data.principles,meta:{...data.principles.meta,roadmap}}})}/>
          )}
          {rightTab==='recursos'&&(
            <ResourceList resources={data.resources??[]} onChange={(resources:Resource[])=>onChange({...data,resources})}/>
          )}
          {rightTab==='notas'&&(
            <div className="rp-notes-wrap">
              <span className="rp-notes-lbl">{t.notesTab}</span>
              <textarea className="rp-notes" spellCheck={false} placeholder={t.freeNotesPlaceholder}
                value={data.freeNotes} onChange={e=>update({freeNotes:e.target.value})}/>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
