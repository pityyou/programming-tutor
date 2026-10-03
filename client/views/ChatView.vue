<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../src/stores/app'
import { useThemeStore } from '../src/stores/theme'
import { sendMessage, executeCode, ChatMessage } from '../src/api/chat'
import { LANGUAGES, HELLO_WORLD, MODEL_OPTIONS } from '../src/api/constants'
import api from '../src/api'
import CodeEditor from '../src/components/CodeEditor.vue'

import MarkdownRenderer from '../src/components/MarkdownRenderer.vue'
import ChatHistory from '../src/components/ChatHistory.vue'
import KnowledgeCards from '../src/components/KnowledgeCards.vue'
import ExercisePanel from '../src/components/ExercisePanel.vue'
import VoiceInput from '../src/components/VoiceInput.vue'
import QuickCommands from '../src/components/QuickCommands.vue'
import { useToast } from '../src/stores/toast'

const router = useRouter()
const store = useAppStore()
const themeStore = useThemeStore()
const toast = useToast()

if (!store.isLoggedIn) {
  router.replace('/login')
}

// Sidebar
const sidebarTab = ref<'history' | 'cards'>('history')
const sidebarOpen = ref(true)

// Ref to the chat history panel so we can refresh it when a session is saved
const chatHistoryRef = ref<InstanceType<typeof ChatHistory> | null>(null)

// Model selector (from store provider)
const modelOptions = MODEL_OPTIONS[store.provider]?.models || []

// Resizable chat/editor split
const savedPct = parseFloat(localStorage.getItem('chat_panel_pct') || '50')
const chatPct = ref(Number.isFinite(savedPct) ? Math.min(75, Math.max(25, savedPct)) : 50)
const splitterDrag = ref(false)

// Mobile detection (drives the drawer sidebar + stacked layout)
const isMobile = ref(window.matchMedia('(max-width: 768px)').matches)
if (window.matchMedia) {
  window.matchMedia('(max-width: 768px)').addEventListener('change', (e) => {
    isMobile.value = e.matches
  })
}

// CSS Grid columns for the main area (sidebar | chat | splitter | editor)
const mainAreaStyle = computed(() => {
  if (isMobile.value) return {}
  const col = sidebarOpen.value ? '260px ' : ''
  return {
    gridTemplateColumns: `${col}minmax(0, ${chatPct.value}fr) 6px minmax(0, ${100 - chatPct.value}fr)`,
  }
})

function autoGrow(e: Event) {
  const el = e.target as HTMLTextAreaElement
  el.style.height = 'auto'
  el.style.height = Math.min(el.scrollHeight, 200) + 'px'
}

function onSplitterDown(e: MouseEvent) {
  e.preventDefault()
  const area = (e.currentTarget as HTMLElement).parentElement
  if (!area) return
  const areaRect = area.getBoundingClientRect()
  const move = (ev: MouseEvent) => {
    const pct = ((ev.clientX - areaRect.left) / areaRect.width) * 100
    chatPct.value = Math.min(75, Math.max(25, pct))
  }
  const up = () => {
    splitterDrag.value = false
    window.removeEventListener('mousemove', move)
    window.removeEventListener('mouseup', up)
    localStorage.setItem('chat_panel_pct', String(chatPct.value))
  }
  splitterDrag.value = true
  window.addEventListener('mousemove', move)
  window.addEventListener('mouseup', up)
}

onMounted(() => {
  // Navigation from Learning Path → Knowledge Cards
  const nav = localStorage.getItem('nav_to_knowledge')
  if (nav) {
    sidebarTab.value = 'cards'
    sidebarOpen.value = true
  }
})

// Abort any in-flight stream when leaving the page
onUnmounted(() => {
  abortController?.abort()
})

// Message quick actions
function copyMessage(content: string) {
  navigator.clipboard?.writeText(content).then(() => toast.success('已复制到剪贴板')).catch(() => toast.error('复制失败'))
}

async function regenLast() {
  if (loading.value) return
  const last = messages.value[messages.value.length - 1]
  if (last?.role !== 'assistant') return
  const userIdx = messages.value.length - 2
  if (messages.value[userIdx]?.role !== 'user') return
  const question = messages.value[userIdx].content
  const gen = sessionGeneration
  // Truncate the persisted history from this user message so the
  // regenerated reply replaces the old one instead of duplicating it.
  try {
    if (currentSessionId.value) {
      await api.delete(`/chat/sessions/${currentSessionId.value}/messages?fromSeq=${userIdx}`)
    }
  } catch { /* ignore */ }
  // 请求期间用户可能已切换/新建会话 → 放弃本次重新生成
  if (gen !== sessionGeneration) return
  messages.value.splice(userIdx)
  savedCount.value = Math.min(savedCount.value, userIdx)
  streamReply(question)
}

// Chat
const messages = ref<ChatMessage[]>([])
const input = ref('')
const loading = ref(false)
const chatContainer = ref<HTMLElement | null>(null)
const currentSessionId = ref<string | null>(null)
// How many messages at the front are already persisted to the server.
// Used for incremental session saves (append-only instead of delete+recreate).
const savedCount = ref(0)

// Abort support for "stop generating"
let abortController: AbortController | null = null

function stopStreaming() {
  abortController?.abort()
}

// Editor
const savedLang = localStorage.getItem('editor_lang') || 'python'
const currentLanguage = ref(savedLang)
const savedCode = localStorage.getItem(`code_${savedLang}`)
const codeContent = ref(savedCode || HELLO_WORLD[savedLang] || '')
const codeOutput = ref('')
const codeError = ref('')
const stdinInput = ref('')
const editorTab = ref<'editor' | 'exercise'>('editor')

// Track languages the user has coded in (drives the "多语言探索者" badge)
function trackLanguage(lang: string) {
  try {
    const arr = JSON.parse(localStorage.getItem('learned_languages') || '[]')
    if (!arr.includes(lang)) {
      arr.push(lang)
      localStorage.setItem('learned_languages', JSON.stringify(arr))
    }
  } catch { /* ignore */ }
}

watch(currentLanguage, (lang) => {
  const saved = localStorage.getItem(`code_${lang}`)
  codeContent.value = saved || HELLO_WORLD[lang] || ''
  localStorage.setItem('editor_lang', lang)
  trackLanguage(lang)
})

trackLanguage(currentLanguage.value)

watch(codeContent, (val) => {
  localStorage.setItem(`code_${currentLanguage.value}`, val)
})

function scrollToBottom() {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight
    }
  })
}

// 会话世代：新建/切换会话时递增。用于丢弃"过期"的异步结果，
// 避免旧会话的流式写入或保存结果污染当前会话。
let sessionGeneration = 0

function streamReply(userContent: string) {
  if (loading.value) return
  messages.value.push({ role: 'user', content: userContent })
  messages.value.push({ role: 'assistant', content: '' })
  const lastIdx = messages.value.length - 1
  const gen = sessionGeneration
  const msgsArray = messages.value // 数组引用快照
  scrollToBottom()
  loading.value = true
  // 用户消息立即持久化（不等流完成），刷新/断网也不丢失问题与当前会话
  saveCurrentSession()

  let rawContent = ''
  let finished = false
  abortController = new AbortController()

  // Throttled flush: update the bubble at most every 80ms instead of
  // re-rendering markdown on every SSE chunk (previously every 45ms via a
  // "typewriter" loop that also re-rendered half-open markdown).
  const flush = () => {
    // 会话已切换：丢弃写入，否则会用本次回复覆盖其他会话的消息
    if (gen !== sessionGeneration || messages.value !== msgsArray) return
    if (messages.value[lastIdx].content !== rawContent) {
      messages.value[lastIdx].content = rawContent
      scrollToBottom()
    }
  }
  const timer = window.setInterval(() => {
    flush()
    if (finished) window.clearInterval(timer)
  }, 80)

  const finish = () => {
    if (finished) return
    finished = true
    window.clearInterval(timer)
    flush()
    loading.value = false
    abortController = null
    // 会话已切换则不再保存本次结果
    if (gen === sessionGeneration) saveCurrentSession()
  }

  sendMessage(
    {
      messages: messages.value.slice(0, -1),
      provider: store.provider,
      model: store.model,
      language: currentLanguage.value,
    },
    (chunk) => { rawContent += chunk },
    abortController.signal
  )
    .then(() => finish())
    .catch((e) => {
      if (e?.name === 'AbortError') {
        // User clicked "stop": keep whatever was generated so far.
        if (!rawContent) rawContent = '（已停止生成）'
      } else {
        rawContent = `错误: ${e.message || '请求失败'}`
      }
      finish()
    })
}

async function handleSend() {
  const text = input.value.trim()
  if (!text || loading.value) return
  input.value = ''
  streamReply(text)
}

// Prevent Enter inside an IME composition (Chinese input) from sending.
function onKeydownEnter(e: KeyboardEvent) {
  if (e.isComposing || (e as any).keyCode === 229) return
  handleSend()
}

// Serialized session persistence: saves run one after another so the
// "immediate save on send" and "save on stream finish" calls never race.
let saveChain: Promise<void> = Promise.resolve()

function saveCurrentSession() {
  saveChain = saveChain.then(() => doSave()).catch(() => { /* ignore */ })
}

async function doSave() {
  if (messages.value.length === 0) return
  const gen = sessionGeneration
  const msgsArray = messages.value // 数组引用快照
  // 不要把尾部尚未生成的 assistant 占位（content 为空）持久化：
  // 否则刷新后加载到空回复会永远显示"思考中"，且真实回复会丢失。
  let end = msgsArray.length
  while (end > 0 && msgsArray[end - 1].role === 'assistant' && !msgsArray[end - 1].content) {
    end--
  }
  if (end <= savedCount.value) return
  const newMsgs = msgsArray.slice(savedCount.value, end)
  try {
    if (currentSessionId.value) {
      await api.post(`/chat/sessions/${currentSessionId.value}/messages`, { messages: newMsgs })
    } else {
      const { data } = await api.post('/chat/sessions', {
        title: msgsArray[0]?.content?.slice(0, 30) || 'New Chat',
        messages: newMsgs,
      })
      // 会话已在服务端创建，无论前端是否已切换会话都应刷新左侧列表
      chatHistoryRef.value?.loadSessions()
      // 请求期间用户可能已新建/切换会话 → 不把当前上下文绑定到这个旧会话
      if (gen !== sessionGeneration) return
      currentSessionId.value = data.sessionId
    }
    // 同上：会话已切换则不要污染新会话的 savedCount（否则后续消息永远存不上）
    if (gen !== sessionGeneration) return
    savedCount.value = end
  } catch { /* ignore */ }
}

async function handleRun() {
  codeOutput.value = ''
  codeError.value = ''
  try {
    const res = await executeCode(currentLanguage.value, codeContent.value, stdinInput.value)
    codeOutput.value = res.data.output || ''
    codeError.value = res.data.error || ''
  } catch (e: any) {
    codeError.value = e.response?.data?.error || e.message || '执行失败'
  }
  // Refocus Monaco editor
  await nextTick()
  ;(document.querySelector('.monaco-editor textarea') as HTMLTextAreaElement | null)?.focus()
}

function handleDebug() {
  const prompt = `请帮我分析以下 ${currentLanguage.value} 代码的错误或问题，给出修复建议：\n\n\`\`\`${currentLanguage.value}\n${codeContent.value}\n\`\`\`\n\n${codeError.value ? '运行错误：' + codeError.value : ''}`
  streamReply(prompt)
}

// Sidebar actions
function selectSession(id: string) {
  // Stop any in-flight generation so its content isn't written to the wrong session
  stopStreaming()
  sessionGeneration++
  const gen = sessionGeneration
  api.get(`/chat/sessions/${id}`).then(({ data }) => {
    // 期间用户又切换/新建了会话 → 丢弃这次结果
    if (gen !== sessionGeneration) return
    const msgs: ChatMessage[] = data.messages || []
    // 清理旧版本 bug 残留的尾部空回复（assistant content === ''），
    // 避免加载后一直显示"思考中"；同时删除服务端记录。
    if (msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant' && !msgs[msgs.length - 1].content) {
      api.delete(`/chat/sessions/${id}/messages?fromSeq=${msgs.length - 1}`).catch(() => {})
      msgs.pop()
    }
    messages.value = msgs
    currentSessionId.value = id
    savedCount.value = msgs.length
    scrollToBottom()
  }).catch(() => {})
}

function newChat() {
  sessionGeneration++
  messages.value = []
  currentSessionId.value = null
  savedCount.value = 0
}

// 删除会话后：只有删掉的是当前会话才清空对话区，否则保留正在看的内容
function handleSessionDeleted(id: string) {
  if (id === currentSessionId.value) newChat()
}

function handleAskAi(prompt: string) {
  streamReply(prompt)
}

function handleOpenInEditor(code: string, lang?: string) {
  if (lang && lang !== currentLanguage.value) {
    currentLanguage.value = lang
  }
  codeContent.value = code
  editorTab.value = 'editor'
}

function handleSetCode(code: string) {
  codeContent.value = code
  editorTab.value = 'editor'
}

function handleExerciseInChat(content: string) {
  const assistantMsg: ChatMessage = { role: 'assistant', content: content }
  messages.value.push(assistantMsg)
  scrollToBottom()
  saveCurrentSession()
}

async function handleBookmarkExercise(title: string, content: string) {
  try {
    await api.post('/snippets', {
      code: content,
      language: currentLanguage.value,
      title: title || '练习题',
      tags: ['exercise', currentLanguage.value],
    })
    toast.success('题目已收藏到代码库')
  } catch (e: any) {
    toast.error(e.response?.data?.error || '收藏失败')
  }
}

async function handleSaveSnippet(code: string, language: string) {
  try {
    await api.post('/snippets', { code, language, title: code.split('\n')[0].slice(0, 50) })
    toast.success('代码已收藏')
  } catch (e: any) {
    toast.error(e.response?.data?.error || '收藏失败')
  }
}

function exportChat() {
  const md = messages.value.map(m => {
    if (m.role === 'user') return `## 问题\n\n${m.content}\n`
    return `## 回答\n\n${m.content}\n\n---\n`
  }).join('\n')
  const blob = new Blob([md], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `chat-${Date.now()}.md`
  a.click()
  URL.revokeObjectURL(url)
  toast.success('对话已导出为 Markdown')
}
</script>

<template>
  <div class="chat-page">
    <header class="topbar">
      <div class="topbar-left">
        <button class="sidebar-toggle" @click="sidebarOpen = !sidebarOpen" :title="sidebarOpen ? '收起侧边栏' : '展开侧边栏'">
          {{ sidebarOpen ? '◁' : '▷' }}
        </button>
        <span class="logo">编程助学智能体</span>
      </div>
      <div class="topbar-right">
        <select v-model="store.model" class="model-select" title="选择模型" @change="store.setModel(store.model)">
          <option v-for="m in modelOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
        </select>
        <button class="top-btn" @click="exportChat" :disabled="messages.length === 0">导出</button>
        <button class="top-btn" @click="router.push('/dashboard')">仪表盘</button>
        <button class="top-btn" @click="router.push('/snippets')">代码库</button>
        <button class="top-btn" @click="router.push('/learning-path')">学习路径</button>
        <button class="top-btn" @click="themeStore.toggle()">
          {{ themeStore.mode === 'dark' ? '☀' : '🌙' }}
        </button>
        <span class="user-info">{{ store.user?.username }}</span>
      </div>
    </header>

    <div class="main-area" :class="{ dragging: splitterDrag }" :style="mainAreaStyle">
      <!-- Sidebar -->
      <div v-if="sidebarOpen" class="sidebar">
        <div class="sidebar-tabs">
          <button
            :class="['sb-tab', { active: sidebarTab === 'history' }]"
            @click="sidebarTab = 'history'"
          >历史</button>
          <button
            :class="['sb-tab', { active: sidebarTab === 'cards' }]"
            @click="sidebarTab = 'cards'"
          >知识</button>
        </div>
        <ChatHistory
          v-if="sidebarTab === 'history'"
          ref="chatHistoryRef"
          @select-session="selectSession"
          @new-chat="newChat"
          @deleted="handleSessionDeleted"
        />
        <KnowledgeCards
          v-else
          @ask-ai="handleAskAi"
          @open-in-editor="(code, lang) => handleOpenInEditor(code, lang)"
        />
      </div>
      <div v-if="sidebarOpen && isMobile" class="sidebar-backdrop" @click="sidebarOpen = false"></div>

      <!-- Chat Panel -->
      <div class="chat-panel">
        <div class="chat-messages" ref="chatContainer">
          <div v-if="messages.length === 0" class="welcome">
            <div class="welcome-hero">
              <div class="welcome-icons">
                <span class="w-icon" style="--i:0">🐍</span>
                <span class="w-icon" style="--i:1">☕</span>
                <span class="w-icon" style="--i:2">⚡</span>
                <span class="w-icon" style="--i:3">🔵</span>
                <span class="w-icon" style="--i:4">🔧</span>
                <span class="w-icon" style="--i:5">📜</span>
              </div>
              <h2>开始你的编程之旅</h2>
              <p class="welcome-sub">选择一个话题，AI 助教带你探索编程世界</p>
            </div>
            <div class="welcome-grid">
              <div class="w-card beginner" @click="handleAskAi('我刚开始学编程，Python 的第一个程序怎么写？')">
                <span class="wc-icon">🌱</span>
                <div class="wc-text">
                  <strong>零基础入门</strong>
                  <span>从 Hello World 开始</span>
                </div>
              </div>
              <div class="w-card practice" @click="handleAskAi('出一道 Python 算法题让我练习一下')">
                <span class="wc-icon">💪</span>
                <div class="wc-text">
                  <strong>刷题练习</strong>
                  <span>算法 + 数据结构</span>
                </div>
              </div>
              <div class="w-card debug" @click="handleAskAi('我的代码运行报错了，怎么调试？')">
                <span class="wc-icon">🔍</span>
                <div class="wc-text">
                  <strong>Debug 指导</strong>
                  <span>排查错误，优化代码</span>
                </div>
              </div>
              <div class="w-card review" @click="handleAskAi('帮我做一个今天的学习总结')">
                <span class="wc-icon">📊</span>
                <div class="wc-text">
                  <strong>学习总结</strong>
                  <span>回顾知识，查漏补缺</span>
                </div>
              </div>
            </div>
          </div>
          <div
            v-for="(msg, i) in messages"
            :key="i"
            :class="['message', msg.role]"
          >
            <div v-if="msg.role === 'assistant'" class="avatar">🤖</div>
            <div class="msg-content">
              <template v-if="msg.role === 'user'">
                {{ msg.content }}
              </template>
              <template v-else>
                <MarkdownRenderer
                  :content="msg.content || '思考中...'"
                  @open-in-editor="handleOpenInEditor"
                  @save-snippet="handleSaveSnippet"
                />
                <span v-if="loading && i === messages.length - 1" class="stream-cursor"></span>
              </template>
            </div>
            <div class="msg-actions" @click.stop>
              <button class="msg-action-btn" title="复制" @click="copyMessage(msg.content)">⧉</button>
              <button
                v-if="msg.role === 'assistant' && i === messages.length - 1 && !loading"
                class="msg-action-btn"
                title="重新生成"
                @click="regenLast"
              >↻</button>
            </div>
            <div v-if="msg.role === 'user'" class="avatar">🧑‍🎓</div>
          </div>
          <div v-if="loading" class="typing-indicator">
            <span></span><span></span><span></span>
          </div>
        </div>
        <QuickCommands @command="(t: string) => streamReply(t)" />
        <div class="chat-input">
          <VoiceInput @result="(t: string) => { input = t; handleSend() }" />
          <textarea
            v-model="input"
            placeholder="输入你的问题，如：解释 Python 的装饰器...（Enter 发送，Ctrl+Enter 或 Shift+Enter 换行）"
            @keydown.enter.exact.prevent="onKeydownEnter"
            @keydown.ctrl.enter.prevent="input += '\n'"
            @keydown.shift.enter.prevent="input += '\n'"
            @input="autoGrow"
            :disabled="loading"
            rows="2"
            class="chat-textarea"
          ></textarea>
          <button v-if="loading" @click="stopStreaming" class="send-btn stop-btn">⏹ 停止</button>
          <button v-else @click="handleSend" :disabled="!input.trim()" class="send-btn">发送</button>
        </div>
      </div>

      <div v-if="!isMobile" class="splitter" @mousedown="onSplitterDown"></div>

      <!-- Editor/Exercise Panel -->
      <div class="editor-panel">
        <div class="editor-tabs">
          <button
            :class="['et-tab', { active: editorTab === 'editor' }]"
            @click="editorTab = 'editor'"
          >代码编辑</button>
          <button
            :class="['et-tab', { active: editorTab === 'exercise' }]"
            @click="editorTab = 'exercise'"
          >练习</button>
        </div>

        <div v-show="editorTab === 'editor'" style="display:flex;flex-direction:column;flex:1;min-height:0">
          <div class="editor-header">
            <select v-model="currentLanguage">
              <option v-for="lang in LANGUAGES" :key="lang.value" :value="lang.value">
                {{ lang.label }}
              </option>
            </select>
            <div class="editor-actions">
              <button @click="handleRun" class="btn-run">▶ 运行</button>
              <button @click="handleDebug" class="btn-debug">AI 帮我调试</button>
            </div>
          </div>
          <CodeEditor
            v-model="codeContent"
            :language="currentLanguage"
          />
          <div class="stdin-bar">
            <span class="stdin-label">输入:</span>
            <textarea
              v-model="stdinInput"
              placeholder="程序需要的输入值（每行一个值）"
              class="stdin-input"
              rows="2"
            ></textarea>
          </div>
          <div class="output-panel" v-show="codeOutput || codeError">
            <div v-if="codeOutput">
              <div class="output-label">输出:</div>
              <pre>{{ codeOutput }}</pre>
            </div>
            <div v-if="codeError" class="error-output">
              <div class="output-label">错误:</div>
              <pre>{{ codeError }}</pre>
            </div>
          </div>
        </div>

        <div v-show="editorTab === 'exercise'" style="display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden">
          <ExercisePanel
            :language="currentLanguage"
            @set-code="handleSetCode"
            @show-in-chat="handleExerciseInChat"
            @bookmark-exercise="handleBookmarkExercise"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  position: relative;
  z-index: 1;
}

/* Topbar */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--gradient-top);
  border-bottom: 1px solid var(--border-primary);
  flex-shrink: 0;
  box-shadow: var(--shadow-sm);
  z-index: 10;
}
.topbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sidebar-toggle {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
  padding: 2px 6px;
}
.sidebar-toggle:hover { color: var(--text-primary); }
.logo {
  font-size: 17px;
  font-weight: 800;
  background: linear-gradient(135deg, var(--accent), var(--purple));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.topbar-right {
  display: flex;
  align-items: center;
  gap: 14px;
}
.user-info { color: var(--text-secondary); font-size: 13px; }
.top-btn {
  padding: 4px 10px; border-radius: 5px; border: 1px solid var(--border-secondary);
  background: transparent; color: var(--text-secondary); font-size: 12px; cursor: pointer;
}
.top-btn:hover { background: var(--bg-tertiary); color: var(--text-primary); }
.top-btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* Main Layout */
.main-area {
  flex: 1;
  overflow: hidden;
  display: grid;
}

/* Resizable splitter between chat and editor */
.splitter {
  cursor: col-resize;
  background: var(--bg-tertiary);
  transition: background 0.2s;
  flex-shrink: 0;
}
.splitter:hover,
.main-area.dragging .splitter {
  background: var(--accent);
}
.main-area.dragging {
  cursor: col-resize;
  user-select: none;
}

/* Sidebar */
.sidebar {
  width: 260px;
  border-right: 1px solid var(--bg-tertiary);
  flex-shrink: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  min-width: 0;
}
.sidebar-tabs {
  display: flex;
  border-bottom: 1px solid var(--bg-tertiary);
}
.sb-tab {
  flex: 1;
  padding: 10px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
}
.sb-tab.active {
  color: var(--accent);
  border-bottom: 2px solid var(--accent);
}

/* Chat */
.chat-panel {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--bg-tertiary);
  min-width: 0;
  overflow: hidden;
}
.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
.welcome { padding: 20px 10px; animation: fadeInUp 0.4s ease; }
.welcome-hero { text-align: center; margin-bottom: 28px; }
.welcome-icons {
  display: flex; justify-content: center; gap: 8px; margin-bottom: 20px; flex-wrap: wrap;
}
.w-icon {
  font-size: 28px;
  animation: floatIcon 3s ease-in-out infinite;
  animation-delay: calc(var(--i, 0) * 0.3s);
}
@keyframes floatIcon {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  33% { transform: translateY(-12px) rotate(5deg); }
  66% { transform: translateY(-4px) rotate(-3deg); }
}
.welcome h2 {
  font-size: 24px; font-weight: 800; margin-bottom: 6px;
  background: var(--gradient-accent);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
}
.welcome-sub { color: var(--text-secondary); font-size: 14px; }
.welcome-grid {
  display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; max-width: 480px; margin: 0 auto;
}
.w-card {
  display: flex; align-items: center; gap: 12px;
  padding: 14px; border-radius: var(--radius-md);
  cursor: pointer; transition: all 0.25s ease;
  border: 1px solid var(--border-primary);
  background: var(--bg-secondary);
}
.w-card:hover {
  transform: translateY(-3px);
}
.w-card.beginner:hover { border-color: var(--accent-3); background: rgba(77,232,192,0.06); }
.w-card.practice:hover { border-color: var(--accent); background: rgba(108,140,255,0.06); }
.w-card.debug:hover { border-color: var(--accent-2); background: rgba(255,107,157,0.06); }
.w-card.review:hover { border-color: var(--purple); background: rgba(183,148,244,0.06); }
.wc-icon { font-size: 26px; flex-shrink: 0; }
.wc-text { display: flex; flex-direction: column; gap: 2px; }
.wc-text strong { font-size: 13px; color: var(--text-primary); }
.wc-text span { font-size: 11px; color: var(--text-muted); }
.message {
  margin-bottom: 16px;
  animation: fadeInUp 0.25s ease;
  display: flex;
  gap: 8px;
  align-items: flex-start;
}
.message.user { text-align: right; justify-content: flex-end; }
.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-primary);
  flex-shrink: 0;
}
.message.user .msg-content {
  background: linear-gradient(135deg, var(--accent), #74c7ec);
  color: var(--bg-primary);
  display: inline-block;
  padding: 10px 16px;
  border-radius: 16px 16px 4px 16px;
  max-width: 85%;
  text-align: left;
  white-space: pre-wrap;
  box-shadow: var(--shadow-sm);
}
.message.assistant .msg-content {
  background: var(--bg-secondary);
  color: var(--text-primary);
  padding: 12px 16px;
  border-radius: 4px 16px 16px 16px;
  line-height: 1.7;
  border: 1px solid var(--border-primary);
  min-width: 0;
}
.msg-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.2s;
  align-self: center;
  flex-shrink: 0;
}
.message:hover .msg-actions { opacity: 1; }
.msg-action-btn {
  padding: 2px 7px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;
  cursor: pointer;
  border-radius: 4px;
}
.msg-action-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}
.stream-cursor {
  display: inline-block;
  width: 8px;
  height: 15px;
  margin-left: 3px;
  vertical-align: text-bottom;
  background: var(--accent);
  animation: blink 1s steps(2) infinite;
}
@keyframes blink {
  50% { opacity: 0; }
}
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 8px 14px;
}
.typing-indicator span {
  width: 6px; height: 6px;
  background: var(--text-secondary);
  border-radius: 50%;
  animation: bounce 1.4s infinite ease-in-out both;
}
.typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
.typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
@keyframes bounce {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}
.chat-input {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid var(--border-primary);
  background: var(--gradient-top);
  box-shadow: 0 -2px 8px rgba(0,0,0,0.1);
}
.chat-textarea {
  flex: 1;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid var(--border-secondary);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
  resize: none;
  font-family: inherit;
  line-height: 1.5;
}
.chat-textarea:focus { border-color: var(--accent); }
.send-btn {
  padding: 10px 20px;
  border-radius: 10px;
  border: none;
  background: var(--accent);
  color: var(--bg-primary);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
.send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.stop-btn {
  background: var(--danger);
  color: #fff;
  animation: pulseGlow 1.2s infinite;
}

/* Editor */
.editor-panel {
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  min-width: 0;
  overflow: hidden;
}
.editor-tabs {
  display: flex;
  border-bottom: 1px solid var(--bg-tertiary);
  background: var(--bg-secondary);
}
.et-tab {
  flex: 1;
  padding: 10px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
}
.et-tab.active {
  color: var(--accent);
  border-bottom: 2px solid var(--accent);
}
.editor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--bg-tertiary);
}
.editor-header select {
  padding: 7px 36px 7px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-secondary);
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  min-width: 110px;
  outline: none;
}
.editor-actions { display: flex; gap: 8px; }
.btn-run {
  padding: 6px 16px;
  border-radius: 6px;
  border: none;
  background: #a6e3a1;
  color: var(--bg-primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}
.btn-debug {
  padding: 6px 16px;
  border-radius: 6px;
  border: none;
  background: #fab387;
  color: var(--bg-primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

/* Code Editor Area */
:deep(.monaco-editor) {
  flex: 1;
  min-height: 0;
}

.output-panel {
  padding: 12px;
  background: var(--bg-code);
  border-top: 1px solid var(--bg-tertiary);
  max-height: 150px;
  overflow-y: auto;
}
.stdin-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 12px; background: var(--bg-secondary); border-top: 1px solid var(--border-primary);
}
.stdin-label { font-size: 12px; color: var(--text-secondary); white-space: nowrap; }
.stdin-input {
  flex: 1; padding: 5px 10px; border-radius: 6px;
  border: 1px solid var(--border-secondary); background: var(--bg-code);
  color: var(--text-primary); font-size: 12px; outline: none;
  font-family: 'Fira Code', Consolas, monospace;
  resize: none;
}
.stdin-input:focus { border-color: var(--accent); }
.output-label { font-size: 12px; color: var(--text-secondary); margin-bottom: 4px; }
.output-panel pre {
  color: var(--text-primary);
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  white-space: pre-wrap;
  margin: 0;
}
.error-output pre { color: #f38ba8; }

.model-select {
  padding: 5px 30px 5px 10px;
  font-size: 12px;
  border-radius: 6px;
  border: 1px solid var(--border-secondary);
  background: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  outline: none;
}
.model-select:hover { border-color: var(--accent); }

/* Responsive: Tablet */
@media (max-width: 1024px) {
  .sidebar { width: 220px; }
}

/* Responsive: Mobile */
@media (max-width: 768px) {
  .main-area {
    display: flex;
    flex-direction: column;
  }
  /* Sidebar becomes a fixed drawer with a backdrop */
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 280px;
    max-width: 85vw;
    border-right: 1px solid var(--border-primary);
    border-bottom: none;
    z-index: 100;
    box-shadow: var(--shadow-lg);
  }
  .sidebar-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.45);
    z-index: 90;
  }
  .chat-panel {
    flex: 1 1 45%;
    min-height: 0;
    border-right: none;
  }
  .editor-panel {
    flex: 1 1 auto;
    min-height: 35vh;
    border-top: 1px solid var(--bg-tertiary);
  }
  .topbar {
    flex-wrap: wrap;
    gap: 6px;
    padding: 8px 10px;
  }
  .topbar-right {
    gap: 6px;
  }
  .top-btn {
    font-size: 11px;
    padding: 3px 8px;
  }
  .model-select {
    font-size: 11px;
    padding: 3px 8px;
    min-width: 0;
    max-width: 110px;
  }
  .user-info {
    display: none;
  }
  .logo {
    font-size: 14px;
  }
  .sidebar-toggle {
    display: inline-flex;
    font-size: 12px;
    padding: 2px 6px;
  }
  .editor-header select {
    font-size: 12px;
    padding: 4px 8px;
  }
  .btn-run, .btn-debug {
    font-size: 11px;
    padding: 4px 10px;
  }
}
</style>
