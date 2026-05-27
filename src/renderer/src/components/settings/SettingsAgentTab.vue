<script setup lang="ts">

import type { PersonalityTone } from '../../composables/useSettings'

const props = defineProps<{
  agentPersonality: PersonalityTone
  customInstructions: string
}>()

const emit = defineEmits([
  'update:agentPersonality',
  'update:customInstructions'
])
</script>

<template>
  <div class="settings-section animate-fade-in">
    <h3 class="section-label">Bubbles AI Agent Personality</h3>

    <!-- Selection grid for Personality Tone -->
    <div class="tone-select-grid">
      <div 
        class="tone-option-card"
        :class="{ 'active': agentPersonality === 'professional' }"
        @click="emit('update:agentPersonality', 'professional')"
      >
        <div class="radio-dot"></div>
        <div class="tone-text-block">
          <h4 class="tone-title">Professional</h4>
          <p class="tone-desc">Strictly Vercel-style, monochrome, respectful, structured, and precise.</p>
        </div>
      </div>

      <div 
        class="tone-option-card"
        :class="{ 'active': agentPersonality === 'friendly' }"
        @click="emit('update:agentPersonality', 'friendly')"
      >
        <div class="radio-dot"></div>
        <div class="tone-text-block">
          <h4 class="tone-title">Friendly & Conversational</h4>
          <p class="tone-desc">Approachables, supportive, using warm openings and energetic sign-offs.</p>
        </div>
      </div>

      <div 
        class="tone-option-card"
        :class="{ 'active': agentPersonality === 'creative' }"
        @click="emit('update:agentPersonality', 'creative')"
      >
        <div class="radio-dot"></div>
        <div class="tone-text-block">
          <h4 class="tone-title">Creative & Enthusiastic</h4>
          <p class="tone-desc">Expansive, highly collaborative, utilizing contextual emojis and brainstorming styles.</p>
        </div>
      </div>

      <div 
        class="tone-option-card"
        :class="{ 'active': agentPersonality === 'concise' }"
        @click="emit('update:agentPersonality', 'concise')"
      >
        <div class="radio-dot"></div>
        <div class="tone-text-block">
          <h4 class="tone-title">Concise & Architectural</h4>
          <p class="tone-desc">Ultra-minimalist, bulletin bulleted lists, maximum information density, zero fluff.</p>
        </div>
      </div>
    </div>

    <!-- Prompt instruction guidelines text area -->
    <div class="custom-prompt-container">
      <h4 class="field-title">Custom Assistant Guidelines</h4>
      <p class="field-subtitle">Provide custom rules and guidelines. The AI will strictly respect these parameters across all draft replies and conversations.</p>
      <textarea 
        :value="customInstructions"
        @input="emit('update:customInstructions', ($event.target as HTMLTextAreaElement).value)"
        class="guidelines-textarea" 
        placeholder="e.g. Always keep emails under 3 sentences. Avoid starting sentences with 'I hope this email finds you well'."
      ></textarea>
    </div>
  </div>
</template>
