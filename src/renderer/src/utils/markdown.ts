// Uses js-yaml for YAML front-matter — pure JS, no Node.js Buffer needed.
// Format is identical to Obsidian: ---\nkey: value\n---\n\nbody text
import yaml from 'js-yaml'
import type { SubjectData } from '../types'
import { PRINCIPLE_KEYS } from './defaults'

const CHECKLIST_LENGTH = 7

function makeEmptyPrinciple(key: string): SubjectData['principles']['meta'] {
  return {
    checklist: Array.from({ length: CHECKLIST_LENGTH }, (_, i) => ({
      id: String(i + 1), text: '', checked: false,
    })),
    notes: '',
    lastReviewed: null,
    ...(key === 'meta' ? { roadmap: [] } : {}),
  }
}

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function emptySubject(): SubjectData {
  const now = todayStr()
  return {
    title: 'Untitled', motivation: 'instrumental', why: '',
    targetHours: 100, hoursSpent: 0, createdAt: now, updatedAt: now,
    principles: Object.fromEntries(
      PRINCIPLE_KEYS.map(k => [k, makeEmptyPrinciple(k)])
    ) as SubjectData['principles'],
    freeNotes: '', resources: [],
  }
}

// ── Serialize — Obsidian-compatible Markdown + YAML front-matter ─────────────
export function serializeSubjectFile(data: SubjectData): string {
  const { freeNotes, ...meta } = data
  const frontmatter = yaml.dump(
    { ...meta, updatedAt: todayStr() },
    { lineWidth: -1, noRefs: true }
  )
  return `---\n${frontmatter}---\n\n${freeNotes || ''}`
}

// ── Parse ────────────────────────────────────────────────────────────────────
export function parseSubjectFile(raw: string): SubjectData {
  try {
    // Standard YAML front-matter: starts with ---
    if (!raw.startsWith('---')) return emptySubject()

    const end = raw.indexOf('\n---', 3)
    if (end === -1) return emptySubject()

    const yamlStr  = raw.slice(4, end)           // content between the two ---
    const bodyStr  = raw.slice(end + 4).replace(/^\r?\n/, '')

    const parsed = yaml.load(yamlStr) as Record<string, unknown>
    if (!parsed || typeof parsed !== 'object') return emptySubject()

    return mergeData(parsed, bodyStr)
  } catch (e) {
    console.error('parseSubjectFile error:', e)
    return emptySubject()
  }
}

function mergeData(data: Record<string, unknown>, freeNotes: string): SubjectData {
  const now      = todayStr()
  const rawPrins = (data.principles as Record<string, unknown>) ?? {}
  const mergedPrinciples = {} as SubjectData['principles']

  for (const key of PRINCIPLE_KEYS) {
    const stored = rawPrins[key] as Record<string, unknown> | undefined
    if (!stored) { mergedPrinciples[key] = makeEmptyPrinciple(key); continue }

    // Keep ALL stored items (user may have added custom ones with timestamp IDs)
    const storedList: { id: string; text: string; checked: boolean }[] =
      ((stored.checklist as unknown[]) || []).map((c) => {
        const ci = c as Record<string, unknown>
        return { id: String(ci.id ?? ''), text: String(ci.text ?? ''), checked: Boolean(ci.checked) }
      })

    // Backfill default slot IDs "1"–"7" if missing
    const storedIds = new Set(storedList.map(c => c.id))
    for (let i = 1; i <= CHECKLIST_LENGTH; i++) {
      if (!storedIds.has(String(i))) storedList.push({ id: String(i), text: '', checked: false })
    }

    mergedPrinciples[key] = {
      checklist: storedList,
      notes: String(stored.notes ?? ''),
      lastReviewed: stored.lastReviewed ? String(stored.lastReviewed) : null,
      ...(key === 'meta' ? {
        roadmap: Array.isArray(stored.roadmap) &&
                 stored.roadmap.length > 0 &&
                 typeof (stored.roadmap[0] as Record<string,unknown>)?.x === 'number'
          ? stored.roadmap : []
      } : {}),
    }
  }

  return {
    title:       String(data.title ?? 'Untitled'),
    motivation:  (data.motivation as 'instrumental' | 'intrinsic') ?? 'instrumental',
    why:         String(data.why ?? ''),
    targetHours: Number(data.targetHours ?? 100),
    hoursSpent:  Number(data.hoursSpent  ?? 0),
    createdAt:   String(data.createdAt   ?? now),
    updatedAt:   String(data.updatedAt   ?? now),
    principles:  mergedPrinciples,
    freeNotes:   freeNotes.trim(),
    resources:   Array.isArray(data.resources) ? data.resources : [],
  }
}

// ── Scoring ──────────────────────────────────────────────────────────────────
export function getPrincipleScore(
  principle: SubjectData['principles'][keyof SubjectData['principles']]
): number {
  const { length } = principle.checklist
  if (!length) return 0
  return Math.round(principle.checklist.filter(c => c.checked).length / length * 100)
}

export function getOverallScore(principles: SubjectData['principles']): number {
  const scores = Object.values(principles).map(getPrincipleScore)
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}

export type PrincipleStatus = 'not-started' | 'in-progress' | 'following'

export function getStatus(score: number): PrincipleStatus {
  if (score === 0) return 'not-started'
  if (score >= 80) return 'following'
  return 'in-progress'
}
