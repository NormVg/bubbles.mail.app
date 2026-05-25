<template>
  <div class="app-wrapper">
    <div class="pane-layout animate-fade-in">
      <slot name="left" />
      <div class="pane-divider"></div>
      <slot name="middle" />
      <div class="pane-divider"></div>
      <slot name="right" />
    </div>
  </div>
</template>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.4s var(--transition-normal);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(2px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
