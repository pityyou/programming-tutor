<script setup lang="ts">
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/core'
import python from 'highlight.js/lib/languages/python'
import javascript from 'highlight.js/lib/languages/javascript'
import java from 'highlight.js/lib/languages/java'
import cpp from 'highlight.js/lib/languages/cpp'
import c from 'highlight.js/lib/languages/c'
import csharp from 'highlight.js/lib/languages/csharp'
import go from 'highlight.js/lib/languages/go'
import bash from 'highlight.js/lib/languages/bash'

hljs.registerLanguage('python', python)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('java', java)
hljs.registerLanguage('cpp', cpp)
hljs.registerLanguage('c', c)
hljs.registerLanguage('csharp', csharp)
hljs.registerLanguage('go', go)
hljs.registerLanguage('bash', bash)

const emit = defineEmits<{
  'copy-code': [code: string]
  'open-in-editor': [code: string]
  'save-snippet': [code: string, language: string]
}>()

const props = defineProps<{ content: string }>()

const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
  highlight(str: string, lang: string) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="code-block-wrapper"><code class="hljs language-${lang}">${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value}</code><div class="code-actions"><span class="code-lang">${lang}</span><button class="code-btn copy-btn" data-code="${escapeHtml(str)}">复制</button><button class="code-btn edit-btn" data-code="${escapeHtml(str)}">打开</button><button class="code-btn save-btn" data-code="${escapeHtml(str)}" data-lang="${lang}">收藏</button></div></pre>`
      } catch {}
    }
    return `<pre class="code-block-wrapper"><code class="hljs">${escapeHtml(str)}</code><div class="code-actions"><span class="code-lang">text</span><button class="code-btn copy-btn" data-code="${escapeHtml(str)}">复制</button><button class="code-btn edit-btn" data-code="${escapeHtml(str)}">打开</button><button class="code-btn save-btn" data-code="${escapeHtml(str)}" data-lang="">收藏</button></div></pre>`
  },
})

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function rendered() {
  return md.render(props.content)
}

function handleClick(e: Event) {
  const btn = (e.target as HTMLElement).closest('.code-btn') as HTMLElement | null
  if (!btn) return
  const code = btn.dataset.code?.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"') || ''
  if (btn.classList.contains('copy-btn')) {
    navigator.clipboard.writeText(code).catch(() => {})
    btn.textContent = '已复制'
    setTimeout(() => { btn.textContent = '复制' }, 1500)
  } else if (btn.classList.contains('edit-btn')) {
    emit('open-in-editor', code)
  } else if (btn.classList.contains('save-btn')) {
    const lang = (btn as HTMLElement).dataset.lang || ''
    emit('save-snippet', code, lang)
    btn.textContent = '已收藏'
    setTimeout(() => { btn.textContent = '收藏' }, 1500)
  }
}
</script>

<template>
  <div class="markdown-body" v-html="rendered()" @click="handleClick"></div>
</template>

<style>
.markdown-body {
  line-height: 1.7;
  word-break: break-word;
}
.markdown-body p {
  margin-bottom: 8px;
}
.markdown-body strong {
  font-weight: 700;
  color: var(--pink);
}
.markdown-body em {
  font-style: italic;
  color: var(--warning);
}
.markdown-body ul, .markdown-body ol {
  padding-left: 20px;
  margin: 8px 0;
}
.markdown-body li {
  margin-bottom: 4px;
}
.markdown-body blockquote {
  border-left: 3px solid var(--accent);
  padding: 4px 12px;
  margin: 12px 0;
  background: rgba(137, 180, 250, 0.08);
  border-radius: 0 6px 6px 0;
}
.markdown-body h1, .markdown-body h2, .markdown-body h3 {
  color: var(--accent);
  margin: 16px 0 8px;
}
.markdown-body hr {
  border: none;
  border-top: 1px solid var(--border-secondary);
  margin: 16px 0;
}
.markdown-body table {
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
}
.markdown-body th, .markdown-body td {
  border: 1px solid var(--border-secondary);
  padding: 6px 10px;
  text-align: left;
}
.markdown-body th {
  background: var(--bg-tertiary);
}
.code-block-wrapper {
  position: relative;
  margin: 10px 0;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-code) !important;
}
.code-block-wrapper pre {
  margin: 0 !important;
  padding: 14px !important;
  overflow-x: auto;
}
.code-block-wrapper code {
  font-family: 'Fira Code', 'Cascadia Code', Consolas, monospace;
  font-size: 13px;
  line-height: 1.5;
}
.code-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--bg-tertiary);
}
.code-lang {
  font-size: 11px;
  color: var(--text-secondary);
  margin-right: auto;
  text-transform: uppercase;
}
.code-btn {
  padding: 3px 10px;
  border-radius: 4px;
  border: 1px solid var(--border-secondary);
  background: var(--bg-tertiary);
  color: var(--text-primary);
  font-size: 11px;
  cursor: pointer;
}
.code-btn:hover {
  background: var(--border-secondary);
}
</style>
