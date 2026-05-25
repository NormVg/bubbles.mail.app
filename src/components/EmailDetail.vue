<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue'
import { 
  Sparkles, 
  Zap, 
  Clock as ClockIcon, 
  Mic, 
  MicOff, 
  Wand2, 
  Send, 
  Trash2, 
  Check, 
  RefreshCw,
  Paperclip,
  FileText,
  X,
  CornerUpRight
} from '@lucide/vue'
import { useMail } from '../composables/useMail'
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
const isRecording = ref(false)
const recordingProgress = ref(0)
const waveBars = ref<number[]>([12, 24, 8, 16, 28, 14, 20, 10, 18, 6, 22, 12, 16])
let recordInterval: any = null

const draftTextareaRef = ref<HTMLTextAreaElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const replyTextareaRef = ref<HTMLTextAreaElement | null>(null)

function adjustReplyTextareaHeight() {
  const textarea = replyTextareaRef.value
  if (!textarea) return
  textarea.style.height = 'auto'
  textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
}

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
function triggerFileSelect() {
  if (fileInputRef.value) {
    fileInputRef.value.click()
  }
}

// Handle file attachment changes
function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files) {
    for (let i = 0; i < target.files.length; i++) {
      const file = target.files[i]
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
      attachedFiles.value.push({
        name: file.name,
        size: `${sizeMB} MB`,
        type: file.type
      })
    }
  }
}

function removeFile(index: number) {
  attachedFiles.value.splice(index, 1)
}

// Simulate voice input dictation with waveform animations
function startVoiceInput() {
  if (draftState.value === 'generating') return
  
  if (draftState.value === 'dictating') {
    stopVoiceInput()
    return
  }

  draftState.value = 'dictating'
  isRecording.value = true
  recordingProgress.value = 0
  
  recordInterval = setInterval(() => {
    recordingProgress.value += 1
    // Pulse wave heights randomly
    waveBars.value = waveBars.value.map(() => Math.floor(Math.random() * 26) + 6)
    
    // Stop and transcribe after 3.2 seconds automatically
    if (recordingProgress.value >= 32) {
      stopVoiceInput()
    }
  }, 100)
}

function stopVoiceInput() {
  if (recordInterval) {
    clearInterval(recordInterval)
    recordInterval = null
  }
  isRecording.value = false
  
  if (selectedEmail.value) {
    const sender = selectedEmail.value.sender.split(' ')[0]
    if (selectedEmail.value.subject.includes('Meeting') || selectedEmail.value.subject.includes('Roadmap')) {
      instructionText.value = `Tell ${sender} that I will definitely join the sync tomorrow. Let's make sure we walk through the milestones first, and see if we can host it on Google Meet instead.`
    } else if (selectedEmail.value.subject.includes('Budget')) {
      instructionText.value = `Say that I've looked at the QA sheet and 15% seems a bit high to cut. Let's schedule a brief 10 minute call to negotiate.`
    } else {
      instructionText.value = `Draft a friendly response thanking ${sender} for the update and confirming that I've reviewed the details. everything looks solid.`
    }
  }
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

    <!-- Email Body Text -->
    <div class="email-body">
      {{ selectedEmail.body }}
    </div>

    <div class="detail-divider"></div>

    <!-- Quick Reply Box with Drafting Stage & Voice Input -->
    <div class="quick-reply-box">
      <!-- Success Overlay -->
      <div v-if="showSuccessOverlay" class="send-success-overlay flex-center animate-fade-in">
        <div class="success-content flex-center">
          <span class="success-icon flex-center"><Check :size="18" /></span>
          <span class="success-message">Email sent successfully!</span>
        </div>
      </div>

      <!-- Header -->
      <div class="reply-header">
        <div class="reply-header-left">
          <span class="reply-label">Reply</span>
          <span class="reply-target">to {{ selectedEmail.sender.split(' ')[0] }}</span>
        </div>
        <span class="reply-stage-badge" :class="draftState">
          {{ draftState === 'empty' ? 'Drafting Stage' : draftState === 'dictating' ? 'Voice Input' : draftState === 'generating' ? 'Drafting...' : 'Review Draft' }}
        </span>
      </div>

      <!-- STATE 1: Empty state / Instructions Entry (Screenshot 1 Theme with synchronized inline mic state) -->
      <div v-if="draftState === 'empty' || draftState === 'dictating'" class="input-stage-container animate-fade-in">
        <!-- Hidden file selector input -->
        <input 
          type="file" 
          ref="fileInputRef" 
          multiple 
          @change="handleFileChange" 
          style="display: none" 
        />

        <div class="double-box-outer" :class="{ 'is-recording': draftState === 'dictating' }">
          <div class="reply-input-card">
            <!-- Render Attached File Chips inside card if any -->
            <div v-if="attachedFiles.length > 0 && draftState !== 'dictating'" class="attachment-chips-row animate-fade-in">
              <div 
                v-for="(file, i) in attachedFiles" 
                :key="i" 
                class="attached-chip"
              >
                <FileText :size="11" class="chip-file-icon" />
                <span class="chip-file-name" :title="file.name">{{ file.name }}</span>
                <span class="chip-file-size">{{ file.size }}</span>
                <button type="button" class="remove-chip-btn flex-center" @click="removeFile(i)">
                  <X :size="10" />
                </button>
              </div>
            </div>

            <!-- Textarea matching screenshot, hidden during dictation -->
            <textarea 
              v-if="draftState !== 'dictating'"
              ref="replyTextareaRef"
              v-model="instructionText"
              placeholder="Dump you mind, let me manage" 
              class="reply-textarea"
              rows="1"
              @input="adjustReplyTextareaHeight"
            ></textarea>

            <!-- Dictating Waveform View Inside Card when Recording (Same as Chat!) -->
            <div class="dictating-pulse-row animate-fade-in" v-else>
              <span class="recording-pulsing-dot"></span>
              <span class="dictating-status-text">Listening... Speak now</span>
              <div class="mini-voice-wave flex-center">
                <span class="wave-pillar p1"></span>
                <span class="wave-pillar p2"></span>
                <span class="wave-pillar p3"></span>
                <span class="wave-pillar p4"></span>
              </div>
              <button type="button" class="stop-dictate-btn" @click="stopVoiceInput">Stop</button>
            </div>

            <!-- Bottom toolbar nested inside card -->
            <div class="card-toolbar-row">
              <div class="toolbar-left-actions">
                <!-- Paperclip button -->
                <button 
                  type="button" 
                  class="toolbar-icon-btn flex-center" 
                  title="Attach files"
                  @click="triggerFileSelect"
                  :disabled="draftState === 'dictating'"
                >
                  <Paperclip :size="15" />
                </button>

                <!-- Microphone button -->
                <button 
                  type="button" 
                  class="toolbar-icon-btn flex-center" 
                  :class="{ 'recording-active': draftState === 'dictating' }"
                  title="Voice dictation"
                  @click="startVoiceInput"
                >
                  <Mic v-if="draftState !== 'dictating'" :size="15" />
                  <MicOff v-else :size="15" />
                </button>
              </div>

              <!-- Auto-draft outline + primary curved-arrow send buttons -->
              <div class="toolbar-right-actions">
                <button 
                  type="button" 
                  class="card-outline-draft-btn flex-center" 
                  @click="generateDraft"
                  :disabled="draftState === 'dictating'"
                  title="Auto-draft instantly from context"
                >
                  <Sparkles :size="12" /> Auto-draft
                </button>

                <button 
                  type="button" 
                  class="card-send-btn flex-center"
                  :disabled="(!instructionText.trim() && attachedFiles.length === 0) || draftState === 'dictating'"
                  @click="generateDraft"
                  title="Draft with instructions"
                >
                  <CornerUpRight :size="14" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <p class="copywriting-hint">
          Your context above is a guide. AI will generate a professional draft for you to review and edit before sending.
        </p>
      </div>

      <!-- STATE 3 & 4: Generating or Drafted (Both show the proposed draft card!) -->
      <div v-else-if="draftState === 'generating' || draftState === 'drafted'" class="drafted-stage-container animate-fade-in">
        <div class="draft-review-card" :class="{ 'is-streaming': draftState === 'generating' }">
          <div class="draft-card-header">
            <span class="draft-card-title">
              <Sparkles v-if="draftState === 'generating'" class="streaming-sparkle" :size="12" />
              <Wand2 v-else :size="12" />
              {{ draftState === 'generating' ? 'AI is drafting response...' : 'Proposed Email Draft' }}
            </span>
            <span class="draft-editable-hint">
              {{ draftState === 'generating' ? 'Streaming...' : 'Directly editable' }}
            </span>
          </div>
          <div class="draft-textarea-wrapper">
            <textarea 
              ref="draftTextareaRef"
              v-model="generatedDraft"
              class="draft-review-textarea"
              placeholder="AI is compiling context and writing draft..."
              :disabled="draftState === 'generating'"
            ></textarea>
          </div>
        </div>
        
        <p class="draft-stage-copywriting">
          {{ draftState === 'generating' ? 'Please wait while AI processes the thread context and streams the email draft.' : 'Review the email above. You can tweak it directly inside the card, update your guidelines below, or click Send.' }}
        </p>

        <!-- Refine Prompt Inline input (Only visible when drafting is complete!) -->
        <div v-if="draftState === 'drafted'" class="refine-row">
          <input 
            v-model="instructionText"
            type="text" 
            placeholder="Ask AI to refine draft (e.g., 'make it more formal' or 'shorten')..."
            class="refine-input"
            @keyup.enter="generateDraft"
          />
          <button 
            type="button" 
            class="refine-submit-btn flex-center" 
            @click="generateDraft"
            :disabled="!instructionText.trim()"
          >
            <RefreshCw :size="12" /> Update Draft
          </button>
        </div>

        <div class="drafted-actions">
          <button 
            type="button" 
            class="discard-draft-btn flex-center" 
            @click="discardDraft"
            :disabled="draftState === 'generating'"
          >
            <Trash2 :size="13" /> Discard
          </button>
          
          <button 
            type="button" 
            class="send-final-btn flex-center" 
            @click="sendFinalEmail"
            :disabled="draftState === 'generating'"
          >
            <Send :size="13" /> Send Email
          </button>
        </div>
      </div>
    </div>
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
  white-space: pre-wrap;
}

/* Quick Reply Box with Drafting Stage */
.quick-reply-box {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background-color: var(--bg-secondary);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 8px;
  position: relative;
  overflow: hidden;
  transition: all var(--transition-normal);
}

.send-success-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.96);
  z-index: 10;
  backdrop-filter: blur(4px);
}

.success-content {
  flex-direction: column;
  gap: 12px;
  animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes scaleIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

.success-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: hsl(142, 70%, 90%);
  color: hsl(142, 70%, 25%);
  border: 1px solid hsl(142, 70%, 80%);
}

.success-message {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.reply-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 8px;
  margin-bottom: 4px;
}

.reply-header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.reply-label {
  font-weight: 600;
  color: var(--text-primary);
}

.reply-target {
  color: var(--text-muted);
}

.reply-stage-badge {
  font-size: 0.68rem;
  font-weight: 500;
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  color: var(--text-secondary);
}

.reply-stage-badge.dictating {
  background-color: hsl(0, 100%, 97%);
  border-color: hsl(0, 100%, 90%);
  color: hsl(0, 85%, 45%);
}

.reply-stage-badge.generating {
  background-color: hsl(250, 100%, 98%);
  border-color: hsl(250, 100%, 92%);
  color: hsl(250, 80%, 45%);
}

.reply-stage-badge.drafted {
  background-color: var(--text-primary);
  border-color: var(--text-primary);
  color: var(--bg-primary);
}

/* Empty / Card Input Stage CSS (Screenshot 1 Card) */
.double-box-outer {
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 5px;
  width: 100%;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.double-box-outer:focus-within {
  border-color: var(--text-primary);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
}

.double-box-outer.is-recording {
  background-color: hsl(0, 100%, 97%);
  border-color: hsl(0, 80%, 90%);
}

.reply-input-card {
  border: 1px solid var(--border-color);
  border-radius: 11px;
  background-color: var(--bg-primary);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: var(--shadow-sm);
  transition: background-color var(--transition-fast);
}

.double-box-outer.is-recording .reply-input-card {
  background-color: hsl(0, 100%, 99%);
  border-color: hsl(0, 80%, 90%);
}

.reply-textarea {
  width: 100%;
  min-height: 24px;
  max-height: 120px;
  border: none;
  background: transparent;
  padding: 0;
  font-family: var(--font-sans);
  font-size: 0.88rem;
  line-height: 1.45;
  color: var(--text-primary);
  outline: none;
  resize: none;
}

.reply-textarea::placeholder {
  color: var(--text-muted);
}

/* Attached File Chips Inside Card */
.attachment-chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 2px;
}

.attached-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 0.72rem;
  color: var(--text-primary);
  max-width: 170px;
  overflow: hidden;
}

.chip-file-icon {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.chip-file-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.chip-file-size {
  color: var(--text-muted);
  font-size: 0.65rem;
  flex-shrink: 0;
}

.remove-chip-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 1px;
  border-radius: 50%;
  flex-shrink: 0;
}

.remove-chip-btn:hover {
  background-color: var(--border-color);
  color: var(--text-primary);
}

/* Card toolbar matching screenshot */
.card-toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid transparent;
}

.toolbar-left-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-icon-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.toolbar-icon-btn:hover:not(:disabled) {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.toolbar-icon-btn.recording-active {
  background-color: hsl(0, 85%, 95%);
  color: hsl(0, 85%, 45%);
}

.toolbar-right-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.card-outline-draft-btn {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  border-radius: 6px;
  padding: 5px 12px;
  font-family: var(--font-sans);
  font-size: 0.78rem;
  font-weight: 500;
  cursor: pointer;
  gap: 5px;
  transition: all var(--transition-fast);
  height: 28px;
}

.card-outline-draft-btn:hover:not(:disabled) {
  border-color: var(--text-primary);
  color: var(--text-primary);
  background-color: var(--bg-secondary);
}

.card-outline-draft-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.card-send-btn {
  width: 32px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.reply-input-card:focus-within .card-send-btn {
  background-color: var(--text-primary);
  border-color: var(--text-primary);
  color: var(--bg-primary);
}

.card-send-btn:hover:not(:disabled) {
  background-color: var(--text-primary);
  border-color: var(--text-primary);
  color: var(--bg-primary);
}

.card-send-btn:disabled {
  opacity: 0.35;
  background-color: var(--bg-secondary) !important;
  border-color: var(--border-color) !important;
  color: var(--text-muted) !important;
  cursor: not-allowed;
}

.copywriting-hint {
  font-size: 0.72rem;
  color: var(--text-muted);
  line-height: 1.4;
  margin-top: 4px;
}

/* Compact Audio Recording design same as chat */
.dictating-pulse-row {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 24px;
}

.recording-pulsing-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: hsl(0, 85%, 50%);
  animation: voicePulse 1.2s infinite ease-in-out;
}

@keyframes voicePulse {
  0% { transform: scale(0.85); opacity: 0.5; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(0.85); opacity: 0.5; }
}

.dictating-status-text {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-primary);
}

.mini-voice-wave {
  display: flex;
  align-items: center;
  gap: 2.5px;
  height: 14px;
}

.wave-pillar {
  width: 2px;
  background-color: var(--text-primary);
  border-radius: 1px;
  animation: moveWave 1s infinite alternate ease-in-out;
}

.p1 { height: 6px; animation-delay: 0.1s; }
.p2 { height: 12px; animation-delay: 0.3s; }
.p3 { height: 8px; animation-delay: 0.2s; }
.p4 { height: 10px; animation-delay: 0.4s; }

@keyframes moveWave {
  from { transform: scaleY(0.6); }
  to { transform: scaleY(1.3); }
}

.stop-dictate-btn {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  font-family: var(--font-sans);
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  margin-left: auto;
}

.stop-dictate-btn:hover {
  background-color: var(--border-color);
}

/* Generating Stage CSS */
.generating-stage-container {
  padding: 30px 0;
}

.generation-loader {
  flex-direction: column;
  gap: 12px;
}

.spinning-sparkle {
  color: var(--text-primary);
  animation: spinSparkle 1.8s infinite linear;
}

@keyframes spinSparkle {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.loader-text {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.progress-bar-track {
  width: 160px;
  height: 3px;
  background-color: var(--border-color);
  border-radius: 999px;
  overflow: hidden;
}

.progress-bar-fill {
  width: 40%;
  height: 100%;
  background-color: var(--text-primary);
  border-radius: 999px;
  animation: fillTrack 1.2s infinite ease-in-out;
}

@keyframes fillTrack {
  0% { transform: translateX(-100%); width: 30%; }
  50% { width: 60%; }
  100% { transform: translateX(200%); width: 30%; }
}

/* Drafted Stage CSS */
.draft-review-card {
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--bg-primary);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  transition: all var(--transition-fast);
}

.draft-review-card.is-streaming {
  border-color: var(--text-muted);
  box-shadow: 0 0 0 1px var(--border-color);
}

.draft-card-header {
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  padding: 6px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.draft-card-title {
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 4px;
}

.draft-editable-hint {
  font-size: 0.65rem;
  color: var(--text-muted);
}

.draft-textarea-wrapper {
  position: relative;
  display: flex;
  width: 100%;
}

.draft-review-textarea {
  border: none;
  background-color: var(--bg-primary);
  font-family: var(--font-sans);
  font-size: 0.82rem;
  line-height: 1.55;
  color: var(--text-primary);
  padding: 12px;
  min-height: 145px;
  width: 100%;
  outline: none;
  resize: vertical;
}

.draft-stage-copywriting {
  font-size: 0.72rem;
  color: var(--text-muted);
  line-height: 1.4;
  margin-top: 4px;
}

/* Sparkles animation while streaming */
.streaming-sparkle {
  color: var(--primary-color);
  animation: pulseSparkle 1.4s infinite ease-in-out;
}

@keyframes pulseSparkle {
  0% { transform: scale(0.9); opacity: 0.5; }
  50% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.5; }
}

/* Refinement Input inside Draft Stage */
.refine-row {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.refine-input {
  flex: 1;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0 10px;
  height: 32px;
  font-family: var(--font-sans);
  font-size: 0.78rem;
  color: var(--text-primary);
  background-color: var(--bg-primary);
  outline: none;
  transition: border-color var(--transition-fast);
}

.refine-input:focus {
  border-color: var(--text-primary);
}

.refine-submit-btn {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 500;
  border-radius: 6px;
  padding: 0 12px;
  height: 32px;
  cursor: pointer;
  gap: 4px;
  transition: all var(--transition-fast);
}

.refine-submit-btn:hover:not(:disabled) {
  border-color: var(--text-primary);
  color: var(--text-primary);
}

.refine-submit-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.drafted-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
  gap: 8px;
}

.discard-draft-btn {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  border-radius: 8px;
  padding: 7px 14px;
  font-family: var(--font-sans);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  gap: 6px;
  transition: all var(--transition-fast);
}

.discard-draft-btn:hover:not(:disabled) {
  border-color: hsl(0, 80%, 80%);
  color: hsl(0, 80%, 40%);
  background-color: hsl(0, 100%, 98%);
}

.discard-draft-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.send-final-btn {
  background-color: var(--text-primary);
  color: var(--bg-primary);
  border: none;
  border-radius: 8px;
  padding: 7px 20px;
  font-family: var(--font-sans);
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  gap: 6px;
  transition: all var(--transition-fast);
}

.send-final-btn:hover:not(:disabled) {
  background-color: var(--text-secondary);
}

.send-final-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.animate-fade-in {
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

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
