<script setup lang="ts">
import { ref } from 'vue'
import { useMail } from './composables/useMail'
import ComposeView from './components/ComposeView.vue'

// Import global styling
import './assets/css/main.css'

const { viewMode } = useMail()

const activeSettingsCategory = ref('ai')

function handleSelectSettingsCategory(catId: string) {
  activeSettingsCategory.value = catId
}

// Head settings for SEO & Premium experience
useHead({
  title: 'Bubbles.mail — Daily Intelligence System',
  meta: [
    { name: 'description', content: 'Transform email from message reading to action engine. Time-centric Daily AI Intelligence feed.' }
  ],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }
  ]
})
</script>

<template>
  <DashboardLayout :hide-middle="viewMode === 'chat' || viewMode === 'compose'">
    <template #left>
      <LeftPanel />
    </template>
    
    <template #middle>
      <SettingsSidebar v-if="viewMode === 'settings'" @select-category="handleSelectSettingsCategory" />
      <MiddlePanel v-else-if="viewMode !== 'chat' && viewMode !== 'compose'" />
    </template>
    
    <template #right>
      <SettingsDetailView v-if="viewMode === 'settings'" :category="activeSettingsCategory" />
      <BubblesAiView v-else-if="viewMode === 'chat'" />
      <ComposeView v-else-if="viewMode === 'compose'" />
      <RightPanel v-else />
    </template>
  </DashboardLayout>
</template>

<style>
/* Global App Overrides if any */
</style>
