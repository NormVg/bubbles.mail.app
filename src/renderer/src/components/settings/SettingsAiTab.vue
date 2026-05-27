<script setup lang="ts">


const props = defineProps<{
  autoGenerateSummary: boolean
  autoDraftReplies: boolean
  enableVoiceDictation: boolean
}>()

const emit = defineEmits([
  'update:autoGenerateSummary',
  'update:autoDraftReplies',
  'update:enableVoiceDictation'
])
</script>

<template>
  <div class="settings-section animate-fade-in">
    <div class="section-title-row">
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

      <!-- Toggle 3: Voice dictation -->
      <div class="setting-row-card">
        <div class="setting-card-left">
          <h4 class="setting-title">Voice Dictation Integration</h4>
          <p class="setting-subtitle">Equip the quick reply cards and AI assistant views with the direct voice dictation waveform composer.</p>
        </div>
        <label class="switch">
          <input
            type="checkbox"
            :checked="enableVoiceDictation"
            @change="emit('update:enableVoiceDictation', ($event.target as HTMLInputElement).checked)"
          />
          <span class="slider"></span>
        </label>
      </div>
    </div>
  </div>
</template>
