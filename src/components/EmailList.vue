<script setup lang="ts">
import { Search } from '@lucide/vue'
import { useMail } from '../composables/useMail'

const { filteredEmails, selectedEmailId, setSelectedEmailId } = useMail()

function selectEmail(id: string) {
  setSelectedEmailId(id)
}
</script>

<template>
  <div class="email-list">
    <div v-if="filteredEmails.length === 0" class="empty-search-state animate-fade-in">
      <span class="empty-icon"><Search :size="32" /></span>
      <p class="empty-text">No emails found matching your query</p>
    </div>
    
    <div 
      v-for="email in filteredEmails" 
      :key="email.id" 
      class="email-card"
      :class="{ 'selected': email.id === selectedEmailId, 'unread-card': email.unread }"
      @click="selectEmail(email.id)"
    >
      <!-- Unread Indicator Dot & Header Info -->
      <div class="card-header">
        <div class="sender-info">
          <span v-if="email.unread" class="unread-dot-indicator"></span>
          <span class="sender-name">{{ email.sender }}</span>
        </div>
        <span class="card-date">{{ email.date }}</span>
      </div>

      <!-- Subject line -->
      <h4 class="card-subject">{{ email.subject }}</h4>

      <!-- Body Snippet clamped text -->
      <p class="card-snippet">{{ email.body }}</p>

      <!-- Bottom Badges List -->
      <div class="card-badges">
        <span 
          v-for="tag in email.tags" 
          :key="tag" 
          class="badge"
          :class="`badge-${tag}`"
        >
          {{ tag }}
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.email-list {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.email-card {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  background-color: var(--bg-primary);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 8px;
  transition: all var(--transition-fast);
  position: relative;
  user-select: none;
}

.email-card:hover {
  border-color: hsl(0, 0%, 80%);
  background-color: var(--bg-secondary);
  transform: translateY(-1px);
}

.email-card.selected {
  border-color: var(--text-primary);
  background-color: var(--bg-primary);
  box-shadow: var(--shadow-md);
}

.email-card.selected::before {
  content: "";
  position: absolute;
  left: 0;
  top: 16px;
  bottom: 16px;
  width: 3px;
  background-color: var(--text-primary);
  border-top-right-radius: 4px;
  border-bottom-right-radius: 4px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8rem;
}

.sender-info {
  display: flex;
  align-items: center;
  gap: 6px;
}

.unread-dot-indicator {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--primary-color);
  display: inline-block;
}

.sender-name {
  font-family: var(--font-title);
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.88rem;
}

.card-date {
  color: var(--text-secondary);
  font-size: 0.78rem;
}

.card-subject {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-top: -2px;
}

.card-snippet {
  font-size: 0.8rem;
  color: var(--text-secondary);
  line-height: 1.4;
  /* Multi-line clamp */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}

.empty-search-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.empty-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  color: var(--text-secondary);
  opacity: 0.7;
}

.empty-text {
  font-size: 0.88rem;
  color: var(--text-secondary);
}

.animate-fade-in {
  animation: fadeIn 0.3s var(--transition-fast);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
