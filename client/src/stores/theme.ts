import { defineStore } from 'pinia'
import { ref, watch } from 'vue'

export const useThemeStore = defineStore('theme', () => {
  const saved = localStorage.getItem('theme')
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const mode = ref<'light' | 'dark'>(saved === 'light' ? 'light' : saved === 'dark' ? 'dark' : prefersDark ? 'dark' : 'light')

  function toggle() {
    mode.value = mode.value === 'dark' ? 'light' : 'dark'
  }

  function setTheme(m: 'light' | 'dark') {
    mode.value = m
  }

  watch(mode, (v) => {
    document.documentElement.setAttribute('data-theme', v)
    localStorage.setItem('theme', v)
  }, { immediate: true })

  return { mode, toggle, setTheme }
})
