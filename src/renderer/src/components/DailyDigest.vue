<script setup lang="ts">
import { Sparkles, Lightbulb } from '@lucide/vue'
import { useMail } from '../composables/useMail'
import { useDailyDigest } from '../composables/useDailyDigest'

const { setViewMode, setSelectedEmailId } = useMail()
const { selectedReport, toggleTask } = useDailyDigest()

// Traceability: Switch back to Traditional Inbox mode and focus the source email!
function viewSourceEmail(emailId: string) {
  setViewMode('inbox')
  setSelectedEmailId(emailId)
}
</script>

<template>
  <div v-if="selectedReport" class="daily-digest animate-fade-in">
    <!-- Date Header -->
    <div class="digest-header">
      <div class="digest-header-left">
        <span class="digest-meta"><Sparkles :size="14" /> Daily summary</span>
        <h3 class="digest-date">{{ selectedReport.dateFormatted }}</h3>
      </div>
      <button class="view-emails-btn flex-center" @click="setViewMode('inbox')" title="View all emails for this day">
        View emails &rarr;
      </button>
    </div>

    <!-- Section 1: Executive Summary Card -->
    <div class="digest-section">
      <h4 class="section-heading">Executive Summary</h4>
      <div class="summary-card">
        <ul class="summary-list">
          <li v-for="(bullet, index) in selectedReport.summary" :key="index" class="summary-item">
            {{ bullet }}
          </li>
        </ul>
      </div>
    </div>

    <!-- Section 2: Extracted Tasks Checklist -->
    <div class="digest-section">
      <div class="section-header-row">
        <h4 class="section-heading">Actionable Tasks</h4>
        <span class="heading-counter">{{ selectedReport.tasks.filter(t => !t.completed).length }} pending</span>
      </div>
      <div class="tasks-card">
        <div 
          v-for="task in selectedReport.tasks" 
          :key="task.id" 
          class="task-row"
          :class="{ 'completed': task.completed }"
        >
          <label class="task-checkbox-container">
            <input 
              type="checkbox" 
              :checked="task.completed" 
              @change="toggleTask(task.id)"
              class="task-checkbox"
            />
            <span class="checkmark"></span>
            <span class="task-text">{{ task.text }}</span>
          </label>
          
          <!-- Source Traceability button -->
          <button 
            class="trace-btn" 
            title="View source email"
            @click="viewSourceEmail(task.sourceEmailId)"
          >
            <svg class="trace-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Section 3: Deadlines Alert List -->
    <div v-if="selectedReport.deadlines.length > 0" class="digest-section">
      <h4 class="section-heading">Time-Sensitive Deadlines</h4>
      <div class="deadlines-list">
        <div 
          v-for="deadline in selectedReport.deadlines" 
          :key="deadline.id" 
          class="deadline-item-card"
          :class="`deadline-${deadline.urgency}`"
        >
          <div class="deadline-left">
            <span class="deadline-badge">{{ deadline.urgency }}</span>
            <span class="deadline-text">{{ deadline.text }}</span>
          </div>
          <button 
            class="trace-btn" 
            title="View source email"
            @click="viewSourceEmail(deadline.sourceEmailId)"
          >
            <svg class="trace-icon" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Section 4: Key Thread Conversations -->
    <div class="digest-section">
      <h4 class="section-heading">Important Threads</h4>
      <div class="threads-feed">
        <div 
          v-for="thread in selectedReport.threads" 
          :key="thread.id" 
          class="thread-card interactive-item"
          @click="viewSourceEmail(thread.sourceEmailId)"
        >
          <div class="thread-header">
            <span class="thread-who">{{ thread.who }}</span>
            <span class="thread-status-tag">{{ thread.status }}</span>
          </div>
          <h5 class="thread-topic">{{ thread.topic }}</h5>
          <p class="thread-body">{{ thread.summary }}</p>
          <div class="thread-footer">
            <span class="view-trace-link">View source email &rarr;</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Section 5: Daily Insights -->
    <div class="digest-section">
      <h4 class="section-heading">Observations & insights</h4>
      <div class="insights-container">
        <div 
          v-for="(insight, index) in selectedReport.insights" 
          :key="index" 
          class="insight-pill"
        >
          <span class="insight-spark"><Lightbulb :size="14" /></span>
          <span class="insight-content">{{ insight }}</span>
        </div>
      </div>
    </div>
  </div>

  <div v-else class="daily-digest digest-empty animate-fade-in">
    <div class="empty-card">
      <span class="empty-icon flex-center"><Sparkles :size="16" /></span>
      <h3>No digest for this day yet</h3>
      <p>Sync your real inbox first, then select a day with messages to build intelligence from actual email data.</p>
      <button class="view-emails-btn flex-center" @click="setViewMode('inbox')">
        View inbox &rarr;
      </button>
    </div>
  </div>
</template>

<style scoped>
.daily-digest {
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.digest-empty {
  min-height: 100%;
  justify-content: center;
}

.empty-card {
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
  border-radius: 14px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}

.empty-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid var(--border-color);
  background: var(--bg-primary);
  color: var(--text-secondary);
}

.empty-card h3 {
  margin: 0;
  font-family: var(--font-title);
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
}

.empty-card p {
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.45;
  color: var(--text-secondary);
}

.digest-header {
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 12px;
  margin-bottom: 4px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}

.digest-header-left {
  display: flex;
  flex-direction: column;
}

.view-emails-btn {
  background: transparent;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 4px 10px;
  font-family: var(--font-sans);
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  height: 28px;
}

.view-emails-btn:hover {
  border-color: var(--text-primary);
  color: var(--text-primary);
  background-color: var(--bg-secondary);
}

.digest-meta {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.digest-date {
  font-family: var(--font-title);
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-top: 2px;
}

.digest-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.section-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-heading {
  font-family: var(--font-sans);
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.heading-counter {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--primary-color);
  background-color: var(--primary-light);
  padding: 2px 8px;
  border-radius: 9999px;
}

/* Summary Card */
.summary-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
}

.summary-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.summary-item {
  font-size: 0.82rem;
  color: var(--text-primary);
  line-height: 1.45;
  position: relative;
  padding-left: 14px;
}

.summary-item::before {
  content: "•";
  position: absolute;
  left: 0;
  color: var(--primary-color);
  font-weight: bold;
}

/* Tasks Checklist */
.tasks-card {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  background-color: var(--bg-primary);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.task-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border-color);
  transition: background-color var(--transition-fast);
}

.task-row:last-child {
  border-bottom: none;
}

.task-row:hover {
  background-color: var(--bg-secondary);
}

.task-checkbox-container {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
  font-size: 0.82rem;
  color: var(--text-primary);
  user-select: none;
  flex: 1;
  line-height: 1.4;
}

.task-checkbox {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.checkmark {
  width: 16px;
  height: 16px;
  border: 1.5px solid var(--text-secondary);
  border-radius: 4px;
  display: inline-block;
  flex-shrink: 0;
  margin-top: 1px;
  transition: all var(--transition-fast);
  position: relative;
}

.task-checkbox:checked ~ .checkmark {
  background-color: var(--text-primary);
  border-color: var(--text-primary);
}

.checkmark::after {
  content: "";
  position: absolute;
  display: none;
}

.task-checkbox:checked ~ .checkmark::after {
  display: block;
}

.task-checkbox-container .checkmark::after {
  left: 4.5px;
  top: 1px;
  width: 4px;
  height: 8px;
  border: solid var(--bg-primary);
  border-width: 0 1.5px 1.5px 0;
  transform: rotate(45deg);
}

.task-text {
  transition: color var(--transition-fast), text-decoration var(--transition-fast);
}

.task-row.completed .task-text {
  color: var(--text-muted);
  text-decoration: line-through;
}

.task-row.completed .checkmark {
  border-color: var(--text-muted);
  background-color: var(--text-muted);
}

/* Traceability Button */
.trace-btn {
  background: transparent;
  border: none;
  padding: 4px;
  border-radius: 4px;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-fast);
}

.trace-btn:hover {
  background-color: var(--border-color);
  color: var(--text-primary);
}

.trace-icon {
  width: 14px;
  height: 14px;
}

/* Deadlines */
.deadlines-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.deadline-item-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--border-color);
  font-size: 0.8rem;
}

.deadline-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.deadline-badge {
  text-transform: uppercase;
  font-size: 0.62rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  letter-spacing: 0.05em;
}

.deadline-high {
  background-color: hsl(0, 100%, 97%);
  border-color: hsl(0, 100%, 90%);
  color: hsl(0, 85%, 45%);
}

.deadline-high .deadline-badge {
  background-color: hsl(0, 85%, 45%);
  color: white;
}

.deadline-medium {
  background-color: hsl(35, 100%, 97%);
  border-color: hsl(35, 100%, 90%);
  color: hsl(35, 90%, 40%);
}

.deadline-medium .deadline-badge {
  background-color: hsl(35, 90%, 40%);
  color: white;
}

.deadline-low {
  background-color: var(--bg-secondary);
  border-color: var(--border-color);
  color: var(--text-secondary);
}

.deadline-low .deadline-badge {
  background-color: var(--text-secondary);
  color: white;
}

/* Threads Feed */
.threads-feed {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.thread-card {
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 14px;
  background-color: var(--bg-primary);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.thread-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.thread-who {
  font-family: var(--font-title);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary);
}

.thread-status-tag {
  font-size: 0.7rem;
  font-weight: 500;
  color: var(--text-secondary);
  background-color: var(--bg-secondary);
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid var(--border-color);
}

.thread-topic {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--text-primary);
}

.thread-body {
  font-size: 0.78rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.thread-footer {
  margin-top: 4px;
}

.view-trace-link {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--primary-color);
  transition: color var(--transition-fast);
}

.thread-card:hover .view-trace-link {
  color: var(--primary-hover);
}

/* Insights */
.insights-container {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.insight-pill {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background-color: var(--bg-secondary);
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.78rem;
  color: var(--text-secondary);
  line-height: 1.4;
  border-left: 3px solid var(--primary-color);
}

.insight-spark {
  display: flex;
  align-items: center;
  margin-top: 1px;
  color: var(--primary-color);
}

.animate-fade-in {
  animation: fadeIn 0.3s var(--transition-fast);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
