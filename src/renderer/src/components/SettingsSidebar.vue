<script setup lang="ts">
import { ref } from 'vue'
import { Sparkles, Shield, Users } from '@lucide/vue'

const activeCategory = ref('accounts')

const categories = [
  { id: 'accounts', label: 'Connected Accounts', icon: Users, desc: 'Manage your logins' },
  { id: 'ai', label: 'AI Automation', icon: Sparkles, desc: 'Summaries & generation' },
  { id: 'security', label: 'Security & Access', icon: Shield, desc: 'API keys & privacy' }
]

const emit = defineEmits(['select-category'])

function selectCategory(id: string) {
  activeCategory.value = id
  emit('select-category', id)
}
</script>

<template>
  <div class="pane pane-middle settings-sidebar animate-fade-in">
    <!-- Header -->
    <div class="pane-header settings-header">
      <h2 class="pane-title">Settings</h2>
    </div>

    <!-- Category List -->
    <div class="categories-list">
      <div 
        v-for="cat in categories" 
        :key="cat.id" 
        class="category-card"
        :class="{ 'active': activeCategory === cat.id }"
        @click="selectCategory(cat.id)"
      >
        <div class="category-icon-wrapper flex-center">
          <component :is="cat.icon" :size="16" />
        </div>
        <div class="category-info">
          <h4 class="category-label">{{ cat.label }}</h4>
          <p class="category-desc">{{ cat.desc }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-sidebar {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-primary);
}

.settings-header {
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  padding: 0 16px;
}

.categories-list {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow-y: auto;
}

.category-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all var(--transition-fast);
}

.category-card:hover {
  background-color: var(--bg-secondary);
}

.category-card.active {
  background-color: var(--bg-secondary);
  border-color: var(--border-color);
}

.category-icon-wrapper {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background-color: var(--bg-secondary);
  color: var(--text-secondary);
  flex-shrink: 0;
  transition: all var(--transition-fast);
}

.category-card.active .category-icon-wrapper {
  background-color: var(--text-primary);
  color: var(--bg-primary);
}

.category-info {
  display: flex;
  flex-direction: column;
}

.category-label {
  font-family: var(--font-sans);
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--text-primary);
}

.category-desc {
  font-size: 0.72rem;
  color: var(--text-muted);
  margin-top: 1px;
}

.animate-fade-in {
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
