<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../src/stores/app'
import { sendMessage } from '../src/api/chat'
import { bindEmail } from '../src/api/auth'
import { getPractices, deletePractice, PracticeRecord } from '../src/api/practice'
import MarkdownRenderer from '../src/components/MarkdownRenderer.vue'
import { useToast } from '../src/stores/toast'
import api from '../src/api'

const router = useRouter()
const store = useAppStore()
const toast = useToast()

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
const practiceRecords = ref<PracticeRecord[]>([])

onMounted(async () => {
  try {
    const [sRes, snRes, chRes, pRes] = await Promise.all([
      api.get('/stats'),
      api.get('/snippets'),
      api.get('/chat/sessions'),
      getPractices(10),
    ])
    stats.value = { ...sRes.data, snippetCount: snRes.data.snippets?.length || 0 }
    snippets.value = snRes.data.snippets || []
    chatSessions.value = chRes.data.sessions || []
    practiceRecords.value = pRes.data.records || []
  } catch { /* ignore */ }
})

const practiceTotal = computed(() => practiceRecords.value.length)
const practicePassed = computed(() => practiceRecords.value.filter(r => r.passed).length)

async function removePractice(id: string) {
  try {
    await deletePractice(id)
    practiceRecords.value = practiceRecords.value.filter(r => r.id !== id)
    toast.success('已删除练习记录')
  } catch (e: any) {
    toast.error(e.response?.data?.error || '删除失败')
  }
}

function difficultyLabel(d: string) {
  return d === 'easy' ? '简单' : d === 'medium' ? '中等' : d === 'hard' ? '困难' : d
}

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

// 老账号补绑邮箱（用于找回密码）
const bindEmailInput = ref('')
const bindingEmail = ref(false)

async function submitBindEmail() {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bindEmailInput.value.trim())) {
    toast.error('请输入正确的邮箱地址')
    return
  }
  bindingEmail.value = true
  try {
    const { data } = await bindEmail(bindEmailInput.value.trim())
    store.user = data.user
    localStorage.setItem('user', JSON.stringify(data.user))
    toast.success('邮箱绑定成功，现在可以使用邮箱找回密码')
    bindEmailInput.value = ''
  } catch (e: any) {
    toast.error(e.response?.data?.error || '绑定失败')
  } finally {
    bindingEmail.value = false
  }
}

// Count distinct study days from session creation dates
function studyDays(): number {
  const days = new Set<string>()
  for (const s of chatSessions.value) {
    const d = (s.created_at || '').slice(0, 10)
    if (d) days.add(d)
  }
  return days.size
}

// Longest streak of consecutive study days (ending today or yesterday)
function maxStreak(): number {
  const days = new Set<string>()
  for (const s of chatSessions.value) {
    const d = (s.created_at || '').slice(0, 10)
    if (d) days.add(d)
  }
  if (days.size === 0) return 0
  const sorted = [...days].sort()
  let best = 1
  let cur = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T00:00:00Z')
    const curr = new Date(sorted[i] + 'T00:00:00Z')
    const diff = Math.round((curr.getTime() - prev.getTime()) / 86400000)
    if (diff === 1) {
      cur += 1
      best = Math.max(best, cur)
    } else if (diff > 1) {
      cur = 1
    }
  }
  return best
}

const learnedLanguages = (() => {
  try { return JSON.parse(localStorage.getItem('learned_languages') || '[]') as string[] } catch { return [] }
})()

const computedBadges = computed(() => [
  { name: '初次对话', icon: '💬', condition: '完成1次对话', earned: stats.value.totalSessions >= 1 },
  { name: '勤学好问', icon: '📚', condition: '完成10次对话', earned: stats.value.totalSessions >= 10 },
  { name: '代码收藏家', icon: '⭐', condition: '收藏5个代码', earned: stats.value.snippetCount >= 5 },
  { name: '消息达人', icon: '✉️', condition: '发送50条消息', earned: stats.value.totalMessages >= 50 },
  { name: '持之以恒', icon: '🔥', condition: '连续3天学习', earned: maxStreak() >= 3 },
  { name: '多语言探索者', icon: '🌍', condition: '学习3门语言', earned: learnedLanguages.length >= 3 },
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

      <div class="section" v-if="practiceRecords.length > 0">
        <h2>练习记录（错题本）</h2>
        <p class="practice-stat">共练习 {{ practiceTotal }} 次，通过 {{ practicePassed }} 次</p>
        <div class="practice-list">
          <div v-for="r in practiceRecords" :key="r.id" class="practice-item">
            <div class="practice-main">
              <span
                :class="['practice-badge', r.hasTests ? (r.passed ? 'pass' : 'fail') : 'untested']"
              >{{ r.hasTests ? (r.passed ? '✅ 通过' : '❌ 未过') : '📝 已练习' }}</span>
              <div class="practice-text">
                <div class="practice-title">{{ r.exercise }}</div>
                <div class="practice-meta">
                  <span class="snip-lang">{{ r.language }}</span>
                  <span v-if="r.difficulty" class="practice-diff">{{ difficultyLabel(r.difficulty) }}</span>
                  <span class="practice-date">{{ r.created_at?.slice(0, 10) }}</span>
                </div>
              </div>
            </div>
            <button class="practice-del" title="删除记录" @click="removePractice(r.id)">✕</button>
          </div>
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
        <h2>账户安全</h2>
        <div class="account-card">
          <div class="account-row">
            <span class="account-label">用户名</span>
            <span class="account-value">{{ store.user?.username }}</span>
          </div>
          <div class="account-row">
            <span class="account-label">邮箱</span>
            <span class="account-value" :class="{ unbound: !store.user?.email }">
              {{ store.user?.email || '未绑定' }}
            </span>
          </div>
          <div v-if="!store.user?.email" class="bind-row">
            <input
              v-model="bindEmailInput"
              type="email"
              placeholder="绑定邮箱，用于找回密码"
              class="bind-input"
              @keydown.enter.prevent="submitBindEmail"
            />
            <button class="btn-report" @click="submitBindEmail" :disabled="bindingEmail">
              {{ bindingEmail ? '绑定中...' : '绑定邮箱' }}
            </button>
          </div>
          <p class="account-tip">忘记密码时可通过绑定的邮箱收取验证码重置</p>
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
.practice-stat { font-size: 12px; color: var(--text-secondary); margin-bottom: 10px; }
.practice-list { display: flex; flex-direction: column; gap: 8px; max-width: 640px; }
.practice-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 10px 14px;
}
.practice-main { display: flex; align-items: center; gap: 12px; min-width: 0; }
.practice-badge {
  flex-shrink: 0;
  font-size: 12px;
  padding: 2px 10px;
  border-radius: 12px;
}
.practice-badge.pass { background: rgba(166, 227, 161, 0.15); color: var(--success); }
.practice-badge.fail { background: rgba(243, 139, 168, 0.15); color: var(--danger); }
.practice-badge.untested { background: var(--bg-tertiary); color: var(--text-secondary); }
.practice-text { min-width: 0; }
.practice-title {
  font-size: 13px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 380px;
}
.practice-meta { display: flex; align-items: center; gap: 8px; margin-top: 4px; }
.practice-diff { font-size: 11px; color: var(--text-muted); }
.practice-date { font-size: 11px; color: var(--text-muted); }
.practice-del {
  flex-shrink: 0;
  padding: 2px 8px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
  border-radius: 4px;
}
.practice-del:hover { background: var(--bg-tertiary); color: var(--danger); }
.account-card {
  background: var(--bg-secondary);
  border-radius: 10px;
  padding: 16px 18px;
  max-width: 420px;
}
.account-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid var(--bg-tertiary);
}
.account-row:last-of-type { border-bottom: none; }
.account-label { font-size: 13px; color: var(--text-secondary); }
.account-value { font-size: 14px; font-weight: 600; }
.account-value.unbound { color: var(--warning); font-weight: 400; }
.bind-row {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.bind-input {
  flex: 1;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid var(--bg-tertiary);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
}
.bind-input:focus { border-color: var(--accent); }
.account-tip { font-size: 11px; color: var(--text-muted); margin-top: 10px; }
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
