import { defineStore } from 'pinia'
import { ref, computed, nextTick, watch } from 'vue'
import { useMail } from '../composables/useMail'
import { appApiFetch } from '../composables/useAppApi'

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
  content?: string
}

export type DraftState = 'empty' | 'dictating' | 'generating' | 'drafted'

export const useComposeStore = defineStore('compose', () => {
  const mailStore = useMail()
  const activeAccount = mailStore.activeAccount

  const fromAccounts = computed(() => mailStore.gmailAccountEmails.value)

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

  const savedDrafts = ref<SavedDraft[]>([])
  const currentDraftId = ref<string | null>(null)

  const canSend = computed(() => {
    const recipients = toChips.value.some(chip => chip.valid)
    return Boolean(visibleFromAccount.value) && recipients && (subject.value.trim().length > 0 || body.value.trim().length > 0)
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

  async function loadSavedDrafts() {
    if (!visibleFromAccount.value) return
    try {
      const drafts = await appApiFetch<SavedDraft[]>('/api/gmail/drafts', {
        query: {
          accountEmail: visibleFromAccount.value
        }
      })
      savedDrafts.value = drafts
    } catch (error) {
      console.error('[Compose Store] Failed to load drafts:', error)
    }
  }

  async function deleteDraft(id: string) {
    try {
      await appApiFetch(`/api/gmail/drafts/${id}`, {
        method: 'DELETE'
      })
      await loadSavedDrafts()
      if (currentDraftId.value === id) {
        currentDraftId.value = null
      }
    } catch (error) {
      console.error('[Compose Store] Failed to delete draft:', error)
    }
  }

  function clearComposer() {
    toChips.value = []
    ccChips.value = []
    bccChips.value = []
    toInput.value = ''
    ccInput.value = ''
    bccInput.value = ''
    subject.value = ''
    body.value = ''
    attachments.value = []
    sent.value = false
    draftSaved.value = false
    aiDraftState.value = 'empty'
    aiPrompt.value = ''
    aiDraft.value = ''
    aiAttachedFiles.value = []
    aiShowApplied.value = false
    currentDraftId.value = null
  }

  // Load drafts automatically when the selected sender account changes
  watch(visibleFromAccount, () => {
    void loadSavedDrafts()
  }, { immediate: true })

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
    currentDraftId,
    canSend,
    visibleFromAccount,
    isValidEmail,
    chipId,
    addChip,
    removeChip,
    handleChipKeydown,
    loadSavedDrafts,
    deleteDraft,
    clearComposer
  }
})
