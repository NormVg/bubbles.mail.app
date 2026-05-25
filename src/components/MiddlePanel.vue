<script setup lang="ts">
import { Sparkles, Inbox } from '@lucide/vue'
import { useMail } from '../composables/useMail'
import { useDailyDigest } from '../composables/useDailyDigest'

const { viewMode, setViewMode, activeTab, setActiveTab, searchQuery, setSearchQuery } = useMail()
const { selectedReport } = useDailyDigest()

function handleSearchInput(event: Event) {
  const target = event.target as HTMLInputElement
  setSearchQuery(target.value)
}
</script>

<template>
  <section class="pane pane-middle">
    <!-- Header: Classic layout with static title depending on active page context -->
    <div class="pane-header middle-header">
      <div class="pane-title flex-center gap-6" style="display: flex; align-items: center; gap: 8px;">
        <Sparkles v-if="viewMode === 'digest'" :size="15" style="color: var(--text-secondary);" />
        <Inbox v-else-if="viewMode === 'inbox'" :size="15" style="color: var(--text-secondary);" />
        <span class="header-title-text" style="font-size: 0.95rem; font-weight: 600; color: var(--text-primary);">{{ viewMode === 'digest' ? 'Intelligence' : 'Inbox' }}</span>
      </div>
      
      <!-- Right Side Context Date Display -->
      <div class="timeline-day-context" v-if="viewMode === 'digest'">
        {{ selectedReport.dateKey }}
      </div>
    </div>

    <!-- Search Input (Matches screenshot design) -->
    <div class="search-container">
      <div class="search-bar">
        <svg class="search-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input 
          type="text" 
          :value="searchQuery" 
          placeholder="Search..."
          @input="handleSearchInput"
          class="search-input"
        />
      </div>
    </div>

    <!-- Main List Scroll Container -->
    <div class="list-scroll-area">
      <!-- Traditional Inbox View -->
      <EmailList v-if="viewMode === 'inbox'" />
      
      <!-- Bubbles AI Daily Report View -->
      <DailyDigest v-else />
    </div>
  </section>
</template>

<style scoped>
.tabs-container {
  display: flex;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 2px;
}

.tab-btn {
  border: none;
  background: transparent;
  padding: 6px 12px;
  border-radius: 6px;
  font-family: var(--font-sans);
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.tab-btn.active {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
}

.view-mode-tabs {
  display: flex;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 2px;
  gap: 2px;
}

.mode-tab-btn {
  border: none;
  background: transparent;
  padding: 6px 12px;
  border-radius: 6px;
  font-family: var(--font-sans);
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all var(--transition-fast);
}

.mode-tab-btn:hover {
  color: var(--text-primary);
}

.mode-tab-btn.active {
  background-color: var(--bg-primary);
  color: var(--text-primary);
  box-shadow: var(--shadow-sm);
  font-weight: 500;
}

.timeline-day-context {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-secondary);
  background-color: var(--bg-secondary);
  padding: 4px 10px;
  border-radius: 9999px;
  border: 1px solid var(--border-color);
}

/* Search Bar Styling */
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
  height: 38px;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.search-bar:focus-within {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px var(--primary-light);
}

.search-icon {
  width: 16px;
  height: 16px;
  color: var(--text-muted);
  margin-right: 8px;
}

.search-input {
  border: none;
  background: transparent;
  flex: 1;
  height: 100%;
  font-family: var(--font-sans);
  font-size: 0.88rem;
  color: var(--text-primary);
  outline: none;
}

.search-input::placeholder {
  color: var(--text-muted);
}

/* Scroll Area */
.list-scroll-area {
  flex: 1;
  overflow-y: auto;
  background-color: var(--bg-primary);
}
</style>
