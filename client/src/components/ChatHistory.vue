<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '../api'

interface Session {
  id: string
  title: string
  created_at: string
}

const emit = defineEmits<{
  'select-session': [id: string]
  'new-chat': []
}>()

const sessions = ref<Session[]>([])
const search = ref('')
const editingId = ref<string | null>(null)
const editingTitle = ref('')
const loading = ref(true)
const deletingId = ref<string | null>(null)

onMounted(async () => {
  await loadSessions()
})

async function loadSessions() {
  try {
    loading.value = true
    const { data } = await api.get('/chat/sessions')
    sessions.value = data.sessions || []
  } catch {
    sessions.value = []
  } finally {
    loading.value = false
  }
}

function filtered() {
  if (!search.value) return sessions.value
  const q = search.value.toLowerCase()
  return sessions.value.filter(s => s.title.toLowerCase().includes(q))
}

function startRename(s: Session) {
  editingId.value = s.id
  editingTitle.value = s.title
}

async function saveRename(s: Session) {
  if (editingTitle.value.trim()) {
    try {
      await api.patch(`/chat/sessions/${s.id}`, { title: editingTitle.value.trim() })
      s.title = editingTitle.value.trim()
    } catch { /* ignore */ }
  }
  editingId.value = null
}

function confirmDelete(id: string) {
  deletingId.value = id
}

async function doDelete() {
  if (!deletingId.value) return
  try {
    await api.delete(`/chat/sessions/${deletingId.value}`)
    sessions.value = sessions.value.filter(s => s.id !== deletingId.value)
    emit('new-chat')
  } catch { /* ignore */ }
  deletingId.value = null
}

function cancelDelete() {
  deletingId.value = null
}
</script>

<template>
  <div class="history-panel">
    <div class="history-search">
      <input
        v-model="search"
        type="text"
        placeholder="搜索对话..."
        class="search-input"
      />
    </div>
    <button class="new-chat-btn" @click="emit('new-chat')">+ 新建对话</button>
    <div class="session-list" v-if="!loading">
      <div v-if="filtered().length === 0" class="empty">暂无对话记录</div>
      <div
        v-for="s in filtered()"
        :key="s.id"
        class="session-item"
        @click="emit('select-session', s.id)"
      >
        <template v-if="editingId === s.id">
          <input
            v-model="editingTitle"
            class="rename-input"
            @blur="saveRename(s)"
            @keydown.enter="saveRename(s)"
            @click.stop
            autofocus
          />
        </template>
        <template v-else>
          <span class="session-title">{{ s.title }}</span>
          <span class="session-date">{{ s.created_at.slice(0, 10) }}</span>
          <div class="session-actions" @click.stop>
            <button class="action-btn" @click="startRename(s)" title="重命名">✎</button>
            <button class="action-btn danger" @click="confirmDelete(s.id)" title="删除">✕</button>
          </div>
        </template>
      </div>
    </div>
    <div v-else class="loading">加载中...</div>

    <!-- Confirm Dialog -->
    <div v-if="deletingId" class="confirm-overlay" @click.stop>
      <div class="confirm-box">
        <p>确定要删除这个对话吗？</p>
        <p class="confirm-sub">删除后无法恢复</p>
        <div class="confirm-actions">
          <button class="confirm-btn cancel" @click="cancelDelete">取消</button>
          <button class="confirm-btn ok" @click="doDelete">确定删除</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.history-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-card);
}
.history-search {
  padding: 10px;
}
.search-input {
  width: 100%;
  padding: 8px 10px;
  border-radius: 6px;
  border: 1px solid var(--bg-tertiary);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
}
.search-input:focus {
  border-color: var(--accent);
}
.new-chat-btn {
  margin: 0 10px 8px;
  padding: 8px;
  border-radius: 6px;
  border: 1px dashed var(--border-secondary);
  background: transparent;
  color: var(--accent);
  font-size: 13px;
  cursor: pointer;
}
.new-chat-btn:hover {
  background: rgba(137, 180, 250, 0.1);
}
.session-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px;
}
.empty, .loading {
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
  padding: 20px;
}
.session-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  margin-bottom: 2px;
  flex-wrap: wrap;
}
.session-item:hover {
  background: var(--bg-secondary);
}
.session-title {
  flex: 1;
  font-size: 13px;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.session-date {
  font-size: 11px;
  color: var(--text-muted);
}
.session-actions {
  display: none;
  gap: 2px;
}
.session-item:hover .session-actions {
  display: flex;
}
.action-btn {
  padding: 2px 6px;
  border-radius: 4px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
}
.action-btn:hover {
  background: var(--bg-tertiary);
}
.action-btn.danger:hover {
  color: #f38ba8;
}
.rename-input {
  flex: 1;
  padding: 4px 6px;
  border-radius: 4px;
  border: 1px solid var(--accent);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
}
.confirm-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
  z-index: 9999;
}
.confirm-box {
  background: var(--bg-secondary); padding: 24px 28px; border-radius: 12px;
  text-align: center; max-width: 320px; box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}
.confirm-box p { font-size: 15px; color: var(--text-primary); margin-bottom: 4px; }
.confirm-sub { font-size: 12px !important; color: var(--text-muted) !important; }
.confirm-actions { display: flex; gap: 10px; margin-top: 16px; justify-content: center; }
.confirm-btn {
  padding: 8px 20px; border-radius: 8px; border: none; font-size: 13px; cursor: pointer;
}
.confirm-btn.cancel { background: var(--bg-tertiary); color: var(--text-primary); }
.confirm-btn.ok { background: var(--danger); color: #fff; }
</style>
