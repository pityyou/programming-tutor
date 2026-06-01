<script setup lang="ts">
import { ref } from 'vue'

const emit = defineEmits<{
  command: [text: string]
}>()

const showPanel = ref(false)

const groups = [
  {
    label: '学习辅助',
    icon: '📝',
    commands: [
      { label: '学习总结', prompt: '请根据我们今天的对话，帮我做一个学习总结，包括学到的知识点、需要复习的地方' },
      { label: '知识点梳理', prompt: '请帮我梳理当前学过的知识点，画出知识点之间的关系' },
      { label: '制作思维导图', prompt: '请用Markdown格式帮我为本节课的内容制作一个思维导图' },
    ],
  },
  {
    label: '作业辅导',
    icon: '📖',
    commands: [
      { label: '帮我解题', prompt: '请帮我分析这道题应该怎么做，先引导我思考，不要直接给答案' },
      { label: '添加注释', prompt: '请帮我把这段代码加上详细的注释' },
      { label: '代码审查', prompt: '请帮我审查这段代码，看看有没有bug、性能问题或不规范的地方' },
    ],
  },
  {
    label: '练习',
    icon: '🎯',
    commands: [
      { label: '出编程题', prompt: '请根据我当前学习的知识点，出一道编程练习题' },
      { label: '出选择题', prompt: '请出3道选择题来考察我对这个知识点的理解程度' },
      { label: '考我这个知识点', prompt: '来考考我最近学的内容，出题让我回答' },
    ],
  },
  {
    label: '代码操作',
    icon: '🔄',
    commands: [
      { label: '解释这段代码', prompt: '请逐行解释这段代码的作用' },
      { label: '优化代码', prompt: '请帮我优化这段代码，提高效率或可读性' },
      { label: '转为其他语言', prompt: '请帮我把这段代码转换成其他编程语言的写法' },
    ],
  },
  {
    label: '复习',
    icon: '📊',
    commands: [
      { label: '今日复习', prompt: '请帮我做一个今日复习计划，回顾今天学的主要内容' },
      { label: '错题回顾', prompt: '请帮我回顾之前的错误，总结经常犯的问题类型' },
      { label: '学习周报', prompt: '请根据我这一周的学习情况，生成一份学习周报' },
    ],
  },
]

</script>

<template>
  <div class="qc-wrap">
    <button class="qc-toggle" @click="showPanel = !showPanel">
      ⚡ 快捷指令
    </button>
    <div v-show="showPanel" class="qc-panel">
      <div v-for="g in groups" :key="g.label" class="qc-group">
        <div class="qc-group-label">{{ g.icon }} {{ g.label }}</div>
        <div class="qc-buttons">
          <button
            v-for="c in g.commands"
            :key="c.label"
            class="qc-btn"
            @click="emit('command', c.prompt); showPanel = false"
          >
            {{ c.label }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.qc-wrap {
  flex-shrink: 0;
}
.qc-toggle {
  padding: 4px 12px;
  border-radius: 6px;
  border: 1px solid var(--border-secondary);
  background: var(--bg-secondary);
  color: var(--accent);
  font-size: 12px;
  cursor: pointer;
  margin: 0 16px 4px;
}
.qc-toggle:hover {
  background: var(--bg-tertiary);
}
.qc-panel {
  padding: 10px 16px;
  border-top: 1px solid var(--border-primary);
  background: var(--bg-secondary);
  max-height: 220px;
  overflow-y: auto;
}
.qc-group {
  margin-bottom: 10px;
}
.qc-group-label {
  font-size: 11px;
  color: var(--text-muted);
  margin-bottom: 4px;
}
.qc-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.qc-btn {
  padding: 3px 10px;
  border-radius: 12px;
  border: 1px solid var(--border-secondary);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 11px;
  cursor: pointer;
  white-space: nowrap;
}
.qc-btn:hover {
  background: var(--accent);
  color: var(--accent-text);
  border-color: var(--accent);
}
</style>
