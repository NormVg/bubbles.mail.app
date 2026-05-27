<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useMail } from './composables/useMail'

// Import global styling
import './assets/css/main.css'

const { viewMode, refreshGmailAccounts } = useMail()

const activeSettingsCategory = ref('ai')

function handleSelectSettingsCategory(catId: string) {
  activeSettingsCategory.value = catId
}

let unsubscribeOAuth: (() => void) | undefined

onMounted(() => {
  // Load local SQLite accounts immediately on startup
  void refreshGmailAccounts()

  // Listen for Google OAuth successes from main process and refresh account folders instantly
  if (window.electronAPI?.onOAuthSuccess) {
    unsubscribeOAuth = window.electronAPI.onOAuthSuccess((email) => {
      console.log(`[Vue App] Gmail account connected successfully: ${email}`)
      void refreshGmailAccounts()
    })
  }
})

onUnmounted(() => {
  if (unsubscribeOAuth) unsubscribeOAuth()
})
</script>

<template>
  <DashboardLayout :hide-middle="viewMode === 'chat' || viewMode === 'compose'">
    <template #left>
      <LeftPanel />
    </template>
    
    <template #middle>
      <Transition name="view-fade" mode="out-in">
        <SettingsSidebar v-if="viewMode === 'settings'" @select-category="handleSelectSettingsCategory" />
        <MiddlePanel v-else-if="viewMode !== 'chat' && viewMode !== 'compose'" />
      </Transition>
    </template>
    
    <template #right>
      <Transition name="view-fade" mode="out-in">
        <SettingsDetailView v-if="viewMode === 'settings'" :category="activeSettingsCategory" />
        <BubblesAiView v-else-if="viewMode === 'chat'" />
        <ComposeView v-else-if="viewMode === 'compose'" />
        <RightPanel v-else />
      </Transition>
    </template>
  </DashboardLayout>
</template>

<style>
/* View Transitions */
.view-fade-enter-active,
.view-fade-leave-active {
  transition: opacity 0.15s ease-in-out, transform 0.15s ease-in-out;
}
.view-fade-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.view-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
