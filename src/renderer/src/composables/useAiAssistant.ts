import { ref, computed } from 'vue'
import { Email } from './useMail'
import { useSettings } from './useSettings'

export interface Message {
  id: string
  sender: 'user' | 'ai'
  text: string
  timestamp: Date
  contextEmails?: { id: string; subject: string }[]
}

export interface ChatSession {
  id: string
  title: string
  messages: Message[]
}

// Initial session mock data
const initialSessions: ChatSession[] = [
  {
    id: 's1',
    title: 'New Chat',
    messages: [
      {
        id: 'm1',
        sender: 'ai',
        text: `Hello Alicia! How can I help you manage your inbox or draft responses today?`,
        timestamp: new Date(Date.now() - 600000)
      }
    ]
  }
]

import { defineStore, storeToRefs } from 'pinia'

export const useAiStore = defineStore('aiAssistant', () => {
  // Load from localStorage if available
  let loadedSessions = initialSessions
  let loadedSessionId = 's1'
  try {
    const storedSessions = window.localStorage.getItem('bubbles_ai_sessions')
    if (storedSessions) {
      const parsed = JSON.parse(storedSessions)
      if (parsed && parsed.length > 0) {
        loadedSessions = parsed
        // parse back dates
        loadedSessions.forEach(s => {
          s.messages.forEach(m => {
            m.timestamp = new Date(m.timestamp)
          })
        })
      }
    }
    const storedCurrentId = window.localStorage.getItem('bubbles_ai_current_session')
    if (storedCurrentId) {
      loadedSessionId = storedCurrentId
    }
  } catch (e) {
    console.error('Failed to load AI sessions from localStorage', e)
  }

  const sessions = ref<ChatSession[]>(loadedSessions)
  const currentSessionId = ref<string>(loadedSessionId)
  const isThinking = ref<boolean>(false)
  const activeContextEmails = ref<Email[]>([])

  // Explicit state saving logic
  const saveState = () => {
    try {
      window.localStorage.setItem('bubbles_ai_sessions', JSON.stringify(sessions.value))
      window.localStorage.setItem('bubbles_ai_current_session', currentSessionId.value)
    } catch (e) {
      console.error('Failed to save AI sessions to localStorage', e)
    }
  }

  const currentSession = computed(() => {
    return sessions.value.find(s => s.id === currentSessionId.value) || sessions.value[0]
  })

  // Expose messages read-only dynamically computed from active session
  const messages = computed(() => currentSession.value.messages)

  const getSuggestedActions = () => {
    return [
      'How does today look?',
      'Show my highest priority tasks',
      'Help me draft a new email'
    ]
  }

  const sendMessage = async (text: string) => {
    if (!text.trim()) return

    const activeSess = sessions.value.find(s => s.id === currentSessionId.value)
    if (!activeSess) return

    // Add user message
    activeSess.messages.push({
      id: `user_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date(),
      contextEmails: activeContextEmails.value.length > 0 ? activeContextEmails.value.map(e => ({ id: e.id, subject: e.subject })) : undefined
    })

    // Auto-update session title dynamically based on the first user query
    if (activeSess.title === 'New Chat' || activeSess.title === 'Action Engine') {
      let cleanTitle = text.replace(/^[📎📎 ]*Attached files:.*?\n*/gi, '').trim()
      if (!cleanTitle) cleanTitle = 'File upload analysis'
      activeSess.title = cleanTitle.slice(0, 20) + (cleanTitle.length > 20 ? '...' : '')
    }

    isThinking.value = true

    // System context without auto-injected emails, unless EXPLICITLY set by user
    let systemContext = 'You are Bubbles AI, a helpful, concise, and professional email assistant.'
    if (activeContextEmails.value.length > 0) {
      systemContext += `\n\nThe user has explicitly asked you about the following emails:\n`
      activeContextEmails.value.forEach((email, index) => {
        systemContext += `\n--- Email ${index + 1} ---\nFrom: ${email.sender} <${email.senderEmail}>\nSubject: ${email.subject}\nBody: ${email.body}\n`
      })
    }

    // Build conversation history for the model
    const conversationHistory = activeSess.messages
      .filter(m => m.sender === 'user' || m.sender === 'ai')
      .slice(-10) // last 10 messages for context
      .map(m => `${m.sender === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
      .join('\n\n')

    // Add a placeholder AI message that we'll stream into
    const aiMsgId = `ai_${Date.now()}`
    activeSess.messages.push({
      id: aiMsgId,
      sender: 'ai',
      text: '',
      timestamp: new Date()
    })

    const { settings } = useSettings()
    const modelName = settings.value.ollamaModel

    if (!modelName) {
      const aiMsg = activeSess.messages.find(m => m.id === aiMsgId)
      if (aiMsg) aiMsg.text = '⚠️ No AI model selected. Please go to **Settings > AI** and select an Ollama model.'
      isThinking.value = false
      saveState()
      return
    }

    try {
      await new Promise<void>((resolve, reject) => {
        window.electronAPI.streamApi(
          '/api/ai/chat',
          {
            headers: { 'x-ai-model': modelName },
            body: {
              prompt: text,
              system: systemContext,
              history: conversationHistory
            }
          },
          {
            onChunk: (chunk: string) => {
              isThinking.value = false
              const aiMsg = activeSess.messages.find(m => m.id === aiMsgId)
              if (aiMsg) {
                aiMsg.text += chunk
                // Throttle saving chunks to prevent IO bottleneck, save on finish anyway
              }
            },
            onFinish: () => {
              isThinking.value = false
              saveState()
              resolve()
            },
            onError: (err: any) => {
              const aiMsg = activeSess.messages.find(m => m.id === aiMsgId)
              if (aiMsg) aiMsg.text = `⚠️ Error: ${err}`
              isThinking.value = false
              saveState()
              reject(err)
            }
          }
        )
      })
    } catch {
      isThinking.value = false
      saveState()
    } finally {
      activeContextEmails.value = [] // clear contexts after sending
    }
  }

  const createNewSession = () => {
    const newId = `s_${Date.now()}`
    sessions.value.push({
      id: newId,
      title: 'New Chat',
      messages: [
        {
          id: `m_${Date.now()}`,
          sender: 'ai',
          text: `Hello Alicia! How can I help you manage your inbox or draft responses today?`,
          timestamp: new Date()
        }
      ]
    })
    currentSessionId.value = newId
    saveState()
  }

  const deleteSession = (sessionId: string) => {
    if (sessions.value.length <= 1) {
      clearChat()
      return
    }
    const idx = sessions.value.findIndex(s => s.id === sessionId)
    if (idx !== -1) {
      sessions.value.splice(idx, 1)
      if (currentSessionId.value === sessionId) {
        currentSessionId.value = sessions.value[0].id
      }
      saveState()
    }
  }

  const clearChat = () => {
    const activeSess = sessions.value.find(s => s.id === currentSessionId.value)
    if (activeSess) {
      activeSess.title = 'New Chat'
      activeSess.messages = [
        {
          id: `m_${Date.now()}`,
          sender: 'ai',
          text: `Hello Alicia! Let's start fresh. How can I help you manage your inbox or draft responses today?`,
          timestamp: new Date()
        }
      ]
      saveState()
    }
  }

  return {
    sessions,
    currentSessionId,
    messages,
    isThinking,
    activeContextEmails,
    getSuggestedActions,
    sendMessage,
    createNewSession,
    deleteSession,
    clearChat
  }
})

export function useAiAssistant() {
  const store = useAiStore()
  const { sessions, currentSessionId, messages, isThinking, activeContextEmails } = storeToRefs(store)
  return {
    sessions, currentSessionId, messages, isThinking, activeContextEmails,
    getSuggestedActions: store.getSuggestedActions,
    sendMessage: store.sendMessage,
    createNewSession: store.createNewSession,
    deleteSession: store.deleteSession,
    clearChat: store.clearChat
  }
}
