import type { PrincipleData, SubjectData, PrincipleMeta } from '../types'
import type { Translations } from '../i18n'

// Static principle keys — order matters (matches numbering 1-9)
export const PRINCIPLE_KEYS: PrincipleMeta['key'][] = [
  'meta','focus','directPractice','drilling','retrieval',
  'feedback','retention','intuition','experimentation',
]

export function getPrincipleMeta(t: Translations): PrincipleMeta[] {
  return PRINCIPLE_KEYS.map((key, i) => ({
    key,
    number: i + 1,
    name: t.principles[key].name,
    description: '',
    guideQuestion: t.principles[key].guideQuestion,
  }))
}

function makeChecklist(items: string[]): PrincipleData['checklist'] {
  return items.map((text, i) => ({ id: String(i + 1), text, checked: false }))
}

export function getDefaultPrinciples(t: Translations): SubjectData['principles'] {
  const result = {} as SubjectData['principles']
  for (const key of PRINCIPLE_KEYS) {
    result[key] = {
      checklist: makeChecklist(t.principles[key].checklist),
      notes: '',
      lastReviewed: null,
      ...(key === 'meta' ? { roadmap: [] } : {}),
    }
  }
  return result
}

export function createDefaultSubject(title: string, t: Translations): SubjectData {
  const now = new Date().toISOString().split('T')[0]
  return {
    title,
    motivation: 'instrumental',
    why: '',
    targetHours: 100,
    hoursSpent: 0,
    createdAt: now,
    updatedAt: now,
    principles: getDefaultPrinciples(t),
    freeNotes: '',
    resources: [],
  }
}

// PRINCIPLE_META is no longer static — use getPrincipleMeta(t) everywhere
// Kept for backward compatibility with markdown.ts which doesn't need names
export const PRINCIPLE_KEYS_ONLY = PRINCIPLE_KEYS
