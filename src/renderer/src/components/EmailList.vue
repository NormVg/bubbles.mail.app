<script setup lang="ts">
import { AlertCircle, Plus, RefreshCw, Search } from '@lucide/vue'
import { useMail } from '../composables/useMail'

const {
  filteredEmails,
  selectedEmailId,
  setSelectedEmailId,
  visibleAccounts,
  gmailError,
  gmailLoading,
  gmailSyncing,
  gmailHasMore,
  gmailPageLoading,
  connectGmailAccount,
  syncActiveGmailAccount,
  loadMoreGmailMessages
} = useMail()

function loadMore() {
  void loadMoreGmailMessages()
}

function selectEmail(id: string) {
  setSelectedEmailId(id)
}
</script>

<template>
  <div class="email-list">
    <div v-if="gmailError" class="empty-search-state error-state animate-fade-in">
      <span class="empty-icon"><AlertCircle :size="32" /></span>
      <p class="empty-title">Gmail error</p>
      <p class="empty-text">{{ gmailError }}</p>
      <button class="empty-action-btn" @click="syncActiveGmailAccount">
        <RefreshCw :size="13" />
        Retry sync
      </button>
    </div>

    <div v-else-if="visibleAccounts.length === 0" class="empty-search-state animate-fade-in">
      <span class="empty-icon"><Plus :size="32" /></span>
      <p class="empty-title">Connect Gmail</p>
      <p class="empty-text">Add a real Gmail account to load inbox messages.</p>
      <button class="empty-action-btn" :disabled="gmailLoading" @click="connectGmailAccount">
        <RefreshCw v-if="gmailLoading" :size="13" class="spin-icon" />
        <Plus v-else :size="13" />
        Add account
      </button>
    </div>

    <div v-else-if="(gmailLoading || gmailSyncing) && filteredEmails.length === 0" class="empty-search-state animate-fade-in">
      <span class="empty-icon"><RefreshCw :size="32" class="spin-icon" /></span>
      <p class="empty-title">Syncing Gmail</p>
      <p class="empty-text">Loading real emails from your connected account.</p>
    </div>

    <div v-else-if="filteredEmails.length === 0" class="empty-search-state animate-fade-in">
      <span class="empty-icon"><Search :size="32" /></span>
      <p class="empty-title">No emails found</p>
      <p class="empty-text">Try clearing search or date filters.</p>
    </div>
    
    <TransitionGroup name="list-fade" tag="div" class="email-list-group">
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
    </TransitionGroup>

    <!-- Pagination Loading States -->
    <div v-if="gmailPageLoading" class="pagination-spinner flex-center animate-fade-in">
      <RefreshCw :size="14" class="spin-icon" />
      <span>Loading more...</span>
    </div>
    <div v-else-if="gmailHasMore && filteredEmails.length > 0" class="load-more-wrapper flex-center animate-fade-in">
      <button class="load-more-btn flex-center" @click="loadMore">
        Load more emails
      </button>
    </div>
    <div v-else-if="!gmailHasMore && filteredEmails.length > 0" class="pagination-end flex-center animate-fade-in">
      <span>All messages loaded</span>
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
  margin: 0;
}

.empty-title {
  margin: 0 0 4px;
  font-size: 0.92rem;
  font-weight: 650;
  color: var(--text-primary);
}

.error-state .empty-icon {
  color: hsl(0, 68%, 46%);
}

.empty-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 12px;
  border: 1px solid var(--border-color);
  border-radius: 999px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: 0.76rem;
  font-weight: 600;
  padding: 7px 12px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.empty-action-btn:hover:not(:disabled) {
  border-color: var(--text-muted);
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.empty-action-btn:disabled {
  cursor: progress;
  opacity: 0.6;
}

.spin-icon {
  animation: spin 0.9s linear infinite;
}

.animate-fade-in {
  animation: fadeIn 0.3s var(--transition-fast);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.pagination-spinner,
.pagination-end {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--text-muted);
  user-select: none;
}

.pagination-end {
  font-size: 0.68rem;
  opacity: 0.8;
}

.load-more-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 8px;
  margin-bottom: 8px;
}

.load-more-btn {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  padding: 8px 20px;
  font-family: var(--font-sans);
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  box-shadow: var(--shadow-sm);
  outline: none;
}

.load-more-btn:hover {
  background-color: var(--bg-primary);
  border-color: var(--text-muted);
  color: var(--text-primary);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
</style>
