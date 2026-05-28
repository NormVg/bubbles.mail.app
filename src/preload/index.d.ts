declare global {
  interface Window {
    electron: any
    electronAPI: {
      openExternal: (url: string) => Promise<void>
      getAppVersion: () => Promise<string>
      invokeApi: (path: string, options: any) => Promise<any>
      streamApi: (
        path: string,
        options: any,
        callbacks: { onChunk: (chunk: string) => void, onFinish: () => void, onError: (err: any) => void }
      ) => () => void
      onOAuthSuccess: (callback: (email: string) => void) => () => void
    }
  }
}

export {}
