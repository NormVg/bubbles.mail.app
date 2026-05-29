<script setup lang="ts">
import { ref, onMounted, nextTick, watch, computed } from 'vue'
import { Sparkles, X, Copy, Check, Brain, ChevronDown, RefreshCw } from '@lucide/vue'
import { useAiAssistant } from '../composables/useAiAssistant'
import { useMail } from '../composables/useMail'
import AiInputBox from './common/AiInputBox.vue'
import { useDictation } from '../composables/useDictation'
import { Markdown } from 'vue-stream-markdown'
import 'vue-stream-markdown/index.css'
import 'vue-stream-markdown/theme.css'

const { messages, isThinking, getSuggestedActions, sendMessage, activeContextEmails, stopGeneration, saveState } = useAiAssistant()
const { viewMode, selectedEmailId, activeAccount, gmailAccounts } = useMail()

const openReasonings = ref<Record<string, boolean>>({})

const isReasoningOpen = (msg: any) => {
  if (openReasonings.value[msg.id] !== undefined) {
    return openReasonings.value[msg.id]
  }
  return !msg.text
}

const toggleReasoning = (msgId: string) => {
  const currentMsg = messages.value.find((m) => m.id === msgId)
  if (!currentMsg) return
  
  const current = openReasonings.value[msgId] !== undefined ? openReasonings.value[msgId] : !currentMsg.text
  openReasonings.value[msgId] = !current
}

const isFreshSession = computed(() => messages.value.length <= 1)

const inputMessage = ref('')
const messageContainer = ref<HTMLElement | null>(null)

interface AttachedFile {
  name: string
  size: string
  type: string
  dataUrl?: string
}

const attachedFiles = ref<AttachedFile[]>([])
const copiedMessageId = ref<string | null>(null)
const sendingBulkId = ref<string | null>(null)

const sendBulkEmails = async (emails: any[], msgId: string, toolIdx: number) => {
  if (!emails || emails.length === 0) return
  sendingBulkId.value = `${msgId}-${toolIdx}`
  
  try {
    const activeGmailAccount = gmailAccounts.value.find(a => a.email === activeAccount.value)
    const globalAccountId = activeContextEmails.value[0]?.gmailAccountId || activeGmailAccount?.id
    
    // Send each one via API
    for (const email of emails) {
      // Ensure 'to' is converted to an array if the model passed a string
      const rawTo = email.to || email.recipient
      const toAddresses = Array.isArray(rawTo) ? rawTo : [rawTo].filter(Boolean)
      
      let targetAccountId = globalAccountId
      if (email.from) {
        const matchingAccount = gmailAccounts.value.find(a => a.email.toLowerCase() === email.from.toLowerCase())
        if (matchingAccount) {
          targetAccountId = matchingAccount.id
        }
      }
      
      await (window as any).electronAPI.invokeApi('/api/gmail/send', {
        method: 'POST',
        body: {
          accountId: email.accountId || targetAccountId,
          to: toAddresses,
          subject: email.subject,
          bodyText: email.bodyText || email.body || '',
          inReplyTo: email.inReplyTo,
          threadId: email.threadId
        }
      })
    }
    
    // Mark as sent in UI
    const msg = messages.value.find(m => m.id === msgId)
    if (msg && msg.toolCalls && msg.toolCalls[toolIdx]) {
      msg.toolCalls[toolIdx].result = { ...(msg.toolCalls[toolIdx].result || {}), sent: true }
      saveState()
    }
  } catch (e: any) {
    console.error('Failed to bulk send:', e)
  } finally {
    sendingBulkId.value = null
  }
}

const { isRecording, isTranscribing, audioLevel, startVoiceDictation, stopVoiceDictation } = useDictation((result) => {
  inputMessage.value = result
})

function goToEmail(id: string) {
  selectedEmailId.value = id
  viewMode.value = 'inbox'
}

async function copyToClipboard(text: string, msgId: string) {
  try {
    await navigator.clipboard.writeText(text)
    copiedMessageId.value = msgId
    setTimeout(() => {
      copiedMessageId.value = null
    }, 2000)
  } catch (err) {
    console.error('Failed to copy text', err)
  }
}

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

  const images = attachedFiles.value.map(f => f.dataUrl).filter(Boolean) as string[]

  sendMessage(formattedText, images)
  inputMessage.value = ''
  attachedFiles.value = []
  scrollToBottom()
}

function selectSuggestion(suggestion: string) {
  sendMessage(suggestion)
  scrollToBottom()
}

function formatUserText(text: string) {
  return text.replace(/\n/g, '<br>')
}

watch(messages, () => {
  scrollToBottom()
}, { deep: true })

onMounted(() => {
  scrollToBottom()
})
</script>

<template>
  <div class="ai-chat">

    <!-- Top spacer to push content to center when fresh -->
    <div class="smooth-spacer" :style="{ flex: isFreshSession ? 1 : 0 }"></div>

    <div class="welcome-stage" :class="{ 'hide-welcome': !isFreshSession }">
      <div class="welcome-copy">
        <h1 class="welcome-title">Welcome to <span class="underlined-brand">Bubbles.mail</span></h1>
      </div>
    </div>

    <!-- Chat messages -->
    <div class="chat-messages" :class="{ 'show-chat': !isFreshSession }" ref="messageContainer">
      <div
        v-for="msg in messages"
        :key="msg.id"
        class="message-wrapper"
        :class="msg.sender"
        v-show="msg.sender === 'user' || msg.text || msg.reasoning"
      >
        <div v-if="msg.sender === 'ai'" class="ai-response">
          <div class="ai-msg-sidebar">
            <span class="ai-icon flex-center"><Sparkles :size="12" /></span>
          </div>

          <div class="ai-msg-content">
            <div v-if="msg.reasoning" class="reasoning-accordion">
              <div class="reasoning-summary" @click="toggleReasoning(msg.id)">
                <Brain :size="12" class="reasoning-icon" />
                <span>Thought process</span>
                <span v-if="!msg.text" class="reasoning-live-dot"></span>
                <ChevronDown :size="14" class="reasoning-chevron" :class="{ 'is-rotated': isReasoningOpen(msg) }" />
              </div>
              <div class="reasoning-body-wrapper" :class="{ 'is-open': isReasoningOpen(msg) }">
                <div class="reasoning-body-inner">
                  <div class="reasoning-body">
                    <Markdown :content="msg.reasoning" />
                  </div>
                </div>
              </div>
            </div>

            <div v-if="msg.toolCalls && msg.toolCalls.length > 0" class="ai-tools-list">
              <div v-for="(tool, idx) in msg.toolCalls" :key="idx" class="ai-tool-item">
                <div v-if="tool.name === 'stageEmailsForSending'" class="staged-emails-card">
                  <div class="staged-emails-header">
                    <h4>Staged Emails</h4>
                    <span class="staged-count">{{ tool.args?.emails?.length || 0 }} emails ready</span>
                  </div>
                  <div class="staged-emails-body">
                    <div v-for="(email, eIdx) in tool.args?.emails" :key="eIdx" class="staged-email-preview">
                      <div class="staged-row">
                        <span class="staged-label">From:</span>
                        <select v-model="email.from" class="staged-select">
                          <option :value="undefined">Auto ({{ activeAccount }})</option>
                          <option v-for="account in gmailAccounts" :key="account.id" :value="account.email">
                            {{ account.email }}
                          </option>
                          <option v-if="!gmailAccounts.length" value="" disabled>No accounts connected</option>
                        </select>
                      </div>
                      <div class="staged-row">
                        <span class="staged-label">To:</span>
                        <span v-if="(email.to && email.to.length > 0) || email.recipient" class="staged-value">
                          {{ Array.isArray(email.to || email.recipient) ? (email.to || email.recipient).join(', ') : (email.to || email.recipient) }}
                        </span>
                        <span v-else class="text-error staged-value">Missing recipient</span>
                      </div>
                      <div class="staged-row">
                        <span class="staged-label">Subject:</span>
                        <span class="staged-value font-medium">{{ email.subject }}</span>
                      </div>
                      <div class="staged-body-preview">
                        {{ email.bodyText || email.body || '(No body content)' }}
                      </div>
                    </div>
                  </div>
                  <div class="staged-emails-footer">
                    <button class="approve-all-btn" @click="sendBulkEmails(tool.args?.emails, msg.id, idx)" :disabled="tool.result?.sent || sendingBulkId === `${msg.id}-${idx}`">
                      <RefreshCw v-if="sendingBulkId === `${msg.id}-${idx}`" :size="14" class="spin-icon" />
                      <Check v-else :size="14" />
                      {{ tool.result?.sent ? 'Sent All' : (sendingBulkId === `${msg.id}-${idx}` ? 'Sending...' : 'Approve & Send All') }}
                    </button>
                  </div>
                </div>
                <div v-else class="generic-tool-card">
                  <span class="tool-status-dot" :class="tool.status"></span>
                  <span class="tool-name">Agent used <code>{{ tool.name }}</code></span>
                </div>
              </div>
            </div>

            <div v-if="msg.text" class="ai-msg-body">
              <Markdown :content="msg.text" />
            </div>
            
            <div class="ai-msg-footer">
              <div class="ai-msg-actions">
                <button class="msg-action-btn" @click="copyToClipboard(msg.text, msg.id)" title="Copy message">
                  <Check v-if="copiedMessageId === msg.id" :size="12" class="success-icon" />
                  <Copy v-else :size="12" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="user-msg">
          <div v-if="msg.contextEmails && msg.contextEmails.length > 0" class="user-msg-context-group">
            <div v-for="email in msg.contextEmails" :key="email.id" class="user-msg-context clickable" @click="goToEmail(email.id)" title="View this email">
              <span class="context-label">Context:</span> {{ email.subject }}
            </div>
          </div>
          <div v-if="msg.images && msg.images.length > 0" class="user-msg-images">
            <img v-for="(img, idx) in msg.images" :key="idx" :src="img" class="user-msg-thumb" />
          </div>
          <div class="user-msg-text" v-html="formatUserText(msg.text)"></div>
        </div>
      </div>

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

    <div class="chat-bottom-section">
      <!-- Suggestion chips -->
      <div v-if="isFreshSession && !isThinking" class="suggestions-bar">
        <div class="suggestions-scroll">
          <button
            v-for="chip in getSuggestedActions()"
            :key="chip"
            class="suggestion-chip"
            @click="selectSuggestion(chip)"
            :disabled="isThinking"
          >
            {{ chip }}
          </button>
        </div>
      </div>

      <!-- Active Context Chips -->
      <div v-if="activeContextEmails.length > 0" class="context-chip-wrapper">
        <div v-for="(email, idx) in activeContextEmails" :key="email.id" class="context-chip">
          <span class="context-label">Context:</span>
          <span class="context-subject">{{ email.subject }}</span>
          <button class="context-clear-btn flex-center" @click="activeContextEmails.splice(idx, 1)">
            <X :size="10" />
          </button>
        </div>
      </div>

      <!-- Input Box -->
      <div class="chat-input-area">
        <AiInputBox
          v-model="inputMessage"
          v-model:attachedFiles="attachedFiles"
          :isRecording="isRecording"
          :isTranscribing="isTranscribing"
          :audioLevel="audioLevel"
          :disabled="isThinking || isTranscribing"
          :isGenerating="isThinking"
          @send="handleSend"
          @stop="stopGeneration"
          @startDictation="startVoiceDictation"
          @stopDictation="stopVoiceDictation"
        />
      </div>
    </div>

    <!-- Bottom spacer to push content up when fresh -->
    <div class="smooth-spacer" :style="{ flex: isFreshSession ? 1 : 0 }"></div>

  </div>
</template>


<style scoped>
.ai-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background-color: transparent;
}

.smooth-spacer {
  transition: flex 0.5s cubic-bezier(0.22, 1, 0.36, 1);
  min-height: 0;
}

.welcome-stage {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  height: auto;
  opacity: 1;
  transform: translateY(0) scale(1);
  padding-bottom: 24px;
}

.welcome-stage.hide-welcome {
  opacity: 0;
  height: 0;
  padding: 0;
  margin: 0;
  pointer-events: none;
  transform: translateY(-20px) scale(0.98);
}

.welcome-copy {
  text-align: center;
}

.text-error {
  color: #ef4444;
  font-style: italic;
  font-weight: 500;
}

.welcome-title {
  font-family: var(--font-sans);
  font-size: 2.75rem;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.03em;
  margin: 0;
}

.underlined-brand {
  text-decoration: underline;
  text-underline-offset: 4px;
}

.chat-messages {
  flex: 0;
  opacity: 0;
  pointer-events: none;
  transition: flex 0.5s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.5s ease 0.1s;
  overflow-y: auto;
  padding: 0 24px;
  max-width: 720px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.chat-messages.show-chat {
  flex: 1;
  opacity: 1;
  pointer-events: auto;
  padding: 20px 24px;
}

.chat-bottom-section {
  flex-shrink: 0;
  width: 100%;
  max-width: 620px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  z-index: 10;
}

.message-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  animation: slideUpFade 0.3s ease forwards;
}

@keyframes slideUpFade {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
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
  flex-direction: row;
  gap: 16px;
  align-items: flex-start;
}

.ai-msg-sidebar {
  flex-shrink: 0;
  padding-top: 2px;
}

.ai-msg-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.ai-icon {
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background-color: var(--text-primary);
  color: var(--bg-primary);
}

.ai-msg-footer {
  display: flex;
  justify-content: flex-start;
  margin-top: 4px;
}

.ai-msg-actions {
  display: flex;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.ai-response:hover .ai-msg-actions {
  opacity: 1;
}

.msg-action-btn {
  background: transparent;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px;
  border-radius: 4px;
  transition: all var(--transition-fast);
}

.msg-action-btn:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.success-icon {
  color: hsl(142, 70%, 45%);
}

.ai-msg-body {
  font-size: 0.84rem;
  color: var(--text-primary);
  line-height: 1.6;
  padding-left: 0;
}

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

.suggestions-bar {
  padding: 4px 20px 12px;
  overflow-x: auto;
  flex-shrink: 0;
  scrollbar-width: none;
  width: 100%;
}

.suggestions-bar::-webkit-scrollbar {
  display: none;
}

.suggestions-scroll {
  display: flex;
  gap: 8px;
  justify-content: center;
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

.suggestion-chip:hover:not(:disabled) {
  border-color: var(--text-primary);
  color: var(--text-primary);
}

.suggestion-chip:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.chat-input-area {
  padding: 10px 20px 20px;
  flex-shrink: 0;
  width: 100%;
}
.context-chip-wrapper {
  padding: 0 20px;
  margin-bottom: 12px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-start;
}

.context-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  background-color: var(--bg-secondary);
  border: 1px solid transparent;
  border-radius: 9999px;
  padding: 4px 10px;
  font-size: 0.72rem;
  font-family: var(--font-sans);
  max-width: 100%;
}

.context-label {
  color: var(--text-muted);
  font-weight: 500;
  text-transform: uppercase;
  font-size: 0.65rem;
  letter-spacing: 0.02em;
}

.context-subject {
  color: var(--text-primary);
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 180px;
}

.context-clear-btn {
  background: rgba(0, 0, 0, 0.05);
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3px;
  border-radius: 50%;
  margin-left: 2px;
  transition: all var(--transition-fast);
}

.context-clear-btn:hover {
  background-color: rgba(0, 0, 0, 0.1);
  color: var(--text-primary);
}

[data-theme='dark'] .context-clear-btn {
  background: rgba(255, 255, 255, 0.1);
}
[data-theme='dark'] .context-clear-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.user-msg-context-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 8px;
}

.user-msg-context {
  background-color: rgba(0, 0, 0, 0.15);
  padding: 4px 10px;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-family: var(--font-sans);
  color: rgba(255, 255, 255, 0.9);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  border: none;
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  transition: all var(--transition-fast);
}

.user-msg-context.clickable {
  cursor: pointer;
}
.user-msg-context.clickable:hover {
  background-color: rgba(0, 0, 0, 0.25);
}

.user-msg-context .context-label {
  color: rgba(255, 255, 255, 0.5);
  font-weight: 500;
  margin-right: 4px;
  text-transform: uppercase;
  font-size: 0.6rem;
  letter-spacing: 0.02em;
}

[data-theme='light'] .user-msg-context {
  background-color: rgba(0, 0, 0, 0.06);
  color: var(--text-primary);
}
[data-theme='light'] .user-msg-context.clickable:hover {
  background-color: rgba(0, 0, 0, 0.12);
}
[data-theme='light'] .user-msg-context .context-label {
  color: var(--text-muted);
}

.user-msg-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.user-msg-thumb {
  max-width: 120px;
  max-height: 120px;
  border-radius: 6px;
  object-fit: cover;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

[data-theme='light'] .user-msg-thumb {
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.reasoning-accordion {
  margin: 4px 0 8px 0;
  background-color: transparent;
  border: none;
}

.reasoning-summary {
  padding: 4px 0;
  font-size: 0.75rem;
  color: var(--text-muted);
  cursor: pointer;
  user-select: none;
  font-family: var(--font-sans);
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: color 0.2s ease;
}

.reasoning-chevron {
  margin-left: 2px;
  opacity: 0.6;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.reasoning-chevron.is-rotated {
  transform: rotate(180deg);
}

.reasoning-icon {
  opacity: 0.8;
  flex-shrink: 0;
}

.reasoning-live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: #a78bfa;
  animation: pulse-dot 1.2s ease-in-out infinite;
  margin-left: 4px;
  flex-shrink: 0;
}

@keyframes pulse-dot {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1.2); }
}

.reasoning-summary:hover {
  color: var(--text-primary);
}

.reasoning-body-wrapper {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.reasoning-body-wrapper.is-open {
  grid-template-rows: 1fr;
}

.reasoning-body-inner {
  overflow: hidden;
}

.reasoning-body {
  margin-top: 8px;
  padding: 4px 0 4px 16px;
  border-left: 2px solid var(--border-color);
  font-size: 0.8rem;
  color: var(--text-secondary);
  background-color: transparent;
}

.ai-tools-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}

.generic-tool-card {
  display: flex;
  align-items: center;
  gap: 8px;
  background-color: var(--bg-secondary);
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.75rem;
  color: var(--text-muted);
  border: 1px solid var(--border-color);
}

.tool-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #f5a623;
}
.tool-status-dot.completed {
  background-color: #10b981;
}

.staged-emails-card {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  overflow: hidden;
  margin-top: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
}

.staged-emails-header {
  padding: 14px 18px;
  background-color: transparent;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.staged-emails-header h4 {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
}

.staged-count {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  padding: 4px 10px;
  border-radius: 6px;
}

.staged-emails-body {
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.staged-email-preview {
  padding: 0 0 20px 0;
  background-color: transparent;
  border: none;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.staged-email-preview:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.staged-row {
  display: flex;
  align-items: center;
  font-size: 0.85rem;
}

.staged-label {
  width: 70px;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-weight: 600;
  color: var(--text-muted);
  flex-shrink: 0;
}

.staged-value {
  color: var(--text-primary);
  flex-grow: 1;
  word-break: break-word;
  font-weight: 500;
}

.staged-select {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 4px 8px;
  color: var(--text-primary);
  font-size: 0.8rem;
  outline: none;
  width: 100%;
  max-width: 280px;
  transition: border-color var(--transition-fast);
}
.staged-select:focus {
  border-color: var(--primary-color);
}

.font-medium {
  font-weight: 500;
}

.staged-body-preview {
  margin-top: 8px;
  padding: 4px 0 4px 14px;
  background-color: transparent;
  border-radius: 0;
  border: none;
  border-left: 2px solid var(--border-color);
  font-size: 0.85rem;
  color: var(--text-secondary);
  white-space: pre-wrap;
  line-height: 1.5;
}
[data-theme='dark'] .staged-body-preview {
  background-color: transparent;
  border-color: rgba(255,255,255,0.1);
}

.staged-emails-footer {
  padding: 14px 18px;
  background-color: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  display: flex;
  justify-content: flex-end;
}

.approve-all-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background-color: var(--text-primary);
  color: var(--bg-primary);
  border: none;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.approve-all-btn:hover:not(:disabled) {
  opacity: 0.9;
  transform: translateY(-1px);
}
.approve-all-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
