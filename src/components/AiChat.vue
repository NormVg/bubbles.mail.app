<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { Sparkles } from '@lucide/vue'
import { useMail } from '../composables/useMail'
import { useAiAssistant } from '../composables/useAiAssistant'
import AiInputBox from './common/AiInputBox.vue'
import { useDictation } from '../composables/useDictation'
import type { AttachedFile } from './common/AiInputBox.vue'

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
    <!-- Chat messages -->
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

        <!-- User message (Clean architectural styling like Vercel) -->
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

    <!-- Suggestion chips (Sitting above the input box as shown in screenshot) -->
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

    <!-- Premium Screenshot 1 Input Box Card -->
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
</template>

<style scoped>
.ai-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background-color: var(--bg-primary);
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
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

/* User message — sleek Vercel style bubble */
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

/* AI response — clean typography */
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

/* Thinking dots */
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

/* Suggestion chips */
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

.suggestion-chip:hover:not(:disabled) {
  border-color: var(--text-primary);
  color: var(--text-primary);
}

.suggestion-chip:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Premium Card Input Sizing */
.chat-input-area {
  padding: 10px 20px 20px;
  flex-shrink: 0;
  background-color: var(--bg-primary);
  max-width: 600px;
  width: 100%;
  margin: 0 auto;
}















/* Attached File Chips Inside Card */














/* Toolbar row matching Screenshot 1 */






.toolbar-icon-btn:hover:not(:disabled) {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}





.chat-input-card:focus-within 





/* Voice Input Inline inside Card view */




@keyframes voicePulse {
  0% { transform: scale(0.85); opacity: 0.5; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(0.85); opacity: 0.5; }
}







.p1 { height: 6px; animation-delay: 0.1s; }
.p2 { height: 12px; animation-delay: 0.3s; }
.p3 { height: 8px; animation-delay: 0.2s; }
.p4 { height: 10px; animation-delay: 0.4s; }





.stop-dictate-btn:hover {
  background-color: var(--border-color);
}

.animate-fade-in {
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
