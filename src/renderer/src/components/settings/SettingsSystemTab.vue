<script setup lang="ts">


const props = defineProps<{
  syncInterval: number
  isDarkTheme: boolean
}>()

const emit = defineEmits(['update:syncInterval', 'toggleTheme'])
</script>

<template>
  <div class="settings-section animate-fade-in">
    <h3 class="section-label">System Preferences</h3>

    <!-- Sync Timer Selection slider -->
    <div class="system-sync-card">
      <div class="sync-slider-header">
        <div>
          <h4 class="setting-title">Background Scan Interval</h4>
          <p class="setting-subtitle">Define how frequently Bubbles queries the secure local back-end for fresh workspace emails.</p>
        </div>
        <span class="sync-value-badge">{{ syncInterval }} mins</span>
      </div>
      <input 
        type="range" 
        min="1" 
        max="60" 
        :value="syncInterval"
        @input="emit('update:syncInterval', parseInt(($event.target as HTMLInputElement).value))"
        class="sync-range-slider" 
      />
      <div class="slider-ticks">
        <span>Immediate</span>
        <span>30m</span>
        <span>Hourly</span>
      </div>
    </div>
  </div>
</template>
