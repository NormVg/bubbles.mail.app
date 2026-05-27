<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useMail } from '../composables/useMail'
import { useDailyDigest } from '../composables/useDailyDigest'
import { useComposeStore } from '../stores/useComposeStore'
import BubblesLogo from './common/BubblesLogo.vue'
import {
  CalendarDays,
  Clock,
  ChevronLeft,
  Settings,
  Plus,
  Inbox,
  Sparkles,
  SquarePen,
  RefreshCw
} from '@lucide/vue'

const {
  activeAccount,
  setActiveAccount,
  accountUnreadCounts,
  filteredEmails,
  setSelectedEmailId,
  viewMode,
  setViewMode,
  timelineDateKeys,
  visibleAccounts,
  gmailLoading,
  gmailConnectPending,
  gmailError,
  refreshGmailAccounts,
  connectGmailAccount,
  syncActiveGmailAccount
} = useMail()

const { selectedDateKey, setSelectedDateKey: setDateKey } = useDailyDigest()

function setSelectedDateKey(date: string) {
  setDateKey(date)
  if (viewMode.value !== 'inbox') {
    setViewMode('digest')
  }

  // Wait for computed filteredEmails to update, then select first email
  setTimeout(() => {
    const firstMail = filteredEmails.value[0]
    setSelectedEmailId(firstMail ? firstMail.id : null)
  }, 0)
}

function handleInboxClick() {
  setViewMode('inbox')
  setDateKey('')
  void syncActiveGmailAccount()
  // Wait for computed filteredEmails to update, then select first email
  setTimeout(() => {
    const firstMail = filteredEmails.value[0]
    setSelectedEmailId(firstMail ? firstMail.id : null)
  }, 0)
}

function handleComposeClick() {
  useComposeStore().clearComposer()
  setViewMode('compose')
}

let lastFocusTime = 0
function handleWindowFocus() {
  const now = Date.now()
  if (now - lastFocusTime > 5000) {
    lastFocusTime = now
    void refreshGmailAccounts()
  }
}

onMounted(() => {
  void refreshGmailAccounts()
  window.addEventListener('focus', handleWindowFocus)
})

onUnmounted(() => {
  window.removeEventListener('focus', handleWindowFocus)
})
</script>

<template>
  <aside class="pane pane-left unified-sidebar">
    <!-- Branding Header: Bubbles Logo + App Name -->
    <div class="sidebar-header">
      <div class="bubbles-branding-logo">
        <BubblesLogo class="logo-svg" />
      </div>
      <h1 class="branding-title">Bubbles.mail</h1>
    </div>

    <!-- Sidebar Main Scrolling Navigation -->
    <div class="sidebar-scrollable-content">

      <!-- Timeline Navigation Section -->
      <div class="nav-section">
        <h3 class="section-uppercase-title">Timeline</h3>
        <ul class="nav-list">

          <li
            v-for="item in timelineDateKeys"
            :key="item.dateKey"
            class="nav-item timeline-item"
            :class="{ 'active': selectedDateKey === item.dateKey && (viewMode === 'digest' || viewMode === 'inbox') }"
            @click="setSelectedDateKey(item.dateKey)"
          >
            <div class="nav-item-left">
              <Clock v-if="item.dateKey === 'Yesterday'" :size="15" class="nav-icon" />
              <ChevronLeft v-else-if="item.dateKey !== 'Today'" :size="15" class="nav-icon date-chevron" />
              <CalendarDays v-else :size="15" class="nav-icon" />
              <span :class="{ 'past-date-label': item.dateKey !== 'Today' && item.dateKey !== 'Yesterday' }">
                {{ item.dateKey }}
              </span>
            </div>
            <span
              v-if="item.count > 0"
              class="timeline-badge"
              :class="{ 'muted-badge': item.dateKey !== 'Today' }"
            >
              {{ item.count }}
            </span>
          </li>

          <li v-if="timelineDateKeys.length === 0" class="nav-empty-row">No synced mail yet</li>
        </ul>

        <ul class="nav-list nav-list-apps">
          <li
            class="nav-item"
            :class="{ active: viewMode === 'chat' }"
            @click="setViewMode('chat')"
          >
            <div class="nav-item-left">
              <Sparkles :size="15" class="nav-icon" />
              <span>Bubbles.ai</span>
            </div>
          </li>

          <li
            class="nav-item"
            :class="{ active: viewMode === 'inbox' && !selectedDateKey }"
            @click="handleInboxClick"
          >
            <div class="nav-item-left">
              <Inbox :size="15" class="nav-icon" />
              <span>Inbox</span>
            </div>
          </li>

          <li
            class="nav-item"
            :class="{ active: viewMode === 'compose' }"
            @click="handleComposeClick"
          >
            <div class="nav-item-left">
              <SquarePen :size="15" class="nav-icon" />
              <span>Compose</span>
            </div>
          </li>
        </ul>
      </div>

      <div class="nav-divider" />

      <!-- Accounts Section exactly matching screenshot -->
      <div class="nav-section accounts-section">
        <h3 class="section-uppercase-title">Accounts</h3>
        <ul class="nav-list">

          <li
            v-for="email in visibleAccounts"
            :key="email"
            class="account-item-row"
            :class="{ 'active': activeAccount === email }"
            @click="setActiveAccount(email)"
          >
            <div class="account-item-inner">
              <span class="account-monogram flex-center">{{ email[0].toUpperCase() }}</span>
              <span class="account-email-text" :title="email">{{ email }}</span>
            </div>
            <span v-if="accountUnreadCounts[email] > 0" class="account-badge">
              {{ accountUnreadCounts[email] }}
            </span>
          </li>

          <!-- Add Account dashed button matching screenshot -->
          <li class="add-account-wrapper">
            <button class="dashed-add-btn flex-center" :disabled="gmailLoading" @click="connectGmailAccount">
              <RefreshCw v-if="gmailLoading" :size="14" class="add-plus-icon spin-icon" />
              <Plus v-else :size="14" class="add-plus-icon" />
              {{ gmailConnectPending ? 'Finish in browser' : 'Add account' }}
            </button>
            <p v-if="gmailError" class="account-error">{{ gmailError }}</p>
          </li>

        </ul>
      </div>

    </div>

    <!-- Sidebar Fixed Footer -->
    <div class="sidebar-footer">
      <div class="footer-actions-row">
        <button 
          class="footer-action-btn" 
          :class="{ 'active-settings': viewMode === 'settings' }"
          title="AI & App Settings" 
          @click="setViewMode('settings')"
        >
          <Settings :size="16" />
        </button>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.unified-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-primary);
  border-right: 1px solid var(--border-color);
}

.sidebar-header {
  height: 56px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

/* Rounded grey circle with two dark vertical dots logo matching screenshot */
.bubbles-branding-logo {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logo-svg {
  width: 100%;
  height: 100%;
  color: var(--text-primary);
}

.branding-title {
  font-family: var(--font-title);
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.sidebar-scrollable-content {
  flex: 1;
  overflow-y: auto;
  padding: 10px 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.nav-section {
  display: flex;
  flex-direction: column;
}

.section-uppercase-title {
  font-family: var(--font-sans);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
  padding: 0 10px 6px;
  margin: 0;
}

.nav-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin: 0;
  padding: 0;
}

.nav-list-apps {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border-color);
}

.nav-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 32px;
  padding: 6px 10px;
  border-radius: 8px;
  color: var(--text-secondary);
  font-size: 0.81rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color var(--transition-fast), color var(--transition-fast);
  user-select: none;
}

.nav-item:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.dashed-add-btn:disabled {
  cursor: progress;
  opacity: 0.72;
}

.spin-icon {
  animation: spin 0.9s linear infinite;
}

.account-error {
  margin: 6px 4px 0;
  color: hsl(0, 68%, 46%);
  font-size: 0.68rem;
  line-height: 1.3;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.nav-item.active {
  background-color: var(--active-bg);
  color: var(--active-text);
}

.nav-item-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.nav-icon {
  width: 15px;
  height: 15px;
  color: var(--text-secondary);
  flex-shrink: 0;
  transition: color var(--transition-fast);
}

.nav-item.active .nav-icon {
  color: var(--active-text);
}

.date-chevron {
  opacity: 0.4;
}

.past-date-label {
  font-size: 0.81rem;
  font-weight: 450;
  color: var(--text-primary);
}

.nav-item.active .past-date-label {
  color: var(--active-text);
}

/* Timeline unread circular count badges */
.timeline-badge {
  font-size: 0.7rem;
  font-weight: 600;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background-color: var(--bg-tertiary);
  color: var(--text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

.nav-item.active .timeline-badge {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.timeline-badge.muted-badge {
  background-color: var(--bg-secondary);
  color: var(--text-muted);
}

.nav-divider {
  height: 1px;
  background-color: var(--border-color);
  margin: 14px 10px;
  flex-shrink: 0;
}

.accounts-section {
  margin-top: 0;
}

/* Connected account item style list */
.account-item-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 32px;
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
  color: var(--text-secondary);
  border: 1px solid transparent; /* Static border to prevent layout shifts */
}

.account-item-row:hover {
  background-color: var(--bg-secondary);
}

.account-item-row.active {
  background-color: var(--bg-secondary);
  border-color: var(--border-color); /* Animate border color only, not size! */
  color: var(--text-primary);
}

.account-item-inner {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  flex: 1;
}

.account-monogram {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background-color: var(--bg-tertiary);
  color: var(--text-secondary);
  font-size: 0.65rem;
  font-weight: 700;
  flex-shrink: 0;
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

.account-item-row.active .account-monogram {
  background-color: var(--text-primary);
  color: var(--bg-primary);
}

.account-email-text {
  font-size: 0.78rem;
  font-weight: 450;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.account-badge {
  font-size: 0.65rem;
  font-weight: 600;
  padding: 1px 5px;
  background-color: var(--border-color);
  color: var(--text-secondary);
  border-radius: 4px;
  margin-left: 6px;
}

/* Add account button style dashed border */
.add-account-wrapper {
  margin-top: 4px;
  padding: 0 2px;
}

.dashed-add-btn {
  width: 100%;
  background: transparent;
  border: 1.5px dashed var(--border-color);
  border-radius: 8px;
  padding: 6px 8px;
  min-height: 32px;
  font-family: var(--font-sans);
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color var(--transition-fast), border-color var(--transition-fast), color var(--transition-fast);
  gap: 6px;
}

.dashed-add-btn:hover {
  border-color: var(--text-muted);
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.add-plus-icon {
  opacity: 0.7;
}

/* Fixed Footer Row */
.sidebar-footer {
  padding: 10px 14px;
  border-top: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  flex-shrink: 0;
}

.footer-actions-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.footer-action-btn {
  background: transparent;
  border: none;
  padding: 6px;
  border-radius: 6px;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color var(--transition-fast), background-color var(--transition-fast);
}

.footer-action-btn:hover {
  color: var(--text-primary);
}

/* ── Active Physics ──────────────────────────────────────────────────────── */
.nav-item:active,
.dashed-add-btn:active,
.footer-action-btn:active,
.account-item-row:active {
  transform: scale(0.96);
  transition: transform 0.1s;
}

.footer-action-btn.active-settings {
  color: var(--text-primary);
  background-color: var(--bg-secondary);
}
</style>
