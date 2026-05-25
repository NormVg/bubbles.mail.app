<script setup lang="ts">
import { computed } from 'vue'
import AiChat from './AiChat.vue'
import { Sparkles } from '@lucide/vue'
import { useAiAssistant } from '../composables/useAiAssistant'

const { sessions, currentSessionId } = useAiAssistant()

const activeSession = computed(() => {
  return sessions.value.find(s => s.id === currentSessionId.value) || sessions.value[0]
})
</script>

<template>
  <div class="chat-focus-view animate-fade-in">
    <!-- Active Chat Title Header -->
    <div class="pane-header chat-focus-header">
      <div class="header-title-row flex-center gap-6">
        <Sparkles class="header-sparkle-icon" :size="14" />
        <h2 class="pane-title">{{ activeSession.title }}</h2>
      </div>
    </div>

    <!-- Wide Full-Height AiChat Panel -->
    <div class="chat-focus-body">
      <AiChat />
    </div>
  </div>
</template>

<style scoped>
.chat-focus-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-primary);
}

.chat-focus-header {
  border-bottom: 1px solid var(--border-color);
  padding: 0 24px;
  display: flex;
  align-items: center;
}

.gap-6 {
  gap: 6px;
}

.header-sparkle-icon {
  color: var(--text-secondary);
}

.chat-focus-body {
  flex: 1;
  overflow: hidden;
  height: 100%;
}

.animate-fade-in {
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
