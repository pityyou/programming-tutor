<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../src/stores/app'
import { useThemeStore } from '../src/stores/theme'
import { sendMessage, executeCode, ChatMessage } from '../src/api/chat'
import { LANGUAGES, HELLO_WORLD } from '../src/api/constants'
import api from '../src/api'
import CodeEditor from '../src/components/CodeEditor.vue'

import MarkdownRenderer from '../src/components/MarkdownRenderer.vue'
import ChatHistory from '../src/components/ChatHistory.vue'
import KnowledgeCards from '../src/components/KnowledgeCards.vue'
import ExercisePanel from '../src/components/ExercisePanel.vue'
import VoiceInput from '../src/components/VoiceInput.vue'
import QuickCommands from '../src/components/QuickCommands.vue'

const router = useRouter()
const store = useAppStore()
const themeStore = useThemeStore()

if (!store.isLoggedIn) {
  router.replace('/login')
}

// Sidebar
const sidebarTab = ref<'history' | 'cards'>('history')
const sidebarOpen = ref(true)

// Chat
const messages = ref<ChatMessage[]>([])
const input = ref('')
const loading = ref(false)
const chatContainer = ref<HTMLElement | null>(null)
const currentSessionId = ref<string | null>(null)

// Editor
const savedLang = localStorage.getItem('editor_lang') || 'python'
const currentLanguage = ref(savedLang)
const savedCode = localStorage.getItem(`code_${savedLang}`)
const codeContent = ref(savedCode || HELLO_WORLD[savedLang] || '')
const codeOutput = ref('')
const codeError = ref('')
const stdinInput = ref('')
const editorTab = ref<'editor' | 'exercise'>('editor')

watch(currentLanguage, (lang) => {
  const saved = localStorage.getItem(`code_${lang}`)
  codeContent.value = saved || HELLO_WORLD[lang] || ''
  localStorage.setItem('editor_lang', lang)
})

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

function streamReply(userContent: string) {
  messages.value.push({ role: 'user', content: userContent })
  messages.value.push({ role: 'assistant', content: '' })
  const lastIdx = messages.value.length - 1
  scrollToBottom()
  loading.value = true

  let rawContent = ''
  let displayContent = ''
  let streamDone = false

  const typewriterTimer = setInterval(() => {
    if (displayContent.length < rawContent.length) {
      const remaining = rawContent.length - displayContent.length
      const step = Math.min(15, Math.max(1, Math.ceil(remaining / 6)))
      displayContent = rawContent.slice(0, displayContent.length + step)
      messages.value[lastIdx].content = displayContent
      scrollToBottom()
    } else if (streamDone) {
      clearInterval(typewriterTimer)
      loading.value = false
      saveCurrentSession()
    }
  }, 45)

  sendMessage(
    {
      messages: messages.value.slice(0, -1),
      provider: store.provider,
      model: store.model,
      language: currentLanguage.value,
    },
    (chunk) => {
      rawContent += chunk
    }
  )
    .then(() => { streamDone = true })
    .catch((e) => {
      clearInterval(typewriterTimer)
      messages.value[lastIdx].content = `错误: ${e.message || '请求失败'}`
      loading.value = false
    })
}

async function handleSend() {
  const text = input.value.trim()
  if (!text || loading.value) return
  input.value = ''
  streamReply(text)
}

async function saveCurrentSession() {
  if (messages.value.length < 2) return
  try {
    if (currentSessionId.value) {
      await api.delete(`/chat/sessions/${currentSessionId.value}`)
    }
    const { data } = await api.post('/chat/sessions', {
      title: messages.value[0]?.content?.slice(0, 30) || 'New Chat',
      messages: messages.value,
    })
    currentSessionId.value = data.sessionId
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
  api.get(`/chat/sessions/${id}`).then(({ data }) => {
    messages.value = data.messages || []
    currentSessionId.value = id
    scrollToBottom()
  }).catch(() => {})
}

function newChat() {
  messages.value = []
  currentSessionId.value = null
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
  } catch { /* ignore */ }
}

async function handleSaveSnippet(code: string, language: string) {
  try {
    await api.post('/snippets', { code, language, title: code.split('\n')[0].slice(0, 50) })
  } catch { /* ignore */ }
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
}
</script>

<template>
  <div class="chat-page">
    <header class="topbar">
      <div class="topbar-left">
        <button class="sidebar-toggle" @click="sidebarOpen = !sidebarOpen">
          {{ sidebarOpen ? '◁' : '▷' }}
        </button>
        <span class="logo">编程助学智能体</span>
      </div>
      <div class="topbar-right">
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

    <div class="main-area">
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
          @select-session="selectSession"
          @new-chat="newChat"
        />
        <KnowledgeCards
          v-else
          @ask-ai="handleAskAi"
          @open-in-editor="(code, lang) => handleOpenInEditor(code, lang)"
        />
      </div>

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
            <div class="msg-content">
              <template v-if="msg.role === 'user'">
                {{ msg.content }}
              </template>
              <MarkdownRenderer
                v-else
                :content="msg.content || '思考中...'"
                @open-in-editor="handleOpenInEditor"
                @save-snippet="handleSaveSnippet"
              />
            </div>
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
            placeholder="输入你的问题，如：解释 Python 的装饰器...（Enter 发送，Shift+Enter 换行）"
            @keydown.enter.prevent="handleSend"
            @keydown.shift.enter.prevent="input += '\n'"
            :disabled="loading"
            rows="2"
            class="chat-textarea"
          ></textarea>
          <button @click="handleSend" :disabled="loading || !input.trim()" class="send-btn">发送</button>
        </div>
      </div>

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
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* Sidebar */
.sidebar {
  width: 260px;
  border-right: 1px solid var(--bg-tertiary);
  flex-shrink: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
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
  width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--bg-tertiary);
  min-width: 300px;
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
.message { margin-bottom: 16px; animation: fadeInUp 0.25s ease; }
.message.user { text-align: right; }
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

/* Editor */
.editor-panel {
  width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
  min-width: 350px;
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

/* Responsive: Tablet */
@media (max-width: 1024px) {
  .sidebar { width: 200px; }
  .chat-panel { min-width: 220px; }
  .editor-panel { min-width: 250px; }
}

/* Responsive: Mobile */
@media (max-width: 768px) {
  .main-area {
    flex-direction: column;
  }
  .sidebar {
    width: 100%;
    max-height: 25vh;
    border-right: none;
    border-bottom: 1px solid var(--bg-tertiary);
  }
  .chat-panel {
    flex: 1 1 40%;
    min-width: 0;
    border-right: none;
  }
  .editor-panel {
    flex: 1 1 auto;
    min-width: 0;
    min-height: 35vh;
    border-top: 1px solid var(--bg-tertiary);
  }
  .topbar {
    flex-wrap: wrap;
    gap: 6px;
    padding: 8px 10px;
  }
  .topbar-right {
    gap: 4px;
  }
  .top-btn {
    font-size: 11px;
    padding: 3px 8px;
  }
  .user-info {
    display: none;
  }
  .logo {
    font-size: 14px;
  }
  .sidebar-toggle {
    display: none;
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
