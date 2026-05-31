<script setup lang="ts">
const props = defineProps<{
  userCode: string
  aiCode: string
  language: string
}>()

function diffLines(user: string, ai: string) {
  const uLines = user.split('\n')
  const aLines = ai.split('\n')
  const result: { left: string; right: string; type: 'same' | 'diff' | 'added' | 'removed' }[] = []

  const maxLen = Math.max(uLines.length, aLines.length)
  for (let i = 0; i < maxLen; i++) {
    const ul = uLines[i] || ''
    const al = aLines[i] || ''
    if (ul === al) {
      result.push({ left: ul, right: al, type: 'same' })
    } else if (!ul && al) {
      result.push({ left: '', right: al, type: 'added' })
    } else if (ul && !al) {
      result.push({ left: ul, right: '', type: 'removed' })
    } else {
      result.push({ left: ul, right: al, type: 'diff' })
    }
  }
  return result
}

const rows = diffLines(props.userCode, props.aiCode)
</script>

<template>
  <div class="diff-container">
    <div class="diff-header">
      <span class="diff-col-label left-label">我的代码</span>
      <span class="diff-col-label right-label">AI 参考答案</span>
    </div>
    <div class="diff-table">
      <div
        v-for="(row, i) in rows"
        :key="i"
        :class="['diff-row', row.type]"
      >
        <pre class="diff-cell left">{{ row.left }}</pre>
        <pre class="diff-cell right">{{ row.right }}</pre>
      </div>
    </div>
  </div>
</template>

<style scoped>
.diff-container {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--border-primary);
}
.diff-header {
  display: flex;
  background: var(--bg-tertiary);
}
.diff-col-label {
  flex: 1;
  padding: 8px 12px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-align: center;
}
.left-label { border-right: 1px solid var(--border-primary); }
.diff-table {
  font-family: 'Fira Code', Consolas, monospace;
  font-size: 12px;
  line-height: 1.6;
}
.diff-row {
  display: flex;
}
.diff-cell {
  flex: 1;
  padding: 2px 12px;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-all;
}
.left { border-right: 1px solid var(--border-primary); }
.diff-row.same { background: transparent; }
.diff-row.diff { background: rgba(250, 179, 135, 0.15); }
.diff-row.diff .left { color: var(--warning); }
.diff-row.diff .right { color: var(--success); }
.diff-row.added { background: rgba(166, 227, 161, 0.1); }
.diff-row.added .right { color: var(--success); }
.diff-row.removed { background: rgba(243, 139, 168, 0.1); }
.diff-row.removed .left { color: var(--danger); }
</style>
