<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { 
  Sparkles, 
  Zap, 
  Clock as ClockIcon
} from '@lucide/vue'
import { useMail } from '../composables/useMail'
import AiDraftPanel from './common/AiDraftPanel.vue'
import { appApiFetch } from '../composables/useAppApi'
import { useCompletion } from '@ai-sdk/vue'
import { useSettings } from '../composables/useSettings'

const { selectedEmail, sendEmailReply } = useMail()
const { settings } = useSettings()

const manuallyGeneratedSummary = ref(false)

const showSummary = computed(() => {
  // When selectedEmail changes, reset manual generation trigger
  return settings.value.autoGenerateSummary || manuallyGeneratedSummary.value
})

watch(selectedEmail, () => {
  manuallyGeneratedSummary.value = false
})

// Interactive reply states
const draftState = ref<'empty' | 'dictating' | 'generating' | 'drafted'>('empty')
const instructionText = ref('')
const generatedDraft = ref('')

const draftTextareaRef = ref<HTMLTextAreaElement | null>(null)
const replyTextareaRef = ref<HTMLTextAreaElement | null>(null)


// Attachment State
interface AttachedFile {
  name: string
  size: string
  type: string
}
const attachedFiles = ref<AttachedFile[]>([])

const senderInitials = computed(() => {
  if (!selectedEmail.value) return '?'
  const parts = selectedEmail.value.sender.split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase()
  }
  return parts[0][0].toUpperCase()
})

// Generate a smart summary from email content
const aiSummary = computed(() => {
  if (!selectedEmail.value) return null
  const email = selectedEmail.value
  const body = email.body
  
  // Extract key points from the email body
  const sentences = body.split(/[.!?]+/).filter(s => s.trim().length > 20)
  const keyPoints: string[] = []
  
  if (sentences.length > 0) {
    keyPoints.push(sentences[0].trim().slice(0, 120))
  }
  if (sentences.length > 2) {
    keyPoints.push(sentences[Math.floor(sentences.length / 2)].trim().slice(0, 120))
  }
  
  // Detect action items
  const hasActionItems = /please|let's|need to|should|must|deadline|meeting|review|send|submit|confirm/i.test(body)
  const hasMeeting = /meeting|call|sync|standup|conference|zoom|meet/i.test(body)
  const hasDeadline = /deadline|due|by end of|before|until|asap|urgent/i.test(body)
  
  return {
    keyPoints,
    hasActionItems,
    hasMeeting,
    hasDeadline,
    readTime: Math.max(1, Math.ceil(body.split(' ').length / 200))
  }
})

// File Attachment handling


let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []

async function startDictation() {
  if (draftState.value === 'generating') return
  draftState.value = 'dictating'
  instructionText.value = ''

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    mediaRecorder = new MediaRecorder(stream)
    audioChunks = []

    mediaRecorder.ondataavailable = e => {
      if (e.data.size > 0) audioChunks.push(e.data)
    }

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' })
      const reader = new FileReader()
      reader.readAsDataURL(audioBlob)
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1]
        try {
          const res = await appApiFetch<{text: string}>('/api/ai/transcribe', {
            method: 'POST',
            body: { 
              audioBase64: base64Data,
              apiKey: settings.value.sarvamApiKey
            }
          })
          instructionText.value = res.text || 'Transcription failed.'
        } catch (e) {
          console.error('Transcription failed', e)
        } finally {
          draftState.value = 'empty'
          stream.getTracks().forEach(track => track.stop())
        }
      }
    }

    mediaRecorder.start()
  } catch (err) {
    console.error('Error accessing microphone:', err)
    draftState.value = 'empty'
  }
}

function stopDictation() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop()
  } else {
    draftState.value = 'empty'
  }
}

const ipcStreamFetch = (url: string, options: RequestInit): Promise<Response> => {
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()

  window.electronAPI.streamApi(
    url,
    { headers: options.headers, body: JSON.parse(options.body as string) },
    {
      onChunk: (chunk: string) => writer.write(new TextEncoder().encode(chunk)),
      onFinish: () => writer.close(),
      onError: (err: any) => writer.abort(err)
    }
  )

  return Promise.resolve(new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  }))
}

const { completion: aiCompletion, complete: completeAiDraft } = useCompletion({
  api: '/api/ai/reply',
  fetch: ipcStreamFetch,
  onFinish: () => {
    draftState.value = 'drafted'
    nextTick(() => {
      if (draftTextareaRef.value) draftTextareaRef.value.scrollTop = draftTextareaRef.value.scrollHeight
    })
  },
  onError: (err) => {
    console.error('Draft generation error:', err)
    draftState.value = 'empty'
  }
})

watch(aiCompletion, (newVal) => {
  if (draftState.value === 'generating') {
    generatedDraft.value = newVal
    nextTick(() => {
      if (draftTextareaRef.value) draftTextareaRef.value.scrollTop = draftTextareaRef.value.scrollHeight
    })
  }
})

async function generateDraft() {
  if (draftState.value === 'generating') return
  
  draftState.value = 'generating'
  generatedDraft.value = ''
  
  const context = selectedEmail.value ? selectedEmail.value.body : ''
  const prompt = instructionText.value.trim()
  
  await completeAiDraft(prompt, {
    headers: {
      'x-ai-model': settings.value.ollamaModel
    },
    body: { 
      prompt, 
      context
    }
  })
}

// Actions in drafted review state
const showSuccessOverlay = ref(false)

async function sendFinalEmail() {
  if (!selectedEmail.value || !selectedEmail.value.gmailAccountId) return
  
  try {
    const payload = {
      accountId: selectedEmail.value.gmailAccountId,
      to: [selectedEmail.value.senderEmail],
      subject: selectedEmail.value.subject.startsWith('Re:') ? selectedEmail.value.subject : `Re: ${selectedEmail.value.subject}`,
      bodyText: generatedDraft.value,
      inReplyTo: selectedEmail.value.gmailMessageId
    }
    
    await sendEmailReply(payload)
    
    showSuccessOverlay.value = true
    setTimeout(() => {
      showSuccessOverlay.value = false
      discardDraft()
    }, 2200)
  } catch (error) {
    console.error('Failed to send email:', error)
  }
}

function discardDraft() {
  instructionText.value = ''
  generatedDraft.value = ''
  attachedFiles.value = []
  draftState.value = 'empty'
  nextTick(() => {
    if (replyTextareaRef.value) {
      replyTextareaRef.value.style.height = 'auto'
    }
  })
}
</script>

<template>
  <div class="email-detail animate-fade-in" v-if="selectedEmail">
    <!-- Header Block -->
    <div class="detail-header-card">
      <div class="sender-identity">
        <div class="avatar flex-center">{{ senderInitials }}</div>
        <div class="identity-text">
          <h3 class="sender-name">{{ selectedEmail.sender }}</h3>
          <span class="sender-email">&lt;{{ selectedEmail.senderEmail }}&gt;</span>
        </div>
      </div>
      <span class="detail-date">{{ selectedEmail.date }}</span>
    </div>

    <!-- Subject -->
    <div class="detail-subject-card">
      <h2 class="email-subject">{{ selectedEmail.subject }}</h2>
      <div class="badges-row">
        <span 
          v-for="tag in selectedEmail.tags" 
          :key="tag" 
          class="badge" 
          :class="`badge-${tag}`"
        >
          {{ tag }}
        </span>
      </div>
    </div>

    <!-- AI Summary Card -->
    <div v-if="aiSummary && showSummary" class="ai-summary-card">
      <div class="summary-header">
        <div class="summary-header-left">
          <span class="summary-icon flex-center"><Sparkles :size="12" /></span>
          <span class="summary-label">Summary</span>
        </div>
        <span class="read-time">{{ aiSummary.readTime }} min read</span>
      </div>
      
      <div class="summary-body">
        <p v-for="(point, i) in aiSummary.keyPoints" :key="i" class="summary-point">
          {{ point }}
        </p>
      </div>

      <div class="summary-signals" v-if="aiSummary.hasActionItems || aiSummary.hasMeeting || aiSummary.hasDeadline">
        <span v-if="aiSummary.hasActionItems" class="signal-tag action">
          <Zap :size="11" /> Action needed
        </span>
        <span v-if="aiSummary.hasMeeting" class="signal-tag meeting">
          <ClockIcon :size="11" /> Meeting
        </span>
        <span v-if="aiSummary.hasDeadline" class="signal-tag deadline">
          <ClockIcon :size="11" /> Time-sensitive
        </span>
      </div>
    </div>

    <!-- On-Demand Summary Generation Placeholder -->
    <div v-else-if="aiSummary && !showSummary" class="ai-summary-on-demand flex-center">
      <div class="on-demand-inner">
        <span class="on-demand-spark-icon flex-center"><Sparkles :size="13" /></span>
        <span class="on-demand-notice-text">Email summary is available</span>
        <button class="on-demand-gen-btn flex-center" @click="manuallyGeneratedSummary = true">
          <Sparkles :size="11" /> Generate summary
        </button>
      </div>
    </div>

    <div class="detail-divider"></div>

    <!-- Email Body -->
    <div
      v-if="selectedEmail.bodyHtml"
      class="email-body email-html-body"
      v-html="selectedEmail.bodyHtml"
    />
    <div v-else class="email-body email-text-body">
      {{ selectedEmail.body }}
    </div>

    <div class="detail-divider"></div>

    <!-- Quick Reply Box with Drafting Stage & Voice Input -->
    <AiDraftPanel
      :showAiPanel="true"
      :aiShowApplied="showSuccessOverlay"
      :aiDraftState="draftState"
      v-model:aiPrompt="instructionText"
      v-model:aiDraft="generatedDraft"
      v-model:aiAttachedFiles="attachedFiles"
      @generate-draft="generateDraft"
      @apply-draft="sendFinalEmail"
      @discard-draft="discardDraft"
      @start-dictation="startDictation"
      @stop-dictation="stopDictation"
      mode="reply"
      :headerTarget="selectedEmail?.sender.split(' ')[0]"
    />
  </div>
</template>

<style scoped>
.email-detail {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  background-color: var(--bg-primary);
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
}

.detail-header-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sender-identity {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  font-family: var(--font-sans);
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.identity-text {
  display: flex;
  flex-direction: column;
}

.sender-name {
  font-family: var(--font-sans);
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--text-primary);
}

.sender-email {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.detail-date {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.detail-subject-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.email-subject {
  font-family: var(--font-title);
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.35;
}

.badges-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

/* AI Summary Card */
.ai-summary-card {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.summary-header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.summary-icon {
  width: 18px;
  height: 18px;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 50%;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.summary-label {
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.read-time {
  font-size: 0.68rem;
  color: var(--text-muted);
}

.summary-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.summary-point {
  font-size: 0.8rem;
  color: var(--text-primary);
  line-height: 1.45;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.summary-signals {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 2px;
}

.signal-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.68rem;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 9999px;
  border: 1px solid;
}

.signal-tag.action {
  color: hsl(25, 85%, 45%);
  background-color: hsl(25, 85%, 96%);
  border-color: hsl(25, 85%, 90%);
}

.signal-tag.meeting {
  color: hsl(212, 75%, 40%);
  background-color: hsl(212, 75%, 96%);
  border-color: hsl(212, 75%, 90%);
}

.signal-tag.deadline {
  color: hsl(0, 75%, 45%);
  background-color: hsl(0, 75%, 96%);
  border-color: hsl(0, 75%, 90%);
}

.detail-divider {
  height: 1px;
  background-color: var(--border-color);
  margin: 4px 0;
}

.email-body {
  font-size: 0.86rem;
  color: var(--text-primary);
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.email-text-body {
  white-space: pre-wrap;
}

.email-html-body {
  white-space: normal;
  overflow-x: auto;
  max-width: 100%;
}

.email-html-body :deep(*) {
  max-width: 100%;
  box-sizing: border-box;
}

.email-html-body :deep(img) {
  height: auto;
  max-width: 100%;
  border-radius: 6px;
}

.email-html-body :deep(table) {
  width: 100% !important;
  border-collapse: collapse;
}

.email-html-body :deep(a) {
  color: var(--text-primary);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.email-html-body :deep(p),
.email-html-body :deep(div) {
  line-height: 1.6;
}

/* Quick Reply Box with Drafting Stage */
.ai-summary-on-demand {
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 12px 16px;
  background-color: var(--bg-secondary);
  width: 100%;
}

.on-demand-inner {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.on-demand-spark-icon {
  width: 22px;
  height: 22px;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 50%;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.on-demand-notice-text {
  font-size: 0.78rem;
  color: var(--text-secondary);
  flex: 1;
}

.on-demand-gen-btn {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 4px 10px;
  font-family: var(--font-sans);
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  gap: 4px;
}

.on-demand-gen-btn:hover {
  border-color: var(--text-primary);
  color: var(--text-primary);
  background-color: var(--bg-secondary);
}
</style>
