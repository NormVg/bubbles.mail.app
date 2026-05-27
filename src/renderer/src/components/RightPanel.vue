<script setup lang="ts">
import { Archive, Trash2, Reply, ReplyAll, Forward } from '@lucide/vue'
import { useMail } from '../composables/useMail'
import { useAiAssistant } from '../composables/useAiAssistant'

import { useComposeStore } from '../stores/useComposeStore'

const { viewMode, selectedEmail, deleteEmail, archiveEmail } = useMail()
const composeStore = useComposeStore()
const { 
  sessions, 
  currentSessionId, 
  createNewSession, 
  deleteSession
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

function handleReply() {
  if (selectedEmail.value) {
    composeStore.clearComposer()
    composeStore.addChip(composeStore.toChips, selectedEmail.value.senderEmail)
    composeStore.subject = selectedEmail.value.subject.startsWith('Re:') 
      ? selectedEmail.value.subject 
      : `Re: ${selectedEmail.value.subject}`
    composeStore.body = `\n\nOn ${selectedEmail.value.date}, ${selectedEmail.value.sender} <${selectedEmail.value.senderEmail}> wrote:\n> ${selectedEmail.value.body.replace(/\n/g, '\n> ')}`
    viewMode.value = 'compose'
  }
}

function handleReplyAll() {
  if (selectedEmail.value) {
    composeStore.clearComposer()
    composeStore.addChip(composeStore.toChips, selectedEmail.value.senderEmail)
    composeStore.subject = selectedEmail.value.subject.startsWith('Re:') 
      ? selectedEmail.value.subject 
      : `Re: ${selectedEmail.value.subject}`
    composeStore.body = `\n\nOn ${selectedEmail.value.date}, ${selectedEmail.value.sender} <${selectedEmail.value.senderEmail}> wrote:\n> ${selectedEmail.value.body.replace(/\n/g, '\n> ')}`
    viewMode.value = 'compose'
  }
}

function handleForward() {
  if (selectedEmail.value) {
    composeStore.clearComposer()
    composeStore.subject = selectedEmail.value.subject.startsWith('Fwd:') 
      ? selectedEmail.value.subject 
      : `Fwd: ${selectedEmail.value.subject}`
    composeStore.body = `\n\n---------- Forwarded message ---------\nFrom: ${selectedEmail.value.sender} <${selectedEmail.value.senderEmail}>\nDate: ${selectedEmail.value.date}\nSubject: ${selectedEmail.value.subject}\n\n${selectedEmail.value.body}`
    viewMode.value = 'compose'
  }
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
            <button class="tool-btn" title="Reply" @click="handleReply">
              <Reply :size="16" />
            </button>
            <button class="tool-btn" title="Reply All" @click="handleReplyAll">
              <ReplyAll :size="16" />
            </button>
            <button class="tool-btn" title="Forward" @click="handleForward">
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
              <defs>
                <linearGradient id="envelopeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="var(--bg-primary)" />
                  <stop offset="100%" stop-color="var(--bg-secondary)" />
                </linearGradient>
                <filter id="envelopeShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="6" stdDeviation="4" flood-color="var(--text-primary)" flood-opacity="0.06" />
                </filter>
              </defs>
              <circle cx="50" cy="50" r="38" stroke="var(--border-color)" stroke-width="1.2" stroke-dasharray="3 3" />
              <g class="floating-envelope-group" filter="url(#envelopeShadow)">
                <rect x="26" y="34" width="48" height="32" rx="4" fill="url(#envelopeGrad)" stroke="var(--border-color)" stroke-width="1.5" />
                <path d="M26 35L50 51L74 35" stroke="var(--text-muted)" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" />
                <path d="M26 63L44 49" stroke="var(--border-color)" stroke-width="1" stroke-linecap="round" />
                <path d="M74 63L56 49" stroke="var(--border-color)" stroke-width="1" stroke-linecap="round" />
              </g>
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

.floating-envelope-group {
  animation: floatEnvelope 3s ease-in-out infinite;
  transform-origin: center;
}

@keyframes floatEnvelope {
  0% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
  100% { transform: translateY(0); }
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
