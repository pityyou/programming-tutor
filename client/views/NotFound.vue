<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <div class="nf-page">
    <h1>404</h1>
    <p>页面不存在</p>
    <button @click="router.push('/')">返回首页</button>
  </div>
</template>

<style scoped>
.nf-page {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  min-height: 100vh; text-align: center;
  background: var(--bg-primary); color: var(--text-primary);
}
h1 { font-size: 72px; font-weight: 800; margin-bottom: 8px;
  background: var(--gradient-accent);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
p { color: var(--text-secondary); margin-bottom: 24px; }
button {
  padding: 12px 32px; border-radius: var(--radius-md); border: none;
  background: var(--accent); color: var(--accent-text); font-size: 15px; font-weight: 600; cursor: pointer;
}
</style>
