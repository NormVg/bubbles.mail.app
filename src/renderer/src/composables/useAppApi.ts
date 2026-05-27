type ApiFetchOptions = {
  method?: string
  query?: Record<string, string | number | boolean | null | undefined>
  body?: unknown
}

export async function appApiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  if (typeof window !== 'undefined' && window.electronAPI?.invokeApi) {
    return await window.electronAPI.invokeApi(path, options)
  }
  
  throw new Error('Native Electron API context not loaded.')
}
