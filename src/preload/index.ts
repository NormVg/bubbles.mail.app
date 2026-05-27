import { contextBridge, ipcRenderer } from 'electron'

// Custom APIs for renderer
const electronAPI = {
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  invokeApi: (path: string, options: any) => ipcRenderer.invoke('api-request', path, options),
  onOAuthSuccess: (callback: (email: string) => void) => {
    const listener = (_event: any, email: string) => callback(email)
    ipcRenderer.on('oauth-success', listener)
    return () => ipcRenderer.removeListener('oauth-success', listener)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electronAPI', electronAPI)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electronAPI = electronAPI
}
