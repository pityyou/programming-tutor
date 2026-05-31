<script setup lang="ts">
import { ref, watch } from 'vue'
import { sendMessage, executeCode } from '../api/chat'
import CodeDiff from './CodeDiff.vue'

const props = defineProps<{ language: string }>()
const emit = defineEmits<{
  'set-code': [code: string]
  'show-in-chat': [content: string]
  'bookmark-exercise': [title: string, content: string]
}>()

const difficulty = ref('easy')
const topic = ref('')
const exercise = ref('')
const loading = ref(false)
const userCode = ref('')
const result = ref('')
const resultError = ref('')
const submitting = ref(false)
const hints = ref<string[]>([])
const hintIndex = ref(0)
const generated = ref(false)
const aiAnswer = ref('')
const showDiff = ref(false)
const gettingAnswer = ref(false)

async function generateExercise() {
  loading.value = true
  generated.value = false
  exercise.value = ''
  result.value = ''
  resultError.value = ''
  hints.value = []
  hintIndex.value = 0
  userCode.value = ''

  const prompt = `请为正在学习${props.language}的学生出一道编程练习题。
难度：${difficulty.value === 'easy' ? '简单' : difficulty.value === 'medium' ? '中等' : '困难'}
${topic.value ? `主题/知识点：${topic.value}` : '默认基础语法'}
语言：${props.language}

要求：
1. 给出题目描述（包含输入输出说明和示例）
2. 给出2-3个测试用例（输入→预期输出）
3. 给出3个分级提示（从模糊引导到具体方向，不直接给答案，标记为[提示1][提示2][提示3]）
4. 不要给出完整答案代码

格式：
## 题目
(题目描述)

## 测试用例
- 输入: xxx → 预期输出: xxx
- 输入: xxx → 预期输出: xxx

## 提示
[提示1] ...
[提示2] ...
[提示3] ...`

  try {
    let full = ''
    await sendMessage(
      { messages: [{ role: 'user', content: prompt }], provider: 'deepseek', model: 'deepseek-chat' },
      (chunk) => { full += chunk }
    )
    const parts = full.split('## 提示')
    exercise.value = parts[0]?.replace('## 题目', '').replace('## 测试用例', '').trim() || full
    if (parts[1]) {
      hints.value = parts[1].split(/\[提示\d+\]/).filter(s => s.trim()).map(s => s.trim())
    }
    generated.value = true
    // Show exercise in chat area
    const chatContent = `📝 **练习题**（${props.language} | 难度：${difficulty.value === 'easy' ? '简单' : difficulty.value === 'medium' ? '中等' : '困难'}）\n\n${full}`
    emit('show-in-chat', chatContent)
  } catch (e: any) {
    exercise.value = '生成题目失败: ' + e.message
  } finally {
    loading.value = false
  }
}

async function submitCode() {
  if (!userCode.value.trim()) return
  submitting.value = true
  result.value = ''
  resultError.value = ''

  try {
    const res = await executeCode(props.language, userCode.value, '')
    result.value = res.data.output || '(无输出)'
    resultError.value = res.data.error || ''
  } catch (e: any) {
    resultError.value = e.response?.data?.error || e.message || '执行失败'
  } finally {
    submitting.value = false
  }
}

async function checkAnswer() {
  if (!userCode.value.trim() || !exercise.value) return
  submitting.value = true
  const prompt = `下面是一道编程题和学生的答案，请评测是否正确。

题目：
${exercise.value}

学生的代码 (${props.language})：
\`\`\`${props.language}
${userCode.value}
\`\`\`

执行输出：
${result.value}
${resultError.value ? '错误：' + resultError.value : ''}

请简短评价（不超过200字）：是否正确？哪里有问题？给出改进建议。不要直接给出完整答案。`

  try {
    let full = ''
    await sendMessage(
      { messages: [{ role: 'user', content: prompt }], provider: 'deepseek', model: 'deepseek-chat' },
      (chunk) => { full += chunk }
    )
    result.value = (result.value || '') + '\n\n--- AI 评测 ---\n' + full
  } catch {
    // ignore
  } finally {
    submitting.value = false
  }
}

function showHint() {
  if (hintIndex.value < hints.value.length) {
    hintIndex.value++
  }
}

function openInEditor() {
  emit('set-code', userCode.value)
}

async function getAiAnswer() {
  gettingAnswer.value = true
  const prompt = `请为下面的编程题给出参考答案代码（仅${props.language}代码块，无需解释）：\n${exercise.value}`
  try {
    let full = ''
    await sendMessage(
      { messages: [{ role: 'user', content: prompt }], provider: 'deepseek', model: 'deepseek-chat' },
      (chunk) => { full += chunk }
    )
    const m = full.match(/```[\w]*\n?([\s\S]*?)```/)
    aiAnswer.value = m ? m[1].trim() : full.trim()
    showDiff.value = true
  } catch {
    aiAnswer.value = '获取参考答案失败'
  } finally {
    gettingAnswer.value = false
  }
}
</script>

<template>
  <div class="exercise-panel">
    <div class="exercise-generator">
      <div class="gen-row">
        <select v-model="difficulty" class="gen-select">
          <option value="easy">简单</option>
          <option value="medium">中等</option>
          <option value="hard">困难</option>
        </select>
        <input
          v-model="topic"
          type="text"
          placeholder="输入主题（可选）..."
          class="gen-input"
        />
        <button @click="generateExercise" :disabled="loading" class="gen-btn">
          {{ loading ? '生成中...' : 'AI 出题' }}
        </button>
      </div>
    </div>

    <div v-if="exercise" class="exercise-content">
      <div class="exercise-desc" v-html="exercise.replace(/\n/g, '<br>')"></div>

      <div v-if="hints.length > 0 && hintIndex > 0" class="hints-section">
        <div v-for="(h, i) in hints.slice(0, hintIndex)" :key="i" class="hint-item">
          💡 提示{{ i + 1 }}：{{ h }}
        </div>
      </div>

      <div class="solution-area">
        <textarea
          v-model="userCode"
          :placeholder="`用 ${language} 编写你的答案...`"
          class="solution-editor"
          rows="8"
        ></textarea>
        <div class="solution-actions">
          <button @click="submitCode" :disabled="submitting" class="sol-btn run-btn">
            ▶ 运行
          </button>
          <button @click="checkAnswer" :disabled="submitting || !result" class="sol-btn check-btn">
            🤖 AI 评测
          </button>
          <button @click="showHint" :disabled="hintIndex >= hints.length" class="sol-btn hint-btn">
            💡 看提示 ({{ hints.length - hintIndex }})
          </button>
          <button @click="openInEditor" class="sol-btn edit-btn">
            📝 在编辑器中打开
          </button>
          <button
            v-if="exercise"
            @click="emit('bookmark-exercise', topic || '练习题', exercise)"
            class="sol-btn save-btn"
          >
            ⭐ 收藏题目
          </button>
          <button
            v-if="exercise && userCode"
            @click="getAiAnswer"
            :disabled="gettingAnswer"
            class="sol-btn answer-btn"
          >
            {{ gettingAnswer ? '获取中...' : '🤖 AI 参考答案' }}
          </button>
        </div>
        <div v-if="showDiff && aiAnswer" class="diff-section">
          <CodeDiff
            :user-code="userCode"
            :ai-code="aiAnswer"
            :language="language"
          />
        </div>
      </div>

      <div v-if="result || resultError" class="result-panel">
        <div v-if="result">
          <div class="result-label">输出:</div>
          <pre>{{ result }}</pre>
        </div>
        <div v-if="resultError" class="error-output">
          <div class="result-label">错误:</div>
          <pre>{{ resultError }}</pre>
        </div>
      </div>
    </div>

    <div v-else-if="!loading" class="exercise-empty">
      <p>点击"AI 出题"生成一道编程练习题</p>
    </div>
  </div>
</template>

<style scoped>
.exercise-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
}
.exercise-generator {
  padding: 10px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--bg-secondary);
}
.gen-row {
  display: flex;
  gap: 8px;
}
.gen-select {
  padding: 7px 36px 7px 14px;
  border-radius: 8px;
  border: 1px solid var(--border-secondary);
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  outline: none;
  min-width: 80px;
}
.gen-input {
  flex: 1;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid var(--bg-tertiary);
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 13px;
  outline: none;
}
.gen-btn {
  padding: 6px 16px;
  border-radius: 6px;
  border: none;
  background: var(--accent);
  color: var(--bg-primary);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
}
.gen-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.exercise-content {
  flex: 1;
  padding: 12px;
  overflow-y: auto;
}
.exercise-desc {
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-primary);
  margin-bottom: 16px;
}
.hints-section {
  margin-bottom: 12px;
}
.hint-item {
  padding: 8px 12px;
  margin-bottom: 6px;
  border-radius: 6px;
  background: rgba(250, 179, 135, 0.1);
  border-left: 3px solid #fab387;
  font-size: 13px;
  color: #fab387;
  line-height: 1.5;
}
.solution-area {
  margin-bottom: 12px;
}
.solution-editor {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid var(--bg-tertiary);
  background: var(--bg-code);
  color: var(--text-primary);
  font-family: 'Fira Code', Consolas, monospace;
  font-size: 13px;
  resize: vertical;
  outline: none;
}
.solution-editor:focus {
  border-color: var(--accent);
}
.solution-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
}
.sol-btn {
  padding: 6px 14px;
  border-radius: 6px;
  border: none;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
.sol-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.run-btn { background: #a6e3a1; color: var(--bg-primary); }
.check-btn { background: var(--accent); color: var(--bg-primary); }
.hint-btn { background: #fab387; color: var(--bg-primary); }
.edit-btn { background: #cba6f7; color: var(--bg-primary); }
.save-btn { background: var(--yellow); color: var(--bg-primary); }
.answer-btn { background: var(--purple); color: var(--accent-text); }
.diff-section { margin-top: 12px; }
.result-panel {
  padding: 12px;
  background: var(--bg-code);
  border-radius: 8px;
  max-height: 200px;
  overflow-y: auto;
}
.result-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}
.result-panel pre {
  color: var(--text-primary);
  font-family: 'Fira Code', monospace;
  font-size: 13px;
  white-space: pre-wrap;
  margin: 0;
}
.error-output pre {
  color: #f38ba8;
}
.exercise-empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 14px;
}
</style>
