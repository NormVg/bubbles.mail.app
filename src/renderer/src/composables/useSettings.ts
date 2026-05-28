import { ref, watch } from 'vue'

export type PersonalityTone = 'professional' | 'friendly' | 'creative' | 'concise'

export interface AiSettings {
  autoGenerateSummary: boolean
  autoDraftReplies: boolean
  enableVoiceDictation: boolean
  agentPersonality: PersonalityTone
  customInstructions: string
  syncInterval: number // in minutes
  apiKey: string
  ollamaModel: string
  digestModel: string
  sarvamApiKey: string
}

const DEFAULT_SETTINGS: AiSettings = {
  autoGenerateSummary: true,
  autoDraftReplies: true,
  enableVoiceDictation: true,
  agentPersonality: 'professional',
  customInstructions: 'Focus on minimal, Vercel-style, professional responses. Avoid fluff.',
  syncInterval: 5,
  apiKey: 'bb-live-8a3c9f2d1e0b5a6c7e8d',
  ollamaModel: '',
  digestModel: '',
  sarvamApiKey: ''
}

// Global state shared across the application
const settings = ref<AiSettings>({ ...DEFAULT_SETTINGS })

// Load from localStorage if available
function loadSettings() {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const stored = window.localStorage.getItem('bubbles_settings')
      if (stored) {
        const parsed = JSON.parse(stored)
        settings.value = { ...DEFAULT_SETTINGS, ...parsed }
      }
    } catch (e) {
      console.error('Failed to load settings from localStorage:', e)
    }
  }
}

// Save to localStorage
function saveSettings(newSettings: AiSettings) {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem('bubbles_settings', JSON.stringify(newSettings))
    } catch (e) {
      console.error('Failed to save settings to localStorage:', e)
    }
  }
}

// Initialize on import/load
loadSettings()

// If no model is saved, auto-detect from Ollama on startup
if (!settings.value.ollamaModel || !settings.value.digestModel) {
  fetch('http://localhost:11434/api/tags')
    .then(res => res.json())
    .then((data: any) => {
      if (data.models && data.models.length > 0) {
        if (!settings.value.ollamaModel) settings.value.ollamaModel = data.models[0].name
        if (!settings.value.digestModel) settings.value.digestModel = data.models[0].name
      }
    })
    .catch(() => { /* Ollama not running, user will set manually */ })
}

// Auto-save whenever settings change deeply
watch(settings, (newSettings) => {
  saveSettings(newSettings)
}, { deep: true })

export function useSettings() {
  return {
    settings
  }
}
