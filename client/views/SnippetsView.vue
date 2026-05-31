<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../src/stores/app'
import api from '../src/api'

const router = useRouter()
const store = useAppStore()
if (!store.isLoggedIn) router.replace('/login')

const snippets = ref<any[]>([])
const search = ref('')

onMounted(loadSnippets)

async function loadSnippets() {
  try {
    const { data } = await api.get('/snippets')
    snippets.value = data.snippets || []
  } catch { snippets.value = [] }
}

function filtered() {
  if (!search.value) return snippets.value
  const q = search.value.toLowerCase()
  return snippets.value.filter((s: any) =>
    (s.title || '').toLowerCase().includes(q) ||
    (s.language || '').toLowerCase().includes(q) ||
    (s.code || '').toLowerCase().includes(q) ||
    (s.tags || '').toLowerCase().includes(q)
  )
}

async function deleteSnippet(id: string) {
  try {
    await api.delete(`/snippets/${id}`)
    snippets.value = snippets.value.filter(s => s.id !== id)
  } catch { /* ignore */ }
}

function copyCode(code: string) {
  navigator.clipboard.writeText(code).catch(() => {})
}
</script>

<template>
  <div class="snippets-page">
    <header class="topbar">
      <span class="logo" @click="router.push('/chat')" style="cursor:pointer">编程助学智能体</span>
      <div class="topbar-right">
        <button class="back-btn" @click="router.push('/chat')">← 返回</button>
        <span class="user-info">{{ store.user?.username }}</span>
      </div>
    </header>

    <div class="snip-content">
      <div class="snip-header-row">
        <h1>代码片段库</h1>
        <input v-model="search" placeholder="搜索代码..." class="search-input" />
      </div>

      <div v-if="filtered().length === 0" class="empty">
        <p>暂无收藏的代码片段</p>
        <p class="sub">在对话中点击代码块的"收藏"按钮即可保存</p>
      </div>

      <div class="snip-grid">
        <div v-for="s in filtered()" :key="s.id" class="snip-card">
          <div class="snip-top">
            <span class="snip-title">{{ s.title || '未命名' }}</span>
            <span class="snip-lang">{{ s.language || 'text' }}</span>
          </div>
          <pre class="snip-code"><code>{{ s.code }}</code></pre>
          <div class="snip-bottom">
            <span class="snip-date">{{ s.created_at?.slice(0, 10) }}</span>
            <div class="snip-actions">
              <button @click="copyCode(s.code)">复制</button>
              <button class="del" @click="deleteSnippet(s.id)">删除</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.snippets-page { min-height: 100vh; background: var(--bg-primary); color: var(--text-primary); }
.topbar {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 20px; background: var(--bg-secondary); border-bottom: 1px solid var(--bg-tertiary);
}
.logo { font-size: 18px; font-weight: 700; color: var(--accent); }
.topbar-right { display: flex; align-items: center; gap: 14px; }
.user-info { color: var(--text-secondary); font-size: 13px; }
.back-btn {
  padding: 5px 12px; border-radius: 6px; border: 1px solid var(--border-secondary);
  background: var(--bg-tertiary); color: var(--text-primary); font-size: 12px; cursor: pointer;
}
.back-btn:hover { background: var(--border-secondary); }
.snip-content { max-width: 900px; margin: 0 auto; padding: 24px 20px; }
.snip-header-row {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 20px; flex-wrap: wrap; gap: 12px;
}
h1 { font-size: 22px; }
.search-input {
  padding: 8px 14px; border-radius: 8px; border: 1px solid var(--bg-tertiary);
  background: var(--bg-secondary); color: var(--text-primary); font-size: 13px; outline: none; width: 240px;
}
.search-input:focus { border-color: var(--accent); }
.empty { text-align: center; padding: 60px 20px; color: var(--text-muted); }
.empty .sub { font-size: 13px; margin-top: 8px; }
.snip-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 16px; }
.snip-card { background: var(--bg-secondary); border-radius: 10px; overflow: hidden; }
.snip-top {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 14px; background: var(--bg-tertiary);
}
.snip-title { font-size: 13px; font-weight: 600; }
.snip-lang {
  font-size: 11px; background: var(--accent); color: var(--bg-primary);
  padding: 2px 8px; border-radius: 4px;
}
.snip-code {
  padding: 12px 14px; margin: 0; overflow-x: auto;
  background: var(--bg-code); font-size: 12px; line-height: 1.5;
}
.snip-code code { font-family: 'Fira Code', monospace; color: var(--text-primary); }
.snip-bottom {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 14px; border-top: 1px solid var(--bg-tertiary);
}
.snip-date { font-size: 11px; color: var(--text-muted); }
.snip-actions { display: flex; gap: 8px; }
.snip-actions button {
  padding: 3px 10px; border-radius: 4px; border: 1px solid var(--border-secondary);
  background: var(--bg-tertiary); color: var(--text-primary); font-size: 11px; cursor: pointer;
}
.snip-actions button.del { color: #f38ba8; border-color: #f38ba866; }
</style>
