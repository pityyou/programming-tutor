<script setup lang="ts">
import { ref, watch } from 'vue'
import { sendMessage, executeCode } from '../api/chat'
import { savePractice, updatePractice } from '../api/practice'
import CodeDiff from './CodeDiff.vue'
import MarkdownRenderer from './MarkdownRenderer.vue'
import api from '../api'

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

interface TestCase {
  input: string
  expected: string
}
interface TestResult {
  index: number
  input: string
  expected: string
  actual: string
  passed: boolean
  error?: string
}

const testCases = ref<TestCase[]>([])
const testResults = ref<TestResult[] | null>(null)
const passedCount = ref(0)
// 当前题目已保存的练习记录 id：同一题重复提交时覆盖而非新增
const currentRecordId = ref<string | null>(null)

watch(() => props.language, () => {
  // Language switched: reset the exercise state
  exercise.value = ''
  generated.value = false
  testCases.value = []
  testResults.value = null
  currentRecordId.value = null
  hints.value = []
  hintIndex.value = 0
  userCode.value = ''
  result.value = ''
  resultError.value = ''
})

const difficultyLabel = () =>
  difficulty.value === 'easy' ? '简单' : difficulty.value === 'medium' ? '中等' : '困难'

// Parse test cases from the LLM-generated exercise text. Expected format:
//   - 输入: 1 2 → 预期输出: 3
//   - Input: 5 => Output: 25
function parseTestCases(text: string): TestCase[] {
  const cases: TestCase[] = []
  for (const line of text.split('\n')) {
    const m = line.match(
      /^\s*[-*•]?\s*(?:输入|Input)\s*[:：]\s*(.*?)\s*(?:→|->|=>|⟶|==>)\s*(?:预期输出|期望输出|Output)\s*[:：]\s*(.*)$/i
    )
    if (m && (m[1].trim() || m[2].trim())) {
      cases.push({ input: m[1].trim(), expected: m[2].trim() })
    }
  }
  return cases.slice(0, 20)
}

async function generateExercise() {
  loading.value = true
  generated.value = false
  exercise.value = ''
  result.value = ''
  resultError.value = ''
  hints.value = []
  hintIndex.value = 0
  userCode.value = ''
  testCases.value = []
  testResults.value = null
  currentRecordId.value = null // 新题目 → 新记录

  const prompt = `请为正在学习${props.language}的学生出一道编程练习题。
难度：${difficultyLabel()}
${topic.value ? `主题/知识点：${topic.value}` : '默认基础语法'}
语言：${props.language}

要求：
1. 给出题目描述（包含输入输出说明和示例）
2. 给出3个测试用例，格式必须严格为：\n- 输入: xxx → 预期输出: xxx\n（每个测试用例单独一行，不要用其他格式）
3. 给出3个分级提示（从模糊引导到具体方向，不直接给答案，标记为[提示1][提示2][提示3]）
4. 不要给出完整答案代码

格式：
## 题目
(题目描述)

## 测试用例
- 输入: xxx → 预期输出: xxx
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
    // Extract test cases from the "测试用例" section (or the whole text as fallback)
    const testSection = parts[0]?.split('## 测试用例')[1] || full
    testCases.value = parseTestCases(testSection)
    generated.value = true
    // Show exercise in chat area
    const chatContent = `📝 **练习题**（${props.language} | 难度：${difficultyLabel()}）\n\n${full}`
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
  testResults.value = null

  try {
    if (testCases.value.length > 0) {
      // Auto-judge against the extracted test cases
      const res = await api.post('/execute/test', {
        language: props.language,
        code: userCode.value,
        tests: testCases.value,
      })
      const results: TestResult[] = res.data.results || []
      testResults.value = results
      passedCount.value = results.filter(r => r.passed).length
      const total = results.length
      if (passedCount.value === total) {
        result.value = `✅ 全部通过！${passedCount.value}/${total} 个测试用例`
      } else {
        result.value = `❌ 通过 ${passedCount.value}/${total} 个测试用例`
      }
    } else {
      const res = await executeCode(props.language, userCode.value, '')
      result.value = res.data.output || '(无输出)'
      resultError.value = res.data.error || ''
    }
    // Auto-save the practice record (for the wrong-question review in dashboard)
    autoSaveRecord()
  } catch (e: any) {
    resultError.value = e.response?.data?.error || e.message || '执行失败'
  } finally {
    submitting.value = false
  }
}

function autoSaveRecord() {
  if (!exercise.value) return
  // 有测试用例时以判题结果为准；无测试用例（只是运行）不能算"通过"
  const passed = testCases.value.length > 0
    ? (testResults.value?.every(r => r.passed) ?? false)
    : false
  const payload = {
    userCode: userCode.value,
    results: testResults.value || undefined,
    passed,
  }
  try {
    if (currentRecordId.value) {
      // 同一题重复提交 → 覆盖原记录，避免错题本被同一道题刷屏
      updatePractice(currentRecordId.value, payload).catch(() => { /* ignore */ })
      return
    }
    savePractice({
      language: props.language,
      difficulty: difficulty.value,
      topic: topic.value,
      exercise: exercise.value,
      ...payload,
    })
      .then(({ data }) => { currentRecordId.value = data.id })
      .catch(() => { /* ignore */ })
  } catch { /* ignore */ }
}

async function checkAnswer() {
  if (!userCode.value.trim() || !exercise.value) return
  submitting.value = true

  const testSummary = testResults.value && testResults.value.length > 0
    ? testResults.value.map(r =>
        `用例${r.index}: 输入=${r.input} → 预期=${r.expected} → 实际=${r.actual || r.error || '(无输出)'} → ${r.passed ? '通过' : '未通过'}`
      ).join('\n')
    : `${result.value || '(无输出)'}${resultError.value ? '\n错误：' + resultError.value : ''}`

  const prompt = `下面是一道编程题和学生的答案，请评测是否正确。

题目：
${exercise.value}

学生的代码 (${props.language})：
\`\`\`${props.language}
${userCode.value}
\`\`\`

测试用例执行结果：
${testSummary}

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
      <div class="exercise-desc">
        <MarkdownRenderer :content="exercise" />
      </div>

      <div v-if="testCases.length > 0" class="cases-section">
        <div class="cases-label">测试用例</div>
        <div v-for="(tc, i) in testCases" :key="i" class="case-item">
          <span class="case-input">输入: {{ tc.input }}</span>
          <span class="case-arrow">→</span>
          <span class="case-expected">预期: {{ tc.expected }}</span>
        </div>
      </div>

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
            ▶ 运行{{ testCases.length > 0 ? '判题' : '' }}
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

        <div v-if="testResults && testResults.length > 0" class="test-results">
          <div
            v-for="r in testResults"
            :key="r.index"
            :class="['test-row', r.passed ? 'pass' : 'fail']"
          >
            <span class="test-badge">{{ r.passed ? '✅' : '❌' }}</span>
            <span class="test-detail">输入: {{ r.input }}</span>
            <span class="test-detail">预期: {{ r.expected }}</span>
            <span class="test-detail">实际: {{ r.error || r.actual || '(无输出)' }}</span>
          </div>
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
.cases-section {
  margin-bottom: 12px;
}
.cases-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 6px;
  font-weight: 600;
}
.case-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  margin-bottom: 4px;
  border-radius: 6px;
  background: var(--bg-secondary);
  font-family: 'Fira Code', Consolas, monospace;
  font-size: 12px;
  flex-wrap: wrap;
}
.case-input { color: var(--text-primary); }
.case-arrow { color: var(--text-muted); }
.case-expected { color: var(--success); }
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
.test-results {
  margin-top: 10px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-primary);
}
.test-row {
  display: flex;
  gap: 12px;
  align-items: baseline;
  padding: 8px 12px;
  font-family: 'Fira Code', Consolas, monospace;
  font-size: 12px;
  flex-wrap: wrap;
}
.test-row.pass { background: rgba(166, 227, 161, 0.08); }
.test-row.fail { background: rgba(243, 139, 168, 0.08); }
.test-row + .test-row { border-top: 1px solid var(--border-primary); }
.test-badge { flex-shrink: 0; }
.test-detail { color: var(--text-primary); }
.test-row.fail .test-detail { color: var(--danger); }
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
