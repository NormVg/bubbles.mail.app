<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { Check, RefreshCw, Sparkles, Trash2, Wand2, Send } from '@lucide/vue'
import AiInputBox from '../common/AiInputBox.vue'

// Props and Emits
const props = defineProps<{
  showAiPanel: boolean
  aiShowApplied: boolean
  aiDraftState: 'empty' | 'dictating' | 'generating' | 'drafted'
  aiPrompt: string
  aiDraft: string
  aiAttachedFiles: { name: string; size: string; type: string }[]
  mode?: 'compose' | 'reply'
  headerTarget?: string
}>()

const emit = defineEmits([
  'update:aiPrompt',
  'update:aiDraft',
  'update:aiAttachedFiles',
  'generate-draft',
  'apply-draft',
  'discard-draft',
  'start-dictation',
  'stop-dictation'
])

const aiDraftRef = ref<HTMLTextAreaElement | null>(null)

// Handle File Selection
function handleAiFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files
  if (!files) return
  const newFiles = Array.from(files).map(file => {
    const kb = file.size / 1024
    return {
      name: file.name,
      size: kb < 1024 ? `${Math.max(1, Math.round(kb))} KB` : `${(kb / 1024).toFixed(1)} MB`,
      type: file.type
    }
  })
  emit('update:aiAttachedFiles', [...props.aiAttachedFiles, ...newFiles])
  input.value = ''
}

function autosizeTextarea(textarea: HTMLTextAreaElement | null, maxHeight = 380) {
  if (!textarea) return
  textarea.style.height = 'auto'
  textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`
  textarea.style.overflowY = textarea.scrollHeight > maxHeight ? 'auto' : 'hidden'
}

function onAiDraftInput(e: Event) {
  const target = e.target as HTMLTextAreaElement
  emit('update:aiDraft', target.value)
  nextTick(() => autosizeTextarea(target, 380))
}

watch(() => props.aiDraftState, () => {
  nextTick(() => autosizeTextarea(aiDraftRef.value, 380))
})
</script>

<template>
  <Transition name="widget-slide">
    <div v-if="showAiPanel" class="quick-reply-box">
      <div v-if="aiShowApplied" class="send-success-overlay flex-center animate-fade-in">
        <div class="success-content flex-center">
          <span class="success-icon flex-center"><Check :size="18" /></span>
          <span class="success-message">{{ mode === 'reply' ? 'Email sent successfully!' : 'Draft applied to editor!' }}</span>
        </div>
      </div>

      <div class="reply-header">
        <div class="reply-header-left">
          <span class="reply-label">{{ mode === 'reply' ? 'Reply' : 'Compose' }}</span>
          <span class="reply-target">{{ mode === 'reply' && headerTarget ? 'to ' + headerTarget : 'with Bubbles.ai' }}</span>
        </div>
        <span class="reply-stage-badge" :class="aiDraftState">
          {{ aiDraftState === 'empty' ? 'Drafting Stage' : aiDraftState === 'dictating' ? 'Voice Input' : aiDraftState === 'generating' ? 'Drafting...' : 'Review Draft' }}
        </span>
      </div>

      <div v-if="aiDraftState === 'empty' || aiDraftState === 'dictating'" class="input-stage-container animate-fade-in">
        <input ref="aiFileInputRef" type="file" multiple class="hidden-file-input" @change="handleAiFileSelect">

        <AiInputBox
          :modelValue="aiPrompt"
          @update:modelValue="emit('update:aiPrompt', $event)"
          :attachedFiles="aiAttachedFiles"
          @update:attachedFiles="emit('update:aiAttachedFiles', $event)"
          :isRecording="aiDraftState === 'dictating'"
          :disabled="false"
          @send="emit('generate-draft')"
          @startDictation="emit('start-dictation')"
          @stopDictation="emit('stop-dictation')"
        >
          <template #toolbar-right>
            <button type="button" class="card-outline-draft-btn flex-center" :disabled="aiDraftState === 'dictating'" title="Auto-draft instantly from context" @click="emit('generate-draft')">
              <Sparkles :size="12" /> Auto-draft
            </button>
          </template>
        </AiInputBox>
        <p class="copywriting-hint">
          Your context above is a guide. AI will generate a professional draft for you to review and edit before sending.
        </p>
      </div>

      <div v-else-if="aiDraftState === 'generating' || aiDraftState === 'drafted'" class="drafted-stage-container animate-fade-in">
        <div class="draft-review-card" :class="{ 'is-streaming': aiDraftState === 'generating' }">
          <div class="draft-card-header">
            <span class="draft-card-title">
              <Sparkles v-if="aiDraftState === 'generating'" class="streaming-sparkle" :size="12" />
              <Wand2 v-else :size="12" />
              {{ aiDraftState === 'generating' ? 'AI is drafting response...' : 'Proposed Email Draft' }}
            </span>
            <span class="draft-editable-hint">
              {{ aiDraftState === 'generating' ? 'Streaming...' : 'Directly editable' }}
            </span>
          </div>
          <div class="draft-textarea-wrapper">
            <textarea
              ref="aiDraftRef"
              :value="aiDraft"
              class="draft-review-textarea"
              placeholder="AI is compiling context and writing draft..."
              :disabled="aiDraftState === 'generating'"
              @input="onAiDraftInput"
            />
          </div>
        </div>

        <p class="draft-stage-copywriting">
          {{ aiDraftState === 'generating' ? 'Please wait while AI processes the message context and streams the email draft.' : 'Review the email above. You can tweak it directly inside the card, update your guidelines below, or apply it to the editor.' }}
        </p>

        <div v-if="aiDraftState === 'drafted'" class="refine-row">
          <input :value="aiPrompt" @input="emit('update:aiPrompt', ($event.target as HTMLInputElement).value)" type="text" placeholder="Ask AI to refine draft (e.g., 'make it more formal' or 'shorten')..." class="refine-input" @keyup.enter="emit('generate-draft')">
          <button type="button" class="refine-submit-btn flex-center" :disabled="!aiPrompt.trim()" @click="emit('generate-draft')">
            <RefreshCw :size="12" /> Update Draft
          </button>
        </div>

        <div class="drafted-actions">
          <button type="button" class="discard-draft-btn flex-center" :disabled="aiDraftState === 'generating'" @click="emit('discard-draft')">
            <Trash2 :size="13" /> Discard
          </button>
          <button type="button" class="send-final-btn flex-center" :disabled="aiDraftState === 'generating'" @click="emit('apply-draft')">
            <Check v-if="mode === 'compose'" :size="13" />
            <Send v-else :size="13" />
            {{ mode === 'reply' ? 'Send Email' : 'Apply to Editor' }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.quick-reply-box {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 16px;
  margin-top: 20px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
  transition: all var(--transition-normal);
}

.send-success-overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.95);
  z-index: 20;
  backdrop-filter: blur(4px);
}

.success-content {
  flex-direction: column;
  gap: 12px;
  animation: scale-up 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
}

.success-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--primary-color);
  color: white;
  box-shadow: 0 4px 12px rgba(108, 92, 231, 0.3);
}

.success-message {
  font-family: var(--font-sans);
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.reply-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.reply-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.reply-label {
  font-family: var(--font-sans);
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-primary);
}

.reply-target {
  font-family: var(--font-sans);
  font-size: 0.8rem;
  color: var(--text-tertiary);
}

.reply-stage-badge {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  font-weight: 600;
  padding: 4px 8px;
  border-radius: 12px;
  background: var(--bg-primary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.reply-stage-badge.generating {
  background: rgba(108, 92, 231, 0.1);
  color: var(--primary-color);
  border-color: rgba(108, 92, 231, 0.2);
  animation: pulse-badge 2s infinite;
}

.reply-stage-badge.dictating {
  background: rgba(255, 71, 87, 0.1);
  color: var(--danger-color);
  border-color: rgba(255, 71, 87, 0.2);
  animation: pulse-danger 2s infinite;
}

.input-stage-container,
.drafted-stage-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hidden-file-input {
  display: none;
}

.card-outline-draft-btn {
  background: transparent;
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: 0.8rem;
  font-weight: 500;
  padding: 6px 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all var(--transition-fast);
  gap: 6px;
}
.card-outline-draft-btn:hover:not(:disabled) {
  background: var(--bg-primary);
  border-color: var(--primary-color);
  color: var(--primary-color);
}
.card-outline-draft-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.copywriting-hint {
  font-family: var(--font-sans);
  font-size: 0.75rem;
  color: var(--text-tertiary);
  margin: 0;
  line-height: 1.4;
  text-align: center;
}

.draft-review-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: border-color var(--transition-normal);
}

.draft-review-card.is-streaming {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 1px var(--primary-color);
}

.draft-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

.draft-card-title {
  font-family: var(--font-sans);
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.streaming-sparkle {
  color: var(--primary-color);
  animation: ai-pulse 1.5s ease-in-out infinite;
}

@keyframes ai-pulse {
  0% { transform: scale(1); opacity: 0.6; }
  50% { transform: scale(1.15); opacity: 1; filter: drop-shadow(0 0 4px var(--primary-light)); }
  100% { transform: scale(1); opacity: 0.6; }
}

.draft-editable-hint {
  font-family: var(--font-sans);
  font-size: 0.7rem;
  color: var(--text-tertiary);
}

.draft-textarea-wrapper {
  padding: 14px;
  background: var(--bg-primary);
}

.draft-review-textarea {
  width: 100%;
  min-height: 120px;
  background: transparent;
  border: none;
  resize: none;
  font-family: var(--font-sans);
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--text-primary);
  outline: none;
}

.draft-review-textarea:disabled {
  color: var(--text-secondary);
  cursor: not-allowed;
}

.draft-stage-copywriting {
  font-family: var(--font-sans);
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}

.refine-row {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.refine-input {
  flex: 1;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 8px 12px;
  font-family: var(--font-sans);
  font-size: 0.85rem;
  color: var(--text-primary);
  outline: none;
  transition: border-color var(--transition-fast);
}

.refine-input:focus {
  border-color: var(--primary-color);
}

.refine-submit-btn {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all var(--transition-fast);
  gap: 6px;
}

.refine-submit-btn:hover:not(:disabled) {
  background: var(--bg-secondary);
  border-color: var(--text-secondary);
}

.refine-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.drafted-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
  padding-top: 16px;
  border-top: 1px dashed var(--border-color);
}

.discard-draft-btn,
.send-final-btn {
  font-family: var(--font-sans);
  font-size: 0.85rem;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  transition: all var(--transition-fast);
  gap: 6px;
  border: none;
}

.discard-draft-btn {
  background: transparent;
  color: var(--text-secondary);
}

.discard-draft-btn:hover:not(:disabled) {
  background: rgba(255, 71, 87, 0.1);
  color: var(--danger-color);
}

.send-final-btn {
  background: var(--primary-color);
  color: white;
  box-shadow: 0 2px 6px rgba(108, 92, 231, 0.2);
}

.send-final-btn:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(108, 92, 231, 0.3);
}

.discard-draft-btn:disabled,
.send-final-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}

@keyframes fade-in {
  from { opacity: 0; transform: translateY(5px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes scale-up {
  0% { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}


@keyframes pulse-badge {
  0% { box-shadow: 0 0 0 0 rgba(108, 92, 231, 0.4); }
  70% { box-shadow: 0 0 0 4px rgba(108, 92, 231, 0); }
  100% { box-shadow: 0 0 0 0 rgba(108, 92, 231, 0); }
}

@keyframes pulse-danger {
  0% { box-shadow: 0 0 0 0 rgba(255, 71, 87, 0.4); }
  70% { box-shadow: 0 0 0 4px rgba(255, 71, 87, 0); }
  100% { box-shadow: 0 0 0 0 rgba(255, 71, 87, 0); }
}

.widget-slide-enter-active,
.widget-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.widget-slide-enter-from,
.widget-slide-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.98);
}
</style>
