export type MotivationType = 'instrumental' | 'intrinsic'

export interface ChecklistItem {
  id: string
  text: string
  checked: boolean
}

export type RoadmapStatus = 'todo' | 'doing' | 'done'

export type ResourceType   = 'livro' | 'curso' | 'video' | 'artigo' | 'link' | 'outro'
export type ResourceStatus = 'na-fila' | 'em-uso' | 'concluido'

export interface Resource {
  id: string
  title: string
  url: string
  type: ResourceType
  status: ResourceStatus
}

export interface RoadmapCheckItem {
  id: string
  text: string
  checked: boolean
}

export interface RoadmapNode {
  id: string
  title: string
  x: number
  y: number
  parentId: string | null
  status: RoadmapStatus
  notes: string
  color?: string
  nodeType?: 'default' | 'checklist' | 'text' | 'image' | 'group'
  checkItems?: RoadmapCheckItem[]
  // resizable nodes (text / image / group)
  w?: number
  h?: number
  // image node
  imageData?: string   // base64 data URL
  // edge label removed
}

export interface PrincipleData {
  checklist: ChecklistItem[]
  notes: string
  lastReviewed: string | null
  roadmap?: RoadmapNode[]
}

export type PrincipleKey =
  | 'meta'
  | 'focus'
  | 'directPractice'
  | 'drilling'
  | 'retrieval'
  | 'feedback'
  | 'retention'
  | 'intuition'
  | 'experimentation'

export interface SubjectPrinciples {
  meta: PrincipleData
  focus: PrincipleData
  directPractice: PrincipleData
  drilling: PrincipleData
  retrieval: PrincipleData
  feedback: PrincipleData
  retention: PrincipleData
  intuition: PrincipleData
  experimentation: PrincipleData
}

export interface SubjectData {
  title: string
  motivation: MotivationType
  why: string
  targetHours: number
  hoursSpent: number
  createdAt: string
  updatedAt: string
  principles: SubjectPrinciples
  freeNotes: string
  resources: Resource[]
}

export interface SubjectFile {
  filePath: string
  fileName: string
  data: SubjectData
}

export interface PrincipleMeta {
  key: PrincipleKey
  number: number
  name: string
  description: string
  guideQuestion: string
}

declare global {
  interface Window {
    api: {
      getConfig: () => Promise<{ folderPath: string | null }>
      openFolderDialog: () => Promise<string | null>
      setFolder: (folderPath: string) => Promise<boolean>
      listSubjects: (folderPath: string) => Promise<{ fileName: string; filePath: string }[]>
      readFile: (filePath: string) => Promise<string | null>
      writeFile: (filePath: string, content: string) => Promise<boolean>
      writeFileSync: (filePath: string, content: string) => boolean
      createSubject: (
        folderPath: string,
        title: string
      ) => Promise<{ filePath: string; fileName: string }>
      revealFile: (filePath: string) => Promise<void>
      deleteFile: (filePath: string) => Promise<boolean>
      restartApp: () => Promise<void>
      writeFileSync: (filePath: string, content: string) => boolean
    }
  }
}
