<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { FileText, X, Paperclip, Mic, CornerUpRight } from '@lucide/vue'

export interface AttachedFile {
  name: string
  size: string
  type: string
}

const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  disabled?: boolean
  attachedFiles?: AttachedFile[]
  isRecording?: boolean
}>(), {
  placeholder: "Dump your mind, let me manage",
  disabled: false,
  attachedFiles: () => [],
  isRecording: false
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'update:attachedFiles', value: AttachedFile[]): void
  (e: 'send', text: string): void
  (e: 'startDictation'): void
  (e: 'stopDictation'): void
}>()

const chatTextareaRef = ref<HTMLTextAreaElement | null>(null)
const fileInputRef = ref<HTMLInputElement | null>(null)

function adjustTextareaHeight() {
  const textarea = chatTextareaRef.value
  if (!textarea) return
  textarea.style.height = 'auto'
  textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
}

watch(() => props.modelValue, (newVal) => {
  if (newVal === '') {
    nextTick(() => {
      if (chatTextareaRef.value) {
        chatTextareaRef.value.style.height = 'auto'
      }
    })
  }
})

function triggerFileSelect() {
  fileInputRef.value?.click()
}

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (!target.files) return
  const newFiles = [...props.attachedFiles]
  for (let i = 0; i < target.files.length; i++) {
    const file = target.files[i]
    const sizeMB = (file.size / (1024 * 1024)).toFixed(2)
    newFiles.push({
      name: file.name,
      size: `${sizeMB} MB`,
      type: file.type
    })
  }
  target.value = ''
  emit('update:attachedFiles', newFiles)
}

function removeFile(index: number) {
  const newFiles = [...props.attachedFiles]
  newFiles.splice(index, 1)
  emit('update:attachedFiles', newFiles)
}

function handleSend() {
  if (props.disabled) return
  if (!props.modelValue.trim() && props.attachedFiles.length === 0) return
  emit('send', props.modelValue)
}
</script>

<template>
  <div class="double-box-outer" :class="{ 'is-recording': isRecording }">
    <input
      ref="fileInputRef"
      type="file"
      multiple
      style="display: none"
      @change="handleFileChange"
    >
    <div class="chat-input-card">
      <div v-if="attachedFiles.length > 0" class="attachment-chips-row animate-fade-in">
        <div v-for="(file, i) in attachedFiles" :key="`${file.name}_${i}`" class="attached-chip">
          <FileText :size="11" class="chip-file-icon" />
          <span class="chip-file-name" :title="file.name">{{ file.name }}</span>
          <span class="chip-file-size">{{ file.size }}</span>
          <button type="button" class="remove-chip-btn flex-center" @click="removeFile(i)">
            <X :size="10" />
          </button>
        </div>
      </div>

      <textarea
        v-if="!isRecording"
        ref="chatTextareaRef"
        :value="modelValue"
        @input="e => { emit('update:modelValue', (e.target as HTMLTextAreaElement).value); adjustTextareaHeight(); }"
        :placeholder="placeholder"
        class="chat-textarea"
        rows="1"
        :disabled="disabled"
        @keydown.enter.prevent="handleSend"
      />

      <div v-else class="dictating-pulse-row animate-fade-in">
        <span class="recording-pulsing-dot"></span>
        <span class="dictating-status-text">Listening... Speak now</span>
        <div class="mini-voice-wave flex-center">
          <span class="wave-pillar p1"></span>
          <span class="wave-pillar p2"></span>
          <span class="wave-pillar p3"></span>
          <span class="wave-pillar p4"></span>
        </div>
        <button type="button" class="stop-dictate-btn" @click="emit('stopDictation')">Stop</button>
      </div>

      <div class="card-toolbar-row">
        <div class="toolbar-left-actions">
          <button type="button" class="toolbar-icon-btn flex-center" @click="triggerFileSelect">
            <Paperclip :size="15" />
          </button>
          <button
            type="button"
            class="toolbar-icon-btn flex-center"
            :class="{ 'recording-active': isRecording }"
            title="Voice dictation"
            @click="isRecording ? emit('stopDictation') : emit('startDictation')"
          >
            <Mic :size="15" />
          </button>
        </div>

        <div class="toolbar-right-actions">
          <slot name="toolbar-right" />
          
          <button
            type="button"
            class="card-send-btn flex-center"
            :disabled="disabled || (!modelValue.trim() && attachedFiles.length === 0) || isRecording"
            @click="handleSend"
          >
            <CornerUpRight :size="14" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* These styles will be extracted from parent components */
.double-box-outer {
  background-color: var(--bg-tertiary);
  padding: 8px;
  border-radius: 16px;
  transition: all var(--transition-fast);
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

.attachment-chips-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding-bottom: 6px;
}

.attached-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 0.75rem;
  color: var(--text-primary);
}

.chip-file-name {
  max-width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}

.chip-file-size {
  color: var(--text-secondary);
  font-size: 0.7rem;
}

.remove-chip-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  padding: 2px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.remove-chip-btn:hover {
  background-color: var(--border-color);
  color: var(--text-primary);
}

.chat-textarea {
  border: none;
  background: transparent;
  width: 100%;
  min-height: 24px;
  max-height: 120px;
  resize: none;
  font-family: inherit;
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--text-primary);
  outline: none;
  padding: 0;
}

.chat-textarea::placeholder {
  color: var(--text-secondary);
  opacity: 0.7;
}

.card-toolbar-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 4px;
}

.toolbar-left-actions {
  display: flex;
  gap: 8px;
}

.toolbar-icon-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  padding: 6px;
  border-radius: 6px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.toolbar-icon-btn:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.toolbar-icon-btn.recording-active {
  color: #ef4444;
  background-color: #fee2e2;
  animation: pulseBg 2s infinite;
}

.card-send-btn {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.card-send-btn:hover:not(:disabled) {
  background-color: var(--text-primary);
  border-color: var(--text-primary);
  color: var(--bg-primary);
}

.card-send-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.dictating-pulse-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.recording-pulsing-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #ef4444;
  animation: pulseDot 1.5s infinite;
}

.dictating-status-text {
  font-size: 0.85rem;
  color: #ef4444;
  font-weight: 500;
  flex: 1;
}

.mini-voice-wave {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 20px;
  margin-right: 12px;
}

.wave-pillar {
  width: 3px;
  background-color: #ef4444;
  border-radius: 2px;
  animation: moveWave 1s ease-in-out infinite alternate;
}

.wave-pillar.p1 { height: 8px; animation-delay: 0s; }
.wave-pillar.p2 { height: 16px; animation-delay: 0.2s; }
.wave-pillar.p3 { height: 12px; animation-delay: 0.4s; }
.wave-pillar.p4 { height: 6px; animation-delay: 0.6s; }

.stop-dictate-btn {
  background-color: #ef4444;
  color: white;
  border: none;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
}

@keyframes pulseDot {
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

@keyframes pulseBg {
  0% { background-color: #fee2e2; }
  50% { background-color: #fecaca; }
  100% { background-color: #fee2e2; }
}

@keyframes moveWave {
  from { transform: scaleY(0.6); }
  to { transform: scaleY(1.3); }
}

.animate-fade-in {
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(2px); }
  to { opacity: 1; transform: translateY(0); }
}

.toolbar-right-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
