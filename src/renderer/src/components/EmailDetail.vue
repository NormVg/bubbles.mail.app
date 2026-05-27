<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { 
  Sparkles, 
  Zap, 
  Clock as ClockIcon
} from '@lucide/vue'
import { useMail } from '../composables/useMail'
import AiDraftPanel from './common/AiDraftPanel.vue'
import { useDictation } from '../composables/useDictation'
import { useSettings } from '../composables/useSettings'

const { selectedEmail } = useMail()
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


// Simulate voice input dictation with waveform animations

const { startVoiceDictation, stopVoiceDictation } = useDictation((result) => {
  instructionText.value = result
})

function startDictation() {
  draftState.value = 'dictating'
  startVoiceDictation()
}

function stopDictation() {
  stopVoiceDictation()
  draftState.value = 'empty'
}

function getDraftByPersonality(recipientName: string, subject: string, userPrompt: string, attachmentNotice: string) {
  const tone = settings.value.agentPersonality
  const custom = settings.value.customInstructions ? `\n\n[System Guidelines: ${settings.value.customInstructions}]` : ''
  
  if (tone === 'friendly') {
    return `Subject: Re: ${subject}

Hey ${recipientName}! 😊

Thanks so much for reaching out!

${userPrompt ? `Regarding what you asked: "${userPrompt}"\n\nI just went through the details and everything sounds absolutely awesome! Let's definitely find some time next week to catch up and align on the specifics. We can jump on a video call to hash it out.` : `I just completed a quick review of the thread details! Everything looks super exciting. The team is making awesome progress and I'm really looking forward to our alignment sync tomorrow at 10:00 AM.`}${attachmentNotice}

Let's make it happen! Have a fantastic day!

Warmly,
Alicia${custom}`
  }
  
  if (tone === 'creative') {
    return `Subject: Re: ${subject}

Hi ${recipientName}! ✨

Wow, thank you for sending this over! This is brilliant! 🚀

${userPrompt ? `I love the direction of: "${userPrompt}"\n\nThis sparks some really cool ideas! Let's definitely coordinate our calendars so we can do a deep-dive brainstorming session on these specifics next week.` : `I've been reviewing our milestones and the sprint progression looks incredibly stellar! 🌟 Let's gather all our creative thoughts and map out the next launch milestones during our sync tomorrow at 10:00 AM.`}${attachmentNotice}

Can't wait to collaborate and shape this further!

Best and brightest,
Alicia 🥂${custom}`
  }
  
  if (tone === 'concise') {
    return `Subject: Re: ${subject}

${recipientName}:

${userPrompt ? `Re: "${userPrompt}"\n\n- Details reviewed. Path forward is approved.\n- Action: Schedule 10m sync next week to lock in specifics.` : `- Milestones reviewed: Sprint progression is stable.\n- Action: Attending technical alignment sync tomorrow 10:00 AM (Conference Room B).`}${attachmentNotice}

- Alicia${custom}`
  }
  
  // Default: 'professional'
  return `Subject: Re: ${subject}

Hi ${recipientName},

Thank you for your message.

${userPrompt ? `Regarding your inquiry: "${userPrompt}"

I have completed a review of the parameters, and the proposed path forward is appropriate. Let us ensure we coordinate our calendars to review the technical details next week.` : `I have reviewed the milestone parameters and the current sprint progression is highly satisfactory. I will prepare my feedback regarding the API specifications and will join you tomorrow at 10:00 AM in Conference Room B.`}${attachmentNotice}

I look forward to our alignment sync.

Best regards,
Alicia${custom}`
}

// Generate draft reply with premium real-time streaming
function generateDraft() {
  if (draftState.value === 'generating') return
  
  const recipientName = selectedEmail.value ? selectedEmail.value.sender.split(' ')[0] : 'there'
  const subject = selectedEmail.value ? selectedEmail.value.subject.replace(/^Re:\s*/i, '') : 'Project Sync'
  const userPrompt = instructionText.value.trim()
  
  // Format attachment details to list contextually in draft body
  let attachmentNotice = ''
  if (attachedFiles.value.length > 0) {
    attachmentNotice = `\n\nI have attached the following file${attachedFiles.value.length > 1 ? 's' : ''} for your reference:\n` + 
      attachedFiles.value.map(f => `- ${f.name}`).join('\n')
  }

  const targetText = getDraftByPersonality(recipientName, subject, userPrompt, attachmentNotice)

  // Begin Streaming
  draftState.value = 'generating'
  generatedDraft.value = ''
  
  let index = 0
  const totalLength = targetText.length
  
  const streamInterval = setInterval(() => {
    // Append organic chunks
    const chunkSize = Math.floor(Math.random() * 3) + 2
    const nextChunk = targetText.slice(index, index + chunkSize)
    generatedDraft.value += nextChunk
    index += chunkSize
    
    // Auto scroll
    nextTick(() => {
      if (draftTextareaRef.value) {
        draftTextareaRef.value.scrollTop = draftTextareaRef.value.scrollHeight
      }
    })

    if (index >= totalLength) {
      clearInterval(streamInterval)
      draftState.value = 'drafted'
    }
  }, 16)
}

// Actions in drafted review state
const showSuccessOverlay = ref(false)

function sendFinalEmail() {
  showSuccessOverlay.value = true
  setTimeout(() => {
    showSuccessOverlay.value = false
    discardDraft()
  }, 2200)
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
