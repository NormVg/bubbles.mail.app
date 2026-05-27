<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAiAssistant } from '../composables/useAiAssistant'
import { Sparkles, Trash2, Plus, MessageSquare } from '@lucide/vue'

const { 
  sessions, 
  currentSessionId, 
  createNewSession, 
  deleteSession 
} = useAiAssistant()

const sessionSearchQuery = ref('')

const filteredSessions = computed(() => {
  if (!sessionSearchQuery.value.trim()) return sessions.value
  const query = sessionSearchQuery.value.toLowerCase().trim()
  return sessions.value.filter(s => 
    s.title.toLowerCase().includes(query) || 
    s.messages.some(m => m.text.toLowerCase().includes(query))
  )
})

function selectSession(id: string) {
  currentSessionId.value = id
}
</script>

<template>
  <div class="chat-sessions-pane animate-fade-in">
    <!-- Header with New Chat btn -->
    <div class="pane-header sessions-header">
      <div class="header-left">
        <Sparkles :size="15" class="header-icon" />
        <span class="header-title">Conversations</span>
      </div>
      <button 
        class="new-session-btn flex-center" 
        @click="createNewSession" 
        title="Start a new chat session"
      >
        <Plus :size="14" />
        New
      </button>
    </div>

    <!-- Search Sessions -->
    <div class="search-container">
      <div class="search-bar">
        <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input 
          type="text" 
          v-model="sessionSearchQuery" 
          placeholder="Search chat history..."
          class="search-input"
        />
      </div>
    </div>

    <!-- Sessions List -->
    <div class="sessions-list">
      <div 
        v-for="sess in filteredSessions" 
        :key="sess.id" 
        class="session-card"
        :class="{ 'active': currentSessionId === sess.id }"
        @click="selectSession(sess.id)"
      >
        <div class="session-card-inner">
          <div class="chat-bubble-icon flex-center">
            <MessageSquare :size="13" />
          </div>
          <div class="session-info">
            <h4 class="session-title">{{ sess.title }}</h4>
            <p class="session-preview">
              {{ sess.messages[sess.messages.length - 1]?.text || 'Empty conversation' }}
            </p>
          </div>
        </div>

        <!-- Delete session button -->
        <button 
          v-if="sessions.length > 1"
          class="delete-session-btn flex-center" 
          @click.stop="deleteSession(sess.id)" 
          title="Delete chat session"
        >
          <Trash2 :size="12" />
        </button>
      </div>

      <div v-if="filteredSessions.length === 0" class="empty-sessions-state flex-center">
        <p>No active chat histories match.</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-sessions-pane {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-primary);
}

.sessions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.new-session-btn {
  background-color: var(--text-primary);
  color: var(--bg-primary);
  border: none;
  border-radius: 6px;
  padding: 3px 10px;
  font-family: var(--font-sans);
  font-size: 0.72rem;
  font-weight: 500;
  cursor: pointer;
  gap: 4px;
  height: 28px;
  transition: opacity var(--transition-fast);
}

.new-session-btn:hover {
  opacity: 0.9;
}

/* Search Bar */
.search-container {
  padding: 12px 16px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.search-bar {
  display: flex;
  align-items: center;
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0 12px;
  height: 36px;
}

.search-icon {
  width: 14px;
  height: 14px;
  color: var(--text-muted);
  margin-right: 8px;
}

.search-input {
  border: none;
  background: transparent;
  flex: 1;
  height: 100%;
  font-family: var(--font-sans);
  font-size: 0.8rem;
  color: var(--text-primary);
  outline: none;
}

.search-input::placeholder {
  color: var(--text-muted);
}

/* Sessions List */
.sessions-list {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.session-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
  gap: 12px;
  position: relative;
}

.session-card:hover {
  background-color: var(--bg-secondary);
}

.session-card.active {
  background-color: var(--bg-secondary);
  border-color: var(--border-color);
}

.session-card-inner {
  display: flex;
  align-items: center;
  gap: 10px;
  overflow: hidden;
  flex: 1;
}

.chat-bubble-icon {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.session-card.active .chat-bubble-icon {
  background-color: var(--text-primary);
  color: var(--bg-primary);
}

.session-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
}

.session-title {
  font-family: var(--font-sans);
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-preview {
  font-size: 0.72rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 1px;
}

.delete-session-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  opacity: 0;
  transition: all var(--transition-fast);
  flex-shrink: 0;
}

.session-card:hover .delete-session-btn {
  opacity: 1;
}

.delete-session-btn:hover {
  background-color: hsl(0, 100%, 97%);
  color: hsl(0, 85%, 45%);
}

.empty-sessions-state {
  padding: 40px 16px;
  text-align: center;
  font-size: 0.78rem;
  color: var(--text-muted);
}

.animate-fade-in {
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
