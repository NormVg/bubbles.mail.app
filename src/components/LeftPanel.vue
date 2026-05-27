<script setup lang="ts">
import { useMail } from '../composables/useMail'
import { useDailyDigest } from '../composables/useDailyDigest'
import {
  CalendarDays,
  Clock,
  ChevronLeft,
  Settings,
  Plus,
  Inbox,
  Sparkles,
  SquarePen
} from '@lucide/vue'

const {
  activeAccount,
  setActiveAccount,
  accountUnreadCounts,
  filteredEmails,
  setSelectedEmailId,
  viewMode,
  setViewMode,
  emails
} = useMail()

const { selectedDateKey, setSelectedDateKey: setDateKey } = useDailyDigest()

function setSelectedDateKey(date: string) {
  setDateKey(date)
  if (viewMode.value !== 'inbox') {
    setViewMode('digest')
  }
  
  // Dynamically insert a mock email for this date so the feed isn't blank
  const exists = emails.value.some(e => e.dateKey === date)
  if (!exists && date) {
    emails.value.push({
      id: `dynamic_${Date.now()}`,
      sender: 'Bubbles Intelligence',
      senderEmail: 'assistant@bubbles.ai',
      subject: `Daily Briefing - ${date}`,
      date: `${date}, 9:00 AM`,
      body: `Here is your dynamic briefing for ${date}. All email threads have been processed and archived. Your server uptime was 99.99%. No security advisories were published.`,
      tags: ['briefing', 'automated'],
      category: 'updates',
      unread: false,
      account: activeAccount.value,
      dateKey: date
    })
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
  // Wait for computed filteredEmails to update, then select first email
  setTimeout(() => {
    const firstMail = filteredEmails.value[0]
    setSelectedEmailId(firstMail ? firstMail.id : null)
  }, 0)
}


</script>

<template>
  <aside class="pane pane-left unified-sidebar">
    <!-- Branding Header: Bubbles Logo + App Name -->
    <div class="sidebar-header">
      <div class="bubbles-branding-logo">
        <svg viewBox="0 0 350 350" fill="none" xmlns="http://www.w3.org/2000/svg" class="logo-svg">
          <path d="M-2.38419e-06 175C-2.38419e-06 178.717 3.01347 181.731 6.73077 181.731C10.4481 181.731 13.4615 178.717 13.4615 175C13.4615 171.283 10.4481 168.269 6.73077 168.269C3.01347 168.269 -2.38419e-06 171.283 -2.38419e-06 175Z" fill="currentColor"/>
          <path d="M4.21725 212.443C4.21725 216.16 7.23071 219.173 10.948 219.173C14.6653 219.173 17.6788 216.16 17.6788 212.443C17.6788 208.725 14.6653 205.712 10.948 205.712C7.23071 205.712 4.21725 208.725 4.21725 212.443Z" fill="currentColor"/>
          <path d="M16.6639 248.01C16.6639 251.728 19.6774 254.741 23.3947 254.741C27.112 254.741 30.1254 251.728 30.1254 248.01C30.1254 244.293 27.112 241.28 23.3947 241.28C19.6774 241.28 16.6639 244.293 16.6639 248.01Z" fill="currentColor"/>
          <path d="M36.709 279.913C36.709 283.631 39.7225 286.644 43.4398 286.644C47.1571 286.644 50.1705 283.631 50.1705 279.913C50.1705 276.196 47.1571 273.182 43.4398 273.182C39.7225 273.182 36.709 276.196 36.709 279.913Z" fill="currentColor"/>
          <path d="M63.3534 306.558C63.3534 310.275 66.3668 313.288 70.0841 313.288C73.8014 313.288 76.8149 310.275 76.8149 306.558C76.8149 302.84 73.8014 299.827 70.0841 299.827C66.3668 299.827 63.3534 302.84 63.3534 306.558Z" fill="currentColor"/>
          <path d="M95.2562 326.605C95.2562 330.323 98.2696 333.336 101.987 333.336C105.704 333.336 108.718 330.323 108.718 326.605C108.718 322.888 105.704 319.875 101.987 319.875C98.2696 319.875 95.2562 322.888 95.2562 326.605Z" fill="currentColor"/>
          <path d="M130.824 339.049C130.824 342.767 133.838 345.78 137.555 345.78C141.272 345.78 144.286 342.767 144.286 339.049C144.286 335.332 141.272 332.319 137.555 332.319C133.838 332.319 130.824 335.332 130.824 339.049Z" fill="currentColor"/>
          <path d="M168.269 343.269C168.269 346.987 171.283 350 175 350C178.717 350 181.731 346.987 181.731 343.269C181.731 339.552 178.717 336.538 175 336.538C171.283 336.538 168.269 339.552 168.269 343.269Z" fill="currentColor"/>
          <path d="M205.709 339.049C205.709 342.767 208.723 345.78 212.44 345.78C216.157 345.78 219.171 342.767 219.171 339.049C219.171 335.332 216.157 332.319 212.44 332.319C208.723 332.319 205.709 335.332 205.709 339.049Z" fill="currentColor"/>
          <path d="M241.277 326.605C241.277 330.323 244.291 333.336 248.008 333.336C251.725 333.336 254.739 330.323 254.739 326.605C254.739 322.888 251.725 319.875 248.008 319.875C244.291 319.875 241.277 322.888 241.277 326.605Z" fill="currentColor"/>
          <path d="M273.18 306.558C273.18 310.275 276.193 313.288 279.911 313.288C283.628 313.288 286.641 310.275 286.641 306.558C286.641 302.84 283.628 299.827 279.911 299.827C276.193 299.827 273.18 302.84 273.18 306.558Z" fill="currentColor"/>
          <path d="M299.824 279.913C299.824 283.631 302.838 286.644 306.555 286.644C310.272 286.644 313.286 283.631 313.286 279.913C313.286 276.196 310.272 273.182 306.555 273.182C302.838 273.182 299.824 276.196 299.824 279.913Z" fill="currentColor"/>
          <path d="M319.875 248.01C319.875 251.728 322.888 254.741 326.605 254.741C330.323 254.741 333.336 251.728 333.336 248.01C333.336 244.293 330.323 241.28 326.605 241.28C322.888 241.28 319.875 244.293 319.875 248.01Z" fill="currentColor"/>
          <path d="M332.316 212.443C332.316 216.16 335.329 219.173 339.047 219.173C342.764 219.173 345.777 216.16 345.777 212.443C345.777 208.725 342.764 205.712 339.047 205.712C335.329 205.712 332.316 208.725 332.316 212.443Z" fill="currentColor"/>
          <path d="M336.538 175C336.538 178.717 339.552 181.731 343.269 181.731C346.987 181.731 350 178.717 350 175C350 171.283 346.987 168.269 343.269 168.269C339.552 168.269 336.538 171.283 336.538 175Z" fill="currentColor"/>
          <path d="M332.316 137.557C332.316 141.275 335.329 144.288 339.047 144.288C342.764 144.288 345.777 141.275 345.777 137.557C345.777 133.84 342.764 130.827 339.047 130.827C335.329 130.827 332.316 133.84 332.316 137.557Z" fill="currentColor"/>
          <path d="M319.875 101.99C319.875 105.707 322.888 108.72 326.605 108.72C330.323 108.72 333.336 105.707 333.336 101.99C333.336 98.2723 330.323 95.2588 326.605 95.2588C322.888 95.2588 319.875 98.2723 319.875 101.99Z" fill="currentColor"/>
          <path d="M299.824 70.0868C299.824 73.8041 302.838 76.8175 306.555 76.8175C310.272 76.8175 313.286 73.8041 313.286 70.0868C313.286 66.3695 310.272 63.356 306.555 63.356C302.838 63.356 299.824 66.3695 299.824 70.0868Z" fill="currentColor"/>
          <path d="M273.18 43.4424C273.18 47.1597 276.193 50.1732 279.911 50.1732C283.628 50.1732 286.641 47.1597 286.641 43.4424C286.641 39.7251 283.628 36.7116 279.911 36.7116C276.193 36.7116 273.18 39.7251 273.18 43.4424Z" fill="currentColor"/>
          <path d="M241.277 23.3947C241.277 27.112 244.291 30.1255 248.008 30.1255C251.725 30.1255 254.739 27.112 254.739 23.3947C254.739 19.6774 251.725 16.6639 248.008 16.6639C244.291 16.6639 241.277 19.6774 241.277 23.3947Z" fill="currentColor"/>
          <path d="M205.709 10.9506C205.709 14.6679 208.723 17.6814 212.44 17.6814C216.157 17.6814 219.171 14.6679 219.171 10.9506C219.171 7.23334 216.157 4.21988 212.44 4.21988C208.723 4.21988 205.709 7.23334 205.709 10.9506Z" fill="currentColor"/>
          <path d="M168.269 6.73077C168.269 10.4481 171.283 13.4615 175 13.4615C178.717 13.4615 181.731 10.4481 181.731 6.73077C181.731 3.01347 178.717 0 175 0C171.283 0 168.269 3.01347 168.269 6.73077Z" fill="currentColor"/>
          <path d="M130.824 10.9506C130.824 14.6679 133.838 17.6814 137.555 17.6814C141.272 17.6814 144.286 14.6679 144.286 10.9506C144.286 7.23334 141.272 4.21988 137.555 4.21988C133.838 4.21988 130.824 7.23334 130.824 10.9506Z" fill="currentColor"/>
          <path d="M95.2562 23.3947C95.2562 27.112 98.2696 30.1255 101.987 30.1255C105.704 30.1255 108.718 27.112 108.718 23.3947C108.718 19.6774 105.704 16.6639 101.987 16.6639C98.2696 16.6639 95.2562 19.6774 95.2562 23.3947Z" fill="currentColor"/>
          <path d="M63.3534 43.4424C63.3534 47.1597 66.3668 50.1732 70.0841 50.1732C73.8014 50.1732 76.8149 47.1597 76.8149 43.4424C76.8149 39.7251 73.8014 36.7116 70.0841 36.7116C66.3668 36.7116 63.3534 39.7251 63.3534 43.4424Z" fill="currentColor"/>
          <path d="M36.709 70.0868C36.709 73.8041 39.7225 76.8175 43.4398 76.8175C47.1571 76.8175 50.1705 73.8041 50.1705 70.0868C50.1705 66.3695 47.1571 63.356 43.4398 63.356C39.7225 63.356 36.709 66.3695 36.709 70.0868Z" fill="currentColor"/>
          <path d="M16.6639 101.99C16.6639 105.707 19.6774 108.72 23.3947 108.72C27.112 108.72 30.1254 105.707 30.1254 101.99C30.1254 98.2723 27.112 95.2588 23.3947 95.2588C19.6774 95.2588 16.6639 98.2723 16.6639 101.99Z" fill="currentColor"/>
          <path d="M4.21725 137.557C4.21725 141.275 7.23071 144.288 10.948 144.288C14.6653 144.288 17.6788 141.275 17.6788 137.557C17.6788 133.84 14.6653 130.827 10.948 130.827C7.23071 130.827 4.21725 133.84 4.21725 137.557Z" fill="currentColor"/>
          <path d="M179.963 74.8868C176.869 73.1006 173.057 73.1005 169.963 74.8868L90.7314 120.631C87.6376 122.417 85.7315 125.719 85.7314 129.291V220.78C85.7316 224.353 87.6377 227.654 90.7314 229.44L169.963 275.185C173.057 276.971 176.869 276.971 179.963 275.185L259.195 229.44C262.289 227.654 264.195 224.353 264.195 220.78V129.291C264.195 125.719 262.289 122.417 259.195 120.631L179.963 74.8868ZM175.651 106.909C212.64 106.909 242.625 136.895 242.625 173.883C242.625 210.871 212.64 240.856 175.651 240.856C138.663 240.855 108.679 210.871 108.679 173.883C108.679 136.895 138.663 106.909 175.651 106.909Z" fill="currentColor"/>
          <rect width="19.8654" height="19.8692" rx="5" transform="matrix(-1 0 0 1 224.116 146.35)" fill="currentColor"/>
          <rect width="19.8654" height="19.8692" rx="5" transform="matrix(-1 0 0 1 183.396 146.35)" fill="currentColor"/>
        </svg>
      </div>
      <h1 class="branding-title">Bubbles.mail</h1>
    </div>

    <!-- Sidebar Main Scrolling Navigation -->
    <div class="sidebar-scrollable-content">

      <!-- Timeline Navigation Section -->
      <div class="nav-section">
        <h3 class="section-uppercase-title">Timeline</h3>
        <ul class="nav-list">

          <!-- Today -->
          <li
            class="nav-item timeline-item"
            :class="{ 'active': viewMode === 'digest' && selectedDateKey === 'Today' }"
            @click="setSelectedDateKey('Today')"
          >
            <div class="nav-item-left">
              <CalendarDays :size="15" class="nav-icon" />
              <span>Today</span>
            </div>
            <span class="timeline-badge">12</span>
          </li>

          <!-- Yesterday -->
          <li
            class="nav-item timeline-item"
            :class="{ 'active': viewMode === 'digest' && selectedDateKey === 'Yesterday' }"
            @click="setSelectedDateKey('Yesterday')"
          >
            <div class="nav-item-left">
              <Clock :size="15" class="nav-icon" />
              <span>Yesterday</span>
            </div>
            <span class="timeline-badge muted-badge">8</span>
          </li>

          <!-- Past Timeline Dates exactly matching screenshot -->
          <li
            v-for="date in ['Thu, Apr 23', 'Wed, Apr 22', 'Tue, Apr 21', 'Mon, Apr 20', 'Sun, Apr 19']"
            :key="date"
            class="nav-item timeline-item"
            :class="{ 'active': viewMode === 'digest' && selectedDateKey === date }"
            @click="setSelectedDateKey(date)"
          >
            <div class="nav-item-left">
              <ChevronLeft :size="15" class="nav-icon date-chevron" />
              <span class="past-date-label">{{ date }}</span>
            </div>
          </li>
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
            @click="setViewMode('compose')"
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
            v-for="email in ['thenormvg@gmail.com', 'vishnuarunkmgupta@gmail.com', 'thealphaones.hq@gmail.com']"
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
            <button class="dashed-add-btn flex-center">
              <Plus :size="14" class="add-plus-icon" /> Add account
            </button>
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

.footer-action-btn.active-settings {
  color: var(--text-primary);
  background-color: var(--bg-secondary);
}
</style>
