// Web Worker: serializes SubjectData to YAML string off the main thread
import yaml from 'js-yaml'
import type { SubjectData } from '../types'

function todayStr() {
  return new Date().toISOString().split('T')[0]
}

function serializeSubjectFile(data: SubjectData): string {
  const { freeNotes, ...meta } = data
  const frontmatter = yaml.dump(
    { ...meta, updatedAt: todayStr() },
    { lineWidth: -1, noRefs: true }
  )
  return `---\n${frontmatter}---\n\n${freeNotes || ''}`
}

self.onmessage = (e: MessageEvent<{ id: string; data: SubjectData }>) => {
  const { id, data } = e.data
  try {
    const result = serializeSubjectFile(data)
    self.postMessage({ id, result })
  } catch (err) {
    self.postMessage({ id, error: String(err) })
  }
}
