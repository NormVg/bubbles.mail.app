<script setup lang="ts">
// Import global styling
import './assets/css/main.css'

// Head settings for SEO & Premium experience
useHead({
  title: 'Bubbles.mail — Daily Intelligence System',
  meta: [
    { name: 'description', content: 'Transform email from message reading to action engine. Time-centric Daily AI Intelligence feed.' }
  ],
  link: [
    { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }
  ]
})
</script>

<template>
  <DashboardLayout>
    <template #left>
      <LeftPanel />
    </template>
    
    <template #middle>
      <MiddlePanel />
    </template>
    
    <template #right>
      <RightPanel />
    </template>
  </DashboardLayout>
</template>

<style>
/* Global App Overrides if any */
</style>
