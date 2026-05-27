<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { Sparkles } from '@lucide/vue'
import { useMail } from '../composables/useMail'
import { useAiAssistant } from '../composables/useAiAssistant'
import AiInputBox from './common/AiInputBox.vue'
import { useDictation } from '../composables/useDictation'
import type { AttachedFile } from './common/AiInputBox.vue'

defineProps<{
  isFreshSession?: boolean
}>()

const { selectedEmail } = useMail()
const { messages, isThinking, getSuggestedActions, sendMessage } = useAiAssistant()

const inputMessage = ref('')
const messageContainer = ref<HTMLElement | null>(null)
const attachedFiles = ref<AttachedFile[]>([])

const { isRecording, startVoiceDictation, stopVoiceDictation } = useDictation((result) => {
  if (selectedEmail.value) {
    const sender = selectedEmail.value.sender.split(' ')[0]
    inputMessage.value = `Can you draft a short, formal response to ${sender} accepting the timeline but suggesting we meet on Google Meet instead of B?`
  } else {
    inputMessage.value = result
  }
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
}

function selectSuggestion(suggestion: string) {
  sendMessage(suggestion, selectedEmail.value)
  scrollToBottom()
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
      >
        <div v-if="msg.sender === 'ai'" class="ai-response">
          <div class="ai-msg-header">
            <span class="ai-icon flex-center"><Sparkles :size="12" /></span>
          </div>
          <div class="ai-msg-body" v-html="formatMessageText(msg.text)"></div>
        </div>

        <div v-else class="user-msg">
          <div class="user-msg-text" v-html="formatMessageText(msg.text)"></div>
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
      <div class="suggestions-bar" :class="{ 'hide-suggestions': !isFreshSession && !isThinking && false }">
        <div class="suggestions-scroll" v-if="!isThinking">
          <button 
            v-for="chip in getSuggestedActions(selectedEmail)" 
            :key="chip" 
            class="suggestion-chip"
            @click="selectSuggestion(chip)"
            :disabled="isThinking"
          >
            {{ chip }}
          </button>
        </div>
      </div>

      <!-- Input Box -->
      <div class="chat-input-area">
        <AiInputBox
          v-model="inputMessage"
          v-model:attachedFiles="attachedFiles"
          :isRecording="isRecording"
          :disabled="isThinking"
          @send="handleSend"
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
  padding: 4px 16px 8px;
  overflow-x: auto;
  flex-shrink: 0;
  scrollbar-width: none;
  width: 100%;
  min-height: 38px;
  transition: all 0.3s ease;
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
</style>