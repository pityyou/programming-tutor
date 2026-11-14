<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useThemeStore } from '../stores/theme'

const props = defineProps<{
  modelValue: string
  language: string
}>()

const emit = defineEmits<{
  'update:modelValue': [v: string]
}>()

const themeStore = useThemeStore()
const editorEl = ref<HTMLElement | null>(null)
let editor: any = null
let monacoModule: any = null

/**
 * 手机/平板等触屏设备上 Monaco 的软键盘输入体验很差（经常无法输入），
 * 这里自动降级为原生 textarea：可靠可用，同时省掉 3.3MB 的 Monaco 加载。
 */
const coarseMedia = window.matchMedia ? window.matchMedia('(pointer: coarse)') : null
const useFallback = ref(coarseMedia ? coarseMedia.matches : false)

const langMap: Record<string, string> = {
  python: 'python',
  javascript: 'javascript',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  go: 'go',
}

function getMonacoTheme() {
  return themeStore.mode === 'light' ? 'vs' : 'vs-dark'
}

function initMonaco() {
  if (editor || !editorEl.value) return
  import('monaco-editor').then((m) => {
    if (!editorEl.value) return
    monacoModule = m
    createEditor(m)
  })
}

function createEditor(m: any) {
  if (!editorEl.value) return
  const isSmall = window.matchMedia('(max-width: 768px)').matches
  editor = m.editor.create(editorEl.value, {
    value: props.modelValue,
    language: langMap[props.language] || 'python',
    theme: getMonacoTheme(),
    fontSize: isSmall ? 13 : 14,
    fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
    minimap: { enabled: false },
    automaticLayout: true,
    scrollBeyondLastLine: false,
    lineNumbers: 'on',
    wordWrap: isSmall ? 'on' : 'off',
    tabSize: 4,
  })
  editor.onDidChangeModelContent(() => {
    emit('update:modelValue', editor.getValue())
  })
}

function onFallbackInput(e: Event) {
  emit('update:modelValue', (e.target as HTMLTextAreaElement).value)
}

onMounted(() => {
  if (useFallback.value) {
    if (coarseMedia) {
      coarseMedia.addEventListener('change', onCoarseChange)
    }
  } else {
    initMonaco()
  }
})

function onCoarseChange(e: MediaQueryListEvent) {
  useFallback.value = e.matches
}

watch(useFallback, (fallback) => {
  if (fallback) {
    editor?.dispose()
    editor = null
  } else {
    nextTick(() => initMonaco())
  }
})

watch(() => props.language, (lang) => {
  if (editor && monacoModule) {
    const lid = langMap[lang] || 'python'
    monacoModule.editor.setModelLanguage(editor.getModel(), lid)
  }
})

watch(() => props.modelValue, (val) => {
  if (editor && val !== editor.getValue()) {
    editor.setValue(val)
  }
})

watch(() => themeStore.mode, () => {
  if (editor && monacoModule) {
    monacoModule.editor.setTheme(getMonacoTheme())
  }
})

// 卸载时销毁编辑器实例，避免反复展开/收起造成内存泄漏
onUnmounted(() => {
  editor?.dispose()
  editor = null
  monacoModule = null
  if (coarseMedia) coarseMedia.removeEventListener('change', onCoarseChange)
})
</script>

<template>
  <!-- 触屏设备：原生 textarea 兜底（Monaco 在手机上无法可靠输入） -->
  <textarea
    v-if="useFallback"
    class="mobile-code"
    :value="modelValue"
    spellcheck="false"
    autocapitalize="off"
    autocorrect="off"
    @input="onFallbackInput"
  ></textarea>
  <div v-else ref="editorEl" class="monaco-editor"></div>
</template>

<style scoped>
.monaco-editor {
  flex: 1;
  min-height: 0;
}
.mobile-code {
  flex: 1;
  min-height: 0;
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: none;
  outline: none;
  resize: none;
  background: var(--bg-code, #1e1e2e);
  color: var(--text-primary, #cdd6f4);
  font-family: 'Fira Code', 'Cascadia Code', Consolas, monospace;
  font-size: 16px; /* 16px 防止 iOS 聚焦时自动放大页面 */
  line-height: 1.6;
  white-space: pre;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  tab-size: 4;
}
</style>
