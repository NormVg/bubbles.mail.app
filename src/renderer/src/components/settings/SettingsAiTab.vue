<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { appApiFetch } from '../../composables/useAppApi'
import { RefreshCw, Cpu, AlertTriangle, ChevronDown, X, Plus } from '@lucide/vue'

const props = defineProps<{
  autoGenerateSummary: boolean
  autoDraftReplies: boolean
  customInstructions: string
  ignoredDigestSenders: string[]
  ollamaModel: string
  digestModel: string
  agentMaxSteps: number
}>()

const emit = defineEmits([
  'update:autoGenerateSummary',
  'update:autoDraftReplies',
  'update:customInstructions',
  'update:ignoredDigestSenders',
  'update:ollamaModel',
  'update:digestModel',
  'update:agentMaxSteps'
])

const models = ref<{ name: string; size: number }[]>([])
const loadingModels = ref(false)
const ollamaStatus = ref<'online' | 'offline' | 'checking'>('checking')

async function fetchModels() {
  loadingModels.value = true
  ollamaStatus.value = 'checking'
  try {
    const list = await appApiFetch<{ name: string; size: number }[]>('/api/ai/models')
    models.value = list || []
    if (list && list.length > 0) {
      ollamaStatus.value = 'online'
      // If the selected model is not in the fetched list, default to the first one available if empty
      if ((!props.ollamaModel || !list.some(m => m.name === props.ollamaModel)) && list.length > 0) {
        emit('update:ollamaModel', list[0].name)
      }
      if ((!props.digestModel || !list.some(m => m.name === props.digestModel)) && list.length > 0) {
        emit('update:digestModel', list[0].name)
      }
    } else {
      ollamaStatus.value = 'offline'
    }
  } catch (err) {
    console.error('Failed to fetch models', err)
    ollamaStatus.value = 'offline'
    models.value = []
  } finally {
    loadingModels.value = false
  }
}

onMounted(() => {
  fetchModels()
})

function formatSize(bytes: number): string {
  if (!bytes) return '0 GB'
  const gb = bytes / (1024 * 1024 * 1024)
  return `${gb.toFixed(2)} GB`
}

const newIgnoreEmail = ref('')

function addIgnoreEmail() {
  const email = newIgnoreEmail.value.trim().toLowerCase()
  if (!email) return
  if (!props.ignoredDigestSenders.includes(email)) {
    emit('update:ignoredDigestSenders', [...props.ignoredDigestSenders, email])
  }
  newIgnoreEmail.value = ''
}

function removeIgnoreEmail(email: string) {
  emit('update:ignoredDigestSenders', props.ignoredDigestSenders.filter(e => e !== email))
}
</script>

<template>
  <div class="settings-section animate-fade-in">
    <div class="section-title-row">
      <h3 class="section-label">Ollama Model Settings</h3>
      <div class="status-indicator-badge" :class="ollamaStatus">
        <span class="status-dot"></span>
        <span class="status-text">{{ ollamaStatus === 'online' ? 'Ollama Online' : ollamaStatus === 'offline' ? 'Ollama Offline' : 'Checking Ollama...' }}</span>
      </div>
    </div>

    <div class="settings-grid">
      <div class="setting-row-card column-layout">
        <div class="setting-card-header-row">
          <div class="setting-card-left">
            <h4 class="setting-title">Active Ollama Model</h4>
            <p class="setting-subtitle">Select the LLM model running locally in your Ollama environment to power drafts and replies.</p>
          </div>
          <button 
            type="button" 
            class="refresh-models-btn" 
            :disabled="loadingModels"
            @click="fetchModels"
          >
            <RefreshCw class="refresh-icon" :class="{ 'spin': loadingModels }" :size="14" />
          </button>
        </div>

        <div class="model-select-wrapper">
          <div v-if="ollamaStatus === 'offline'" class="ollama-warning-banner">
            <AlertTriangle :size="16" class="warning-icon" />
            <div class="warning-content">
              <h5>Local Ollama Instance Unreachable</h5>
              <p>Make sure Ollama is running locally at <code>http://localhost:11434</code> and you have pulled at least one model (e.g. <code>ollama pull llama3.2</code>).</p>
            </div>
          </div>

          <div class="select-container" :class="{ 'disabled': ollamaStatus === 'offline' }">
            <Cpu :size="16" class="select-icon" />
            <select
              :value="ollamaModel"
              @change="emit('update:ollamaModel', ($event.target as HTMLInputElement).value)"
              class="premium-select"
              :disabled="ollamaStatus === 'offline'"
            >
              <option v-if="models.length === 0" value="">No models available</option>
              <option 
                v-for="model in models" 
                :key="model.name" 
                :value="model.name"
              >
                {{ model.name }} ({{ formatSize(model.size) }})
              </option>
            </select>
            <ChevronDown :size="14" class="select-arrow" />
          </div>
        </div>
      </div>

      <div class="setting-row-card column-layout">
        <div class="setting-card-header-row">
          <div class="setting-card-left">
            <h4 class="setting-title">Daily Digest Model</h4>
            <p class="setting-subtitle">Select the LLM model used for complex background generation of your Daily Intelligence report. A larger model is recommended.</p>
          </div>
        </div>

        <div class="model-select-wrapper">
          <div class="select-container" :class="{ 'disabled': ollamaStatus === 'offline' }">
            <Cpu :size="16" class="select-icon" />
            <select
              :value="digestModel"
              @change="emit('update:digestModel', ($event.target as HTMLInputElement).value)"
              class="premium-select"
              :disabled="ollamaStatus === 'offline'"
            >
              <option v-if="models.length === 0" value="">No models available</option>
              <option 
                v-for="model in models" 
                :key="'digest-'+model.name" 
                :value="model.name"
              >
                {{ model.name }} ({{ formatSize(model.size) }})
              </option>
            </select>
            <ChevronDown :size="14" class="select-arrow" />
          </div>
        </div>
      </div>

      <div class="setting-row-card column-layout">
        <div class="setting-card-header-row">
          <div class="setting-card-left">
            <h4 class="setting-title">Agent Max Steps</h4>
            <p class="setting-subtitle">Configure how many sequential actions (e.g. searching, reading) the AI agent can take before returning to you.</p>
          </div>
        </div>

        <div class="model-select-wrapper">
          <div class="select-container">
            <Cpu :size="16" class="select-icon" />
            <select
              :value="agentMaxSteps"
              @change="emit('update:agentMaxSteps', Number(($event.target as HTMLInputElement).value))"
              class="premium-select"
            >
              <option v-for="n in 20" :key="n" :value="n">{{ n }} step{{ n > 1 ? 's' : '' }}</option>
            </select>
            <ChevronDown :size="14" class="select-arrow" />
          </div>
        </div>
      </div>
    </div>

    <div class="section-title-row" style="margin-top: 16px;">
      <h3 class="section-label">AI Automation Controls</h3>
      <span class="info-badge">Engine v1</span>
    </div>

    <div class="settings-grid">
      <!-- Toggle 1: Auto Summary -->
      <div class="setting-row-card">
        <div class="setting-card-left">
          <h4 class="setting-title">Auto-Generate Summaries</h4>
          <p class="setting-subtitle">Automatically compile summaries and key actionable points when opening any email.</p>
        </div>
        <label class="switch">
          <input
            type="checkbox"
            :checked="autoGenerateSummary"
            @change="emit('update:autoGenerateSummary', ($event.target as HTMLInputElement).checked)"
          />
          <span class="slider"></span>
        </label>
      </div>

      <!-- Toggle 2: Auto Reply Drafts -->
      <div class="setting-row-card">
        <div class="setting-card-left">
          <h4 class="setting-title">Pre-Draft Smart Replies</h4>
          <p class="setting-subtitle">Initiate email drafting streams instantly upon opening to decrease email response latency.</p>
        </div>
        <label class="switch">
          <input
            type="checkbox"
            :checked="autoDraftReplies"
            @change="emit('update:autoDraftReplies', ($event.target as HTMLInputElement).checked)"
          />
          <span class="slider"></span>
        </label>
      </div>

      <!-- Custom Instructions -->
      <div class="setting-row-card column-layout">
        <div class="setting-card-header-row">
          <div class="setting-card-left">
            <h4 class="setting-title">Custom AI Instructions</h4>
            <p class="setting-subtitle">Define specific rules, formatting preferences, or behavioral guidelines that the AI should follow when generating responses or summaries.</p>
          </div>
        </div>
        <textarea
          class="custom-instructions-textarea"
          :value="customInstructions"
          @input="emit('update:customInstructions', ($event.target as HTMLTextAreaElement).value)"
          placeholder="e.g. Always format responses in bullet points. Be extremely concise. Use professional tone."
        ></textarea>
      </div>

      <!-- Ignored Digest Senders -->
      <div class="setting-row-card column-layout">
        <div class="setting-card-header-row">
          <div class="setting-card-left">
            <h4 class="setting-title">Digest Ignore List</h4>
            <p class="setting-subtitle">Emails added here will be completely ignored when generating the Daily Intelligence digest.</p>
          </div>
        </div>
        
        <div class="ignore-emails-container">
          <div v-if="ignoredDigestSenders.length > 0" class="ignore-chips">
            <div v-for="email in ignoredDigestSenders" :key="email" class="ignore-chip">
              <span>{{ email }}</span>
              <button class="remove-chip-btn" @click="removeIgnoreEmail(email)" title="Remove">
                <X :size="12" />
              </button>
            </div>
          </div>
          
          <div class="add-ignore-row">
            <input 
              type="text" 
              class="add-ignore-input" 
              v-model="newIgnoreEmail" 
              @keydown.enter="addIgnoreEmail"
              placeholder="Add email address..."
            />
            <button class="add-ignore-btn" @click="addIgnoreEmail" :disabled="!newIgnoreEmail.trim()">
              <Plus :size="14" /> Add
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.column-layout {
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
}

.setting-card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  width: 100%;
}

.refresh-models-btn {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.refresh-models-btn:hover:not(:disabled) {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border-color: var(--text-primary);
}

.refresh-models-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.refresh-icon.spin {
  animation: spin 1.2s infinite linear;
}

.model-select-wrapper {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
}

.ollama-warning-banner {
  display: flex;
  gap: 12px;
  padding: 12px 14px;
  background-color: hsla(35, 100%, 50%, 0.08);
  border: 1px solid hsla(35, 100%, 50%, 0.2);
  border-radius: 10px;
}

.warning-icon {
  color: hsl(35, 100%, 45%);
  flex-shrink: 0;
  margin-top: 2px;
}

.warning-content h5 {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 4px 0;
}

.warning-content p {
  font-size: 0.72rem;
  color: var(--text-secondary);
  line-height: 1.4;
  margin: 0;
}

.warning-content code {
  background: var(--bg-secondary);
  padding: 1px 4px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.68rem;
}

.select-container {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
}

.select-container.disabled {
  opacity: 0.6;
}

.select-icon {
  position: absolute;
  left: 12px;
  color: var(--text-muted);
  pointer-events: none;
}

.select-arrow {
  position: absolute;
  right: 12px;
  color: var(--text-muted);
  pointer-events: none;
}

.premium-select {
  width: 100%;
  height: 40px;
  padding: 0 36px 0 38px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 0.82rem;
  font-weight: 500;
  outline: none;
  cursor: pointer;
  -webkit-appearance: none;
  -moz-appearance: none;
  appearance: none;
  transition: all var(--transition-fast);
}

.premium-select:focus:not(:disabled) {
  border-color: var(--text-primary);
  background-color: var(--bg-primary);
  box-shadow: 0 0 0 1px var(--text-primary);
}

/* Status badge */
.status-indicator-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.68rem;
  font-weight: 600;
  border: 1px solid transparent;
}

.status-indicator-badge.online {
  background-color: rgba(16, 185, 129, 0.1);
  border-color: rgba(16, 185, 129, 0.2);
  color: rgb(16, 185, 129);
}

.status-indicator-badge.online .status-dot {
  background-color: rgb(16, 185, 129);
}

.status-indicator-badge.offline {
  background-color: rgba(239, 68, 68, 0.1);
  border-color: rgba(239, 68, 68, 0.2);
  color: rgb(239, 68, 68);
}

.status-indicator-badge.offline .status-dot {
  background-color: rgb(239, 68, 68);
}

.status-indicator-badge.checking {
  background-color: rgba(107, 114, 128, 0.1);
  border-color: rgba(107, 114, 128, 0.2);
  color: rgb(107, 114, 128);
}

.status-indicator-badge.checking .status-dot {
  background-color: rgb(107, 114, 128);
  animation: pulse 1.5s infinite ease-in-out;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

.custom-instructions-textarea {
  width: 100%;
  min-height: 80px;
  border: 1px solid var(--border-color);
  border-radius: 10px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 0.82rem;
  padding: 12px;
  resize: vertical;
  outline: none;
  transition: all var(--transition-fast);
}

.custom-instructions-textarea:focus {
  border-color: var(--text-primary);
  background-color: var(--bg-primary);
  box-shadow: 0 0 0 1px var(--text-primary);
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
