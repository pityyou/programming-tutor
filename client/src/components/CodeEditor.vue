<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
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

const langMap: Record<string, string> = {
  python: 'python',
  javascript: 'javascript',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  csharp: 'csharp',
  go: 'go',
}

function getMonacoTheme() {
  return themeStore.mode === 'light' ? 'vs' : 'vs-dark'
}

onMounted(async () => {
  monacoModule = await import('monaco-editor')
  if (editorEl.value) {
    editor = monacoModule.editor.create(editorEl.value, {
      value: props.modelValue,
      language: langMap[props.language] || 'python',
      theme: getMonacoTheme(),
      fontSize: 14,
      fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
      minimap: { enabled: false },
      automaticLayout: true,
      scrollBeyondLastLine: false,
      lineNumbers: 'on',
      tabSize: 4,
    })
    editor.onDidChangeModelContent(() => {
      emit('update:modelValue', editor.getValue())
    })
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
</script>

<template>
  <div ref="editorEl" class="monaco-editor"></div>
</template>

<style scoped>
.monaco-editor {
  flex: 1;
  min-height: 0;
}
</style>
