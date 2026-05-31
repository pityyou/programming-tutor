<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAppStore } from '../src/stores/app'

const router = useRouter()
const store = useAppStore()

if (store.isLoggedIn) {
  router.replace('/chat')
}
</script>

<template>
  <div class="home-page">
    <h1>编程学习智能体</h1>
    <p class="desc">支持 Python · Java · C/C++ · C# · Go · JavaScript 等多语言在线学习</p>
    <div class="features">
      <div class="feature-card">
        <div class="icon">💬</div>
        <h3>AI 对话学伴</h3>
        <p>基于大语言模型的编程答疑，支持多模型自由切换</p>
      </div>
      <div class="feature-card">
        <div class="icon">▶</div>
        <h3>在线代码运行</h3>
        <p>多语言代码沙箱，一键运行查看输出</p>
      </div>
      <div class="feature-card">
        <div class="icon">🔄</div>
        <h3>多模型切换</h3>
        <p>DeepSeek / Claude / OpenAI 自由选择</p>
      </div>
    </div>
    <button class="btn-start" @click="router.push('/login')">开始学习</button>
  </div>
</template>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 40px 20px;
  text-align: center;
  background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
}
h1 {
  font-size: 36px;
  color: var(--text-primary);
  margin-bottom: 12px;
}
.desc {
  color: var(--text-secondary);
  font-size: 16px;
  margin-bottom: 48px;
}
.features {
  display: flex;
  gap: 24px;
  margin-bottom: 48px;
  flex-wrap: wrap;
  justify-content: center;
}
.feature-card {
  background: var(--bg-tertiary);
  padding: 28px 24px;
  border-radius: 12px;
  width: 240px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
}
.feature-card .icon {
  font-size: 32px;
  margin-bottom: 12px;
}
.feature-card h3 {
  color: var(--text-primary);
  font-size: 16px;
  margin-bottom: 8px;
}
.feature-card p {
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.5;
}
.btn-start {
  padding: 14px 48px;
  border-radius: 10px;
  border: none;
  background: var(--accent);
  color: var(--bg-primary);
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
}
.btn-start:hover {
  background: #74c7ec;
}
</style>
