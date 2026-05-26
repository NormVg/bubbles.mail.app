<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { Ref } from 'vue'
import {
  Bold,
  Check,
  ChevronDown,
  
  FileText,
  Italic,
  Link,
  List,
  ListOrdered,
  
  
  Paperclip,
  RefreshCw,
  Send,
  Sparkles,
  SquarePen,
  Trash2,
  UnderlineIcon,
  Wand2,
  X
} from '@lucide/vue'
import { useMail } from '../composables/useMail'
import AiInputBox from './common/AiInputBox.vue'
import { useDictation } from '../composables/useDictation'

const { activeAccount, setViewMode } = useMail()

interface Chip {
  id: string
  email: string
  valid: boolean
}

interface SavedDraft {
  id: string
  subject: string
  body: string
  toChips: Chip[]
  ccChips: Chip[]
  bccChips: Chip[]
  time: string
}

interface AttachedFile {
  name: string
  size: string
  type: string
}

type DraftState = 'empty' | 'dictating' | 'generating' | 'drafted'

const fromAccounts = [
  'thenormvg@gmail.com',
  'vishnuarunkmgupta@gmail.com',
  'thealphaones.hq@gmail.com'
]

const fromAccount = ref(activeAccount.value)
const showFromDropdown = ref(false)
const showDraftsDropdown = ref(false)
const showCc = ref(false)
const showBcc = ref(false)
const showAiPanel = ref(true)

const toChips = ref<Chip[]>([])
const ccChips = ref<Chip[]>([])
const bccChips = ref<Chip[]>([])
const toInput = ref('')
const ccInput = ref('')
const bccInput = ref('')

const toInputRef = ref<HTMLInputElement | null>(null)
const ccInputRef = ref<HTMLInputElement | null>(null)
const bccInputRef = ref<HTMLInputElement | null>(null)
const bodyTextareaRef = ref<HTMLTextAreaElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const aiFileInputRef = ref<HTMLInputElement | null>(null)
const aiPromptRef = ref<HTMLTextAreaElement | null>(null)
const aiDraftRef = ref<HTMLTextAreaElement | null>(null)

const subject = ref('')
const body = ref('')
const attachments = ref<AttachedFile[]>([])
const sent = ref(false)
const draftSaved = ref(false)

const aiDraftState = ref<DraftState>('empty')
const aiPrompt = ref('')
const aiDraft = ref('')
const aiAttachedFiles = ref<AttachedFile[]>([])
const aiShowApplied = ref(false)

const savedDrafts = ref<SavedDraft[]>([
  {
    id: 'd1',
    subject: 'Follow Up: Q2 Sprint Review Pipeline',
    body: 'Hi William,\n\nI wanted to check on the Q2 desktop app compilation latency. We should confirm the database cache indices before testing tomorrow.\n\nBest,\nAlicia',
    toChips: [{ id: 'draft_1', email: 'william.smith@example.com', valid: true }],
    ccChips: [],
    bccChips: [],
    time: '2 hours ago'
  },
  {
    id: 'd2',
    subject: 'Tauri Platform Release Notes',
    body: 'Team,\n\nHere are the raw updates on the Tauri cross-platform security configurations for local SQLite databases. All pipelines have passed client tests.\n\nThanks,\nAlicia',
    toChips: [{ id: 'draft_2', email: 'engineering-list@bubbles.ai', valid: true }],
    ccChips: [],
    bccChips: [],
    time: 'Yesterday'
  }
])

const canSend = computed(() => {
  const recipients = toChips.value.some(chip => chip.valid)
  return recipients && (subject.value.trim().length > 0 || body.value.trim().length > 0)
})

const visibleFromAccount = computed(() => fromAccount.value || activeAccount.value)

function goBack() {
  setViewMode('inbox')
}

function selectFromAccount(account: string) {
  fromAccount.value = account
  showFromDropdown.value = false
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

function chipId() {
  return `chip_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

function addChip(chips: Ref<Chip[]>, input: Ref<string>, inputRef?: Ref<HTMLInputElement | null>) {
  const values = input.value
    .split(/[,\n;]/)
    .map(value => value.trim())
    .filter(Boolean)

  if (!values.length) return

  const existing = new Set(chips.value.map(chip => chip.email.toLowerCase()))
  for (const email of values) {
    if (!existing.has(email.toLowerCase())) {
      chips.value.push({ id: chipId(), email, valid: isValidEmail(email) })
      existing.add(email.toLowerCase())
    }
  }

  input.value = ''
  nextTick(() => inputRef?.value?.focus())
}

function removeChip(chips: Ref<Chip[]>, id: string) {
  chips.value = chips.value.filter(chip => chip.id !== id)
}

function handleChipKeydown(event: KeyboardEvent, chips: Ref<Chip[]>, input: Ref<string>, inputRef: Ref<HTMLInputElement | null>) {
  if (event.key === 'Enter' || event.key === ',' || event.key === 'Tab') {
    event.preventDefault()
    addChip(chips, input, inputRef)
    return
  }

  if (event.key === 'Backspace' && !input.value && chips.value.length) {
    chips.value.pop()
  }
}

function formatFile(file: File): AttachedFile {
  const kb = file.size / 1024
  return {
    name: file.name,
    size: kb < 1024 ? `${Math.max(1, Math.round(kb))} KB` : `${(kb / 1024).toFixed(1)} MB`,
    type: file.type
  }
}

function triggerAttach() {
  fileInputRef.value?.click()
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files) return
  attachments.value.push(...Array.from(files).map(formatFile))
  input.value = ''
}

function removeAttachment(index: number) {
  attachments.value.splice(index, 1)
}


function handleAiFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files) return
  aiAttachedFiles.value.push(...Array.from(files).map(formatFile))
  input.value = ''
}


function autosizeTextarea(textarea: HTMLTextAreaElement | null, maxHeight = 420) {
  if (!textarea) return
  textarea.style.height = 'auto'
  textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`
  textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden'
}

function onBodyInput() {
  nextTick(() => autosizeTextarea(bodyTextareaRef.value, 520))
}


function onAiDraftInput() {
  nextTick(() => autosizeTextarea(aiDraftRef.value, 380))
}

function wrapSelection(prefix: string, suffix = '') {
  const textarea = bodyTextareaRef.value
  if (!textarea) return

  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = body.value.slice(start, end)
  const nextValue = `${prefix}${selected || 'text'}${suffix}`
  textarea.setRangeText(nextValue, start, end, 'select')
  body.value = textarea.value
  textarea.focus()
  onBodyInput()
}

function insertLinePrefix(prefix: string) {
  const textarea = bodyTextareaRef.value
  if (!textarea) return

  const start = textarea.selectionStart
  const lineStart = body.value.lastIndexOf('\n', start - 1) + 1
  textarea.setRangeText(prefix, lineStart, lineStart, 'end')
  body.value = textarea.value
  textarea.focus()
  onBodyInput()
}

function insertLink() {
  const url = window.prompt('Enter URL', 'https://')
  if (!url) return
  wrapSelection('[', `](${url})`)
}

function saveDraft() {
  const newDraft: SavedDraft = {
    id: `draft_${Date.now()}`,
    subject: subject.value.trim() || '(No Subject)',
    body: body.value,
    toChips: toChips.value.map(chip => ({ ...chip })),
    ccChips: ccChips.value.map(chip => ({ ...chip })),
    bccChips: bccChips.value.map(chip => ({ ...chip })),
    time: 'Just now'
  }

  savedDrafts.value.unshift(newDraft)
  draftSaved.value = true
  window.setTimeout(() => {
    draftSaved.value = false
  }, 1800)
}

function loadDraft(draft: SavedDraft) {
  subject.value = draft.subject === '(No Subject)' ? '' : draft.subject
  body.value = draft.body
  toChips.value = draft.toChips.map(chip => ({ ...chip }))
  ccChips.value = draft.ccChips.map(chip => ({ ...chip }))
  bccChips.value = draft.bccChips.map(chip => ({ ...chip }))
  showCc.value = ccChips.value.length > 0
  showBcc.value = bccChips.value.length > 0
  showDraftsDropdown.value = false
  nextTick(() => autosizeTextarea(bodyTextareaRef.value, 520))
}

function startVoiceInput() {
  if (aiDraftState.value === 'generating') return
  aiDraftState.value = 'dictating'
}

function stopVoiceInput() {
  aiDraftState.value = 'empty'
  aiPrompt.value = aiPrompt.value.trim()
    ? aiPrompt.value
    : 'Draft a clear, warm email that confirms next steps and asks for a quick sync.'
  nextTick(() => autosizeTextarea(aiPromptRef.value, 160))
}

function senderName() {
  if (visibleFromAccount.value === 'thenormvg@gmail.com') return 'Norm'
  if (visibleFromAccount.value === 'vishnuarunkmgupta@gmail.com') return 'Vishnu Gupta'
  return 'HQ Team'
}

function buildAiDraft() {
  const prompt = aiPrompt.value.trim()
  const recipient = toChips.value[0]?.email.split('@')[0] || 'there'
  const name = senderName()
  const attachmentLine = aiAttachedFiles.value.length
    ? `\n\nI have included ${aiAttachedFiles.value.length === 1 ? 'the attached file' : 'the attached files'} for context.`
    : ''

  if (!prompt) {
    return `Subject: Quick update\n\nHi ${recipient},\n\nI hope this message finds you well. I wanted to reach out regarding our current priorities and make sure we are aligned on next steps.${attachmentLine}\n\nPlease let me know when you are available for a quick sync.\n\nBest regards,\n${name}`
  }

  if (/decline|invite|invitation/i.test(prompt)) {
    return `Subject: Re: Invitation\n\nHi ${recipient},\n\nThank you for the invitation. I appreciate you thinking of me, but I will need to politely decline this time due to current production milestones.${attachmentLine}\n\nPlease keep me in mind for future opportunities.\n\nBest regards,\n${name}`
  }

  if (/follow|proposal|partnership/i.test(prompt)) {
    return `Subject: Following up on the proposal\n\nHi ${recipient},\n\nI wanted to follow up on the proposal and see whether you had a chance to review the details. We are finalizing the next planning cycle and your feedback would be helpful.${attachmentLine}\n\nHappy to schedule a quick call this week if easier.\n\nBest,\n${name}`
  }

  if (/sync|qa|review|meeting/i.test(prompt)) {
    return `Subject: Technical alignment sync\n\nHi ${recipient},\n\nI would like to schedule a short alignment sync to review the current QA milestones, product priorities, and any blockers before the next release window.${attachmentLine}\n\nWould 10:00 AM or 2:00 PM work for you?\n\nBest,\n${name}`
  }

  return `Subject: ${prompt.slice(0, 48)}${prompt.length > 48 ? '...' : ''}\n\nHi ${recipient},\n\nI hope you are doing well. I am writing regarding "${prompt}".${attachmentLine}\n\nPlease let me know what timing works best for you, and I can coordinate from there.\n\nBest regards,\n${name}`
}

function generateAiDraft() {
  if (aiDraftState.value === 'generating') return

  aiDraftState.value = 'generating'
  aiDraft.value = ''
  const target = buildAiDraft()
  let index = 0

  const interval = window.setInterval(() => {
    const chunk = target.slice(index, index + 4)
    aiDraft.value += chunk
    index += chunk.length
    nextTick(() => {
      autosizeTextarea(aiDraftRef.value, 380)
      if (aiDraftRef.value) aiDraftRef.value.scrollTop = aiDraftRef.value.scrollHeight
    })

    if (index >= target.length) {
      window.clearInterval(interval)
      aiDraftState.value = 'drafted'
      nextTick(() => autosizeTextarea(aiDraftRef.value, 380))
    }
  }, 12)
}

function discardAiDraft() {
  aiPrompt.value = ''
  aiDraft.value = ''
  aiAttachedFiles.value = []
  aiDraftState.value = 'empty'
  nextTick(() => {
    autosizeTextarea(aiPromptRef.value, 160)
    autosizeTextarea(aiDraftRef.value, 380)
  })
}

function applyAiDraft() {
  const lines = aiDraft.value.split('\n')
  const subjectIndex = lines.findIndex(line => /^Subject:/i.test(line))

  if (subjectIndex >= 0) {
    subject.value = lines[subjectIndex].replace(/^Subject:\s*/i, '').trim()
    body.value = lines.slice(subjectIndex + 1).join('\n').trimStart()
  } else {
    body.value = aiDraft.value
  }

  aiShowApplied.value = true
  nextTick(() => autosizeTextarea(bodyTextareaRef.value, 520))
  window.setTimeout(() => {
    aiShowApplied.value = false
    discardAiDraft()
  }, 1200)
}

function handleSend() {
  if (!canSend.value) return
  sent.value = true
  window.setTimeout(() => {
    sent.value = false
    goBack()
  }, 900)
}
</script>

<template>
  <section class="pane pane-right compose-root">
    <div class="pane-header middle-header">
      <div class="header-left">
        <SquarePen :size="15" class="header-icon" />
        <span class="header-title">Compose</span>
      </div>

      <div class="header-right">
        <div class="drafts-menu">
          <button type="button" class="header-trigger-btn" @click="showDraftsDropdown = !showDraftsDropdown">
            <FileText :size="13" />
            <span>Saved Drafts</span>
            <ChevronDown :size="13" />
          </button>

          <Transition name="dropdown">
            <div v-if="showDraftsDropdown" class="drafts-dropdown">
              <button
                v-for="draft in savedDrafts"
                :key="draft.id"
                type="button"
                class="draft-item"
                @click="loadDraft(draft)"
              >
                <span class="draft-subject">{{ draft.subject }}</span>
                <span class="draft-meta">{{ draft.toChips[0]?.email || 'No recipient' }} · {{ draft.time }}</span>
              </button>
            </div>
          </Transition>
        </div>

        <button
          type="button"
          class="header-trigger-btn ai-toggle-btn"
          :class="{ active: showAiPanel }"
          :title="showAiPanel ? 'Hide Bubbles.ai composer' : 'Show Bubbles.ai composer'"
          @click="showAiPanel = !showAiPanel"
        >
          <Sparkles :size="13" />
          <span>AI</span>
        </button>
      </div>
    </div>

    <div class="compose-scroll">
      <div class="compose-sheet">
        <div class="field-row from-row">
          <span class="field-label">From</span>
          <div class="from-account-menu">
            <button type="button" class="from-account" @click="showFromDropdown = !showFromDropdown">
              <span class="account-dot">{{ visibleFromAccount.slice(0, 1).toUpperCase() }}</span>
              <span>{{ visibleFromAccount }}</span>
              <ChevronDown :size="13" class="from-chevron" />
            </button>

            <Transition name="dropdown">
              <div v-if="showFromDropdown" class="from-dropdown">
                <button
                  v-for="account in fromAccounts"
                  :key="account"
                  type="button"
                  class="from-option"
                  :class="{ selected: account === visibleFromAccount }"
                  @click="selectFromAccount(account)"
                >
                  <span class="account-dot option-dot">{{ account.slice(0, 1).toUpperCase() }}</span>
                  <span class="from-option-copy">
                    <span class="from-option-name">{{ account.split('@')[0] }}</span>
                    <span class="from-option-email">{{ account }}</span>
                  </span>
                  <Check v-if="account === visibleFromAccount" :size="14" class="from-option-check" />
                </button>
              </div>
            </Transition>
          </div>
        </div>

        <div class="field-divider" />

        <div class="field-row chip-row">
          <span class="field-label">To</span>
          <div class="chips-input" @click="toInputRef?.focus()">
            <span v-for="chip in toChips" :key="chip.id" class="chip" :class="{ invalid: !chip.valid }">
              {{ chip.email }}
              <button type="button" class="chip-remove" @click.stop="removeChip(toChips, chip.id)">
                <X :size="10" />
              </button>
            </span>
            <input
              ref="toInputRef"
              v-model="toInput"
              type="text"
              class="chip-text-input"
              placeholder="Add recipient..."
              @keydown="handleChipKeydown($event, toChips, toInput, toInputRef)"
              @blur="addChip(toChips, toInput, toInputRef)"
            >
          </div>
          <div class="cc-actions">
            <button v-if="!showCc" type="button" class="mini-field-btn" @click="showCc = true">Cc</button>
            <button v-if="!showBcc" type="button" class="mini-field-btn" @click="showBcc = true">Bcc</button>
          </div>
        </div>

        <Transition name="field-slide">
          <div v-if="showCc" class="optional-field">
            <div class="field-divider" />
            <div class="field-row chip-row">
              <span class="field-label">Cc</span>
              <div class="chips-input" @click="ccInputRef?.focus()">
                <span v-for="chip in ccChips" :key="chip.id" class="chip" :class="{ invalid: !chip.valid }">
                  {{ chip.email }}
                  <button type="button" class="chip-remove" @click.stop="removeChip(ccChips, chip.id)">
                    <X :size="10" />
                  </button>
                </span>
                <input
                  ref="ccInputRef"
                  v-model="ccInput"
                  type="text"
                  class="chip-text-input"
                  placeholder="Add CC..."
                  @keydown="handleChipKeydown($event, ccChips, ccInput, ccInputRef)"
                  @blur="addChip(ccChips, ccInput, ccInputRef)"
                >
              </div>
              <button type="button" class="icon-clear-btn" @click="showCc = false; ccChips = []">
                <X :size="13" />
              </button>
            </div>
          </div>
        </Transition>

        <Transition name="field-slide">
          <div v-if="showBcc" class="optional-field">
            <div class="field-divider" />
            <div class="field-row chip-row">
              <span class="field-label">Bcc</span>
              <div class="chips-input" @click="bccInputRef?.focus()">
                <span v-for="chip in bccChips" :key="chip.id" class="chip" :class="{ invalid: !chip.valid }">
                  {{ chip.email }}
                  <button type="button" class="chip-remove" @click.stop="removeChip(bccChips, chip.id)">
                    <X :size="10" />
                  </button>
                </span>
                <input
                  ref="bccInputRef"
                  v-model="bccInput"
                  type="text"
                  class="chip-text-input"
                  placeholder="Add BCC..."
                  @keydown="handleChipKeydown($event, bccChips, bccInput, bccInputRef)"
                  @blur="addChip(bccChips, bccInput, bccInputRef)"
                >
              </div>
              <button type="button" class="icon-clear-btn" @click="showBcc = false; bccChips = []">
                <X :size="13" />
              </button>
            </div>
          </div>
        </Transition>

        <div class="field-divider" />

        <div class="field-row">
          <span class="field-label">Subject</span>
          <input v-model="subject" class="subject-input" type="text" placeholder="Subject">
        </div>

        <div class="format-toolbar">
          <button type="button" class="fmt-btn" title="Bold" @click="wrapSelection('**', '**')">
            <Bold :size="14" />
          </button>
          <button type="button" class="fmt-btn" title="Italic" @click="wrapSelection('_', '_')">
            <Italic :size="14" />
          </button>
          <button type="button" class="fmt-btn" title="Underline" @click="wrapSelection('<u>', '</u>')">
            <UnderlineIcon :size="14" />
          </button>
          <span class="fmt-separator" />
          <button type="button" class="fmt-btn" title="Bullet list" @click="insertLinePrefix('- ')">
            <List :size="14" />
          </button>
          <button type="button" class="fmt-btn" title="Numbered list" @click="insertLinePrefix('1. ')">
            <ListOrdered :size="14" />
          </button>
          <span class="fmt-separator" />
          <button type="button" class="fmt-btn" title="Insert link" @click="insertLink">
            <Link :size="14" />
          </button>
        </div>

        <label class="body-editor-shell">
          <textarea
            ref="bodyTextareaRef"
            v-model="body"
            class="body-textarea"
            placeholder="Write your message here..."
            spellcheck="true"
            @input="onBodyInput"
          />
        </label>

        <div v-if="attachments.length" class="attachment-list">
          <div v-for="(file, index) in attachments" :key="`${file.name}_${index}`" class="attachment-chip">
            <Paperclip :size="12" />
            <span class="attachment-name">{{ file.name }}</span>
            <span class="attachment-size">{{ file.size }}</span>
            <button type="button" class="chip-remove" @click="removeAttachment(index)">
              <X :size="10" />
            </button>
          </div>
        </div>

        <Transition name="widget-slide">
          <div v-if="showAiPanel" class="quick-reply-box">
            <div v-if="aiShowApplied" class="send-success-overlay flex-center animate-fade-in">
              <div class="success-content flex-center">
                <span class="success-icon flex-center"><Check :size="18" /></span>
                <span class="success-message">Draft applied to editor!</span>
              </div>
            </div>

            <div class="reply-header">
              <div class="reply-header-left">
                <span class="reply-label">Compose</span>
                <span class="reply-target">with Bubbles.ai</span>
              </div>
              <span class="reply-stage-badge" :class="aiDraftState">
                {{ aiDraftState === 'empty' ? 'Drafting Stage' : aiDraftState === 'dictating' ? 'Voice Input' : aiDraftState === 'generating' ? 'Drafting...' : 'Review Draft' }}
              </span>
            </div>

            <div v-if="aiDraftState === 'empty' || aiDraftState === 'dictating'" class="input-stage-container animate-fade-in">
              <input ref="aiFileInputRef" type="file" multiple class="hidden-file-input" @change="handleAiFileSelect">

              <AiInputBox
                  v-model="aiPrompt"
                  v-model:attachedFiles="aiAttachedFiles"
                  :isRecording="aiDraftState === 'dictating'"
                  :disabled="aiDraftState === 'generating'"
                  @send="generateAiDraft"
                  @startDictation="startVoiceInput"
                  @stopDictation="stopVoiceInput"
                >
                  <template #toolbar-right>
                    <button type="button" class="card-outline-draft-btn flex-center" :disabled="aiDraftState === 'dictating'" title="Auto-draft instantly from context" @click="generateAiDraft">
                      <Sparkles :size="12" /> Auto-draft
                    </button>
                  </template>
                </AiInputBox>
              </div>
              <p class="copywriting-hint">
                Your context above is a guide. AI will generate a professional draft for you to review and edit before sending.
              </p>
            </div>

            <div v-else-if="aiDraftState === 'generating' || aiDraftState === 'drafted'" class="drafted-stage-container animate-fade-in">
              <div class="draft-review-card" :class="{ 'is-streaming': aiDraftState === 'generating' }">
                <div class="draft-card-header">
                  <span class="draft-card-title">
                    <Sparkles v-if="aiDraftState === 'generating'" class="streaming-sparkle" :size="12" />
                    <Wand2 v-else :size="12" />
                    {{ aiDraftState === 'generating' ? 'AI is drafting response...' : 'Proposed Email Draft' }}
                  </span>
                  <span class="draft-editable-hint">
                    {{ aiDraftState === 'generating' ? 'Streaming...' : 'Directly editable' }}
                  </span>
                </div>
                <div class="draft-textarea-wrapper">
                  <textarea
                    ref="aiDraftRef"
                    v-model="aiDraft"
                    class="draft-review-textarea"
                    placeholder="AI is compiling context and writing draft..."
                    :disabled="aiDraftState === 'generating'"
                    @input="onAiDraftInput"
                  />
                </div>
              </div>

              <p class="draft-stage-copywriting">
                {{ aiDraftState === 'generating' ? 'Please wait while AI processes the message context and streams the email draft.' : 'Review the email above. You can tweak it directly inside the card, update your guidelines below, or apply it to the editor.' }}
              </p>

              <div v-if="aiDraftState === 'drafted'" class="refine-row">
                <input v-model="aiPrompt" type="text" placeholder="Ask AI to refine draft (e.g., 'make it more formal' or 'shorten')..." class="refine-input" @keyup.enter="generateAiDraft">
                <button type="button" class="refine-submit-btn flex-center" :disabled="!aiPrompt.trim()" @click="generateAiDraft">
                  <RefreshCw :size="12" /> Update Draft
                </button>
              </div>

              <div class="drafted-actions">
                <button type="button" class="discard-draft-btn flex-center" :disabled="aiDraftState === 'generating'" @click="discardAiDraft">
                  <Trash2 :size="13" /> Discard
                </button>
                <button type="button" class="send-final-btn flex-center" :disabled="aiDraftState === 'generating'" @click="applyAiDraft">
                  <Check :size="13" /> Apply to Editor
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <div class="compose-bottom-bar">
      <div class="bottom-left">
        <button type="button" class="bottom-icon-btn" title="Attach file" @click="triggerAttach">
          <Paperclip :size="17" />
        </button>
        <input ref="fileInputRef" type="file" multiple class="hidden-file-input" @change="handleFileSelect">
        <span v-if="draftSaved" class="save-state">
          <Check :size="13" />
          Draft saved
        </span>
      </div>

      <div class="bottom-right">
        <button type="button" class="bottom-text-btn" @click="saveDraft">
          <FileText :size="15" />
          <span>Save draft</span>
        </button>
        <button type="button" class="bottom-text-btn" @click="goBack">
          <Trash2 :size="15" />
          <span>Discard</span>
        </button>
        <button type="button" class="send-btn" :class="{ sent }" :disabled="!canSend" @click="handleSend">
          <Send v-if="!sent" :size="16" />
          <Check v-else :size="16" />
          <span>{{ sent ? 'Sent' : 'Send' }}</span>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.compose-root {
  background: var(--bg-primary);
  min-width: 0;
}

.middle-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.header-left,
.header-right,
.bottom-left,
.bottom-right,
.toolbar-group {
  display: flex;
  align-items: center;
}

.drafts-menu {
  position: relative;
  flex-shrink: 0;
}

.header-trigger-btn,
.ai-toggle-btn,
.from-account,
.mini-field-btn,
.fmt-btn,
.toolbar-icon-btn,
.outline-action-btn,
.send-icon-btn,
.quiet-action-btn,
.primary-action-btn,
.bottom-icon-btn,
.bottom-text-btn,
.send-btn,
.icon-clear-btn {
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-family: var(--font-sans);
  cursor: pointer;
  transition: background-color var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast), transform var(--transition-fast);
}

.header-trigger-btn {
  height: auto;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 20px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.ai-toggle-btn {
  width: auto;
}

.ai-toggle-btn.active {
  background: var(--bg-tertiary);
  border-color: var(--text-muted);
  color: var(--text-primary);
}

.header-trigger-btn:hover {
  border-color: var(--text-muted);
  color: var(--text-primary);
}

.from-account:hover,
.mini-field-btn:hover,
.fmt-btn:hover,
.toolbar-icon-btn:hover,
.outline-action-btn:hover,
.bottom-icon-btn:hover,
.bottom-text-btn:hover,
.icon-clear-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.drafts-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 20;
  width: min(320px, calc(100vw - 48px));
  max-width: calc(100vw - 48px);
  max-height: 320px;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-primary);
  box-shadow: var(--shadow-lg);
}

.draft-item {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  padding: 10px;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
}

.draft-item:hover {
  background: var(--bg-secondary);
}

.draft-subject {
  font-size: 0.82rem;
  font-weight: 650;
  color: var(--text-primary);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.draft-meta {
  overflow: hidden;
  color: var(--text-muted);
  font-size: 0.72rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compose-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 0 16px 28px;
}

.compose-sheet {
  width: min(100%, 1280px);
  margin: 0 auto;
}

.field-row {
  min-height: 56px;
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
}

.from-row {
  min-height: 52px;
}

.field-label {
  color: var(--text-muted);
  font-size: 0.82rem;
  font-weight: 650;
}

.field-divider {
  height: 1px;
  background: var(--border-color);
}

.from-account-menu {
  position: relative;
  justify-self: start;
  min-width: 0;
}

.from-account {
  justify-self: start;
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  padding: 5px 10px 5px 5px;
  font-size: 0.78rem;
  overflow: hidden;
}

.from-account > span:not(.account-dot) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.from-chevron {
  flex-shrink: 0;
  color: var(--text-muted);
}

.from-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 20;
  width: 320px;
  max-width: calc(100vw - 48px);
  padding: 8px;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-primary);
  box-shadow: var(--shadow-lg);
}

.from-option {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  padding: 8px;
  color: var(--text-primary);
  font-family: var(--font-sans);
  cursor: pointer;
  text-align: left;
}

.from-option:hover,
.from-option.selected {
  background: var(--bg-secondary);
}

.option-dot {
  width: 24px;
  height: 24px;
}

.from-option-copy {
  min-width: 0;
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 1px;
}

.from-option-name,
.from-option-email {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.from-option-name {
  font-size: 0.8rem;
  font-weight: 650;
  color: var(--text-primary);
}

.from-option-email {
  font-size: 0.72rem;
  color: var(--text-muted);
}

.from-option-check {
  flex-shrink: 0;
  color: var(--text-primary);
}

.account-dot {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--primary-color);
  color: var(--active-text);
  font-size: 0.7rem;
  font-weight: 700;
  flex-shrink: 0;
}

.chip-row {
  align-items: start;
  padding: 12px 0;
}

.chip-row .field-label {
  padding-top: 8px;
}

.chips-input {
  min-height: 34px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.chip,
.attachment-chip {
  display: inline-flex;
  max-width: 100%;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-size: 0.76rem;
  font-weight: 550;
}

.chip {
  padding: 4px 6px 4px 9px;
}

.chip.invalid {
  border-color: hsl(0, 80%, 82%);
  background: hsl(0, 90%, 97%);
  color: hsl(0, 72%, 42%);
}

.chip-remove {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: currentColor;
  cursor: pointer;
  opacity: 0.72;
}

.chip-remove:hover {
  background: rgba(0, 0, 0, 0.06);
  opacity: 1;
}

.chip-text-input,
.subject-input,
.refine-input {
  min-width: 160px;
  flex: 1;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 0.94rem;
}

.chip-text-input::placeholder,
.subject-input::placeholder,
.body-textarea::placeholder,
.ai-prompt-textarea::placeholder,
.refine-input::placeholder {
  color: var(--text-muted);
}

.cc-actions {
  display: flex;
  gap: 6px;
  padding-top: 1px;
}

.mini-field-btn,
.icon-clear-btn {
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  padding: 0 10px;
  font-size: 0.76rem;
  font-weight: 650;
}

.icon-clear-btn {
  width: 28px;
  padding: 0;
}

.subject-input {
  grid-column: 2 / 4;
  height: 54px;
  font-size: 1rem;
}

.format-toolbar {
  height: 48px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--border-color);
}

.fmt-btn,
.toolbar-icon-btn,
.bottom-icon-btn {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.fmt-btn {
  border-color: transparent;
  background: transparent;
}

.fmt-separator {
  width: 1px;
  height: 20px;
  background: var(--border-color);
}

.body-editor-shell {
  display: block;
  padding: 28px 0 22px;
}

.body-textarea {
  width: 100%;
  min-height: 260px;
  max-height: 520px;
  resize: none;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 0.98rem;
  line-height: 1.7;
}

.attachment-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.attachment-list.compact {
  margin-bottom: 8px;
}

.attachment-chip {
  padding: 5px 6px 5px 9px;
}

.attachment-name {
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-size {
  color: var(--text-muted);
  font-size: 0.7rem;
}

.ai-compose-card {
  position: relative;
  margin: 6px 0 12px;
  border: 1px solid var(--border-color);
  border-radius: 14px;
  background: linear-gradient(180deg, var(--bg-secondary), var(--bg-primary));
  overflow: hidden;
}

.ai-applied-overlay {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.94);
  color: var(--text-primary);
  font-size: 0.9rem;
  font-weight: 650;
  backdrop-filter: blur(4px);
}

.success-mark {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: hsl(142, 70%, 92%);
  color: hsl(142, 68%, 28%);
  border: 1px solid hsl(142, 62%, 82%);
}

.ai-card-header {
  min-height: 56px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 18px;
  border-bottom: 1px solid var(--border-color);
}

.ai-card-header div {
  display: flex;
  align-items: baseline;
  gap: 7px;
  min-width: 0;
}

.ai-card-header strong {
  color: var(--text-primary);
  font-size: 0.88rem;
}

.ai-card-header span {
  color: var(--text-muted);
  font-size: 0.82rem;
}

.stage-badge {
  flex-shrink: 0;
  border: 1px solid var(--border-color);
  border-radius: 7px;
  background: var(--bg-primary);
  padding: 3px 8px;
  color: var(--text-secondary) !important;
  font-size: 0.72rem !important;
  font-weight: 650;
}

.stage-badge.generating {
  color: hsl(212, 72%, 36%) !important;
  border-color: hsl(212, 78%, 88%);
  background: hsl(212, 78%, 97%);
}

.stage-badge.dictating {
  color: hsl(0, 75%, 42%) !important;
  border-color: hsl(0, 82%, 88%);
  background: hsl(0, 88%, 97%);
}

.stage-badge.drafted {
  color: hsl(142, 62%, 28%) !important;
  border-color: hsl(142, 58%, 84%);
  background: hsl(142, 62%, 96%);
}

.ai-input-stage,
.ai-draft-stage {
  padding: 18px;
}

.ai-prompt-box,
.draft-review-card {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background: var(--bg-primary);
  box-shadow: var(--shadow-sm);
}

.ai-prompt-box {
  padding: 12px;
}

.ai-prompt-box.recording {
  border-color: hsl(0, 78%, 84%);
  background: hsl(0, 85%, 98%);
}

.ai-prompt-textarea {
  width: 100%;
  min-height: 44px;
  max-height: 160px;
  resize: none;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 0.92rem;
  line-height: 1.5;
}

.ai-toolbar,
.draft-actions,
.refine-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.ai-toolbar {
  margin-top: 10px;
}

.toolbar-group {
  gap: 8px;
}

.toolbar-icon-btn.active {
  color: hsl(0, 75%, 42%);
  border-color: hsl(0, 76%, 84%);
  background: hsl(0, 82%, 97%);
}

.outline-action-btn,
.quiet-action-btn,
.primary-action-btn,
.send-icon-btn {
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 9px;
  padding: 0 12px;
  font-size: 0.76rem;
  font-weight: 700;
}

.send-icon-btn {
  width: 34px;
  padding: 0;
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: var(--active-text);
}

.primary-action-btn {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: var(--active-text);
}

.quiet-action-btn {
  border-color: transparent;
  background: transparent;
}

.draft-review-card.streaming {
  border-color: hsl(212, 75%, 86%);
}

.draft-card-header {
  min-height: 42px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 14px;
  border-bottom: 1px solid var(--border-color);
}

.draft-card-header span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  color: var(--text-primary);
  font-size: 0.84rem;
  font-weight: 700;
}

.draft-card-header em {
  color: var(--text-muted);
  font-size: 0.74rem;
  font-style: normal;
}

.ai-draft-textarea {
  width: 100%;
  min-height: 180px;
  max-height: 380px;
  resize: none;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 0.92rem;
  line-height: 1.65;
  padding: 16px;
}

.ai-draft-textarea:disabled {
  color: var(--text-primary);
  opacity: 1;
}

.refine-row {
  margin-top: 12px;
}

.refine-input {
  height: 36px;
  border: 1px solid var(--border-color);
  border-radius: 9px;
  background: var(--bg-primary);
  padding: 0 12px;
}

.draft-actions {
  justify-content: flex-end;
  margin-top: 14px;
}

.dictation-row {
  min-height: 44px;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-secondary);
  font-size: 0.84rem;
}

.recording-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: hsl(0, 76%, 52%);
  animation: pulse 1s infinite;
}

.voice-wave {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  height: 22px;
}

.voice-wave span {
  width: 3px;
  border-radius: 999px;
  background: hsl(0, 76%, 52%);
  animation: wave 0.72s ease-in-out infinite;
}

.voice-wave span:nth-child(1) { height: 8px; animation-delay: 0s; }
.voice-wave span:nth-child(2) { height: 18px; animation-delay: 0.08s; }
.voice-wave span:nth-child(3) { height: 12px; animation-delay: 0.16s; }
.voice-wave span:nth-child(4) { height: 20px; animation-delay: 0.24s; }

.compose-bottom-bar {
  min-height: 68px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-shrink: 0;
  border-top: 1px solid var(--border-color);
  background: rgba(255, 255, 255, 0.96);
  padding: 0 16px;
  backdrop-filter: blur(8px);
}

.bottom-left,
.bottom-right {
  gap: 12px;
}

.bottom-text-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 36px;
  border-color: transparent;
  border-radius: 9px;
  background: transparent;
  padding: 0 8px;
  font-size: 0.82rem;
  font-weight: 650;
}

.send-btn {
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border-radius: 999px;
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: var(--active-text);
  padding: 0 18px;
  font-size: 0.86rem;
  font-weight: 750;
}

.send-btn:not(:disabled):hover,
.send-icon-btn:not(:disabled):hover,
.primary-action-btn:not(:disabled):hover {
  background: var(--primary-hover);
  border-color: var(--primary-hover);
}

.send-btn.sent {
  background: hsl(142, 70%, 30%);
  border-color: hsl(142, 70%, 30%);
}

.save-state {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: hsl(142, 62%, 30%);
  font-size: 0.78rem;
  font-weight: 650;
}

.hidden-file-input {
  display: none;
}

.dropdown-enter-active,
.dropdown-leave-active,
.field-slide-enter-active,
.field-slide-leave-active,
.widget-slide-enter-active,
.widget-slide-leave-active {
  transition: opacity var(--transition-fast), transform var(--transition-fast);
}

.dropdown-enter-from,
.dropdown-leave-to,
.field-slide-enter-from,
.field-slide-leave-to,
.widget-slide-enter-from,
.widget-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.spin-soft {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1); }
}

@keyframes wave {
  0%, 100% { transform: scaleY(0.7); }
  50% { transform: scaleY(1.15); }
}

/* EmailDetail quick-reply parity */
.quick-reply-box {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background-color: var(--bg-secondary);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 8px 0 12px;
  position: relative;
  overflow: hidden;
  transition: all var(--transition-normal);
}

.send-success-overlay {
  position: absolute;
  inset: 0;
  background-color: rgba(255, 255, 255, 0.96);
  z-index: 10;
  backdrop-filter: blur(4px);
}

.success-content {
  flex-direction: column;
  gap: 12px;
  animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
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





















.toolbar-left-actions,




.toolbar-icon-btn:hover:not(:disabled) {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
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



.reply-input-card:focus-within .card-send-btn,




.copywriting-hint,
.draft-stage-copywriting {
  font-size: 0.72rem;
  color: var(--text-muted);
  line-height: 1.4;
  margin-top: 4px;
}











.p1 { height: 6px; animation-delay: 0.1s; }
.p2 { height: 12px; animation-delay: 0.3s; }
.p3 { height: 8px; animation-delay: 0.2s; }
.p4 { height: 10px; animation-delay: 0.4s; }



.stop-dictate-btn:hover {
  background-color: var(--border-color);
}

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
  min-height: auto;
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
  max-height: 380px;
  width: 100%;
  outline: none;
  resize: vertical;
  overflow-y: auto;
}

.draft-review-textarea:disabled {
  opacity: 1;
  color: var(--text-primary);
}

.streaming-sparkle {
  color: var(--primary-color);
  animation: pulseSparkle 1.4s infinite ease-in-out;
}

.refine-row {
  display: flex;
  gap: 8px;
  margin-top: 6px;
  align-items: center;
  justify-content: initial;
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

.discard-draft-btn:disabled,
.send-final-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.animate-fade-in {
  animation: fadeIn 0.25s ease;
}

@keyframes scaleIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

@keyframes voicePulse {
  0% { transform: scale(0.85); opacity: 0.5; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(0.85); opacity: 0.5; }
}



@keyframes pulseSparkle {
  0% { transform: scale(0.9); opacity: 0.5; }
  50% { transform: scale(1.15); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.5; }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@media (max-width: 900px) {
  .compose-scroll,
  .compose-bottom-bar {
    padding-left: 16px;
    padding-right: 16px;
  }

  .field-row {
    grid-template-columns: 74px minmax(0, 1fr);
  }

  .cc-actions,
  .icon-clear-btn {
    grid-column: 2;
    justify-self: start;
  }

  .subject-input {
    grid-column: 2;
  }

  .compose-bottom-bar,
  .bottom-right {
    flex-wrap: wrap;
  }
}
</style>
