// Auto-generated — do not edit directly
export type Lang = 'pt' | 'en' | 'es' | 'zh'

export interface Translations {
  // App shell
  overview: string
  newSubject: string
  saving: string
  saved: string
  openFolder: string
  // Welcome
  welcomeTitle: string
  welcomeDesc: string
  openStudyFolder: string
  // Dashboard
  subjects: string
  markedItems: string
  overallAdherence: string
  principlesFollowed: string
  needsReviewAlert: string
  noSubjectsYet: string
  noSubjectsDesc: string
  createFirst: string
  newSubjectCard: string
  hours: string
  // Subject detail
  whyPlaceholder: string
  principlesLabel: string
  hoursLabel: string
  instr: string
  intrin: string
  roadmapTab: string
  resourcesTab: string
  notesTab: string
  reviewedToday: string
  neverReviewed: string
  reviewedOn: string
  observations: string
  observationsPlaceholder: string
  freeNotesPlaceholder: string
  // Create modal
  createModalTitle: string
  whatLearn: string
  whatLearnPlaceholder: string
  motivationType: string
  instrumental: string
  intrinsic: string
  instrDesc: string
  intrinDesc: string
  whyLearnLabel: string
  whyLearnPlaceholder: string
  cancel: string
  createBtn: string
  // Delete modal
  deleteSubject: string
  deleteDesc: string
  delete: string
  // Resource list
  studyResources: string
  noResources: string
  addResource: string
  resourceTitle: string
  resourceUrl: string
  inQueue: string
  inUse: string
  done: string
  confirmAdd: string
  roadmapEmptyHint: string
  // Roadmap canvas
  rmNewStep: string
  rmNewNote: string
  rmNewGroup: string
  rmNewImage: string
  rmGroup: string
  rmConnect: string
  rmConnecting: string
  rmConnectBanner: string
  rmConnectDragBanner: string
  rmLegendMode: string
  rmLegendDrag: string
  rmLegendRemove: string
  rmLegendEsc: string
  rmLegendScroll: string
  rmLegendMove: string
  rmLegendEdit: string
  rmLegendChecklist: string
  rmLegendResize: string
  rmLegendShortcuts: string
  rmLegendMenu: string
  rmDragHint: string
  rmConnectHere: string
  rmInvalid: string
  rmNote: string
  rmNotePlaceholder: string
  rmClickToChoose: string
  // Context menu
  rmCtxEdit: string
  rmCtxAddChild: string
  rmCtxToChecklist: string
  rmCtxToDefault: string
  rmCtxDuplicate: string
  rmCtxDisconnect: string
  rmCtxDelete: string
  // ResourceList v2
  rlUploadFile: string
  rlAddResource: string
  rlAll: string
  rlTotal: string
  rlTitlePlaceholder: string
  rlUrlPlaceholder: string
  rlNotePlaceholder: string
  rlCancel: string
  rlAdd: string
  rlClickToOpen: string
  rlAddFile: string
  rlTypeLivro: string
  rlTypeCurso: string
  rlTypeVideo: string
  rlTypeArtigo: string
  rlTypeLink: string
  rlTypePdf: string
  rlTypeAudio: string
  rlTypeImagem: string
  rlTypeOutro: string
  rlDone: string
  // ResourceList v3 new strings
  rlCancelBtn: string
  rlNewBtn: string
  rlSearch: string
  rlNewResource: string
  rlTotal: string
  rlTitleField: string
  rlUrlField: string
  rlNoteField: string
  rlAddBtn: string
  rlNoResults: string
  rlAttachedFiles: string
  rlAddFiles: string
  rlCycleStatus: string
  rlFieldTitle: string
  rlFieldUrl: string
  rlFieldNote: string
  rlFieldType: string
  // SubjectDetail checklist
  rlRemoveItem: string
  rlAddItem: string
  // Settings panel
  settingsTitle: string
  settingsLang: string
  settingsLangDesc: string
  settingsRestartNeeded: string
  settingsRestart: string
  settingsAppearance: string
  settingsTheme: string
  settingsDark: string
  settingsDebounce: string
  settingsDebounceDesc: string
  settingsData: string
  settingsOpenFolder: string
  settingsOpenFolderDesc: string
  settingsExport: string
  settingsExportDesc: string
  settingsAbout: string
  settingsVersion: string
  settingsMadeBy: string
  settingsClose: string
  // Principles
  principles: PrincipleTranslations
}

export interface PrincipleTranslations {
  meta:             { name: string; guideQuestion: string; checklist: string[] }
  focus:            { name: string; guideQuestion: string; checklist: string[] }
  directPractice:   { name: string; guideQuestion: string; checklist: string[] }
  drilling:         { name: string; guideQuestion: string; checklist: string[] }
  retrieval:        { name: string; guideQuestion: string; checklist: string[] }
  feedback:         { name: string; guideQuestion: string; checklist: string[] }
  retention:        { name: string; guideQuestion: string; checklist: string[] }
  intuition:        { name: string; guideQuestion: string; checklist: string[] }
  experimentation:  { name: string; guideQuestion: string; checklist: string[] }
}

// ─── PORTUGUESE ───────────────────────────────────────────────────────────────

export const LANG_LABELS: Record<Lang, string> = {
  pt: 'Português', en: 'English', es: 'Español', zh: '中文',
}

const STORAGE_KEY = 'ultralearn-lang'

export function loadLang(): Lang {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'pt' || v === 'en' || v === 'es' || v === 'zh') return v
  } catch {}
  return 'pt'
}

export function saveLang(lang: Lang) {
  try { localStorage.setItem(STORAGE_KEY, lang) } catch {}
}

export async function loadTranslations(lang: Lang): Promise<Translations> {
  switch (lang) {
    case 'en': return (await import('./i18n/en')).default
    case 'es': return (await import('./i18n/es')).default
    case 'zh': return (await import('./i18n/zh')).default
    default:   return (await import('./i18n/pt')).default
  }
}
