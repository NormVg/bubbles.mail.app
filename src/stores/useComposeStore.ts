import { defineStore } from 'pinia'
import { ref, computed, nextTick } from 'vue'
import { useMail } from '../composables/useMail'

export interface Chip {
  id: string
  email: string
  valid: boolean
}

export interface SavedDraft {
  id: string
  subject: string
  body: string
  toChips: Chip[]
  ccChips: Chip[]
  bccChips: Chip[]
  time: string
}

export interface AttachedFile {
  name: string
  size: string
  type: string
}

export type DraftState = 'empty' | 'dictating' | 'generating' | 'drafted'

export const useComposeStore = defineStore('compose', () => {
  const mailStore = useMail()
  const activeAccount = mailStore.activeAccount

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

  function isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  }

  function chipId() {
    return `chip_${Date.now()}_${Math.random().toString(36).slice(2)}`
  }

  function addChip(chips: Chip[], inputValue: string, inputRef?: HTMLInputElement | null): string {
    const values = inputValue
      .split(/[,\n;]/)
      .map(value => value.trim())
      .filter(Boolean)

    if (!values.length) return inputValue

    const existing = new Set(chips.map(chip => chip.email.toLowerCase()))
    for (const email of values) {
      if (!existing.has(email.toLowerCase())) {
        chips.push({ id: chipId(), email, valid: isValidEmail(email) })
        existing.add(email.toLowerCase())
      }
    }

    if (inputRef) {
      nextTick(() => inputRef.focus())
    }
    return ''
  }

  function removeChip(chips: Chip[], id: string) {
    const index = chips.findIndex(chip => chip.id === id)
    if (index !== -1) chips.splice(index, 1)
  }

  function handleChipKeydown(event: KeyboardEvent, chips: Chip[], inputValue: string, inputRef: HTMLInputElement | null): string {
    if (event.key === 'Enter' || event.key === ',' || event.key === 'Tab') {
      event.preventDefault()
      return addChip(chips, inputValue, inputRef)
    }

    if (event.key === 'Backspace' && !inputValue && chips.length) {
      chips.pop()
    }
    return inputValue
  }

  return {
    fromAccounts,
    fromAccount,
    showFromDropdown,
    showDraftsDropdown,
    showCc,
    showBcc,
    showAiPanel,
    toChips,
    ccChips,
    bccChips,
    toInput,
    ccInput,
    bccInput,
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
    canSend,
    visibleFromAccount,
    isValidEmail,
    chipId,
    addChip,
    removeChip,
    handleChipKeydown
  }
})
