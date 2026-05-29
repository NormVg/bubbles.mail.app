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

const { selectedEmail, sendEmailReply, aiSummaryCache } = useMail()
const { settings } = useSettings()

const manuallyGeneratedSummary = ref(false)

const showSummary = computed(() => {
  // When selectedEmail changes, reset manual generation trigger
  return settings.value.autoGenerateSummary || manuallyGeneratedSummary.value
})

interface AiSummary {
  keyPoints: string[]
  hasActionItems: boolean
  hasMeeting: boolean
  hasDeadline: boolean
  readTime: number
}

const aiSummaryData = ref<AiSummary | null>(null)
const isGeneratingSummary = ref(false)

async function generateEmailSummary() {
  if (!selectedEmail.value || isGeneratingSummary.value) return
  
  const emailId = selectedEmail.value.id
  if (aiSummaryCache.value[emailId]) {
    aiSummaryData.value = aiSummaryCache.value[emailId]
    return
  }
  
  isGeneratingSummary.value = true
  aiSummaryData.value = null

  try {
    const report = await appApiFetch<any>('/api/ai/summary', {
      method: 'POST',
      body: {
        emailBody: selectedEmail.value.body,
        model: settings.value.ollamaModel || 'gemma2:2b'
      }
    })
    console.log('[EmailDetail] Received summary report from IPC:', report)
    
    // Force clean object to avoid proxy/reactivity issues
    const cleanReport = typeof report === 'string' ? JSON.parse(report) : JSON.parse(JSON.stringify(report))
    console.log('[EmailDetail] Cleaned report:', cleanReport)
    
    aiSummaryData.value = cleanReport
    aiSummaryCache.value[emailId] = cleanReport
  } catch (error) {
    console.error('Failed to generate summary:', error)
    // Minimal fallback on failure
    aiSummaryData.value = {
      keyPoints: ['Failed to generate summary with AI.'],
      hasActionItems: false,
      hasMeeting: false,
      hasDeadline: false,
      readTime: Math.max(1, Math.ceil(selectedEmail.value.body.split(' ').length / 200))
    }
  } finally {
    isGeneratingSummary.value = false
  }
}

function handleManualGenerate() {
  manuallyGeneratedSummary.value = true
  if (!aiSummaryData.value && !isGeneratingSummary.value) {
    generateEmailSummary()
  }
}
// Interactive reply states
const draftState = ref<'empty' | 'dictating' | 'generating' | 'drafted'>('empty')
const instructionText = ref('')
const generatedDraft = ref('')

watch(selectedEmail, () => {
  manuallyGeneratedSummary.value = false
  if (selectedEmail.value && aiSummaryCache.value[selectedEmail.value.id]) {
    aiSummaryData.value = aiSummaryCache.value[selectedEmail.value.id]
  } else {
    aiSummaryData.value = null
    if (settings.value.autoGenerateSummary) {
      generateEmailSummary()
    }
  }

  // Reset draft state when switching emails
  draftState.value = 'empty'
  generatedDraft.value = ''
  instructionText.value = ''
}, { immediate: true })


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

const ipcStreamFetch = (url: string | URL | Request, options?: RequestInit): Promise<Response> => {
  const urlString = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
  console.log('[EmailDetail] ipcStreamFetch called for:', urlString)
  const { readable, writable } = new TransformStream()
  const writer = writable.getWriter()

  let parsedBody = {}
  try {
    parsedBody = typeof options?.body === 'string' ? JSON.parse(options.body) : (options?.body || {})
  } catch (e) {
    console.error('[EmailDetail] Failed to parse body:', e)
  }
  console.log('[EmailDetail] Sending body keys:', Object.keys(parsedBody))

  window.electronAPI.streamApi(
    urlString,
    { headers: options?.headers, body: parsedBody },
    {
      onChunk: (chunk: any) => {
        console.log('[EmailDetail] onChunk received:', typeof chunk, typeof chunk === 'string' ? chunk.substring(0, 80) : chunk)
        if (typeof chunk === 'string') {
          writer.write(new TextEncoder().encode(chunk))
        } else if (chunk.type === 'text') {
          writer.write(new TextEncoder().encode(chunk.text || ''))
        }
      },
      onFinish: () => {
        console.log('[EmailDetail] onFinish called - closing writer')
        writer.close()
      },
      onError: (err: any) => {
        console.error('[EmailDetail] onError called:', err)
        writer.abort(err)
      }
    }
  )

  return Promise.resolve(new Response(readable, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  }))
}

const { completion: aiCompletion, complete: completeAiDraft } = useCompletion({
  api: '/api/ai/reply',
  streamProtocol: 'text',
  fetch: ipcStreamFetch,
  onFinish: () => {
    console.log('[EmailDetail] useCompletion onFinish - setting draftState to drafted')
    draftState.value = 'drafted'
    nextTick(() => {
      if (draftTextareaRef.value) draftTextareaRef.value.scrollTop = draftTextareaRef.value.scrollHeight
    })
  },
  onError: (err) => {
    console.error('[EmailDetail] useCompletion onError:', err)
    draftState.value = 'empty'
  }
})

watch(aiCompletion, (newVal) => {
  if (draftState.value === 'generating') {
    console.log('[EmailDetail] aiCompletion updated, length:', newVal.length)
    generatedDraft.value = newVal
    nextTick(() => {
      if (draftTextareaRef.value) draftTextareaRef.value.scrollTop = draftTextareaRef.value.scrollHeight
    })
  }
})

async function generateDraft() {
  if (draftState.value === 'generating') return
  console.log('[EmailDetail] generateDraft() called')

  draftState.value = 'generating'
  generatedDraft.value = ''

  // Truncate context to prevent Ollama 500 errors on massive emails
  const rawBody = selectedEmail.value ? selectedEmail.value.body : ''
  const context = rawBody.length > 4000 ? rawBody.slice(0, 4000) + '... (truncated)' : rawBody

  const prompt = instructionText.value.trim()
  console.log('[EmailDetail] prompt:', JSON.stringify(prompt))
  console.log('[EmailDetail] context length:', context.length)
  console.log('[EmailDetail] model:', settings.value.ollamaModel)

  let systemPrompt = 'You are an expert email drafting assistant. You are replying to the provided email thread context. Draft a concise and professional reply. ONLY output the email body. No subject line needed.'
  if (settings.value.customInstructions) {
    systemPrompt += `\n\nUSER CUSTOM INSTRUCTIONS (MUST FOLLOW):\n${settings.value.customInstructions}`
  }

  try {
    await completeAiDraft(prompt, {
      headers: {
        'x-ai-model': settings.value.ollamaModel
      },
      body: {
        prompt,
        system: systemPrompt,
        context
      }
    })
    console.log('[EmailDetail] completeAiDraft resolved successfully')
  } catch (e) {
    console.error('[EmailDetail] completeAiDraft threw:', e)
    draftState.value = 'empty'
  }
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
    <div v-if="showSummary" class="ai-summary-card" :class="{ 'is-loading': isGeneratingSummary }">
      <div class="summary-header">
        <div class="summary-header-left">
          <span class="summary-icon flex-center">
            <Sparkles :size="12" />
          </span>
          <span class="summary-label">{{ isGeneratingSummary ? 'AI is summarizing...' : 'Summary' }}</span>
        </div>
        <span class="read-time" v-if="aiSummaryData">{{ aiSummaryData.readTime }} min read</span>
      </div>

      <div class="summary-body" v-if="isGeneratingSummary">
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
      </div>

      <template v-else-if="aiSummaryData">
        <div class="summary-body">
          <p v-for="(point, i) in aiSummaryData.keyPoints" :key="i" class="summary-point">
            {{ point }}
          </p>
        </div>

        <div class="summary-signals" v-if="aiSummaryData.hasActionItems || aiSummaryData.hasMeeting || aiSummaryData.hasDeadline">
          <span v-if="aiSummaryData.hasActionItems" class="signal-tag action">
            <Zap :size="11" /> Action needed
          </span>
          <span v-if="aiSummaryData.hasMeeting" class="signal-tag meeting">
            <ClockIcon :size="11" /> Meeting
          </span>
          <span v-if="aiSummaryData.hasDeadline" class="signal-tag deadline">
            <ClockIcon :size="11" /> Time-sensitive
          </span>
        </div>
      </template>
    </div>

    <!-- On-Demand Summary Generation Placeholder -->
    <div v-else class="ai-summary-on-demand flex-center">
      <div class="on-demand-inner">
        <span class="on-demand-spark-icon flex-center"><Sparkles :size="13" /></span>
        <span class="on-demand-notice-text">Email summary is available</span>
        <button class="on-demand-gen-btn flex-center" @click="handleManualGenerate">
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

.is-loading {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 1px rgba(108, 92, 231, 0.2);
}

.spin {
  animation: spin 2s linear infinite;
  color: var(--primary-color);
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.skeleton-line {
  height: 14px;
  background: linear-gradient(90deg, var(--bg-primary) 25%, var(--border-color) 50%, var(--bg-primary) 75%);
  background-size: 200% 100%;
  animation: skeleton-loading 1.5s infinite;
  border-radius: 4px;
  margin-bottom: 8px;
  width: 100%;
}

.skeleton-line.short {
  width: 70%;
}

@keyframes skeleton-loading {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
</style>
