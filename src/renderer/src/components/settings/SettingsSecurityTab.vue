<script setup lang="ts">
import { ref } from 'vue'
import { Key, EyeOff, Eye, Check, AlertCircle } from '@lucide/vue'

const props = defineProps<{
  apiKey: string
}>()

const emit = defineEmits(['update:apiKey'])

const showApiKey = ref(false)
</script>

<template>
  <div class="settings-section animate-fade-in">
    <h3 class="section-label">Privacy & Access Controls</h3>

    <!-- API Key set card -->
    <div class="api-key-card">
      <div class="api-key-header">
        <div class="api-key-icon-wrapper flex-center">
          <Key :size="15" />
        </div>
        <div>
          <h4 class="setting-title">Bubbles API Access Token</h4>
          <p class="setting-subtitle">Set your secure developer token to authorize background AI agents to compile data checklists.</p>
        </div>
      </div>

      <div class="api-input-wrapper">
        <input 
          :type="showApiKey ? 'text' : 'password'" 
          :value="apiKey"
          @input="emit('update:apiKey', ($event.target as HTMLInputElement).value)"
          class="api-key-input"
          placeholder="Enter your bb-live-... key"
        />
        <button 
          type="button" 
          class="api-toggle-visibility-btn flex-center"
          @click="showApiKey = !showApiKey"
        >
          <EyeOff v-if="showApiKey" :size="14" />
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
