<script setup lang="ts">
import { RouterView } from 'vue-router'
import ParticleBackground from './components/ParticleBackground.vue'
</script>

<template>
  <ParticleBackground />
  <div class="app-content">
    <RouterView />
  </div>
</template>

<style scoped>
.app-content {
  position: relative;
  z-index: 1;
  min-height: 100vh;
}
</style>
