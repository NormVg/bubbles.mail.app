import { ref, computed } from 'vue'
import { useSettings } from './useSettings'

export interface DigestTask {
  id: string
  text: string
  completed: boolean
  sourceEmailId: string
}

export interface DigestDeadline {
  id: string
  text: string
  urgency: 'high' | 'medium' | 'low'
  sourceEmailId: string
}

export interface DigestThread {
  id: string
  who: string
  topic: string
  summary: string
  status: string
  sourceEmailId: string
}

export interface DailyReport {
  dateKey: string
  dateFormatted: string // e.g. "Monday, May 25, 2026"
  summary: string[]
  tasks: DigestTask[]
  deadlines: DigestDeadline[]
  threads: DigestThread[]
  insights: string[]
  latestEmailTimestamp?: number
}

// Stateful references
import { defineStore, storeToRefs } from 'pinia'

export const useDigestStore = defineStore('dailyDigest', () => {
  const dailyReports = ref<DailyReport[]>([])
  const selectedDateKey = ref<string>('Today')
  const selectedReport = computed(() => {
    return dailyReports.value.find(report => report.dateKey === selectedDateKey.value) || null
  })

  const setSelectedDateKey = (key: string) => {
    selectedDateKey.value = key
  }

  const toggleTask = (taskId: string) => {
    dailyReports.value.forEach(report => {
      const task = report.tasks.find(t => t.id === taskId)
      if (task) {
        task.completed = !task.completed
      }
    })
  }

  const addTask = (text: string, dateKey: string, sourceEmailId: string = '1') => {
    const report = dailyReports.value.find(r => r.dateKey === dateKey)
    if (report) {
      report.tasks.push({
        id: `t_${Date.now()}`,
        text,
        completed: false,
        sourceEmailId
      })
    }
  }

  const isGeneratingDigest = ref(false)

  const getCacheKey = (accountId: string, dateKey: string) => `digest_${accountId}_${dateKey}`

  const loadCachedDigest = (accountId: string, dateKey: string): DailyReport | null => {
    const cached = localStorage.getItem(getCacheKey(accountId, dateKey))
    if (cached) {
      try {
        return JSON.parse(cached) as DailyReport
      } catch (e) {
        return null
      }
    }
    return null
  }

  const saveDigestToCache = (accountId: string, dateKey: string, report: DailyReport) => {
    localStorage.setItem(getCacheKey(accountId, dateKey), JSON.stringify(report))
  }

  const generateDigest = async (accountId: string, dateKey: string, dateFormatted: string, emails: any[]) => {
    isGeneratingDigest.value = true
    try {
      const { settings } = useSettings()

      const ignoreList = Array.isArray(settings.value.ignoredDigestSenders) 
        ? settings.value.ignoredDigestSenders 
        : []

      const filteredEmails = emails.filter(e => {
        if (ignoreList.length === 0) return true
        const senderStr = `${e.sender} ${e.senderEmail}`.toLowerCase()
        return !ignoreList.some(ignoreKw => senderStr.includes(ignoreKw))
      })

      const payload = {
        model: settings.value.digestModel,
        emails: filteredEmails.map(e => ({
          id: e.id,
          sender: e.sender,
          subject: e.subject,
          body: e.body.substring(0, 500) // Truncate body to save context window
        }))
      }

      const res = await window.electronAPI.invokeApi('/api/ai/digest', {
        method: 'POST',
        body: payload
      })

      const latestEmailTimestamp = emails.reduce((max, e) => Math.max(max, e.timestamp || 0), 0)

      const report: DailyReport = {
        dateKey,
        dateFormatted,
        summary: res.summary || [],
        tasks: (res.tasks || []).map((t: any) => ({ ...t, id: `t_${Math.random()}`, completed: false })),
        deadlines: (res.deadlines || []).map((d: any) => ({ ...d, id: `d_${Math.random()}` })),
        threads: (res.threads || []).map((t: any) => ({ ...t, id: `th_${Math.random()}` })),
        insights: res.insights || [],
        latestEmailTimestamp
      }

      saveDigestToCache(accountId, dateKey, report)

      const existingIdx = dailyReports.value.findIndex(r => r.dateKey === dateKey)
      if (existingIdx !== -1) {
        dailyReports.value[existingIdx] = report
      } else {
        dailyReports.value.push(report)
      }

      return report
    } catch (e) {
      console.error('[useDailyDigest] Failed to generate digest:', e)
      throw e
    } finally {
      isGeneratingDigest.value = false
    }
  }

  const checkAndGenerateDigest = async (accountId: string, dateKey: string, dateFormatted: string, emailsForDay: any[]) => {
    if (emailsForDay.length === 0) {
      const existingIdx = dailyReports.value.findIndex(r => r.dateKey === dateKey)
      if (existingIdx !== -1) dailyReports.value.splice(existingIdx, 1)
      return
    }

    const latestEmailTimestamp = emailsForDay.reduce((max, e) => Math.max(max, e.timestamp || 0), 0)

    let report = dailyReports.value.find(r => r.dateKey === dateKey)
    if (!report) {
      const cached = loadCachedDigest(accountId, dateKey)
      if (cached) {
        report = cached
        dailyReports.value.push(report)
      }
    }

    if (!report || (report.latestEmailTimestamp || 0) < latestEmailTimestamp) {
      // Prevent overlapping generations for the exact same date
      if (isGeneratingDigest.value && selectedDateKey.value === dateKey) return
      await generateDigest(accountId, dateKey, dateFormatted, emailsForDay)
    }
  }

  const regenerateDigest = async (accountId: string, dateKey: string, dateFormatted: string, emailsForDay: any[]) => {
    await generateDigest(accountId, dateKey, dateFormatted, emailsForDay)
  }

  return {
    dailyReports,
    selectedDateKey,
    selectedReport,
    isGeneratingDigest,
    setSelectedDateKey,
    toggleTask,
    addTask,
    checkAndGenerateDigest,
    regenerateDigest
  }
})

export function useDailyDigest() {
  const store = useDigestStore()
  const { dailyReports, selectedDateKey, selectedReport, isGeneratingDigest } = storeToRefs(store)
  return {
    dailyReports,
    selectedDateKey,
    selectedReport,
    isGeneratingDigest,
    setSelectedDateKey: store.setSelectedDateKey,
    toggleTask: store.toggleTask,
    addTask: store.addTask,
    checkAndGenerateDigest: store.checkAndGenerateDigest,
    regenerateDigest: store.regenerateDigest
  }
}
