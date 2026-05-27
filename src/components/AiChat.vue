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
  <div class="ai-chat" :class="{ 'is-fresh': isFreshSession }">
    <div v-if="isFreshSession" class="welcome-stage animate-fade-in">
      <div class="welcome-copy">
        <h1 class="welcome-title">Welcome to <span class="underlined-brand">Bubbles.mail</span></h1>
      </div>
    </div>
    
    <!-- Chat messages -->
    <div v-else class="chat-messages animate-fade-in" ref="messageContainer">
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

    <div class="chat-bottom-section">
      <!-- Suggestion chips -->
      <div class="suggestions-bar" v-if="!isThinking">
        <div class="suggestions-scroll">
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
  </div>
</template>


<style scoped>
.ai-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background-color: var(--bg-primary);
  transition: justify-content 0.4s ease;
}

.ai-chat.is-fresh {
  justify-content: center;
  align-items: center;
}

.welcome-stage {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  padding: 0 24px 40px;
  width: 100%;
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
}

.underlined-brand {
  text-decoration: underline;
  text-underline-offset: 4px;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 720px;
  width: 100%;
  margin: 0 auto;
}

.chat-bottom-section {
  flex-shrink: 0;
  width: 100%;
  max-width: 620px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
}

.is-fresh .chat-bottom-section {
  flex-shrink: 1;
  margin-bottom: auto;
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

.animate-fade-in {
  animation: fadeIn 0.4s ease forwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
</style>
