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
    <p class="desc">支持 Python · Java · C/C++ · Go · JavaScript 等多语言在线学习</p>
    <div class="features">
      <div class="feature-card">
        <div class="icon">💬</div>
        <h3>AI 对话学伴</h3>
        <p>基于 DeepSeek 大语言模型的编程答疑，支持语音输入</p>
      </div>
      <div class="feature-card">
        <div class="icon">▶</div>
        <h3>在线代码运行</h3>
        <p>多语言代码沙箱，一键运行查看输出</p>
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
  background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 40%, var(--bg-card) 100%);
  position: relative;
  overflow: hidden;
}
.home-page::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle at 30% 20%, var(--accent-glow) 0%, transparent 50%),
              radial-gradient(circle at 70% 80%, rgba(203,166,247,0.08) 0%, transparent 50%);
  pointer-events: none;
}
h1 {
  font-size: 38px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--accent), var(--purple));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 12px;
  position: relative;
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
  border-radius: 16px;
  width: 260px;
  box-shadow: var(--shadow-md);
  transition: transform 0.3s, box-shadow 0.3s;
  cursor: default;
  position: relative;
}
.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 30px rgba(137,180,250,0.15);
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
  padding: 16px 56px;
  border-radius: 14px;
  border: none;
  background: linear-gradient(135deg, var(--accent), var(--purple));
  color: #fff;
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 20px var(--accent-glow);
  transition: transform 0.2s, box-shadow 0.2s;
  letter-spacing: 1px;
}
.btn-start:hover {
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 8px 30px rgba(137,180,250,0.3);
}
</style>
