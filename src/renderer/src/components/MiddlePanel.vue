<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { Sparkles, Inbox, CalendarDays, ChevronLeft, ChevronRight, X, RefreshCw } from '@lucide/vue'
import { useMail } from '../composables/useMail'
import { useDailyDigest } from '../composables/useDailyDigest'
import { appApiFetch } from '../composables/useAppApi'

const {
  viewMode,
  setViewMode,
  searchQuery,
  setSearchQuery,
  gmailSyncing,
  gmailLoading,
  syncActiveGmailAccount,
  activeAccount,
  emails,
  loadGmailMessages,
  gmailAccounts
} = useMail()


const { selectedDateKey, setSelectedDateKey } = useDailyDigest()

function handleSearchInput(event: Event) {
  const target = event.target as HTMLInputElement
  setSearchQuery(target.value)
}

// ─── Custom Calendar Date Picker ────────────────────────────────────────────
const showCalendar = ref(false)
const calendarRef = ref<HTMLElement | null>(null)

const today = new Date()
const calendarMonth = ref(today.getMonth())
const calendarYear = ref(today.getFullYear())

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

interface CalCell {
  day: number | null
  date: Date | null
}

const calendarCells = computed<CalCell[]>(() => {
  const y = calendarYear.value
  const m = calendarMonth.value
  const firstDow = new Date(y, m, 1).getDay()
  const daysInMonth = new Date(y, m + 1, 0).getDate()
  const cells: CalCell[] = []
  for (let i = 0; i < firstDow; i++) cells.push({ day: null, date: null })
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, date: new Date(y, m, d) })
  return cells
})

function prevMonth() {
  if (calendarMonth.value === 0) { calendarMonth.value = 11; calendarYear.value-- }
  else calendarMonth.value--
}
function nextMonth() {
  if (calendarMonth.value === 11) { calendarMonth.value = 0; calendarYear.value++ }
  else calendarMonth.value++
}

function dateToKey(d: Date): string {
  const td = new Date(); td.setHours(0,0,0,0)
  const yd = new Date(td); yd.setDate(yd.getDate() - 1)
  const dc = new Date(d); dc.setHours(0,0,0,0)
  if (dc.getTime() === td.getTime()) return 'Today'
  if (dc.getTime() === yd.getTime()) return 'Yesterday'
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }).format(dc)
}

async function selectDay(cell: CalCell) {
  if (!cell.date) return
  const dateKey = dateToKey(cell.date)
  setSelectedDateKey(dateKey)
  showCalendar.value = false

  if (dateKey !== 'Today' && dateKey !== 'Yesterday' && activeAccount.value) {
    const hasLocal = emails.value.some(
      email => email.account === activeAccount.value && email.dateKey === dateKey
    )
    if (!hasLocal) {
      console.log(`[Calendar Picker] No local emails found for ${dateKey}. Syncing from Gmail API...`)
      
      const dayBefore = new Date(cell.date)
      dayBefore.setDate(cell.date.getDate() - 1)
      
      const dayAfter = new Date(cell.date)
      dayAfter.setDate(cell.date.getDate() + 1)

      const formatQueryDate = (date: Date) => {
        const yyyy = date.getFullYear()
        const mm = String(date.getMonth() + 1).padStart(2, '0')
        const dd = String(date.getDate()).padStart(2, '0')
        return `${yyyy}/${mm}/${dd}`
      }

      const query = `after:${formatQueryDate(dayBefore)} before:${formatQueryDate(dayAfter)}`
      
      gmailSyncing.value = true
      try {
        const account = gmailAccounts.value.find(item => item.email === activeAccount.value)
        if (account) {
          await appApiFetch('/api/gmail/sync', {
            method: 'POST',
            body: {
              accountId: account.id,
              label: 'INBOX',
              q: query,
              maxResults: 50
            }
          })
          await loadGmailMessages(activeAccount.value)
        }
      } catch (error) {
        console.error('[Calendar Picker] Sync error:', error)
      } finally {
        gmailSyncing.value = false
      }
    }
  }
}

function isSelected(cell: CalCell) {
  if (!cell.date || !selectedDateKey.value) return false
  return dateToKey(cell.date) === selectedDateKey.value
}

function isTodayCell(cell: CalCell) {
  if (!cell.date) return false
  return cell.date.toDateString() === today.toDateString()
}

function clearDate() {
  setSelectedDateKey('')
  showCalendar.value = false
}

function toggleCalendar() {
  showCalendar.value = !showCalendar.value
}

function handleOutsideClick(e: MouseEvent) {
  if (calendarRef.value && !calendarRef.value.contains(e.target as Node)) {
    showCalendar.value = false
  }
}

onMounted(() => document.addEventListener('mousedown', handleOutsideClick))
onUnmounted(() => document.removeEventListener('mousedown', handleOutsideClick))
</script>

<template>
  <section class="pane pane-middle">

    <!-- ── Header ─────────────────────────────────────────────────────────── -->
    <div class="pane-header middle-header">
      <div class="header-left">
        <Sparkles v-if="viewMode === 'digest'" :size="15" class="header-icon" />
        <Inbox    v-else-if="viewMode === 'inbox'" :size="15" class="header-icon" />
        <span class="header-title">{{ viewMode === 'digest' ? 'Intelligence' : 'Inbox' }}</span>
      </div>

      <div class="header-right">

        <!-- ── Date filter (Inbox only) ──────────────────────────────────── -->
        <div v-if="viewMode === 'inbox'" class="date-picker-wrapper" ref="calendarRef">
          <!-- Trigger button -->
          <button
            class="date-trigger-btn"
            :class="{ 'has-date': selectedDateKey }"
            @click="toggleCalendar"
            title="Filter by date"
          >
            <CalendarDays :size="13" />
            <span>{{ selectedDateKey || 'Filter by date' }}</span>
            <X v-if="selectedDateKey" :size="12" class="clear-x" @click.stop="clearDate" />
          </button>

          <!-- ── Calendar dropdown ─────────────────────────────────────── -->
          <Transition name="cal">
            <div v-if="showCalendar" class="calendar-dropdown">
              <!-- Month nav -->
              <div class="cal-nav">
                <button class="cal-nav-btn" @click="prevMonth" title="Previous month">
                  <ChevronLeft :size="14" />
                </button>
                <span class="cal-month-label">
                  {{ MONTH_NAMES[calendarMonth] }} {{ calendarYear }}
                </span>
                <button class="cal-nav-btn" @click="nextMonth" title="Next month">
                  <ChevronRight :size="14" />
                </button>
              </div>

              <!-- Day-of-week headers -->
              <div class="cal-grid">
                <div v-for="d in DAY_LABELS" :key="d" class="cal-dow">{{ d }}</div>

                <!-- Day cells -->
                <div
                  v-for="(cell, i) in calendarCells"
                  :key="i"
                  class="cal-cell"
                  :class="{
                    'empty': !cell.day,
                    'is-today': isTodayCell(cell),
                    'is-selected': isSelected(cell)
                  }"
                  @click="selectDay(cell)"
                >
                  {{ cell.day ?? '' }}
                </div>
              </div>

              <!-- Footer actions -->
              <div class="cal-footer">
                <button v-if="selectedDateKey" class="cal-clear-btn" @click="clearDate">
                  <X :size="11" /> Clear filter
                </button>
                <button class="cal-today-btn" @click="selectDay({ day: today.getDate(), date: today })">
                  Today
                </button>
              </div>
            </div>
          </Transition>
        </div>

        <button
          v-if="viewMode === 'inbox'"
          class="view-toggle-btn secondary"
          :disabled="gmailSyncing || gmailLoading"
          title="Sync Gmail inbox"
          @click="syncActiveGmailAccount"
        >
          <RefreshCw :size="13" :class="{ 'spin-icon': gmailSyncing || gmailLoading }" />
          {{ gmailSyncing ? 'Syncing' : 'Sync' }}
        </button>

        <!-- ── View digest / View emails toggle ──────────────────────────── -->
        <template v-if="viewMode === 'digest'">
          <button class="view-toggle-btn secondary" @click="setViewMode('inbox')" title="See raw emails">
            <Inbox :size="13" />
            View emails
          </button>
        </template>

        <template v-else-if="viewMode === 'inbox' && selectedDateKey">
          <button class="view-toggle-btn accent" @click="setViewMode('digest')" title="See AI digest for this day">
            <Sparkles :size="13" />
            View digest
          </button>
        </template>

      </div>
    </div>

    <!-- ── Search ─────────────────────────────────────────────────────────── -->
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

    <!-- ── List ───────────────────────────────────────────────────────────── -->
    <div class="list-scroll-area">
      <EmailList v-if="viewMode === 'inbox'" />
      <DailyDigest v-else />
    </div>

  </section>
</template>

<style scoped>
/* ── Header ──────────────────────────────────────────────────────────────── */
.middle-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.header-icon {
  color: var(--text-secondary);
}

.header-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ── Date picker trigger ─────────────────────────────────────────────────── */
.date-picker-wrapper {
  position: relative;
}

.date-trigger-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 20px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
}

.date-trigger-btn:hover {
  border-color: var(--text-muted);
  color: var(--text-primary);
}

.date-trigger-btn.has-date {
  background: var(--bg-tertiary);
  border-color: var(--text-muted);
  color: var(--text-primary);
}

.clear-x {
  opacity: 0.6;
  transition: opacity var(--transition-fast);
  flex-shrink: 0;
}
.clear-x:hover { opacity: 1; }

/* ── Calendar dropdown ───────────────────────────────────────────────────── */
.calendar-dropdown {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 200;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 14px;
  box-shadow:
    0 1px 2px rgba(0, 0, 0, 0.03),
    0 4px 8px rgba(0, 0, 0, 0.04),
    0 12px 24px rgba(0, 0, 0, 0.06),
    0 24px 48px rgba(0, 0, 0, 0.08);
  padding: 14px;
  width: 248px;
  user-select: none;
}

/* Nav row */
.cal-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.cal-nav-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}
.cal-nav-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.cal-month-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

/* Grid: 7 columns */
.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}

.cal-dow {
  text-align: center;
  font-size: 0.66rem;
  font-weight: 600;
  color: var(--text-muted);
  padding: 4px 0 6px;
  letter-spacing: 0.03em;
}

.cal-cell {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 450;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background var(--transition-fast), color var(--transition-fast);
}

.cal-cell:not(.empty):hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.cal-cell.empty {
  cursor: default;
  pointer-events: none;
}

.cal-cell.is-today {
  color: var(--text-primary);
  font-weight: 600;
}

.cal-cell.is-today::after {
  content: '';
  position: absolute;
  bottom: 3px;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--primary-color, var(--text-primary));
}

/* Make today cell relative for the dot */
.cal-cell.is-today {
  position: relative;
}

.cal-cell.is-selected {
  background: var(--text-primary);
  color: var(--bg-primary);
  font-weight: 600;
}

.cal-cell.is-selected:hover {
  background: var(--text-primary);
  color: var(--bg-primary);
}

/* Footer */
.cal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--border-color);
  gap: 8px;
}

.cal-clear-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: transparent;
  color: var(--text-muted);
  font-family: var(--font-sans);
  font-size: 0.72rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-fast);
}
.cal-clear-btn:hover {
  border-color: var(--text-secondary);
  color: var(--text-primary);
}

.cal-today-btn {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  margin-left: auto;
}
.cal-today-btn:hover {
  background: var(--bg-tertiary);
}

/* ── Transition ──────────────────────────────────────────────────────────── */
.cal-enter-active,
.cal-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.cal-enter-from,
.cal-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}

/* ── View toggle buttons ─────────────────────────────────────────────────── */
.view-toggle-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 20px;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--transition-fast);
  white-space: nowrap;
  flex-shrink: 0;
}

.view-toggle-btn:disabled {
  cursor: progress;
  opacity: 0.65;
}

.spin-icon {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Secondary: "View emails" */
.view-toggle-btn.secondary {
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  color: var(--text-secondary);
}
.view-toggle-btn.secondary:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

/* Accent: "View digest" — solid & prominent */
.view-toggle-btn.accent {
  border: none;
  background: var(--text-primary);
  color: var(--bg-primary);
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
}
.view-toggle-btn.accent:hover {
  opacity: 0.85;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

/* ── Search ──────────────────────────────────────────────────────────────── */
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
  flex-shrink: 0;
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
.search-input::placeholder { color: var(--text-muted); }

/* ── List scroll area ────────────────────────────────────────────────────── */
.list-scroll-area {
  flex: 1;
  overflow-y: auto;
  background-color: var(--bg-primary);
}

/* ── Active Physics ──────────────────────────────────────────────────────── */
.date-trigger-btn:active:not(:disabled),
.view-toggle-btn:active:not(:disabled),
.cal-nav-btn:active,
.cal-cell:not(.empty):active,
.cal-clear-btn:active,
.cal-today-btn:active {
  transform: scale(0.96);
  transition: transform 0.1s;
}
</style>
