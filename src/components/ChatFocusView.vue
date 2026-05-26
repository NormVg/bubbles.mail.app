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
    <div class="pane-header middle-header">
      <div class="header-left">
        <Sparkles :size="15" class="header-icon" />
        <span class="header-title">{{ activeSession.title }}</span>
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

.middle-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
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
