import { contextBridge, ipcRenderer } from 'electron'

// Custom APIs for renderer
const electronAPI = {
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  invokeApi: (path: string, options: any) => ipcRenderer.invoke('api-request', path, options),
  streamApi: (
    path: string, 
    options: any, 
    callbacks: { onChunk: (chunk: string) => void, onFinish: () => void, onError: (err: any) => void }
  ) => {
    const streamId = Math.random().toString(36).substring(7)
    
    const chunkListener = (_event: any, chunk: string) => callbacks.onChunk(chunk)
    const finishListener = () => {
      cleanup()
      callbacks.onFinish()
    }
    const errorListener = (_event: any, err: any) => {
      cleanup()
      callbacks.onError(err)
    }
    
    const cleanup = () => {
      ipcRenderer.removeListener(`stream-chunk-${streamId}`, chunkListener)
      ipcRenderer.removeListener(`stream-finish-${streamId}`, finishListener)
      ipcRenderer.removeListener(`stream-error-${streamId}`, errorListener)
    }
    
    ipcRenderer.on(`stream-chunk-${streamId}`, chunkListener)
    ipcRenderer.on(`stream-finish-${streamId}`, finishListener)
    ipcRenderer.on(`stream-error-${streamId}`, errorListener)
    
    ipcRenderer.send('api-stream-start', { streamId, path, options })
    
    return () => {
      cleanup()
      ipcRenderer.send('api-stream-abort', streamId)
    }
  },
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
