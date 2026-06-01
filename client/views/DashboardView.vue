<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../src/stores/app'
import { sendMessage } from '../src/api/chat'
import MarkdownRenderer from '../src/components/MarkdownRenderer.vue'
import api from '../src/api'

const router = useRouter()
const store = useAppStore()

if (!store.isLoggedIn) router.replace('/login')

interface Stats {
  totalSessions: number
  totalMessages: number
  snippetCount: number
  lastActive: string | null
}

const stats = ref<Stats>({ totalSessions: 0, totalMessages: 0, snippetCount: 0, lastActive: null })
const snippets = ref<any[]>([])
const report = ref('')
const reportLoading = ref(false)
const chatSessions = ref<any[]>([])

onMounted(async () => {
  try {
    const [sRes, snRes, chRes] = await Promise.all([
      api.get('/stats'),
      api.get('/snippets'),
      api.get('/chat/sessions'),
    ])
    stats.value = { ...sRes.data, snippetCount: snRes.data.snippets?.length || 0 }
    snippets.value = snRes.data.snippets || []
    chatSessions.value = chRes.data.sessions || []
  } catch { /* ignore */ }
})

async function generateReport() {
  reportLoading.value = true
  report.value = ''
  const sessionTitles = chatSessions.value.map((s: any) => s.title).join('、')
  const prompt = `请根据以下学习数据生成一份简短的AI学习报告：

- 对话次数：${stats.value.totalSessions}
- 消息数：${stats.value.totalMessages}
- 收藏代码数：${stats.value.snippetCount}
- 对话主题：${sessionTitles || '暂无'}

请分析：
1. 学习状态总结（1-2句）
2. 当前优势
3. 需要加强的方面
4. 下一步学习建议

用中文回复，控制在200字以内，格式简洁。`

  try {
    await sendMessage(
      { messages: [{ role: 'user', content: prompt }], provider: 'deepseek', model: 'deepseek-chat' },
      (chunk) => { report.value += chunk }
    )
  } catch {
    report.value = '生成报告失败，请稍后重试'
  } finally {
    reportLoading.value = false
  }
}

function goChat() { router.push('/chat') }

const computedBadges = computed(() => [
  { name: '初次对话', icon: '💬', condition: '完成1次对话', earned: stats.value.totalSessions >= 1 },
  { name: '勤学好问', icon: '📚', condition: '完成10次对话', earned: stats.value.totalSessions >= 10 },
  { name: '代码收藏家', icon: '⭐', condition: '收藏5个代码', earned: stats.value.snippetCount >= 5 },
  { name: '消息达人', icon: '✉️', condition: '发送50条消息', earned: stats.value.totalMessages >= 50 },
  { name: '持之以恒', icon: '🔥', condition: '连续3天学习', earned: stats.value.totalSessions >= 5 },
  { name: '多语言探索者', icon: '🌍', condition: '学习3门语言', earned: false },
])
</script>

<template>
  <div class="dashboard-page">
    <header class="topbar">
      <span class="logo" @click="goChat" style="cursor:pointer">编程助学智能体</span>
      <div class="topbar-right">
        <button class="back-btn" @click="goChat">← 返回</button>
        <span class="user-info">{{ store.user?.username }}</span>
      </div>
    </header>

    <div class="dash-content">
      <h1>学习仪表盘</h1>

      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-value">{{ stats.totalSessions }}</div>
          <div class="stat-label">对话次数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.totalMessages }}</div>
          <div class="stat-label">消息数</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.snippetCount }}</div>
          <div class="stat-label">收藏代码</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ stats.lastActive ? stats.lastActive.slice(0, 10) : '-' }}</div>
          <div class="stat-label">最近活跃</div>
        </div>
      </div>

      <div class="section" v-if="snippets.length > 0">
        <h2>最近收藏的代码</h2>
        <div class="snippet-list">
          <div v-for="s in snippets.slice(0, 5)" :key="s.id" class="snippet-item">
            <div class="snip-header">
              <span class="snip-title">{{ s.title || '未命名' }}</span>
              <span class="snip-lang">{{ s.language }}</span>
            </div>
            <pre><code>{{ s.code.slice(0, 200) }}{{ s.code.length > 200 ? '...' : '' }}</code></pre>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>成就</h2>
        <div class="badges">
          <div v-for="b in computedBadges" :key="b.name" :class="['badge', { earned: b.earned }]">
            <span class="badge-icon">{{ b.earned ? b.icon : '🔒' }}</span>
            <span class="badge-name">{{ b.name }}</span>
            <span class="badge-cond">{{ b.condition }}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>AI 学习报告</h2>
        <button class="btn-report" @click="generateReport" :disabled="reportLoading">
          {{ reportLoading ? '生成中...' : report ? '重新生成' : '生成学习报告' }}
        </button>
        <MarkdownRenderer v-if="report" :content="report" />
      </div>

      <div class="actions">
        <button class="btn-primary" @click="goChat">继续学习</button>
        <button class="btn-secondary" @click="router.push('/snippets')">管理代码片段</button>
        <button class="btn-secondary" @click="router.push('/learning-path')">学习路径</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard-page {
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
}
.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 20px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--bg-tertiary);
}
.logo { font-size: 18px; font-weight: 700; color: var(--accent); }
.user-info { color: var(--text-secondary); font-size: 13px; }
.topbar-right { display: flex; align-items: center; gap: 12px; }
.back-btn {
  padding: 5px 12px; border-radius: 6px; border: 1px solid var(--border-secondary);
  background: var(--bg-tertiary); color: var(--text-primary); font-size: 12px; cursor: pointer;
}
.back-btn:hover { background: var(--border-secondary); }
.dash-content {
  max-width: 800px;
  margin: 0 auto;
  padding: 32px 20px;
}
h1 { font-size: 24px; margin-bottom: 24px; }
h2 { font-size: 18px; margin-bottom: 12px; color: var(--accent); }
.stat-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}
.stat-card {
  background: var(--bg-tertiary);
  padding: 20px;
  border-radius: 12px;
  text-align: center;
}
.stat-value { font-size: 32px; font-weight: 700; color: var(--accent); }
.stat-label { font-size: 13px; color: var(--text-secondary); margin-top: 6px; }
.section { margin-bottom: 24px; }
.snippet-list { display: flex; flex-direction: column; gap: 8px; }
.snippet-item {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 12px;
}
.snip-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}
.snip-title { font-size: 13px; font-weight: 600; }
.snip-lang {
  font-size: 11px;
  background: var(--accent);
  color: var(--bg-primary);
  padding: 1px 8px;
  border-radius: 4px;
}
.snippet-item pre {
  background: var(--bg-code);
  padding: 8px;
  border-radius: 6px;
  overflow-x: auto;
}
.snippet-item code {
  font-family: 'Fira Code', monospace;
  font-size: 12px;
  color: var(--text-primary);
}
.actions { display: flex; gap: 12px; }
.btn-primary, .btn-secondary {
  padding: 12px 24px;
  border-radius: 10px;
  border: none;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary { background: var(--accent); color: var(--bg-primary); }
.btn-secondary { background: var(--bg-tertiary); color: var(--text-primary); }
.badges { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px; }
.badge {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  background: var(--bg-secondary); padding: 14px 10px; border-radius: 10px;
  text-align: center; opacity: 0.4;
}
.badge.earned { opacity: 1; border: 1px solid var(--accent); }
.badge-icon { font-size: 24px; }
.badge-name { font-size: 12px; font-weight: 600; }
.badge-cond { font-size: 10px; color: var(--text-muted); }
.btn-report {
  padding: 10px 20px; border-radius: 8px; border: 1px solid var(--accent);
  background: transparent; color: var(--accent); font-size: 14px; cursor: pointer;
  margin-bottom: 16px;
}
.btn-report:hover:not(:disabled) { background: var(--accent); color: var(--accent-text); }
.btn-report:disabled { opacity: 0.5; cursor: not-allowed; }
.report-card {
  background: var(--bg-secondary); padding: 20px; border-radius: 12px;
  line-height: 1.8; margin-bottom: 16px; font-size: 14px;
}
</style>
