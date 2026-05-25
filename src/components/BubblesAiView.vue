<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { Sparkles, Paperclip, Mic, CornerUpRight, FileText, X } from '@lucide/vue'
import { useAiAssistant } from '../composables/useAiAssistant'
import { useMail } from '../composables/useMail'

const { selectedEmail } = useMail()
const {
  sessions,
  currentSessionId,
  messages,
  isThinking,
  sendMessage
} = useAiAssistant()

const inputMessage = ref('')
const messageContainer = ref<HTMLElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)
const chatTextareaRef = ref<HTMLTextAreaElement | null>(null)

// Attachment State
interface AttachedFile {
  name: string
  size: string
  type: string
}
const attachedFiles = ref<AttachedFile[]>([])

// Determine if we are in the "Welcome / Initial State" (no messages sent by user yet)
const isInitialState = computed(() => {
  // If the session has only the welcome message, we are in initial state
  return messages.value.length <= 1
})

function scrollToBottom() {
  nextTick(() => {
    if (messageContainer.value) {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight
    }
  })
}

function handleSend() {
  if (!inputMessage.value.trim() && attachedFiles.value.length === 0) return

  let formattedText = inputMessage.value.trim()

  if (attachedFiles.value.length > 0) {
    const fileNames = attachedFiles.value.map(f => `"${f.name}" (${f.size})`).join(', ')
    const prefix = formattedText ? `${formattedText}\n\n` : ''
    formattedText = `${prefix}📎 Attached files: ${fileNames}`
  }

  sendMessage(formattedText, selectedEmail.value)
  inputMessage.value = ''
  attachedFiles.value = []
  scrollToBottom()

  // Reset textarea height
  nextTick(() => {
    if (chatTextareaRef.value) {
      chatTextareaRef.value.style.height = 'auto'
    }
  })
}

function selectSuggestion(suggestion: string) {
  sendMessage(suggestion, selectedEmail.value)
  scrollToBottom()
}

function adjustTextareaHeight() {
  const textarea = chatTextareaRef.value
  if (!textarea) return
  textarea.style.height = 'auto'
  textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
}

// File Attachment handling
function triggerFileSelect() {
  if (fileInputRef.value) {
    fileInputRef.value.click()
  }
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files) {
    for (let i = 0; i < target.files.length; i++) {
      const file = target.files[i]
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
      attachedFiles.value.push({
        name: file.name,
        size: `${sizeMB} MB`,
        type: file.type
      })
    }
  }
  scrollToBottom()
}

function removeFile(index: number) {
  attachedFiles.value.splice(index, 1)
}

function formatMessageText(text: string) {
  return text
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/```text<br>([\s\S]*?)```/g, '<div class="draft-block"><pre>$1</pre></div>')
    .replace(/```text([\s\S]*?)```/g, '<div class="draft-block"><pre>$1</pre></div>')
}

onMounted(() => {
  scrollToBottom()
})
</script>

<template>
  <div class="dedicated-chat-page" :class="{ 'initial-layout': isInitialState }">
    <!-- 1. LANDING WELCOME STATE -->
    <div v-if="isInitialState" class="welcome-container animate-fade-in">
      <!-- Monochrome mesh grid background pattern -->
      <div class="pixelated-background"></div>

      <!-- Welcome Heading -->
      <div class="welcome-heading-wrapper">
        <h1 class="welcome-title">Welcome to <span class="underlined-brand">Bubbles.mail</span></h1>
      </div>

      <!-- Centered Double-Box Input -->
      <div class="centered-composer-wrapper">
        <!-- Hidden file input -->
        <input
          type="file"
          ref="fileInputRef"
          multiple
          @change="handleFileChange"
          style="display: none"
        />

        <div class="double-box-outer">
          <div class="chat-input-card">
            <!-- File chips -->
            <div v-if="attachedFiles.length > 0" class="attachment-chips-row animate-fade-in">
              <div v-for="(file, i) in attachedFiles" :key="i" class="attached-chip">
                <FileText :size="11" class="chip-file-icon" />
                <span class="chip-file-name" :title="file.name">{{ file.name }}</span>
                <span class="chip-file-size">{{ file.size }}</span>
                <button type="button" class="remove-chip-btn flex-center" @click="removeFile(i)">
                  <X :size="10" />
                </button>
              </div>
            </div>

            <!-- Textarea -->
            <textarea
              ref="chatTextareaRef"
              v-model="inputMessage"
              placeholder="Dump you mind, let me manage"
              class="chat-textarea"
              rows="1"
              @input="adjustTextareaHeight"
              @keydown.enter.prevent="handleSend"
            ></textarea>

            <!-- Card footer actions -->
            <div class="card-toolbar-row">
              <div class="toolbar-left-actions">
                <button type="button" class="toolbar-icon-btn flex-center" @click="triggerFileSelect">
                  <Paperclip :size="15" />
                </button>
                <button type="button" class="toolbar-icon-btn flex-center" disabled>
                  <Mic :size="15" />
                </button>
              </div>
              <button
                type="button"
                class="card-send-btn flex-center"
                :disabled="!inputMessage.trim() && attachedFiles.length === 0"
                @click="handleSend"
              >
                <CornerUpRight :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. ACTIVE CHAT STREAM STATE -->
    <div v-else class="active-chat-container">
      <div class="active-chat-header flex-between">
        <h3 class="pane-title flex-center gap-6">
          <Sparkles class="header-spark-icon" :size="14" />
          <span>Assistant Session</span>
        </h3>
      </div>

      <!-- Messages Viewport -->
      <div class="chat-messages" ref="messageContainer">
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="message-wrapper"
          :class="msg.sender"
        >
          <!-- AI response -->
          <div v-if="msg.sender === 'ai'" class="ai-response animate-fade-in">
            <div class="ai-msg-header">
              <span class="ai-icon flex-center"><Sparkles :size="12" /></span>
            </div>
            <div class="ai-msg-body" v-html="formatMessageText(msg.text)"></div>
          </div>

          <!-- User message -->
          <div v-else class="user-msg animate-fade-in">
            <div class="user-msg-text" v-html="formatMessageText(msg.text)"></div>
          </div>
        </div>

        <!-- Thinking indicator -->
        <div v-if="isThinking" class="message-wrapper ai">
          <div class="ai-response thinking">
            <div class="ai-msg-header">
              <span class="ai-icon flex-center pulse"><Sparkles :size="12" /></span>
            </div>
            <div class="typing-dots flex-center">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>

      <!-- suggestion chips sitting at bottom -->
      <div class="suggestions-bar" v-if="!isThinking">
        <div class="suggestions-scroll">
          <button
            v-for="chip in ['How does today look?', 'Show my highest priority tasks', 'Summarize this week\'s budget discussion']"
            :key="chip"
            class="suggestion-chip"
            @click="selectSuggestion(chip)"
          >
            {{ chip }}
          </button>
        </div>
      </div>

      <!-- Bottom Composer docked -->
      <div class="chat-input-area">
        <input
          type="file"
          ref="fileInputRef"
          multiple
          @change="handleFileChange"
          style="display: none"
        />

        <div class="double-box-outer">
          <div class="chat-input-card">
            <div v-if="attachedFiles.length > 0" class="attachment-chips-row animate-fade-in">
              <div v-for="(file, i) in attachedFiles" :key="i" class="attached-chip">
                <FileText :size="11" class="chip-file-icon" />
                <span class="chip-file-name">{{ file.name }}</span>
                <button type="button" class="remove-chip-btn flex-center" @click="removeFile(i)">
                  <X :size="10" />
                </button>
              </div>
            </div>

            <textarea
              ref="chatTextareaRef"
              v-model="inputMessage"
              placeholder="Dump you mind, let me manage"
              class="chat-textarea"
              rows="1"
              @input="adjustTextareaHeight"
              @keydown.enter.prevent="handleSend"
            ></textarea>

            <div class="card-toolbar-row">
              <div class="toolbar-left-actions">
                <button type="button" class="toolbar-icon-btn flex-center" @click="triggerFileSelect">
                  <Paperclip :size="15" />
                </button>
                <button type="button" class="toolbar-icon-btn flex-center" disabled>
                  <Mic :size="15" />
                </button>
              </div>
              <button
                type="button"
                class="card-send-btn flex-center"
                :disabled="!inputMessage.trim() && attachedFiles.length === 0"
                @click="handleSend"
              >
                <CornerUpRight :size="14" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dedicated-chat-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: var(--bg-primary);
  overflow: hidden;
}

.dedicated-chat-page.initial-layout {
  justify-content: center;
  align-items: center;
}

/* Welcome Slate Centered Styles */
.welcome-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  height: 100%;
  width: 100%;
  position: relative;
  padding: 40px;
  background-color: var(--bg-primary);
}

/* Pixelated mesh pattern background exactly resembling screenshot backdrop */
.pixelated-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.85;
  background-image: url('/deter-bg.png');

  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  z-index: 1;
}

.welcome-heading-wrapper {
  margin-bottom: 28px;
  text-align: center;
  z-index: 2;
}

.welcome-title {
  font-family: var(--font-title);
  font-size: 2.2rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.underlined-brand {
  position: relative;
  display: inline-block;
}

.underlined-brand::after {
  content: "";
  position: absolute;
  left: 0;
  bottom: -2px;
  width: 100%;
  height: 1.5px;
  background-color: var(--text-primary);
}

.centered-composer-wrapper {
  max-width: 580px;
  width: 100%;
  z-index: 2;
}

/* Active message feed layout styles */
.active-chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.active-chat-header {
  height: 56px;
  border-bottom: 1px solid var(--border-color);
  padding: 0 24px;
  display: flex;
  align-items: center;
}

.gap-6 {
  gap: 6px;
}

.header-spark-icon {
  color: var(--text-secondary);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 600px;
  width: 100%;
  margin: 0 auto;
}

.message-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.user-msg {
  max-width: 80%;
  align-self: flex-end;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  border-bottom-right-radius: 3px;
  padding: 10px 14px;
  font-size: 0.82rem;
  line-height: 1.5;
  margin-left: auto;
  word-break: break-word;
  box-shadow: var(--shadow-sm);
}

.ai-response {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ai-msg-header {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ai-icon {
  width: 18px;
  height: 18px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 50%;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.ai-msg-body {
  font-size: 0.84rem;
  color: var(--text-primary);
  line-height: 1.6;
  padding-left: 24px;
}

/* Draft blocks */
:deep(.draft-block) {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 12px 14px;
  margin: 10px 0 4px;
  overflow-x: auto;
}

:deep(.draft-block pre) {
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.76rem;
  color: var(--text-primary);
  line-height: 1.45;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}

/* Typing dots */
.typing-dots {
  display: flex;
  gap: 4px;
  height: 12px;
  padding-left: 24px;
}

.typing-dots span {
  width: 4px;
  height: 4px;
  background-color: var(--text-muted);
  border-radius: 50%;
  animation: typingDot 1.4s infinite ease-in-out;
}

.typing-dots span:nth-child(1) { animation-delay: -0.32s; }
.typing-dots span:nth-child(2) { animation-delay: -0.16s; }

@keyframes typingDot {
  0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
  40% { transform: scale(1.1); opacity: 1; }
}

.pulse {
  animation: pulseLogo 2s infinite ease-in-out;
}

@keyframes pulseLogo {
  0% { transform: scale(1); opacity: 0.7; }
  50% { transform: scale(1.06); opacity: 1; }
  100% { transform: scale(1); opacity: 0.7; }
}

/* Suggestions */
.suggestions-bar {
  padding: 4px 16px 8px;
  overflow-x: auto;
  flex-shrink: 0;
  scrollbar-width: none;
  max-width: 600px;
  width: 100%;
  margin: 0 auto;
}

.suggestions-bar::-webkit-scrollbar {
  display: none;
}

.suggestions-scroll {
  display: flex;
  gap: 8px;
}

.suggestion-chip {
  flex-shrink: 0;
  border: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  padding: 5px 12px;
  border-radius: 9999px;
  font-family: var(--font-sans);
  font-size: 0.75rem;
  font-weight: 450;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
  outline: none;
}

.suggestion-chip:hover {
  border-color: var(--text-primary);
  color: var(--text-primary);
}

/* Docked Input */
.chat-input-area {
  padding: 10px 20px 20px;
  flex-shrink: 0;
  background-color: var(--bg-primary);
  max-width: 600px;
  width: 100%;
  margin: 0 auto;
}

/* Double Box Layout exactly resembling screenshot */
.double-box-outer {
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 5px;
  width: 100%;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}

.double-box-outer:focus-within {
  border-color: var(--text-primary);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
}

.chat-input-card {
  border: 1px solid var(--border-color);
  border-radius: 11px;
  background-color: var(--bg-primary);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: var(--shadow-sm);
  transition: background-color var(--transition-fast);
}

.chat-textarea {
  border: none;
  background: transparent;
  width: 100%;
  min-height: 24px;
  max-height: 120px;
  font-family: var(--font-sans);
  font-size: 0.88rem;
  line-height: 1.45;
  color: var(--text-primary);
  outline: none;
  resize: none;
}

.chat-textarea::placeholder {
  color: var(--text-muted);
}

/* File Chips */
.attachment-chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 2px;
}

.attached-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 3px 8px;
  font-size: 0.72rem;
  color: var(--text-primary);
  max-width: 170px;
  overflow: hidden;
}

.chip-file-icon {
  color: var(--text-secondary);
  flex-shrink: 0;
}

.chip-file-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.chip-file-size {
  color: var(--text-muted);
  font-size: 0.65rem;
  flex-shrink: 0;
}

.remove-chip-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 1px;
  border-radius: 50%;
  flex-shrink: 0;
}

.remove-chip-btn:hover {
  background-color: var(--border-color);
  color: var(--text-primary);
}

.card-toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid transparent;
}

.toolbar-left-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-icon-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.toolbar-icon-btn:hover:not(:disabled) {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.card-send-btn {
  width: 32px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.double-box-outer:focus-within .card-send-btn {
  background-color: var(--text-primary);
  border-color: var(--text-primary);
  color: var(--bg-primary);
}

.card-send-btn:hover:not(:disabled) {
  background-color: var(--text-primary);
  border-color: var(--text-primary);
  color: var(--bg-primary);
}

.card-send-btn:disabled {
  opacity: 0.35;
  background-color: var(--bg-secondary) !important;
  border-color: var(--border-color) !important;
  color: var(--text-muted) !important;
  cursor: not-allowed;
}

.animate-fade-in {
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
