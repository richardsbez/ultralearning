import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('api', {
  getConfig: (): Promise<{ folderPath: string | null }> =>
    ipcRenderer.invoke('get-config'),

  openFolderDialog: (): Promise<string | null> =>
    ipcRenderer.invoke('open-folder-dialog'),

  setFolder: (folderPath: string): Promise<boolean> =>
    ipcRenderer.invoke('set-folder', folderPath),

  listSubjects: (folderPath: string): Promise<{ fileName: string; filePath: string }[]> =>
    ipcRenderer.invoke('list-subjects', folderPath),

  readFile: (filePath: string): Promise<string | null> =>
    ipcRenderer.invoke('read-file', filePath),

  writeFile: (filePath: string, content: string): Promise<boolean> =>
    ipcRenderer.invoke('write-file', filePath, content),

  writeFileSync: (filePath: string, content: string): boolean =>
    ipcRenderer.sendSync('write-file-sync', filePath, content),

  createSubject: (folderPath: string, title: string): Promise<{ filePath: string; fileName: string }> =>
    ipcRenderer.invoke('create-subject', folderPath, title),

  revealFile: (filePath: string): Promise<void> =>
    ipcRenderer.invoke('reveal-file', filePath),

  deleteFile: (filePath: string): Promise<boolean> =>
    ipcRenderer.invoke('delete-file', filePath),

  restartApp: (): Promise<void> =>
    ipcRenderer.invoke('restart-app'),

  openTempFile: (base64Data: string, fileName: string): Promise<string> =>
    ipcRenderer.invoke('open-temp-file', base64Data, fileName),
})
