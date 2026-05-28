<script setup lang="ts">
import { ref } from 'vue'
import { useSettings } from '../composables/useSettings'
import { Check, RefreshCw } from '@lucide/vue'
import SettingsAiTab from './settings/SettingsAiTab.vue'
import SettingsSecurityTab from './settings/SettingsSecurityTab.vue'

import SettingsAccountsTab from './settings/SettingsAccountsTab.vue'

const props = defineProps({
  category: {
    type: String,
    default: 'accounts'
  }
})

const { settings } = useSettings()

import { computed } from 'vue'

const isDarkTheme = ref(false)
if (typeof document !== 'undefined') {
  isDarkTheme.value = document.documentElement.classList.contains('dark-theme')
}

function toggleLocalTheme() {
  isDarkTheme.value = !isDarkTheme.value
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('dark-theme', isDarkTheme.value)
  }
}

// Compute form states to map directly to settings object
const autoGenerateSummary = computed({
  get: () => settings.value.autoGenerateSummary,
  set: (val) => settings.value.autoGenerateSummary = val
})
const autoDraftReplies = computed({
  get: () => settings.value.autoDraftReplies,
  set: (val) => settings.value.autoDraftReplies = val
})
const customInstructions = computed({
  get: () => settings.value.customInstructions,
  set: (val) => settings.value.customInstructions = val
})

const ollamaModel = computed({
  get: () => settings.value.ollamaModel,
  set: (val) => settings.value.ollamaModel = val
})
const digestModel = computed({
  get: () => settings.value.digestModel,
  set: (val) => settings.value.digestModel = val
})
const sarvamApiKey = computed({
  get: () => settings.value.sarvamApiKey,
  set: (val) => settings.value.sarvamApiKey = val
})

// Button save indicators
const isSaving = ref(false)
const showSuccess = ref(false)

function saveAllSettings() {
  isSaving.value = true

  // Simulate premium architectural sync delay
  setTimeout(() => {
    isSaving.value = false
    showSuccess.value = true
    setTimeout(() => {
      showSuccess.value = false
    }, 2000)
  }, 800)
}
</script>

<template>
  <div class="pane pane-right settings-detail animate-fade-in">
    <!-- Header -->
    <div class="pane-header detail-header">
      <h2 class="pane-title">Configure Bubbles</h2>
      <button
        class="save-btn flex-center"
        :disabled="isSaving"
        @click="saveAllSettings"
      >
        <RefreshCw v-if="isSaving" class="spin-icon" :size="13" />
        <Check v-else-if="showSuccess" :size="13" />
        <span>{{ isSaving ? 'Saving...' : showSuccess ? 'Saved' : 'Save Changes' }}</span>
      </button>
    </div>

    <!-- Scrollable settings content area constrained to comfortable 600px balanced reading width -->
    <div class="settings-body-scroll">
      <div class="settings-content-wrapper">

        <SettingsAccountsTab
          v-if="category === 'accounts'"
        />

        <SettingsAiTab
          v-else-if="category === 'ai'"
          v-model:autoGenerateSummary="autoGenerateSummary"
          v-model:autoDraftReplies="autoDraftReplies"
          v-model:customInstructions="customInstructions"
          v-model:ollamaModel="ollamaModel"
          v-model:digestModel="digestModel"
        />

        <SettingsSecurityTab
          v-else-if="category === 'security'"
          v-model:sarvamApiKey="sarvamApiKey"
        />
      </div>
    </div>
  </div>
</template>

<style>
.settings-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-primary);
}

.detail-header {
  border-bottom: 1px solid var(--border-color);
  padding: 0 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.save-btn {
  background-color: var(--text-primary);
  color: var(--bg-primary);
  border: none;
  border-radius: 6px;
  padding: 5px 14px;
  font-family: var(--font-sans);
  font-size: 0.76rem;
  font-weight: 500;
  cursor: pointer;
  gap: 6px;
  transition: opacity var(--transition-fast);
  height: 30px;
}

.save-btn:hover {
  opacity: 0.9;
}

.save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spin-icon {
  animation: spin 1.2s infinite linear;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.settings-body-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.settings-content-wrapper {
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.settings-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-label {
  font-family: var(--font-title);
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.info-badge {
  font-size: 0.68rem;
  font-weight: 600;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  padding: 2px 8px;
  border-radius: 4px;
}

.settings-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.setting-row-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  background-color: var(--bg-primary);
  gap: 20px;
}

.setting-row-card.static-card {
  background-color: var(--bg-secondary);
}

.setting-card-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.setting-title {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-primary);
}

.setting-subtitle {
  font-size: 0.76rem;
  color: var(--text-muted);
  line-height: 1.4;
}

/* Premium toggle switch */
.switch {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
  flex-shrink: 0;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-tertiary);
  transition: .25s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 34px;
  border: 1px solid var(--border-color);
}

.slider:before {
  position: absolute;
  content: "";
  height: 14px;
  width: 14px;
  left: 2px;
  bottom: 2px;
  background-color: var(--bg-primary);
  transition: .25s cubic-bezier(0.4, 0, 0.2, 1);
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

input:checked + .slider {
  background-color: var(--text-primary);
  border-color: var(--text-primary);
}

input:checked + .slider:before {
  transform: translateX(16px);
}

/* Agent Tones selection grid */
.tone-select-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.tone-option-card {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  display: flex;
  gap: 12px;
  transition: all var(--transition-fast);
  background-color: var(--bg-primary);
}

.tone-option-card:hover {
  background-color: var(--bg-secondary);
}

.tone-option-card.active {
  border-color: var(--text-primary);
  background-color: var(--bg-primary);
  box-shadow: var(--shadow-sm);
}

.radio-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1.5px solid var(--text-muted);
  flex-shrink: 0;
  margin-top: 3px;
  position: relative;
  transition: all var(--transition-fast);
}

.tone-option-card.active .radio-dot {
  border-color: var(--text-primary);
}

.tone-option-card.active .radio-dot::after {
  content: "";
  position: absolute;
  top: 2.5px;
  left: 2.5px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background-color: var(--text-primary);
}

.tone-text-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tone-title {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--text-primary);
}

.tone-desc {
  font-size: 0.72rem;
  color: var(--text-muted);
  line-height: 1.45;
}

/* Textarea Prompt area styling */
.custom-prompt-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}

.field-title {
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-primary);
}

.field-subtitle {
  font-size: 0.76rem;
  color: var(--text-muted);
  line-height: 1.4;
  margin-bottom: 2px;
}

.guidelines-textarea {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background-color: var(--bg-primary);
  padding: 12px 14px;
  font-family: var(--font-sans);
  font-size: 0.82rem;
  color: var(--text-primary);
  outline: none;
  resize: vertical;
  min-height: 90px;
  line-height: 1.5;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.guidelines-textarea:focus {
  border-color: var(--text-primary);
  box-shadow: 0 0 0 1px var(--text-primary);
}

.status-shield {
  font-size: 0.7rem;
  font-weight: 600;
  color: hsl(142, 70%, 25%);
  background-color: hsl(142, 70%, 94%);
  border: 1px solid hsl(142, 70%, 88%);
  padding: 4px 10px;
  border-radius: 6px;
  gap: 4px;
  flex-shrink: 0;
}

/* Alert Box */
.alert-box {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  margin-top: 4px;
}

.alert-icon {
  color: var(--text-secondary);
  margin-top: 1px;
  flex-shrink: 0;
}

.alert-text {
  font-size: 0.74rem;
  color: var(--text-secondary);
  line-height: 1.45;
}

/* System sync range slider */
.system-sync-card {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sync-slider-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
}

.sync-value-badge {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-primary);
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  padding: 2px 8px;
  border-radius: 4px;
  flex-shrink: 0;
}

.sync-range-slider {
  -webkit-appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: var(--bg-tertiary);
  outline: none;
}

.sync-range-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--text-primary);
  cursor: pointer;
  transition: transform 0.1s ease;
}

.sync-range-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.slider-ticks {
  display: flex;
  justify-content: space-between;
  font-size: 0.65rem;
  color: var(--text-muted);
  padding: 0 2px;
}

.animate-fade-in {
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* API Key Card Styles */
.api-key-card {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  background-color: var(--bg-primary);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.api-key-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.api-key-icon-wrapper {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  background-color: var(--bg-secondary);
  color: var(--text-secondary);
  flex-shrink: 0;
  margin-top: 2px;
}

.api-input-wrapper {
  display: flex;
  align-items: center;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background-color: var(--bg-secondary);
  padding: 0 4px 0 12px;
  height: 38px;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.api-input-wrapper:focus-within {
  border-color: var(--text-primary);
  background-color: var(--bg-primary);
}

.api-key-input {
  border: none;
  background: transparent;
  flex: 1;
  height: 100%;
  font-family: monospace;
  font-size: 0.82rem;
  color: var(--text-primary);
  outline: none;
}

.api-toggle-visibility-btn {
  background: transparent;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color var(--transition-fast), background-color var(--transition-fast);
}

.api-toggle-visibility-btn:hover {
  color: var(--text-primary);
  background-color: var(--bg-tertiary);
}
</style>
