declare global {
  interface Window {
    electron: any
    electronAPI: {
      openExternal: (url: string) => Promise<void>
      getAppVersion: () => Promise<string>
      invokeApi: (path: string, options: any) => Promise<any>
      onOAuthSuccess: (callback: (email: string) => void) => () => void
    }
  }
}

export {}
