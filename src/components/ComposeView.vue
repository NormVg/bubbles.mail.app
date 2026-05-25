<script setup lang="ts">
import { ref, nextTick } from 'vue'
import {
  X, Send, Paperclip, Bold, Italic, Underline, List,
  ListOrdered, Link, Trash2, FileText, ChevronDown, Sparkles, Check, RefreshCw
} from '@lucide/vue'
import { useMail } from '../composables/useMail'

const { activeAccount, setViewMode } = useMail()

// ─── Previous view tracking ──────────────────────────────────────────────────
function goBack() { setViewMode('inbox') }

// ─── From account ────────────────────────────────────────────────────────────
const accounts = [
  'thenormvg@gmail.com',
  'vishnuarunkmgupta@gmail.com',
  'thealphaones.hq@gmail.com'
]
const fromAccount = ref(activeAccount.value)
const showFromDropdown = ref(false)

// ─── Recipients (To / CC / BCC) ─────────────────────────────────────────────
interface Chip { id: string; email: string; valid: boolean }
const toChips    = ref<Chip[]>([])
const ccChips    = ref<Chip[]>([])
const bccChips   = ref<Chip[]>([])
const toInput    = ref('')
const ccInput    = ref('')
const bccInput   = ref('')
const showCc     = ref(false)
const showBcc    = ref(false)

const toInputRef  = ref<HTMLInputElement | null>(null)
const ccInputRef  = ref<HTMLInputElement | null>(null)
const bccInputRef = ref<HTMLInputElement | null>(null)

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

function addChip(chips: typeof toChips, input: typeof toInput, inputRef: typeof toInputRef) {
  const val = input.value.trim().replace(/,+$/, '')
  if (!val) return
  chips.value.push({ id: `${Date.now()}_${Math.random()}`, email: val, valid: isValidEmail(val) })
  input.value = ''
  nextTick(() => inputRef.value?.focus())
}

function removeChip(chips: typeof toChips, id: string) {
  chips.value = chips.value.filter(c => c.id !== id)
}

function handleChipKeydown(e: KeyboardEvent, chips: typeof toChips, input: typeof toInput, inputRef: typeof toInputRef) {
  if (e.key === 'Enter' || e.key === ',' || e.key === 'Tab') {
    e.preventDefault()
    addChip(chips, input, inputRef)
  } else if (e.key === 'Backspace' && !input.value && chips.value.length) {
    chips.value.pop()
  }
}

// ─── Subject ─────────────────────────────────────────────────────────────────
const subject = ref('')

// ─── Rich text body ──────────────────────────────────────────────────────────
const bodyRef = ref<HTMLDivElement | null>(null)
const bodyIsEmpty = ref(true)

function onBodyInput() {
  bodyIsEmpty.value = !bodyRef.value?.innerText.trim()
}

function execFmt(cmd: string, value?: string) {
  document.execCommand(cmd, false, value)
  bodyRef.value?.focus()
}

function insertLink() {
  const url = window.prompt('Enter URL', 'https://')
  if (url) execFmt('createLink', url)
}

// ─── Attachment state (UI only) ──────────────────────────────────────────────
const attachments = ref<string[]>([])
const fileInputRef = ref<HTMLInputElement | null>(null)

function triggerAttach() { fileInputRef.value?.click() }

function handleFileSelect(e: Event) {
  const files = (e.target as HTMLInputElement).files
  if (!files) return
  for (const f of Array.from(files)) {
    attachments.value.push(f.name)
  }
}

function removeAttachment(name: string) {
  attachments.value = attachments.value.filter(a => a !== name)
}

// ─── Send / draft ────────────────────────────────────────────────────────────
const sent      = ref(false)
const draftSaved = ref(false)

function handleSend() {
  sent.value = true
  setTimeout(() => goBack(), 1200)
}

// ─── Saved Drafts Management ─────────────────────────────────────────────────
interface SavedDraft {
  id: string
  subject: string
  to: string
  body: string
  toChips: Chip[]
  ccChips: Chip[]
  bccChips: Chip[]
  time: string
}

const showDraftsDropdown = ref(false)
const savedDrafts = ref<SavedDraft[]>([
  {
    id: 'd1',
    subject: 'Follow Up: Q2 Sprint Review Pipeline',
    to: 'william.smith@example.com',
    body: 'Hi William,\n\nI wanted to check on the Q2 desktop app compilation latency. We should confirm the database cache indices before testing tomorrow.\n\nBest,\nAlicia',
    toChips: [{ id: '1', email: 'william.smith@example.com', valid: true }],
    ccChips: [],
    bccChips: [],
    time: '2 hours ago'
  },
  {
    id: 'd2',
    subject: 'Tauri Platform Release Notes',
    to: 'engineering-list@bubbles.ai',
    body: 'Team,\n\nHere are the raw updates on the Tauri cross-platform security configurations for local SQLite databases. All pipelines have passed client tests.\n\nThanks,\nAlicia',
    toChips: [{ id: '2', email: 'engineering-list@bubbles.ai', valid: true }],
    ccChips: [],
    bccChips: [],
    time: 'Yesterday'
  }
])

function saveDraft() {
  const currentBody = bodyRef.value?.innerText || ''
  const toEmails = toChips.value.map(c => c.email).join(', ') || toInput.value
  
  const newDraft: SavedDraft = {
    id: `draft_${Date.now()}`,
    subject: subject.value || '(No Subject)',
    to: toEmails || 'Draft Recipient',
    body: currentBody,
    toChips: [...toChips.value],
    ccChips: [...ccChips.value],
    bccChips: [...bccChips.value],
    time: 'Just now'
  }
  
  savedDrafts.value.unshift(newDraft)
  
  draftSaved.value = true
  setTimeout(() => { draftSaved.value = false }, 2500)
}

function loadDraft(draft: SavedDraft) {
  subject.value = draft.subject
  toChips.value = [...draft.toChips]
  ccChips.value = [...draft.ccChips]
  bccChips.value = [...draft.bccChips]
  
  showCc.value = draft.ccChips.length > 0
  showBcc.value = draft.bccChips.length > 0
  
  if (bodyRef.value) {
    bodyRef.value.innerText = draft.body
    bodyIsEmpty.value = !draft.body.trim()
  }
  
  showDraftsDropdown.value = false
}

// ─── Bubbles AI Copilot State ────────────────────────────────────────────────
const showAiPanel = ref(true)
const aiActiveTab = ref<'scratch' | 'refine'>('scratch')
const aiPrompt = ref('')
const aiTone = ref('professional')
const isAiGenerating = ref(false)
const aiStatusText = ref('Standing by')
const aiResultSubject = ref('')
const aiResultBody = ref('')

const getSenderName = () => {
  if (fromAccount.value === 'thenormvg@gmail.com') return 'Norm'
  if (fromAccount.value === 'vishnuarunkmgupta@gmail.com') return 'Vishnu Gupta'
  return 'HQ Team'
}

const aiTemplates = [
  { label: 'Project Sync', text: 'Request a brief sync tomorrow regarding our QA progress and Tauri builds.' },
  { label: 'Follow Up', text: 'Follow up on the strategic partnership proposal sent last week.' },
  { label: 'Polite Decline', text: 'Politely decline the speaker invitation for next month\'s tech summit.' },
  { label: 'Urgent Alert', text: 'Escalate a production incident concerning socket timeouts and high CPU.' }
]

function selectTemplate(text: string) {
  aiPrompt.value = text
  generateAiDraft()
}

function buildCustomDraft(prompt: string, tone: string) {
  const p = prompt.trim()
  const name = getSenderName()
  let subjectStr = ''
  let bodyStr = ''
  
  if (tone === 'professional') {
    subjectStr = `Discussion on: ${p.slice(0, 30)}${p.length > 30 ? '...' : ''}`
    bodyStr = `Hi,\n\nI hope you are doing well.\n\nI am writing to discuss "${p}". I would appreciate it if we could schedule a brief moment to connect on this, or if you could provide additional details.\n\nPlease let me know your thoughts or availability.\n\nBest regards,\n${name}`
  } else if (tone === 'friendly') {
    subjectStr = `Quick chat about ${p.slice(0, 25)}${p.length > 25 ? '...' : ''}`
    bodyStr = `Hi there!\n\nI hope you're having an awesome week. I wanted to reach out quickly to check in regarding "${p}".\n\nLet me know if you have some free time to sync up soon!\n\nWarmly,\n${name}`
  } else if (tone === 'direct') {
    subjectStr = `Update: ${p.slice(0, 30)}${p.length > 30 ? '...' : ''}`
    bodyStr = `Hello,\n\nRegarding "${p}":\n\nPlease let me know the current status at your earliest convenience so we can align before our next sprint milestone.\n\nThanks,\n${name}`
  } else {
    subjectStr = `Strategic Opportunity: ${p.slice(0, 25)}${p.length > 25 ? '...' : ''}`
    bodyStr = `Dear partner,\n\nI wanted to share a compelling opportunity regarding "${p}".\n\nBy leveraging this approach, we can streamline resource allocation, bypass build bottlenecks, and secure substantial value. I'd love to share the blueprint during a brief sync.\n\nBest regards,\n${name}`
  }
  return { subject: subjectStr, body: bodyStr }
}

function buildRefinedDraft(editorText: string, tone: string) {
  const name = getSenderName()
  let bodyStr = ''
  
  if (tone === 'professional') {
    bodyStr = `Dear Recipient,\n\nI hope this message finds you well. I am writing to convey the following details:\n\n${editorText}\n\nThank you for your time, and please let me know if you require any additional information.\n\nBest regards,\n${name}`
  } else if (tone === 'friendly') {
    bodyStr = `Hi there!\n\nI hope you're having a great day. I wanted to reach out and share a quick update:\n\n${editorText}\n\nLet me know what you think when you get a chance!\n\nWarmly,\n${name}`
  } else if (tone === 'direct') {
    bodyStr = `Hello,\n\nHere are the updated details for your review:\n\n${editorText}\n\nLet me know if there are any immediate blocking items.\n\nThanks,\n${name}`
  } else {
    bodyStr = `Hi,\n\nI wanted to bring this technical summary to your attention:\n\n${editorText}\n\nImplementing these adjustments will significantly optimize our production builds and latency rates. I look forward to working together on this.\n\nBest regards,\n${name}`
  }
  return { subject: subject.value || 'Refined Subject', body: bodyStr }
}

function generateAiDraft() {
  if (aiActiveTab.value === 'scratch' && !aiPrompt.value.trim()) return
  
  isAiGenerating.value = true
  aiResultBody.value = ''
  aiResultSubject.value = ''
  
  const statusMessages = [
    'Scanning workspace variables...',
    'Formulating phrasing structure...',
    'Injecting architectural vocabulary...',
    'Perfecting structural flow...'
  ]
  
  let msgIdx = 0
  aiStatusText.value = statusMessages[msgIdx]
  
  const statusInterval = setInterval(() => {
    msgIdx++
    if (msgIdx < statusMessages.length) {
      aiStatusText.value = statusMessages[msgIdx]
    } else {
      clearInterval(statusInterval)
      
      let finalSubject = ''
      let finalBody = ''
      
      if (aiActiveTab.value === 'scratch') {
        const lowerPrompt = aiPrompt.value.toLowerCase()
        if (lowerPrompt.includes('sync') || lowerPrompt.includes('qa')) {
          finalSubject = 'Technical Alignment Sync - QA & Core Pipelines'
          finalBody = `Hi Team,\n\nI hope you're having a productive week. I'd like to schedule a brief alignment sync tomorrow to review our recent QA milestones and core developer infrastructure improvements.\n\nSpecifically, I'd like to align on:\n1. Post-launch QA coverage targets.\n2. Key bottlenecks in our Tauri cross-platform build pipeline.\n3. Allocating resources for SQL database local caching.\n\nPlease let me know if a 30-minute slot at 10:00 AM or 2:00 PM works for you.\n\nBest,\n${getSenderName()}`
        } else if (lowerPrompt.includes('decline') || lowerPrompt.includes('invite')) {
          finalSubject = 'Invitation to Speak - Tech Conference'
          finalBody = `Hi there,\n\nThank you sincerely for the invitation to speak at the upcoming technology summit next month. It sounds like an incredible gathering of developers and designers.\n\nUnfortunately, due to intensive production milestones and our upcoming Q2 launch schedule, I will have to politely decline this time. I want to ensure my team has undivided support during this critical sprint.\n\nLet's definitely stay in touch for future events!\n\nBest regards,\n${getSenderName()}`
        } else if (lowerPrompt.includes('proposal') || lowerPrompt.includes('follow')) {
          finalSubject = 'Following Up: Strategic Partnership Proposal'
          finalBody = `Hi there,\n\nI wanted to send a quick note to follow up on the strategic partnership proposal I sent over last Tuesday. We are currently finalizing our advisory roadmap and would love to hear your initial thoughts.\n\nI'm happy to hop on a quick call to address any questions you or your team might have.\n\nLooking forward to hearing from you.\n\nWarmly,\n${getSenderName()}`
        } else if (lowerPrompt.includes('urgent') || lowerPrompt.includes('alert') || lowerPrompt.includes('incident')) {
          finalSubject = 'URGENT: Production Server Uptime Warning'
          finalBody = `Hi Team,\n\nI am escalating a critical system report concerning our production instance latency. We are experiencing intermittent socket timeouts and the CPU utilization has crossed 92%.\n\nAll on-call developers, please join the primary incident bridge immediately to debug the caching layers.\n\nThank you for your prompt response,\n${getSenderName()}`
        } else {
          const { subject: s, body: b } = buildCustomDraft(aiPrompt.value, aiTone.value)
          finalSubject = s
          finalBody = b
        }
      } else {
        const editorText = bodyRef.value?.innerText || ''
        if (!editorText.trim()) {
          isAiGenerating.value = false
          aiStatusText.value = 'Standing by'
          alert('Please write some text in the email editor first to refine.')
          return
        }
        const { subject: s, body: b } = buildRefinedDraft(editorText, aiTone.value)
        finalSubject = s
        finalBody = b
      }
      
      typeText(finalBody, finalSubject)
    }
  }, 350)
}

let typingInterval: NodeJS.Timeout | null = null

function typeText(targetBody: string, targetSubject: string) {
  if (typingInterval) clearInterval(typingInterval)
  
  aiResultBody.value = ''
  aiResultSubject.value = ''
  aiStatusText.value = 'Streaming draft...'
  
  let bodyIdx = 0
  let subjectIdx = 0
  
  if (targetSubject) {
    const sInt = setInterval(() => {
      if (subjectIdx < targetSubject.length) {
        aiResultSubject.value += targetSubject[subjectIdx]
        subjectIdx++
      } else {
        clearInterval(sInt)
        startBodyStreaming()
      }
    }, 8)
  } else {
    startBodyStreaming()
  }

  function startBodyStreaming() {
    typingInterval = setInterval(() => {
      if (bodyIdx < targetBody.length) {
        const chunk = targetBody.slice(bodyIdx, bodyIdx + 5)
        aiResultBody.value += chunk
        bodyIdx += chunk.length
      } else {
        if (typingInterval) clearInterval(typingInterval)
        isAiGenerating.value = false
        aiStatusText.value = 'Draft complete!'
      }
    }, 12)
  }
}

function applyAiDraft() {
  if (bodyRef.value) {
    bodyRef.value.innerText = aiResultBody.value
    bodyIsEmpty.value = false
  }
  if (aiResultSubject.value) {
    subject.value = aiResultSubject.value
  }
}
</script>

<template>
  <section class="pane pane-right compose-root">

    <!-- ── Top Bar ──────────────────────────────────────────────────────────── -->
    <div class="compose-topbar">
      <div class="compose-topbar-left">
        <!-- Cross Button Removed as Requested -->
        <span class="compose-title">New Email</span>
        
        <!-- Interactive Saved Drafts Button with Dropdown -->
        <div class="drafts-dropdown-wrapper">
          <button class="view-drafts-topbar-btn" @click="showDraftsDropdown = !showDraftsDropdown">
            <FileText :size="13" />
            <span>Saved Drafts</span>
            <ChevronDown :size="12" class="dropdown-chevron" />
          </button>
          
          <Transition name="dropdown">
            <div v-if="showDraftsDropdown" class="drafts-dropdown">
              <div class="drafts-dropdown-header">
                <span>Select a Saved Draft</span>
              </div>
              <div v-if="savedDrafts.length === 0" class="draft-option empty-drafts">
                No drafts saved yet.
              </div>
              <div
                v-for="draft in savedDrafts"
                :key="draft.id"
                class="draft-option"
                @click="loadDraft(draft)"
              >
                <div class="draft-option-title">{{ draft.subject || '(No Subject)' }}</div>
                <div class="draft-option-meta">
                  <span class="draft-to-lbl">To: {{ draft.to || 'No recipient' }}</span>
                  <span class="draft-time">{{ draft.time }}</span>
                </div>
              </div>
            </div>
          </Transition>
        </div>
      </div>

      <div class="compose-topbar-right">
        <span v-if="draftSaved" class="draft-saved-label">
          <FileText :size="12" /> Draft saved
        </span>
        
        <!-- Premium AI Sidebar Toggle Button -->
        <button 
          class="ai-toggle-topbar-btn" 
          :class="{ 'active': showAiPanel }"
          @click="showAiPanel = !showAiPanel"
          title="Toggle Bubbles.ai Copilot"
        >
          <Sparkles :size="14" class="sparkle-icon" />
          <span>Bubbles.ai</span>
        </button>
      </div>
    </div>

    <!-- ── Compose Sheet Splitted Layout ────────────────────────────────────── -->
    <div class="compose-sheet-wrapper">
      
      <!-- MAIN EMAIL SHEET -->
      <div class="compose-sheet">

        <!-- FROM -->
        <div class="field-row">
          <span class="field-label">From</span>
          <div class="from-selector" @click="showFromDropdown = !showFromDropdown">
            <span class="from-email">{{ fromAccount }}</span>
            <ChevronDown :size="13" class="from-chevron" />
            <Transition name="dropdown">
              <div v-if="showFromDropdown" class="from-dropdown">
                <div
                  v-for="acc in accounts"
                  :key="acc"
                  class="from-option"
                  :class="{ 'active': acc === fromAccount }"
                  @click.stop="fromAccount = acc; showFromDropdown = false"
                >
                  {{ acc }}
                </div>
              </div>
            </Transition>
          </div>
        </div>

        <div class="field-divider" />

        <!-- TO -->
        <div class="field-row chip-row">
          <span class="field-label">To</span>
          <div class="chips-input-area" @click="toInputRef?.focus()">
            <TransitionGroup name="chip-anim" tag="div" class="chips-list">
              <span
                v-for="chip in toChips"
                :key="chip.id"
                class="chip"
                :class="{ 'chip-invalid': !chip.valid }"
              >
                {{ chip.email }}
                <button class="chip-remove" @click.stop="removeChip(toChips, chip.id)">
                  <X :size="10" />
                </button>
              </span>
            </TransitionGroup>
            <input
              ref="toInputRef"
              v-model="toInput"
              class="chip-text-input"
              type="text"
              placeholder="Add recipient..."
              @keydown="handleChipKeydown($event, toChips, toInput, toInputRef)"
              @blur="addChip(toChips, toInput, toInputRef)"
            />
          </div>
          <div class="cc-bcc-toggles">
            <button v-if="!showCc"  class="cc-toggle-btn" @click="showCc = true">Cc</button>
            <button v-if="!showBcc" class="cc-toggle-btn" @click="showBcc = true">Bcc</button>
          </div>
        </div>

        <!-- CC -->
        <Transition name="field-slide">
          <div v-if="showCc">
            <div class="field-divider" />
            <div class="field-row chip-row">
              <span class="field-label">Cc</span>
              <div class="chips-input-area" @click="ccInputRef?.focus()">
                <TransitionGroup name="chip-anim" tag="div" class="chips-list">
                  <span v-for="chip in ccChips" :key="chip.id" class="chip" :class="{ 'chip-invalid': !chip.valid }">
                    {{ chip.email }}
                    <button class="chip-remove" @click.stop="removeChip(ccChips, chip.id)"><X :size="10" /></button>
                  </span>
                </TransitionGroup>
                <input
                  ref="ccInputRef"
                  v-model="ccInput"
                  class="chip-text-input"
                  type="text"
                  placeholder="Add CC recipient..."
                  @keydown="handleChipKeydown($event, ccChips, ccInput, ccInputRef)"
                  @blur="addChip(ccChips, ccInput, ccInputRef)"
                />
              </div>
              <button class="cc-toggle-btn close-cc" @click="showCc = false; ccChips = []"><X :size="12" /></button>
            </div>
          </div>
        </Transition>

        <!-- BCC -->
        <Transition name="field-slide">
          <div v-if="showBcc">
            <div class="field-divider" />
            <div class="field-row chip-row">
              <span class="field-label">Bcc</span>
              <div class="chips-input-area" @click="bccInputRef?.focus()">
                <TransitionGroup name="chip-anim" tag="div" class="chips-list">
                  <span v-for="chip in bccChips" :key="chip.id" class="chip" :class="{ 'chip-invalid': !chip.valid }">
                    {{ chip.email }}
                    <button class="chip-remove" @click.stop="removeChip(bccChips, chip.id)"><X :size="10" /></button>
                  </span>
                </TransitionGroup>
                <input
                  ref="bccInputRef"
                  v-model="bccInput"
                  class="chip-text-input"
                  type="text"
                  placeholder="Add BCC recipient..."
                  @keydown="handleChipKeydown($event, bccChips, bccInput, bccInputRef)"
                  @blur="addChip(bccChips, bccInput, bccInputRef)"
                />
              </div>
              <button class="cc-toggle-btn close-cc" @click="showBcc = false; bccChips = []"><X :size="12" /></button>
            </div>
          </div>
        </Transition>

        <div class="field-divider" />

        <!-- SUBJECT -->
        <div class="field-row">
          <span class="field-label">Subject</span>
          <input
            v-model="subject"
            class="subject-input"
            type="text"
            placeholder="Subject"
          />
        </div>

        <div class="field-divider" />

        <!-- FORMATTING TOOLBAR -->
        <div class="format-toolbar">
          <button class="fmt-btn" title="Bold"          @click="execFmt('bold')"><Bold :size="14" /></button>
          <button class="fmt-btn" title="Italic"        @click="execFmt('italic')"><Italic :size="14" /></button>
          <button class="fmt-btn" title="Underline"     @click="execFmt('underline')"><Underline :size="14" /></button>
          <div class="fmt-sep" />
          <button class="fmt-btn" title="Bullet list"   @click="execFmt('insertUnorderedList')"><List :size="14" /></button>
          <button class="fmt-btn" title="Numbered list" @click="execFmt('insertOrderedList')"><ListOrdered :size="14" /></button>
          <div class="fmt-sep" />
          <button class="fmt-btn" title="Insert link"   @click="insertLink"><Link :size="14" /></button>
        </div>

        <!-- BODY -->
        <div class="body-wrapper">
          <div
            ref="bodyRef"
            class="body-editor"
            contenteditable="true"
            @input="onBodyInput"
            spellcheck="true"
          />
          <span v-if="bodyIsEmpty" class="body-placeholder">Write your message here…</span>
        </div>

        <!-- ATTACHMENTS -->
        <div v-if="attachments.length" class="attachments-list">
          <div v-for="name in attachments" :key="name" class="attachment-chip">
            <Paperclip :size="11" />
            <span>{{ name }}</span>
            <button class="chip-remove" @click="removeAttachment(name)"><X :size="10" /></button>
          </div>
        </div>

        <!-- BOTTOM BAR -->
        <div class="compose-bottom-bar">
          <div class="bottom-left">
            <button class="bottom-btn" title="Attach file" @click="triggerAttach">
              <Paperclip :size="15" />
            </button>
            <input ref="fileInputRef" type="file" multiple class="hidden-file-input" @change="handleFileSelect" />
          </div>

          <div class="bottom-right">
            <button class="bottom-btn text-btn" @click="saveDraft" title="Save draft">
              <FileText :size="14" /> Save draft
            </button>
            <button class="bottom-btn discard-btn" @click="goBack" title="Discard">
              <Trash2 :size="14" /> Discard
            </button>
            <button class="send-btn-bottom" :class="{ sent }" @click="handleSend">
              <Send :size="14" />
              {{ sent ? 'Sent!' : 'Send' }}
            </button>
          </div>
        </div>

      </div>

      <!-- BUBBLES AI COPILOT SIDEBAR -->
      <Transition name="panel-slide">
        <div v-if="showAiPanel" class="ai-copilot-pane">
          
          <!-- AI Header -->
          <div class="ai-pane-header">
            <div class="ai-header-left">
              <Sparkles class="ai-glowing-icon" :size="15" />
              <span class="ai-pane-title">Bubbles.ai Copilot</span>
            </div>
            <div class="ai-header-right">
              <span class="ai-pulse-dot" />
              <button class="ai-close-btn" @click="showAiPanel = false">
                <X :size="13" />
              </button>
            </div>
          </div>

          <!-- AI Navigation Tabs -->
          <div class="ai-tabs-row">
            <button 
              class="ai-tab-btn" 
              :class="{ 'active': aiActiveTab === 'scratch' }"
              @click="aiActiveTab = 'scratch'"
            >
              Write Draft
            </button>
            <button 
              class="ai-tab-btn" 
              :class="{ 'active': aiActiveTab === 'refine' }"
              @click="aiActiveTab = 'refine'"
            >
              Refine Phrasing
            </button>
          </div>

          <!-- Scrolling AI Body Container -->
          <div class="ai-pane-scroll-container">
            
            <!-- Quick Actions Prompt Templates (Only for Scratch tab) -->
            <div v-if="aiActiveTab === 'scratch'" class="ai-section">
              <h4 class="ai-section-title">Quick Action Scenarios</h4>
              <div class="ai-template-grid">
                <button
                  v-for="tpl in aiTemplates"
                  :key="tpl.label"
                  class="ai-template-chip"
                  @click="selectTemplate(tpl.text)"
                  :disabled="isAiGenerating"
                >
                  ✨ {{ tpl.label }}
                </button>
              </div>
            </div>

            <!-- Main Input Prompt -->
            <div class="ai-section">
              <h4 class="ai-section-title">
                {{ aiActiveTab === 'scratch' ? 'Tell AI what to write' : 'Select desired adjustment' }}
              </h4>
              
              <textarea
                v-if="aiActiveTab === 'scratch'"
                v-model="aiPrompt"
                class="ai-prompt-input"
                placeholder="Example: Propose meeting at 2 PM to sync on build progress..."
                :disabled="isAiGenerating"
              />
              
              <div v-else class="ai-refine-info-card">
                <Sparkles :size="13" class="glow-info-icon" />
                <span>Refining will format your current email body text below to match the selected tone.</span>
              </div>
            </div>

            <!-- AI Tone Selectors -->
            <div class="ai-section">
              <h4 class="ai-section-title">Select Phrasing Tone</h4>
              <div class="ai-tone-chips-row">
                <button 
                  v-for="tone in ['professional', 'friendly', 'direct', 'persuasive']"
                  :key="tone"
                  class="ai-tone-chip"
                  :class="{ 'active': aiTone === tone }"
                  @click="aiTone = tone"
                  :disabled="isAiGenerating"
                >
                  {{ tone.charAt(0).toUpperCase() + tone.slice(1) }}
                </button>
              </div>
            </div>

            <!-- Generate Action Button -->
            <div class="ai-generate-wrapper">
              <button 
                class="ai-generate-btn" 
                :class="{ 'generating': isAiGenerating }"
                @click="generateAiDraft"
                :disabled="isAiGenerating || (aiActiveTab === 'scratch' && !aiPrompt.trim())"
              >
                <RefreshCw v-if="isAiGenerating" :size="13" class="spin-icon" />
                <Sparkles v-else :size="13" />
                <span>{{ isAiGenerating ? 'Drafting...' : 'Generate AI Copy' }}</span>
              </button>
            </div>

            <!-- Generated AI Draft Results Panel -->
            <div v-if="aiResultBody || isAiGenerating" class="ai-result-section">
              <div class="ai-result-header">
                <span class="ai-result-label">Generated Suggestion</span>
                <span class="ai-status-pill" :class="{ 'thinking': isAiGenerating }">
                  {{ aiStatusText }}
                </span>
              </div>

              <!-- AI Results Box -->
              <div class="ai-result-box">
                <div v-if="aiResultSubject" class="ai-result-subject-row">
                  <span class="res-sub-lbl">Subject:</span>
                  <span class="res-sub-val">{{ aiResultSubject }}</span>
                </div>
                <div class="ai-result-body-content">{{ aiResultBody }}</div>
              </div>

              <!-- AI Application Controls -->
              <div class="ai-apply-row">
                <button 
                  class="ai-apply-btn" 
                  @click="applyAiDraft"
                  :disabled="isAiGenerating"
                >
                  <Check :size="13" />
                  <span>Insert into Email</span>
                </button>
              </div>
            </div>

          </div>

        </div>
      </Transition>

    </div>

  </section>
</template>

<style scoped>
/* ── Root ────────────────────────────────────────────────────────────────── */
.compose-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-secondary);
  overflow: hidden;
}

/* ── Top bar ─────────────────────────────────────────────────────────────── */
.compose-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 56px;
  flex-shrink: 0;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
}

.compose-topbar-left {
  display: flex;
  align-items: center;
  position: relative;
}

.compose-topbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.compose-title {
  font-family: var(--font-title);
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
}

/* ── Saved Drafts Button & Dropdown Styles ── */
.drafts-dropdown-wrapper {
  position: relative;
}

.view-drafts-topbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: 0.76rem;
  font-weight: 550;
  cursor: pointer;
  margin-left: 14px;
  transition: all var(--transition-fast);
}

.view-drafts-topbar-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border-color: var(--text-muted);
}

.dropdown-chevron {
  color: var(--text-muted);
  opacity: 0.7;
}

.drafts-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  left: 14px;
  z-index: 100;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  min-width: 320px;
  max-width: 360px;
}

.drafts-dropdown-header {
  padding: 10px 14px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  font-family: var(--font-sans);
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.draft-option {
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-color);
  cursor: pointer;
  transition: background var(--transition-fast);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.draft-option:last-child {
  border-bottom: none;
}

.draft-option:hover {
  background: var(--bg-secondary);
}

.draft-option-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.draft-option-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.72rem;
  color: var(--text-muted);
  gap: 12px;
}

.draft-to-lbl {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 170px;
}

.draft-time {
  font-weight: 450;
  flex-shrink: 0;
}

.empty-drafts {
  padding: 16px;
  font-size: 0.8rem;
  color: var(--text-muted);
  text-align: center;
  cursor: default;
}

.empty-drafts:hover {
  background: transparent;
}

/* Draft Saved Label */
.draft-saved-label {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--text-muted);
  animation: fadeInOut 2s ease forwards;
}
@keyframes fadeInOut {
  0%   { opacity: 0; transform: translateY(4px); }
  15%  { opacity: 1; transform: translateY(0); }
  80%  { opacity: 1; }
  100% { opacity: 0; }
}

.ai-toggle-topbar-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 18px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.ai-toggle-topbar-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border-color: var(--text-muted);
}

.ai-toggle-topbar-btn.active {
  background: var(--text-primary);
  color: var(--bg-primary);
  border-color: var(--text-primary);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.ai-toggle-topbar-btn.active .sparkle-icon {
  animation: pulse-sparkle 2s infinite ease-in-out;
}

@keyframes pulse-sparkle {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.2); opacity: 0.8; }
  100% { transform: scale(1); opacity: 1; }
}

/* ── Split Layout Wrapper ────────────────────────────────────────────────── */
.compose-sheet-wrapper {
  flex: 1;
  overflow: hidden;
  padding: 20px 20px;
  display: flex;
  gap: 20px;
  height: calc(100% - 56px);
}

.compose-sheet {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  flex: 1;
  height: 100%;
  min-height: 0;
  overflow-y: auto;
}

/* ── Field rows ──────────────────────────────────────────────────────────── */
.field-divider {
  height: 1px;
  background: var(--border-color);
  margin: 0 16px;
}

.field-row {
  display: flex;
  align-items: center;
  padding: 0 16px;
  min-height: 46px;
  gap: 10px;
  position: relative;
}

.field-label {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-muted);
  flex-shrink: 0;
  width: 46px;
}

/* ── From selector ───────────────────────────────────────────────────────── */
.from-selector {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  position: relative;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background var(--transition-fast);
  user-select: none;
}
.from-selector:hover { background: var(--bg-secondary); }

.from-email {
  font-size: 0.83rem;
  font-weight: 500;
  color: var(--text-primary);
}
.from-chevron { color: var(--text-muted); }

.from-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  z-index: 100;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  overflow: hidden;
  min-width: 240px;
}

.from-option {
  padding: 10px 14px;
  font-size: 0.82rem;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}
.from-option:hover { background: var(--bg-secondary); color: var(--text-primary); }
.from-option.active { background: var(--bg-tertiary); color: var(--text-primary); font-weight: 500; }

/* ── Chips ───────────────────────────────────────────────────────────────── */
.chip-row { flex-wrap: wrap; align-items: flex-start; padding-top: 8px; padding-bottom: 8px; }

.chips-input-area {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  flex: 1;
  cursor: text;
  min-height: 30px;
}

.chips-list {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px 3px 10px;
  border-radius: 20px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-primary);
  transition: all var(--transition-fast);
}
.chip-invalid {
  background: hsl(0, 80%, 96%);
  border-color: hsl(0, 80%, 85%);
  color: hsl(0, 65%, 45%);
}

.chip-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  color: var(--text-muted);
  padding: 1px;
  border-radius: 50%;
  transition: color var(--transition-fast), background var(--transition-fast);
}
.chip-remove:hover { color: var(--text-primary); background: var(--border-color); }

.chip-text-input {
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--font-sans);
  font-size: 0.83rem;
  color: var(--text-primary);
  min-width: 180px;
  flex: 1;
}
.chip-text-input::placeholder { color: var(--text-muted); }

.cc-bcc-toggles {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.cc-toggle-btn {
  padding: 3px 9px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: transparent;
  font-size: 0.73rem;
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--transition-fast);
  display: flex;
  align-items: center;
}
.cc-toggle-btn:hover { background: var(--bg-secondary); color: var(--text-primary); }
.close-cc { border-color: transparent; }

/* ── Subject ─────────────────────────────────────────────────────────────── */
.subject-input {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-family: var(--font-sans);
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--text-primary);
}
.subject-input::placeholder { color: var(--text-muted); font-weight: 400; }

/* ── Formatting toolbar ──────────────────────────────────────────────────── */
.format-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 12px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.fmt-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 28px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}
.fmt-btn:hover { background: var(--bg-secondary); color: var(--text-primary); }

.fmt-sep {
  width: 1px;
  height: 18px;
  background: var(--border-color);
  margin: 0 4px;
}

/* ── Body editor ─────────────────────────────────────────────────────────── */
.body-wrapper {
  position: relative;
  flex: 1;
  min-height: 220px;
  display: flex;
  flex-direction: column;
}

.body-editor {
  flex: 1;
  padding: 16px;
  font-family: var(--font-sans);
  font-size: 0.88rem;
  line-height: 1.7;
  color: var(--text-primary);
  outline: none;
  min-height: 220px;
}

.body-placeholder {
  position: absolute;
  top: 16px;
  left: 16px;
  font-size: 0.88rem;
  color: var(--text-muted);
  pointer-events: none;
  user-select: none;
}

/* ── Attachments ─────────────────────────────────────────────────────────── */
.attachments-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 16px;
  border-top: 1px solid var(--border-color);
}

.attachment-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.hidden-file-input { display: none; }

/* ── Bottom bar ──────────────────────────────────────────────────────────── */
.compose-bottom-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-top: 1px solid var(--border-color);
  flex-shrink: 0;
  gap: 8px;
  background: var(--bg-primary);
}

.bottom-left { display: flex; align-items: center; gap: 6px; }
.bottom-right { display: flex; align-items: center; gap: 8px; }

.bottom-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.bottom-btn:hover { background: var(--bg-secondary); color: var(--text-primary); }

.bottom-btn.text-btn {
  width: auto;
  padding: 0 12px;
  gap: 5px;
  font-family: var(--font-sans);
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-secondary);
}
.bottom-btn.text-btn:hover { color: var(--text-primary); }

.bottom-btn.discard-btn {
  width: auto;
  padding: 0 12px;
  gap: 5px;
  font-family: var(--font-sans);
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-muted);
}
.bottom-btn.discard-btn:hover { color: hsl(0, 60%, 50%); background: hsl(0, 80%, 97%); }

.send-btn-bottom {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 20px;
  border-radius: 20px;
  border: none;
  background: var(--text-primary);
  color: var(--bg-primary);
  font-family: var(--font-sans);
  font-size: 0.82rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
.send-btn-bottom:hover { opacity: 0.88; transform: translateY(-1px); box-shadow: 0 4px 14px rgba(0,0,0,0.18); }
.send-btn-bottom.sent { background: hsl(145, 50%, 42%); }

/* ── BUBBLES AI COPILOT SIDEBAR ─────────────────────────────────────────── */
.ai-copilot-pane {
  width: 360px;
  flex-shrink: 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  position: relative;
}

/* AI Header */
.ai-pane-header {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.ai-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ai-glowing-icon {
  color: var(--text-primary);
  animation: glow-animation 2.5s infinite ease-in-out;
}

@keyframes glow-animation {
  0% { opacity: 0.8; transform: scale(0.98); }
  50% { opacity: 1; transform: scale(1.05); filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.15)); }
  100% { opacity: 0.8; transform: scale(0.98); }
}

.ai-pane-title {
  font-family: var(--font-title);
  font-size: 0.88rem;
  font-weight: 650;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.ai-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.ai-pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: hsl(145, 60%, 45%);
  box-shadow: 0 0 8px hsl(145, 65%, 45%);
  animation: pulse-dot 1.8s infinite ease-in-out;
}

@keyframes pulse-dot {
  0% { transform: scale(0.8); opacity: 0.5; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.8); opacity: 0.5; }
}

.ai-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all var(--transition-fast);
}
.ai-close-btn:hover { background: var(--bg-secondary); color: var(--text-primary); }

/* AI Navigation Tabs */
.ai-tabs-row {
  height: 38px;
  display: flex;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  padding: 3px;
  gap: 2px;
  flex-shrink: 0;
}

.ai-tab-btn {
  flex: 1;
  border: none;
  background: transparent;
  font-family: var(--font-sans);
  font-size: 0.76rem;
  font-weight: 550;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: 6px;
  transition: all var(--transition-fast);
}

.ai-tab-btn:hover { color: var(--text-primary); }
.ai-tab-btn.active {
  background: var(--bg-primary);
  color: var(--text-primary);
  box-shadow: 0 1px 4px rgba(0,0,0,0.06);
}

/* Scrolling Container */
.ai-pane-scroll-container {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.ai-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ai-section-title {
  font-family: var(--font-sans);
  font-size: 0.72rem;
  font-weight: 600;
  text-transform: uppercase;
  color: var(--text-muted);
  letter-spacing: 0.03em;
}

/* Quick Action templates chips grid */
.ai-template-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 6px;
}

.ai-template-chip {
  padding: 8px 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-family: var(--font-sans);
  font-size: 0.74rem;
  font-weight: 500;
  color: var(--text-secondary);
  text-align: left;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.ai-template-chip:hover {
  background: var(--bg-primary);
  border-color: var(--text-muted);
  color: var(--text-primary);
  transform: translateY(-0.5px);
}

/* Textarea input */
.ai-prompt-input {
  width: 100%;
  height: 86px;
  padding: 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  font-family: var(--font-sans);
  font-size: 0.8rem;
  color: var(--text-primary);
  outline: none;
  resize: none;
  line-height: 1.4;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}

.ai-prompt-input:focus {
  border-color: var(--text-muted);
  background: var(--bg-primary);
}

.ai-refine-info-card {
  display: flex;
  gap: 8px;
  padding: 10px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  font-size: 0.78rem;
  line-height: 1.4;
  color: var(--text-secondary);
}
.glow-info-icon { color: var(--text-muted); flex-shrink: 0; margin-top: 1px; }

/* Tone Chips list */
.ai-tone-chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.ai-tone-chip {
  padding: 5px 12px;
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.ai-tone-chip:hover {
  border-color: var(--text-muted);
  color: var(--text-primary);
}

.ai-tone-chip.active {
  background: var(--text-primary);
  color: var(--bg-primary);
  border-color: var(--text-primary);
}

/* Action button */
.ai-generate-wrapper {
  margin-top: 4px;
}

.ai-generate-btn {
  width: 100%;
  height: 38px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  background: var(--text-primary);
  color: var(--bg-primary);
  border: none;
  border-radius: 19px;
  font-family: var(--font-sans);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.ai-generate-btn:hover:not(:disabled) {
  opacity: 0.88;
  transform: translateY(-0.5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.ai-generate-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.spin-icon {
  animation: spin 1.2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* AI Drafting results box */
.ai-result-section {
  display: flex;
  flex-direction: column;
  gap: 10px;
  border-top: 1px dashed var(--border-color);
  padding-top: 16px;
  margin-top: 4px;
}

.ai-result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ai-result-label {
  font-family: var(--font-sans);
  font-size: 0.74rem;
  font-weight: 650;
  color: var(--text-primary);
}

.ai-status-pill {
  font-size: 0.68rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 10px;
  background: var(--bg-secondary);
  color: var(--text-muted);
  transition: all var(--transition-fast);
}

.ai-status-pill.thinking {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  animation: pulse-pill 1.2s infinite ease-in-out;
}

@keyframes pulse-pill {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}

.ai-result-box {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 260px;
  overflow-y: auto;
}

.ai-result-subject-row {
  display: flex;
  gap: 6px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 8px;
  font-size: 0.8rem;
  font-weight: 600;
}

.res-sub-lbl { color: var(--text-muted); }
.res-sub-val { color: var(--text-primary); }

.ai-result-body-content {
  font-family: var(--font-sans);
  font-size: 0.8rem;
  line-height: 1.6;
  color: var(--text-secondary);
  white-space: pre-wrap;
}

.ai-apply-row {
  display: flex;
  justify-content: flex-end;
}

.ai-apply-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  font-family: var(--font-sans);
  font-size: 0.76rem;
  font-weight: 600;
  color: var(--text-primary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.ai-apply-btn:hover {
  background: var(--bg-tertiary);
  border-color: var(--text-muted);
}

/* ── Transitions ─────────────────────────────────────────────────────────── */
.dropdown-enter-active, .dropdown-leave-active {
  transition: opacity 0.14s ease, transform 0.14s ease;
}
.dropdown-enter-from, .dropdown-leave-to {
  opacity: 0; transform: translateY(-4px) scale(0.98);
}

.chip-anim-enter-active { transition: all 0.15s ease; }
.chip-anim-enter-from   { opacity: 0; transform: scale(0.85); }
.chip-anim-leave-active { transition: all 0.12s ease; }
.chip-anim-leave-to     { opacity: 0; transform: scale(0.8); }

.field-slide-enter-active { transition: all 0.18s ease; }
.field-slide-enter-from   { opacity: 0; transform: translateY(-6px); }
.field-slide-leave-active { transition: all 0.14s ease; }
.field-slide-leave-to     { opacity: 0; }

.panel-slide-enter-active, .panel-slide-leave-active {
  transition: all 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}
.panel-slide-enter-from, .panel-slide-leave-to {
  opacity: 0;
  transform: translateX(12px);
  width: 0px !important;
  margin-left: -20px;
}
</style>
