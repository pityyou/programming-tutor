<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { languages, cards, bilibiliUrl } from "../data/knowledge"

const emit = defineEmits<{
  'ask-ai': [prompt: string]
  'open-in-editor': [code: string, language: string]
}>()


const selectedLang = ref('python')
const expandedTopics = ref<Record<string, boolean>>({})

onMounted(() => {
  const nav = localStorage.getItem('nav_to_knowledge')
  if (nav) {
    try {
      const { lang, topic } = JSON.parse(nav)
      if (lang && cards[lang]) {
        selectedLang.value = lang
        const idx = (cards[lang] || []).findIndex((g: any) =>
          g.items.some((item: any) => item.title === topic)
        )
        if (idx >= 0) expandedTopics.value[`${lang}-${idx}`] = true
      }
    } catch { /* ignore */ }
    localStorage.removeItem('nav_to_knowledge')
  }
})

function toggleTopic(lang: string, idx: number) {
  const key = `${lang}-${idx}`
  expandedTopics.value[key] = !expandedTopics.value[key]
}

function isExpanded(lang: string, idx: number) {
  return expandedTopics.value[`${lang}-${idx}`] ?? false
}

const currentCards = computed(() => cards[selectedLang.value] || [])
</script>

<template>
  <div class="cards-panel">
    <div class="lang-tabs">
      <button
        v-for="lang in languages"
        :key="lang.value"
        :class="['lang-tab', { active: selectedLang === lang.value }]"
        @click="selectedLang = lang.value"
      >
        {{ lang.icon }} {{ lang.label }}
      </button>
    </div>
    <div class="topics-list">
      <div v-for="(group, idx) in currentCards" :key="group.topic" class="topic-group">
        <div
          :class="['topic-header', { open: isExpanded(selectedLang, idx) }]"
          @click="toggleTopic(selectedLang, idx)"
        >
          <span class="arrow">{{ isExpanded(selectedLang, idx) ? '▾' : '▸' }}</span>
          <span class="topic-name">{{ group.topic }}</span>
          <span class="count">{{ group.items.length }}</span>
        </div>
        <div v-if="isExpanded(selectedLang, idx)" class="topic-items">
          <div v-for="item in group.items" :key="item.id" class="card-item">
            <div class="card-title">{{ item.title }}</div>
            <div class="card-content" v-html="item.content"></div>
            <div class="card-actions">
              <button class="card-btn ai-btn" @click="emit('ask-ai', `请详细讲解 ${item.language} 的 ${item.title}，并给出更多示例`)">
                💬 问 AI
              </button>
              <button class="card-btn run-btn" @click="emit('open-in-editor', item.example, item.language)">
                ▶ 运行
              </button>
              <a :href="bilibiliUrl(`${item.language} ${item.title} 教程`)" target="_blank" class="card-btn video-btn">
                📺 视频
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cards-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg-card);
}
.lang-tabs {
  display: flex;
  gap: 2px;
  padding: 8px;
  flex-wrap: wrap;
}
.lang-tab {
  padding: 5px 10px;
  border-radius: 4px;
  border: 1px solid var(--bg-tertiary);
  background: transparent;
  color: var(--text-secondary);
  font-size: 12px;
  cursor: pointer;
}
.lang-tab.active {
  background: var(--accent);
  color: var(--bg-primary);
  border-color: var(--accent);
}
.topics-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 8px 8px;
}
.topic-group {
  margin-bottom: 4px;
}
.topic-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary);
}
.topic-header:hover { background: var(--bg-secondary); }
.topic-header.open { background: var(--bg-secondary); }
.arrow { font-size: 10px; width: 12px; }
.topic-name { flex: 1; }
.count {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg-tertiary);
  padding: 1px 6px;
  border-radius: 8px;
}
.topic-items { padding-left: 16px; }
.card-item {
  background: var(--bg-primary);
  border: 1px solid var(--bg-secondary);
  border-radius: 8px;
  padding: 10px;
  margin: 4px 0;
}
.card-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 6px;
}
.card-content {
  font-size: 12px;
  color: #bac2de;
  line-height: 1.6;
}
.card-actions {
  display: flex;
  gap: 6px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.card-btn {
  padding: 4px 10px;
  border-radius: 4px;
  border: 1px solid var(--border-secondary);
  font-size: 11px;
  cursor: pointer;
  text-decoration: none;
  display: inline-block;
  background: var(--bg-secondary);
  color: var(--text-primary);
}
.card-btn:hover { filter: brightness(1.2); }
.ai-btn { border-color: var(--accent); color: var(--accent); }
.run-btn { border-color: #a6e3a1; color: #a6e3a1; }
.video-btn { border-color: #f38ba8; color: #f38ba8; }
.video-btn:hover { background: #f38ba822; }
</style>
