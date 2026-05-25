import { ref, computed } from 'vue'
import { Email } from './useMail'

export interface Message {
  id: string
  sender: 'user' | 'ai'
  text: string
  timestamp: Date
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

// Global state refs shared across composer instances
const sessions = ref<ChatSession[]>(initialSessions)
const currentSessionId = ref<string>('s1')
const isThinking = ref<boolean>(false)

export function useAiAssistant() {
  const currentSession = computed(() => {
    return sessions.value.find(s => s.id === currentSessionId.value) || sessions.value[0]
  })

  // Expose messages read-only dynamically computed from active session
  const messages = computed(() => currentSession.value.messages)

  const getSuggestedActions = (email: Email | null) => {
    if (!email) {
      return [
        'How does today look?',
        'Show my highest priority tasks',
        'Summarize this week\'s budget discussion'
      ]
    }
    
    // Context-sensitive prompt chips
    if (email.subject.includes('Meeting')) {
      return [
        'Draft a reply accepting the meeting',
        'Draft a reply: reschedule to 11:30 AM',
        'Generate an agenda for this meeting'
      ]
    } else if (email.subject.includes('Budget')) {
      return [
        'Draft a reply to Emily requesting a sync',
        'Analyze our QA budget gap',
        'Add a task: Review QA spreadsheet'
      ]
    } else if (email.subject.includes('Funding') || email.subject.includes('Announcement')) {
      return [
        'Draft a congratulatory reply to Michael',
        'Summarize Series A details',
        'Add all-hands calendar event'
      ]
    } else if (email.subject.includes('plans') || email.subject.includes('Weekend')) {
      return [
        'Draft a reply: I\'d love to join!',
        'Draft a reply: Can\'t make it this weekend',
        'What is the weather forecast?'
      ]
    }
    
    return [
      `Draft a quick reply to ${email.sender}`,
      'Summarize this conversation thread',
      `Add a follow-up task for ${email.sender}`
    ]
  }

  const sendMessage = async (text: string, contextEmail: Email | null = null) => {
    if (!text.trim()) return
    
    const activeSess = sessions.value.find(s => s.id === currentSessionId.value)
    if (!activeSess) return

    // Add user message
    activeSess.messages.push({
      id: `user_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date()
    })
    
    // Auto-update session title dynamically based on the first user query
    if (activeSess.title === 'New Chat' || activeSess.title === 'Action Engine') {
      let cleanTitle = text.replace(/^[📎📎 ]*Attached files:.*?\n*/gi, '').trim()
      if (!cleanTitle) cleanTitle = 'File upload analysis'
      activeSess.title = cleanTitle.slice(0, 20) + (cleanTitle.length > 20 ? '...' : '')
    }
    
    isThinking.value = true
    
    // Simulate AI response delay
    setTimeout(() => {
      let replyText = ''
      const lowerText = text.toLowerCase()
      
      if (lowerText.includes('draft') || lowerText.includes('reply')) {
        const recipient = contextEmail ? contextEmail.sender : 'William Smith'
        const subject = contextEmail ? contextEmail.subject : 'Re: Meeting Tomorrow'
        
        replyText = `Here is a drafted response to **${recipient}**:
\`\`\`text
Subject: Re: ${subject.replace(/^Re:\s*/i, '')}

Hi ${recipient.split(' ')[0]},

Thanks for the note. That sounds good to me. I've reviewed the details and look forward to discussing the next steps. I'll make sure to bring my notes on our recent milestones and proposed adjustments.

See you then!

Best,
Alicia
\`\`\`

Would you like me to copy this to your clipboard or send it directly?`
      } else if (lowerText.includes('budget') || lowerText.includes('qa')) {
        replyText = `Based on Emily Davis's email, the QA team resource allocation was reduced by **15%** in the current draft. This was redirected towards core developer infrastructure improvements. 

Emily suggests this reduction could create post-launch desktop app regressions. I've added a task to **"Review QA team budget spreadsheet"** to your checklist.`
      } else if (lowerText.includes('agenda') || lowerText.includes('meeting')) {
        replyText = `Here is a suggested meeting agenda based on the engineering items William Smith shared:
1. **API Models Review (20 mins)**: Walkthrough of technical specs and client-side Tauri integrations.
2. **Sprint & Milestone Progress (15 mins)**: Discussion on resource constraints and pending hires.
3. **Client Design Feedback (10 mins)**: Core UX iterations.
4. **Action Steps & Deadlines (15 mins)**: Next steps and next release tags.`
      } else if (lowerText.includes('task') || lowerText.includes('add')) {
        replyText = `Done! I've added the new action item directly to your Daily Intelligence checklist. Is there anything else you need me to log?`
      } else {
        replyText = `I've analyzed that request against today's context.

Since we secured **Series A funding** and have a **Technical Alignment sync** tomorrow, I recommend prioritizing William's API preparation and reviewing Emily's budget sheet.

I'm ready to help you write drafts or search details on these threads!`
      }
      
      activeSess.messages.push({
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: replyText,
        timestamp: new Date()
      })
      isThinking.value = false
    }, 1200)
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
    }
  }

  return {
    sessions,
    currentSessionId,
    messages,
    isThinking,
    getSuggestedActions,
    sendMessage,
    createNewSession,
    deleteSession,
    clearChat
  }
}
