<script setup lang="ts">
import { useMail } from '../../composables/useMail'
import { Mail, Trash2, Plus, RefreshCw, AlertCircle } from '@lucide/vue'
import { ref } from 'vue'

const { gmailAccounts, disconnectGmailAccount, connectGmailAccount, gmailLoading, gmailError } = useMail()

const confirmDisconnectId = ref<string | null>(null)
const isDisconnecting = ref(false)

async function handleDisconnect(accountId: string) {
  if (confirmDisconnectId.value === accountId) {
    isDisconnecting.value = true
    try {
      await disconnectGmailAccount(accountId)
    } finally {
      isDisconnecting.value = false
      confirmDisconnectId.value = null
    }
  } else {
    confirmDisconnectId.value = accountId
    // Auto-reset confirmation after 3 seconds
    setTimeout(() => {
      if (confirmDisconnectId.value === accountId) {
        confirmDisconnectId.value = null
      }
    }, 3000)
  }
}
</script>

<template>
  <div class="settings-section animate-fade-in">
    <div class="section-title-row">
      <h3 class="section-label">Connected Accounts</h3>
      <button class="add-account-btn flex-center" @click="connectGmailAccount" :disabled="gmailLoading">
        <RefreshCw v-if="gmailLoading" class="spin-icon" :size="14" />
        <Plus v-else :size="14" />
        <span>Add Account</span>
      </button>
    </div>

    <!-- Error Banner -->
    <div v-if="gmailError" class="alert-box error-box">
      <AlertCircle class="alert-icon error-icon" :size="16" />
      <span class="alert-text">{{ gmailError }}</span>
    </div>

    <TransitionGroup name="list" tag="div" class="accounts-list" v-if="gmailAccounts.length > 0">
      <div v-for="account in gmailAccounts" :key="account.id" class="account-card">
        <div class="account-info">
          <div class="account-icon-wrapper">
            <Mail :size="16" />
          </div>
          <div class="account-details">
            <span class="account-email">{{ account.email }}</span>
            <div class="account-status">
              <span class="status-dot"></span>
              <span class="status-text">Connected & Syncing</span>
            </div>
          </div>
        </div>
        
        <button 
          class="disconnect-btn flex-center" 
          :class="{ 'confirm-state': confirmDisconnectId === account.id }"
          @click="handleDisconnect(account.id)"
          :disabled="isDisconnecting"
        >
          <Trash2 :size="14" />
          <span>{{ confirmDisconnectId === account.id ? 'Click to Confirm' : 'Disconnect' }}</span>
        </button>
      </div>
    </TransitionGroup>

    <div v-else class="empty-accounts-state">
      <div class="empty-icon-wrapper">
        <Mail :size="24" />
      </div>
      <p class="empty-title">No Accounts Connected</p>
      <p class="empty-subtitle">Connect your first Gmail account to start managing your emails with AI.</p>
    </div>
  </div>
</template>

<style scoped>
.accounts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: relative;
}

.list-enter-active,
.list-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.list-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(20px) scale(0.95);
}

.list-leave-active {
  position: absolute;
  width: 100%;
}

.list-move {
  transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.account-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  background-color: var(--bg-primary);
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.account-card:hover {
  border-color: var(--text-muted);
  box-shadow: var(--shadow-sm);
}

.account-info {
  display: flex;
  align-items: center;
  gap: 14px;
}

.account-icon-wrapper {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background-color: var(--bg-secondary);
  color: var(--text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.account-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.account-email {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.account-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: hsl(142, 70%, 45%);
}

.status-text {
  font-size: 0.72rem;
  color: var(--text-muted);
  font-weight: 500;
}

.disconnect-btn {
  background-color: transparent;
  color: var(--text-muted);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 6px 12px;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  gap: 6px;
  transition: all var(--transition-fast);
}

.disconnect-btn:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.disconnect-btn.confirm-state {
  background-color: hsl(0, 84%, 95%);
  color: hsl(0, 72%, 40%);
  border-color: hsl(0, 84%, 90%);
}

.disconnect-btn.confirm-state:hover {
  background-color: hsl(0, 84%, 90%);
}

.add-account-btn {
  background-color: var(--text-primary);
  color: var(--bg-primary);
  border: none;
  border-radius: 6px;
  padding: 6px 14px;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  gap: 6px;
  transition: opacity var(--transition-fast);
}

.add-account-btn:hover {
  opacity: 0.9;
}

.empty-accounts-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  border: 1px dashed var(--border-color);
  border-radius: 12px;
  background-color: var(--bg-secondary);
}

.empty-icon-wrapper {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: var(--bg-tertiary);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.empty-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.empty-subtitle {
  font-size: 0.8rem;
  color: var(--text-muted);
  max-width: 260px;
  line-height: 1.4;
}

.error-box {
  background-color: hsl(0, 84%, 95%);
  border-color: hsl(0, 84%, 90%);
}

.error-icon {
  color: hsl(0, 72%, 40%);
}
</style>
