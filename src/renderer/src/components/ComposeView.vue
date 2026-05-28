<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'
import {
  Check,
  ChevronDown,
  FileText,
  Paperclip,
  Send,
  Sparkles,
  SquarePen,
  Trash2,
  X,
  RefreshCw
} from '@lucide/vue'
import { useMail } from '../composables/useMail'
import { appApiFetch } from '../composables/useAppApi'
import { useCompletion } from '@ai-sdk/vue'
import { useSettings } from '../composables/useSettings'
import { storeToRefs } from 'pinia'
import { useComposeStore, type SavedDraft } from '../stores/useComposeStore'
import AiDraftPanel from './common/AiDraftPanel.vue'
import ComposeFields from './compose/ComposeFields.vue'
import ComposeToolbar from './compose/ComposeToolbar.vue'

const { setViewMode } = useMail()
const composeStore = useComposeStore()
const { settings } = useSettings()

const {
  showDraftsDropdown,
  showAiPanel,
  subject,
  body,
  attachments,
  sent,
  draftSaved,
  aiDraftState,
  aiPrompt,
  aiDraft,
  aiAttachedFiles,
  aiShowApplied,
  savedDrafts,
  currentDraftId,
  canSend,
  toChips,
  ccChips,
  bccChips,
  showCc,
  showBcc,
  visibleFromAccount
} = storeToRefs(composeStore)

const { clearComposer, deleteDraft } = composeStore

const bodyTextareaRef = ref<HTMLTextAreaElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const aiPromptRef = ref<HTMLTextAreaElement | null>(null)
const aiDraftRef = ref<HTMLTextAreaElement | null>(null)
const sending = ref(false)
const sendError = ref('')

function goBack() {
  clearComposer()
  setViewMode('inbox')
}


function triggerAttach() {
  fileInputRef.value?.click()
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1]
      resolve(base64)
    }
    reader.onerror = error => reject(error)
    reader.readAsDataURL(file)
  })
}

async function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files) return

  try {
    const mapped = await Promise.all(
      Array.from(files).map(async (file) => {
        const base64 = await readFileAsBase64(file)
        const kb = file.size / 1024
        return {
          name: file.name,
          size: kb < 1024 ? `${Math.max(1, Math.round(kb))} KB` : `${(kb / 1024).toFixed(1)} MB`,
          type: file.type,
          content: base64
        }
      })
    )
    attachments.value.push(...mapped)
  } catch (error) {
    console.error('Failed to read file:', error)
  } finally {
    input.value = ''
  }
}

function removeAttachment(index: number) {
  attachments.value.splice(index, 1)
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

async function saveDraft() {
  const draftId = currentDraftId.value || `draft_${Date.now()}`
  currentDraftId.value = draftId

  const newDraft: SavedDraft = {
    id: draftId,
    subject: subject.value.trim() || '(No Subject)',
    body: body.value,
    toChips: toChips.value.map(chip => ({ ...chip })),
    ccChips: ccChips.value.map(chip => ({ ...chip })),
    bccChips: bccChips.value.map(chip => ({ ...chip })),
    time: 'Just now'
  }

  try {
    await appApiFetch('/api/gmail/drafts', {
      method: 'POST',
      body: {
        id: newDraft.id,
        accountEmail: visibleFromAccount.value,
        subject: newDraft.subject,
        body: newDraft.body,
        toChips: newDraft.toChips,
        ccChips: newDraft.ccChips,
        bccChips: newDraft.bccChips
      }
    })
    await composeStore.loadSavedDrafts()
    
    draftSaved.value = true
    window.setTimeout(() => {
      draftSaved.value = false
    }, 1800)
  } catch (error) {
    console.error('Failed to save draft:', error)
  }
}

function loadDraft(draft: SavedDraft) {
  currentDraftId.value = draft.id
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

let mediaRecorder: MediaRecorder | null = null
let audioChunks: Blob[] = []

async function startVoiceInput() {
  if (aiDraftState.value === 'generating') return
  aiDraftState.value = 'dictating'
  aiPrompt.value = ''

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
          aiPrompt.value = res.text || 'Transcription failed.'
        } catch (e) {
          console.error('Transcription failed', e)
        } finally {
          aiDraftState.value = 'empty'
          stream.getTracks().forEach(track => track.stop())
        }
      }
    }

    mediaRecorder.start()
  } catch (err) {
    console.error('Error accessing microphone:', err)
    aiDraftState.value = 'empty'
  }
}

function stopVoiceInput() {
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop()
  } else {
    aiDraftState.value = 'empty'
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
  api: '/api/ai/draft',
  fetch: ipcStreamFetch,
  onFinish: () => {
    aiDraftState.value = 'drafted'
    nextTick(() => autosizeTextarea(aiDraftRef.value, 380))
  },
  onError: (err) => {
    console.error('Draft generation error:', err)
    aiDraftState.value = 'empty'
  }
})

watch(aiCompletion, (newVal) => {
  if (aiDraftState.value === 'generating') {
    aiDraft.value = newVal
    nextTick(() => {
      autosizeTextarea(aiDraftRef.value, 380)
      if (aiDraftRef.value) aiDraftRef.value.scrollTop = aiDraftRef.value.scrollHeight
    })
  }
})

async function generateAiDraft() {
  if (aiDraftState.value === 'generating') return
  aiDraftState.value = 'generating'
  aiDraft.value = ''
  
  await completeAiDraft(aiPrompt.value, {
    headers: {
      'x-ai-model': settings.value.ollamaModel
    }
  })
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

async function handleSend() {
  if (!canSend.value || sending.value) return

  sending.value = true
  sendError.value = ''

  try {
    if (currentDraftId.value) {
      await deleteDraft(currentDraftId.value)
    }

    await appApiFetch('/api/gmail/send', {
      method: 'POST',
      body: {
        accountId: visibleFromAccount.value,
        to: toChips.value.filter(chip => chip.valid).map(chip => chip.email),
        cc: ccChips.value.filter(chip => chip.valid).map(chip => chip.email),
        bcc: bccChips.value.filter(chip => chip.valid).map(chip => chip.email),
        subject: subject.value.trim() || '(No Subject)',
        bodyText: body.value.trim(),
        attachments: attachments.value.map(file => ({
          name: file.name,
          type: file.type,
          content: file.content
        }))
      }
    })

    sent.value = true
    window.setTimeout(() => {
      sent.value = false
      goBack()
    }, 900)
  } catch (error) {
    sendError.value = getSendError(error)
  } finally {
    sending.value = false
  }
}

function getSendError(error: unknown) {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { message?: string } }).data
    if (data?.message) return data.message
  }

  return error instanceof Error ? error.message : 'Could not send email.'
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
              <div v-if="savedDrafts.length === 0" class="empty-drafts-msg">No saved drafts</div>
              <div
                v-for="draft in savedDrafts"
                :key="draft.id"
                class="draft-item-wrapper"
              >
                <button
                  type="button"
                  class="draft-item"
                  @click="loadDraft(draft)"
                >
                  <span class="draft-subject">{{ draft.subject }}</span>
                  <span class="draft-meta">{{ draft.toChips[0]?.email || 'No recipient' }} · {{ draft.time }}</span>
                </button>
                <button
                  type="button"
                  class="draft-delete-btn"
                  title="Delete draft"
                  @click.stop="deleteDraft(draft.id)"
                >
                  <Trash2 :size="12" />
                </button>
              </div>
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
                <ComposeFields />

        <ComposeToolbar 
          @wrap="wrapSelection" 
          @prefix="insertLinePrefix" 
          @link="insertLink" 
        />

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

        <AiDraftPanel
          :showAiPanel="showAiPanel"
          :aiShowApplied="aiShowApplied"
          :aiDraftState="aiDraftState"
          v-model:aiPrompt="aiPrompt"
          v-model:aiDraft="aiDraft"
          v-model:aiAttachedFiles="aiAttachedFiles"
          @generate-draft="generateAiDraft"
          @apply-draft="applyAiDraft"
          @discard-draft="discardAiDraft"
          @start-dictation="startVoiceInput"
          @stop-dictation="stopVoiceInput"
          mode="compose"
        />
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
        <span v-if="sendError" class="send-error">{{ sendError }}</span>
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
        <button type="button" class="send-btn" :class="{ sent }" :disabled="!canSend || sending" @click="handleSend">
          <Send v-if="!sent && !sending" :size="16" />
          <RefreshCw v-else-if="sending" :size="16" class="spin-icon" />
          <Check v-else :size="16" />
          <span>{{ sending ? 'Sending' : sent ? 'Sent' : 'Send' }}</span>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.empty-drafts-msg {
  padding: 16px;
  text-align: center;
  color: var(--text-muted);
  font-size: 0.85rem;
  font-weight: 500;
}

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
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.03),
    0 4px 8px rgba(0, 0, 0, 0.04),
    0 12px 24px rgba(0, 0, 0, 0.06),
    0 24px 48px rgba(0, 0, 0, 0.08);
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

.draft-item-wrapper {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 8px;
  transition: background-color var(--transition-fast);
}
.draft-item-wrapper:hover {
  background: var(--bg-secondary);
}
.draft-item-wrapper:hover .draft-delete-btn {
  opacity: 1;
}
.draft-delete-btn {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  opacity: 0;
  border-radius: 50%;
  margin-right: 6px;
  transition: all var(--transition-fast);
}
.draft-delete-btn:hover {
  background: rgba(220, 38, 38, 0.08);
  color: hsl(0, 72%, 50%);
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

.send-error {
  max-width: min(420px, 45vw);
  overflow: hidden;
  color: hsl(0, 68%, 46%);
  font-size: 0.74rem;
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
  height: 49px;
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
  min-width: 110px;
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

/* ── Active Physics ──────────────────────────────────────────────────────── */
.send-btn:active:not(:disabled),
.bottom-icon-btn:active,
.drafts-trigger-btn:active {
  transform: scale(0.95);
  transition: transform 0.1s;
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
