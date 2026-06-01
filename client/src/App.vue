<script setup lang="ts">
import { RouterView } from 'vue-router'
import ParticleBackground from './components/ParticleBackground.vue'
</script>

<template>
  <div class="app-root">
    <ParticleBackground />
    <RouterView />
  </div>
</template>

<style>
.app-root {
  position: relative;
  min-height: 100vh;
}
.app-root > :not(.particle-canvas) {
  position: relative;
  z-index: 1;
}
</style>
