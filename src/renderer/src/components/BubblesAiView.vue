<script setup lang="ts">
import { computed } from 'vue'
import { Sparkles, Trash2, Plus } from '@lucide/vue'
import AiChat from './AiChat.vue'
import { useAiAssistant } from '../composables/useAiAssistant'

const { sessions, currentSessionId, messages, createNewSession, deleteSession } = useAiAssistant()

const isFreshSession = computed(() => {
  const hasUserMessage = messages.value.some(message => message.sender === 'user')
  return !hasUserMessage && messages.value.length <= 1
})
</script>

<template>
  <section class="pane pane-right bubbles-ai-page">
    <div v-if="isFreshSession" class="bubbles-ai-backdrop" aria-hidden="true">
      <div class="dither-layer" />
      <div class="dither-vignette" />
    </div>

    <div class="bubbles-ai-shell animate-fade-in">
      <div class="pane-header ai-session-header">
        <div class="ai-header-left">
          <Sparkles :size="15" class="header-icon" />

          <div class="session-selector-wrapper">
            <select v-model="currentSessionId" class="minimal-select" title="Switch chat session">
              <option v-for="sess in sessions" :key="sess.id" :value="sess.id">
                {{ sess.title }}
              </option>
            </select>
          </div>

          <button
            type="button"
            class="minimal-new-chat-btn flex-center"
            title="New chat session"
            @click="createNewSession"
          >
            <Plus :size="14" />
          </button>

          <button
            v-if="sessions.length > 1"
            type="button"
            class="minimal-trash-btn flex-center"
            title="Delete this chat session"
            @click="deleteSession(currentSessionId)"
          >
            <Trash2 :size="12" />
          </button>
        </div>
      </div>

      <div class="ai-chat-wrapper">
        <AiChat :isFreshSession="isFreshSession" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.bubbles-ai-page {
  position: relative;
  overflow: hidden;
}

.bubbles-ai-backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background-color: var(--bg-primary);
}

.dither-layer {
  position: absolute;
  inset: -4%;
  background-image: url('/dither-welcome.jpg');
  background-size: cover;
  background-position: center ;
  background-repeat: no-repeat;

  filter: grayscale(1) contrast(1.3);
}

.dither-vignette {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(
      180deg,
      rgba(255, 255, 255, 0.92) 0%,
      rgba(255, 255, 255, 0.52) 45%,
      rgba(255, 255, 255, 0.58) 100%
    ),
    radial-gradient(
      ellipse 90% 75% at 50% 40%,
      rgba(255, 255, 255, 0.1) 0%,
      rgba(255, 255, 255, 0.62) 100%
    );
}

.bubbles-ai-shell {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.ai-session-header {
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--border-color);
}

.ai-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.session-selector-wrapper {
  display: flex;
  align-items: center;
  min-width: 0;
}

.minimal-select {
  border: none;
  background: transparent;
  font-family: var(--font-sans);
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  outline: none;
  cursor: pointer;
  padding: 0 4px 0 0;
  max-width: min(320px, 42vw);
  text-overflow: ellipsis;
}

.minimal-new-chat-btn {
  background: transparent;
  border: none;
  outline: none;
  font-family: var(--font-sans);
  font-size: 1rem;
  font-weight: 500;
  color: var(--text-muted);
  width: 26px;
  height: 26px;
  border-radius: 6px;
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.minimal-new-chat-btn:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.minimal-trash-btn {
  background: transparent;
  border: 1px solid transparent;
  outline: none;
  color: var(--text-muted);
  width: 26px;
  height: 26px;
  border-radius: 6px;
  cursor: pointer;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.minimal-trash-btn:hover {
  border-color: hsl(0, 100%, 92%);
  color: hsl(0, 85%, 45%);
  background-color: hsl(0, 100%, 99%);
}

.ai-chat-wrapper {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.welcome-stage {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 20px;
  padding: 24px;
}

.welcome-copy {
  text-align: center;
}

.welcome-title {
  font-family: var(--font-sans);
  font-size: 2.75rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.03em;
}

.underlined-brand {
  text-decoration: underline;
  text-underline-offset: 4px;
}

.welcome-composer {
  width: 100%;
  max-width: 580px;
}

.welcome-composer.is-transitioning {
  position: fixed;
  z-index: 60;
  left: 0;
  top: 0;
  pointer-events: none;
  will-change: transform, opacity;
  transform: translateY(0);
  transition: transform 520ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms ease;
}

.welcome-composer.is-transitioning.is-armed {
  opacity: 0.92;
  transition: transform 520ms cubic-bezier(0.22, 1, 0.36, 1), opacity 300ms ease;
}

































.toolbar-icon-btn:hover:not(:disabled) {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}





.card-send-btn:hover:not(:disabled),
.chat-input-card:focus-within













.p1 { height: 6px; animation-delay: 0.1s; }
.p2 { height: 12px; animation-delay: 0.3s; }
.p3 { height: 8px; animation-delay: 0.2s; }
.p4 { height: 10px; animation-delay: 0.4s; }



.stop-dictate-btn:hover {
  background-color: var(--border-color);
}

/* Let chat panels sit on frosted white over dither */
.ai-chat-wrapper :deep(.ai-chat) {
  background: transparent;
}

.ai-chat-wrapper :deep(.chat-messages) {
  max-width: 720px;
}

.ai-chat-wrapper :deep(.suggestions-bar),
.ai-chat-wrapper :deep(.chat-input-area) {
  max-width: 720px;
  background: transparent;
}

.ai-chat-wrapper :deep(.chat-input-area) {
  padding-bottom: 24px;
}

.ai-chat-wrapper :deep(.ai-chat) {
  animation: chatSettleIn 280ms ease both;
}

.ai-chat-wrapper:not(.just-transitioned) :deep(.chat-input-area) {
  animation: composerSettleIn 320ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.animate-fade-in {
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(2px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes chatSettleIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes composerSettleIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes voicePulse {
  0% { transform: scale(0.85); opacity: 0.5; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(0.85); opacity: 0.5; }
}


</style>
