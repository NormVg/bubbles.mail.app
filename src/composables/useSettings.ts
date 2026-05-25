import { ref } from 'vue'

export type PersonalityTone = 'professional' | 'friendly' | 'creative' | 'concise'

export interface AiSettings {
  autoGenerateSummary: boolean
  autoDraftReplies: boolean
  enableVoiceDictation: boolean
  agentPersonality: PersonalityTone
  customInstructions: string
  syncInterval: number // in minutes
}

// Global state shared across the application
const settings = ref<AiSettings>({
  autoGenerateSummary: true,
  autoDraftReplies: true,
  enableVoiceDictation: true,
  agentPersonality: 'professional',
  customInstructions: 'Focus on minimal, Vercel-style, professional responses. Avoid fluff.',
  syncInterval: 5
})

export function useSettings() {
  const updateSettings = (updates: Partial<AiSettings>) => {
    settings.value = { ...settings.value, ...updates }
  }

  return {
    settings,
    updateSettings
  }
}
