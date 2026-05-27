<script setup lang="ts">
import { Bold, Italic, UnderlineIcon, List, ListOrdered, Link } from '@lucide/vue'

const emit = defineEmits(['wrap', 'prefix', 'link'])
</script>

<template>
  <div class="format-toolbar">
    <button type="button" class="fmt-btn" title="Bold" @click="emit('wrap', '**', '**')">
      <Bold :size="14" />
    </button>
    <button type="button" class="fmt-btn" title="Italic" @click="emit('wrap', '_', '_')">
      <Italic :size="14" />
    </button>
    <button type="button" class="fmt-btn" title="Underline" @click="emit('wrap', '<u>', '</u>')">
      <UnderlineIcon :size="14" />
    </button>
    <span class="fmt-separator" />
    <button type="button" class="fmt-btn" title="Bullet list" @click="emit('prefix', '- ')">
      <List :size="14" />
    </button>
    <button type="button" class="fmt-btn" title="Numbered list" @click="emit('prefix', '1. ')">
      <ListOrdered :size="14" />
    </button>
    <span class="fmt-separator" />
    <button type="button" class="fmt-btn" title="Insert link" @click="emit('link')">
      <Link :size="14" />
    </button>
  </div>
</template>

<style scoped>
.format-toolbar {
  height: 48px;
  display: flex;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--border-color);
}

.fmt-btn {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color var(--transition-fast), color var(--transition-fast);
}

.fmt-btn:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.fmt-separator {
  width: 1px;
  height: 20px;
  background: var(--border-color);
}
</style>
