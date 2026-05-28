<script setup lang="ts">
import { ref } from 'vue'
import { EyeOff, Eye, Check, AlertCircle } from '@lucide/vue'

const props = defineProps<{
  apiKey: string
  sarvamApiKey: string
}>()

const emit = defineEmits(['update:apiKey', 'update:sarvamApiKey'])

const showSarvamApiKey = ref(false)
</script>

<template>
  <div class="settings-section animate-fade-in">
    <h3 class="section-label">Privacy & Access Controls</h3>

    <!-- Sarvam API Key card -->
    <div class="api-key-card">
      <div class="api-key-header">
        <div class="api-key-icon-wrapper flex-center">
          <Mic :size="15" />
        </div>
        <div>
          <h4 class="setting-title">Sarvam AI Subscription Key</h4>
          <p class="setting-subtitle">Used for fast, streaming voice dictation. Leave empty to fallback to system environment variables.</p>
        </div>
      </div>

      <div class="api-input-wrapper">
        <input
          :type="showSarvamApiKey ? 'text' : 'password'"
          :value="sarvamApiKey"
          @input="emit('update:sarvamApiKey', ($event.target as HTMLInputElement).value)"
          class="api-key-input"
          placeholder="Enter your Sarvam subscription key"
        />
        <button
          type="button"
          class="api-toggle-visibility-btn flex-center"
          @click="showSarvamApiKey = !showSarvamApiKey"
        >
          <EyeOff v-if="showSarvamApiKey" :size="14" />
          <Eye v-else :size="14" />
        </button>
      </div>
    </div>

    <div class="setting-row-card static-card">
      <div class="setting-card-left">
        <h4 class="setting-title">Workspace Data Privacy</h4>
        <p class="setting-subtitle">All email scanning, summaries, and action item checklists are computed inside your safe workspace. No data is stored externally.</p>
      </div>
      <span class="status-shield flex-center"><Check :size="12" /> Encrypted</span>
    </div>

    <div class="alert-box">
      <AlertCircle :size="16" class="alert-icon" />
      <p class="alert-text">Bubbles utilizes secure local-only IPC boundaries. All emails from Alicia's workspace are handled contextually with sandboxed LLM processors.</p>
    </div>
  </div>
</template>
