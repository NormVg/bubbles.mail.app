<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { 
  ArrowRight, 
  Sparkles, 
  Paperclip, 
  Mic, 
  MicOff, 
  CornerUpRight, 
  FileText, 
  X 
} from '@lucide/vue'
import { useMail } from '../composables/useMail'
import { useAiAssistant } from '../composables/useAiAssistant'

const { selectedEmail } = useMail()
const { messages, isThinking, getSuggestedActions, sendMessage } = useAiAssistant()

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

// Voice Dictation State
const isRecording = ref(false)
const dictationTimer = ref(0)
let dictationInterval: any = null

function scrollToBottom() {
  nextTick(() => {
    if (messageContainer.value) {
      messageContainer.value.scrollTop = messageContainer.value.scrollHeight
    }
  })
}

function adjustTextareaHeight() {
  const textarea = chatTextareaRef.value
  if (!textarea) return
  textarea.style.height = 'auto'
  // Auto-extend based on scroll height
  textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
}

function handleSend() {
  if (!inputMessage.value.trim() && attachedFiles.value.length === 0) return
  
  let formattedText = inputMessage.value.trim()
  
  // Acknowledge attached files inside the sent message
  if (attachedFiles.value.length > 0) {
    const fileNames = attachedFiles.value.map(f => `"${f.name}" (${f.size})`).join(', ')
    const prefix = formattedText ? `${formattedText}\n\n` : ''
    formattedText = `${prefix}📎 Attached files: ${fileNames}`
  }
  
  sendMessage(formattedText, selectedEmail.value)
  inputMessage.value = ''
  attachedFiles.value = [] // clear attached files
  scrollToBottom()
  
  // Reset height
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

// Voice Dictation Simulator
function startVoiceDictation() {
  if (isRecording.value) {
    stopVoiceDictation()
    return
  }
  
  isRecording.value = true
  dictationTimer.value = 0
  
  dictationInterval = setInterval(() => {
    dictationTimer.value += 1
    if (dictationTimer.value >= 30) {
      stopVoiceDictation()
    }
  }, 100)
}

function stopVoiceDictation() {
  if (dictationInterval) {
    clearInterval(dictationInterval)
    dictationInterval = null
  }
  isRecording.value = false
  
  if (selectedEmail.value) {
    const sender = selectedEmail.value.sender.split(' ')[0]
    inputMessage.value = `Can you draft a short, formal response to ${sender} accepting the timeline but suggesting we meet on Google Meet instead of B?`
  } else {
    inputMessage.value = "Show my highest priority tasks from today's intelligence summary."
  }
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
      <!-- Hidden file input for attachment support -->
      <input 
        type="file" 
        ref="fileInputRef" 
        multiple 
        @change="handleFileChange" 
        style="display: none" 
      />

      <div class="double-box-outer" :class="{ 'is-recording': isRecording }">
        <div class="chat-input-card">
          <!-- Render Attached File Chips Inside the Card if any -->
          <div v-if="attachedFiles.length > 0" class="attachment-chips-row animate-fade-in">
            <div 
              v-for="(file, i) in attachedFiles" 
              :key="i" 
              class="attached-chip"
            >
              <FileText :size="11" class="chip-file-icon" />
              <span class="chip-file-name" :title="file.name">{{ file.name }}</span>
              <span class="chip-file-size">{{ file.size }}</span>
              <button type="button" class="remove-chip-btn flex-center" @click="removeFile(i)">
                <X :size="10" />
              </button>
            </div>
          </div>

          <!-- Input Textarea inside card -->
          <textarea 
            v-if="!isRecording"
            ref="chatTextareaRef"
            v-model="inputMessage" 
            placeholder="Dump your mind, let me manage" 
            class="chat-textarea"
            rows="1"
            @input="adjustTextareaHeight"
            @keydown.enter.prevent="handleSend"
            :disabled="isThinking"
          ></textarea>

          <!-- Dictating Waveform View Inside Card when Recording -->
          <div v-else class="dictating-pulse-row animate-fade-in">
            <span class="recording-pulsing-dot"></span>
            <span class="dictating-status-text">Listening... Speak now</span>
            <div class="mini-voice-wave flex-center">
              <span class="wave-pillar p1"></span>
              <span class="wave-pillar p2"></span>
              <span class="wave-pillar p3"></span>
              <span class="wave-pillar p4"></span>
            </div>
            <button type="button" class="stop-dictate-btn" @click="stopVoiceDictation">Stop</button>
          </div>

          <!-- Toolbar row at the bottom of the card -->
          <div class="card-toolbar-row">
            <div class="toolbar-left-actions">
              <!-- Paperclip attachment button -->
              <button 
                type="button" 
                class="toolbar-icon-btn flex-center" 
                title="Attach files"
                @click="triggerFileSelect"
                :disabled="isThinking || isRecording"
              >
                <Paperclip :size="15" />
              </button>

              <!-- Microphone dictation button -->
              <button 
                type="button" 
                class="toolbar-icon-btn flex-center" 
                :class="{ 'recording-active': isRecording }"
                title="Voice dictation"
                @click="startVoiceDictation"
                :disabled="isThinking"
              >
                <Mic :size="15" />
              </button>
            </div>

            <!-- Send curved arrow button inside card matching screenshot -->
            <button 
              type="button" 
              class="card-send-btn flex-center" 
              :disabled="(!inputMessage.trim() && attachedFiles.length === 0) || isThinking || isRecording"
              @click="handleSend"
            >
              <CornerUpRight :size="14" />
            </button>
          </div>
        </div>
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

.double-box-outer.is-recording {
  background-color: hsl(0, 100%, 97%);
  border-color: hsl(0, 80%, 90%);
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

.double-box-outer.is-recording .chat-input-card {
  background-color: hsl(0, 100%, 99%);
  border-color: hsl(0, 80%, 90%);
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

/* Attached File Chips Inside Card */
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

/* Toolbar row matching Screenshot 1 */
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

.toolbar-icon-btn.recording-active {
  background-color: hsl(0, 85%, 95%);
  color: hsl(0, 85%, 45%);
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

.chat-input-card:focus-within .card-send-btn {
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

/* Voice Input Inline inside Card view */
.dictating-pulse-row {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 24px;
}

.recording-pulsing-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: hsl(0, 85%, 50%);
  animation: voicePulse 1.2s infinite ease-in-out;
}

@keyframes voicePulse {
  0% { transform: scale(0.85); opacity: 0.5; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(0.85); opacity: 0.5; }
}

.dictating-status-text {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text-primary);
}

.mini-voice-wave {
  display: flex;
  align-items: center;
  gap: 2.5px;
  height: 14px;
}

.wave-pillar {
  width: 2px;
  background-color: var(--text-primary);
  border-radius: 1px;
  animation: moveWave 1s infinite alternate ease-in-out;
}

.p1 { height: 6px; animation-delay: 0.1s; }
.p2 { height: 12px; animation-delay: 0.3s; }
.p3 { height: 8px; animation-delay: 0.2s; }
.p4 { height: 10px; animation-delay: 0.4s; }

@keyframes moveWave {
  from { transform: scaleY(0.6); }
  to { transform: scaleY(1.3); }
}

.stop-dictate-btn {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  font-family: var(--font-sans);
  font-size: 0.72rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  margin-left: auto;
}

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
