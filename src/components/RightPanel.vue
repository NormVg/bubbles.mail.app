<script setup lang="ts">
import { ref } from 'vue'
import { Sparkles, Archive, Trash2, Reply, ReplyAll, Forward } from '@lucide/vue'
import { useMail } from '../composables/useMail'
import { useAiAssistant } from '../composables/useAiAssistant'

const { viewMode, selectedEmail, deleteEmail, archiveEmail } = useMail()
const { 
  sessions, 
  currentSessionId, 
  createNewSession, 
  deleteSession, 
  clearChat 
} = useAiAssistant()

function handleArchive() {
  if (selectedEmail.value) {
    archiveEmail(selectedEmail.value.id)
  }
}

function handleDelete() {
  if (selectedEmail.value) {
    deleteEmail(selectedEmail.value.id)
  }
}

function handleClearChat() {
  clearChat()
}
</script>

<template>
  <section class="pane pane-right">
    <!-- INBOX MODE -->
    <template v-if="viewMode === 'inbox'">
      <!-- Selected email → full-width email detail -->
      <div v-if="selectedEmail" class="right-panel-content animate-fade-in">
        <!-- Toolbar -->
        <div class="pane-header toolbar">
          <div class="toolbar-group">
            <button class="tool-btn" title="Archive" @click="handleArchive">
              <Archive :size="16" />
            </button>
            <button class="tool-btn" title="Delete" @click="handleDelete">
              <Trash2 :size="16" />
            </button>
          </div>

          <div class="toolbar-group">
            <button class="tool-btn" title="Reply">
              <Reply :size="16" />
            </button>
            <button class="tool-btn" title="Reply All">
              <ReplyAll :size="16" />
            </button>
            <button class="tool-btn" title="Forward">
              <Forward :size="16" />
            </button>
          </div>
        </div>

        <!-- Full-width email detail view -->
        <div class="email-detail-container">
          <EmailDetail />
        </div>
      </div>

      <!-- Empty state -->
      <div v-else class="empty-state animate-fade-in">
        <div class="empty-state-card">
          <div class="empty-illustration">
            <svg viewBox="0 0 100 100" fill="none" class="empty-svg">
              <circle cx="50" cy="50" r="36" stroke="var(--border-color)" stroke-width="1.5" stroke-dasharray="4 4" />
              <circle cx="50" cy="50" r="8" fill="var(--primary-light)" opacity="0.4" class="pulse-ring" />
              <path d="M45 45L40 70L52 61L65 72L70 67L59 56L72 52L45 45Z" fill="var(--text-primary)" stroke="var(--bg-primary)" stroke-width="2" />
            </svg>
          </div>
          <h3 class="empty-title">No message selected</h3>
          <p class="empty-subtitle">Choose a conversation from the list to view it here.</p>
        </div>
      </div>
    </template>

    <!-- AI MODE → full-width chat with Multiple Sessions Switcher -->
    <template v-else>
      <div class="ai-chat-focus animate-fade-in">
        <div class="pane-header ai-header">
          <div class="ai-header-left">
            <!-- Sleek Minimal Dropdown Switcher -->
            <div class="session-selector-wrapper">
              <select v-model="currentSessionId" class="minimal-select">
                <option v-for="sess in sessions" :key="sess.id" :value="sess.id">
                  {{ sess.title }}
                </option>
              </select>
            </div>
            
            <!-- + New Chat button -->
            <button class="minimal-new-chat-btn flex-center" @click="createNewSession" title="New chat session">
              +
            </button>

            <!-- Trash/Delete Session button inline on the left! -->
            <button 
              v-if="sessions.length > 1" 
              class="minimal-trash-btn flex-center inline-left" 
              @click="deleteSession(currentSessionId)" 
              title="Delete this chat session"
            >
              <Trash2 :size="12" />
            </button>
          </div>

          <div class="ai-header-right">
            <button class="minimal-clear-btn flex-center" @click="handleClearChat" title="Reset this chat">
              Reset
            </button>
          </div>
        </div>
        <div class="ai-chat-wrapper">
          <AiChat />
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.right-panel-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.toolbar {
  background-color: var(--bg-primary);
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--border-color);
  padding: 0 16px;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 4px;
}

.tool-btn {
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tool-btn:hover {
  background-color: var(--bg-secondary);
  border-color: var(--border-color);
  color: var(--text-primary);
}

.email-detail-container {
  flex: 1;
  overflow-y: auto;
  height: 100%;
}

/* Empty state */
.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 40px;
  text-align: center;
  background-color: var(--bg-primary);
}

.empty-state-card {
  max-width: 280px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.empty-illustration {
  width: 80px;
  height: 80px;
  margin-bottom: 4px;
}

.empty-svg {
  width: 100%;
  height: 100%;
}

.pulse-ring {
  animation: pulseRing 2s infinite ease-in-out;
  transform-origin: 50px 50px;
}

@keyframes pulseRing {
  0% { transform: scale(0.85); opacity: 0.3; }
  50% { transform: scale(1.1); opacity: 0.6; }
  100% { transform: scale(0.85); opacity: 0.3; }
}

.empty-title {
  font-family: var(--font-sans);
  font-size: 0.88rem;
  font-weight: 500;
  color: var(--text-primary);
}

.empty-subtitle {
  font-size: 0.78rem;
  color: var(--text-muted);
  line-height: 1.45;
}

/* AI mode full-width chat */
.ai-chat-focus {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.ai-header {
  background-color: var(--bg-primary);
  border-bottom: 1px solid transparent;
}

.ai-header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.session-selector-wrapper {
  display: flex;
  align-items: center;
}

.minimal-select {
  border: none;
  background: transparent;
  font-family: var(--font-sans);
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-primary);
  outline: none;
  cursor: pointer;
  padding-right: 4px;
  text-transform: capitalize;
}

.minimal-new-chat-btn {
  background: transparent;
  border: none;
  font-family: var(--font-sans);
  font-size: 0.95rem;
  font-weight: 500;
  color: var(--text-muted);
  width: 22px;
  height: 22px;
  border-radius: 4px;
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-left: 2px;
}

.minimal-new-chat-btn:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.ai-header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.minimal-trash-btn {
  background: transparent;
  border: 1px solid transparent;
  color: var(--text-muted);
  width: 24px;
  height: 24px;
  border-radius: 6px;
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-left: 4px;
}

.minimal-trash-btn:hover {
  border-color: hsl(0, 100%, 92%);
  color: hsl(0, 85%, 45%);
  background-color: hsl(0, 100%, 99%);
}

.minimal-clear-btn {
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 3px 8px;
  font-family: var(--font-sans);
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.minimal-clear-btn:hover {
  border-color: var(--text-primary);
  color: var(--text-primary);
  background-color: var(--bg-secondary);
}

.ai-chat-wrapper {
  flex: 1;
  overflow: hidden;
}

/* Animation */
.animate-fade-in {
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(2px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
