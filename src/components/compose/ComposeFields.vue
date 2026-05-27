<script setup lang="ts">
import { ref } from 'vue'
import { Check, ChevronDown, X } from '@lucide/vue'
import { storeToRefs } from 'pinia'
import { useComposeStore } from '../../stores/useComposeStore'

const store = useComposeStore()
const {
  fromAccounts,
  fromAccount,
  showFromDropdown,
  showCc,
  showBcc,
  toChips,
  ccChips,
  bccChips,
  toInput,
  ccInput,
  bccInput,
  subject,
  visibleFromAccount
} = storeToRefs(store)

const toInputRef = ref<HTMLInputElement | null>(null)
const ccInputRef = ref<HTMLInputElement | null>(null)
const bccInputRef = ref<HTMLInputElement | null>(null)

function selectFromAccount(account: string) {
  fromAccount.value = account
  showFromDropdown.value = false
}
</script>

<template>
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
        <button type="button" class="chip-remove" @click.stop="store.removeChip(toChips, chip.id)">
          <X :size="10" />
        </button>
      </span>
      <input
        ref="toInputRef"
        v-model="toInput"
        type="text"
        class="chip-text-input"
        placeholder="Add recipient..."
        @keydown="toInput = store.handleChipKeydown($event, toChips, toInput, toInputRef)"
        @blur="toInput = store.addChip(toChips, toInput, toInputRef)"
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
            <button type="button" class="chip-remove" @click.stop="store.removeChip(ccChips, chip.id)">
              <X :size="10" />
            </button>
          </span>
          <input
            ref="ccInputRef"
            v-model="ccInput"
            type="text"
            class="chip-text-input"
            placeholder="Add CC..."
            @keydown="ccInput = store.handleChipKeydown($event, ccChips, ccInput, ccInputRef)"
            @blur="ccInput = store.addChip(ccChips, ccInput, ccInputRef)"
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
            <button type="button" class="chip-remove" @click.stop="store.removeChip(bccChips, chip.id)">
              <X :size="10" />
            </button>
          </span>
          <input
            ref="bccInputRef"
            v-model="bccInput"
            type="text"
            class="chip-text-input"
            placeholder="Add BCC..."
            @keydown="bccInput = store.handleChipKeydown($event, bccChips, bccInput, bccInputRef)"
            @blur="bccInput = store.addChip(bccChips, bccInput, bccInputRef)"
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
</template>

<style scoped>
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
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.from-account:hover {
  background-color: var(--bg-secondary);
  border-color: var(--text-secondary);
  color: var(--text-primary);
}

.from-account > span:not(.account-dot) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--text-primary);
  color: var(--bg-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.7rem;
  flex-shrink: 0;
}

.from-chevron {
  color: var(--text-muted);
  flex-shrink: 0;
}

.from-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  width: 280px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  z-index: 50;
  padding: 6px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.from-option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 8px 10px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: background-color var(--transition-fast);
}

.from-option:hover {
  background: var(--bg-secondary);
}

.from-option.selected {
  background: var(--bg-secondary);
}

.option-dot {
  width: 28px;
  height: 28px;
  font-size: 0.8rem;
}

.from-option-copy {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.from-option-name {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.from-option-email {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.from-option-check {
  color: var(--text-primary);
  flex-shrink: 0;
}

.chip-row {
  cursor: text;
}

.chips-input {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  min-height: 32px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 0.8rem;
  color: var(--text-primary);
}

.chip.invalid {
  border-color: rgba(255, 71, 87, 0.4);
  color: var(--danger-color);
  background: rgba(255, 71, 87, 0.05);
}

.chip-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 2px;
  border-radius: 4px;
}

.chip-remove:hover {
  background: var(--border-color);
  color: var(--text-primary);
}

.chip-text-input {
  flex: 1;
  min-width: 120px;
  border: none;
  background: transparent;
  outline: none;
  font-family: var(--font-sans);
  font-size: 0.85rem;
  color: var(--text-primary);
  padding: 4px 0;
}

.cc-actions {
  display: flex;
  gap: 8px;
  justify-self: end;
}

.mini-field-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
}

.mini-field-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.optional-field {
  overflow: hidden;
}

.icon-clear-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-clear-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.subject-input {
  width: 100%;
  border: none;
  background: transparent;
  outline: none;
  font-family: var(--font-sans);
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  padding: 8px 0;
}

.dropdown-enter-active,
.dropdown-leave-active,
.field-slide-enter-active,
.field-slide-leave-active {
  transition: all var(--transition-normal);
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.field-slide-enter-from,
.field-slide-leave-to {
  opacity: 0;
  max-height: 0;
}
.field-slide-enter-to,
.field-slide-leave-from {
  max-height: 60px;
}

@media (max-width: 900px) {
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
}
</style>
