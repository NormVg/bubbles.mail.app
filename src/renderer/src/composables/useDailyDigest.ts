import { ref, computed } from 'vue'

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

  return {
    dailyReports,
    selectedDateKey,
    selectedReport,
    setSelectedDateKey,
    toggleTask,
    addTask
  }
})

export function useDailyDigest() {
  const store = useDigestStore()
  const { dailyReports, selectedDateKey, selectedReport } = storeToRefs(store)
  return {
    dailyReports,
    selectedDateKey,
    selectedReport,
    setSelectedDateKey: store.setSelectedDateKey,
    toggleTask: store.toggleTask,
    addTask: store.addTask
  }
}
