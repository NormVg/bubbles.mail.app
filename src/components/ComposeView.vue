<script setup lang="ts">
import { ref, nextTick } from 'vue'
import {
  X, Send, Paperclip, Bold, Italic, Underline, List,
  ListOrdered, Link, Trash2, FileText, ChevronDown
} from '@lucide/vue'
import { useMail } from '../composables/useMail'

const { activeAccount, setViewMode } = useMail()

// ─── Previous view tracking ──────────────────────────────────────────────────
// Go back to inbox on discard/send
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

function saveDraft() {
  draftSaved.value = true
  setTimeout(() => { draftSaved.value = false }, 2000)
}
</script>

<template>
  <section class="pane pane-right compose-root">

    <!-- ── Top Bar ──────────────────────────────────────────────────────────── -->
    <div class="compose-topbar">
      <div class="compose-topbar-left">
        <button class="close-btn" @click="goBack" title="Close">
          <X :size="16" />
        </button>
        <span class="compose-title">New Message</span>
      </div>

      <div class="compose-topbar-right">
        <span v-if="draftSaved" class="draft-saved-label">
          <FileText :size="12" /> Draft saved
        </span>
        <button class="send-btn" :class="{ 'sent': sent }" @click="handleSend">
          <Send :size="14" />
          {{ sent ? 'Sent!' : 'Send' }}
        </button>
      </div>
    </div>

    <!-- ── Compose Sheet ────────────────────────────────────────────────────── -->
    <div class="compose-sheet-wrapper">
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
            <!-- Attach file -->
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
  gap: 12px;
}

.compose-topbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}
.close-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.compose-title {
  font-family: var(--font-title);
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
}

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

.send-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 18px;
  border-radius: 20px;
  border: none;
  background: var(--text-primary);
  color: var(--bg-primary);
  font-family: var(--font-sans);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.send-btn:hover { opacity: 0.85; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
.send-btn.sent { background: hsl(145, 50%, 42%); }

/* ── Sheet wrapper ───────────────────────────────────────────────────────── */
.compose-sheet-wrapper {
  flex: 1;
  overflow-y: auto;
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
}

.compose-sheet {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
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
  padding: 14px 16px;
  font-family: var(--font-sans);
  font-size: 0.88rem;
  line-height: 1.7;
  color: var(--text-primary);
  outline: none;
  min-height: 220px;
}

.body-placeholder {
  position: absolute;
  top: 14px;
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
</style>
