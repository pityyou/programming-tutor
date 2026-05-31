import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAppStore = defineStore('app', () => {
  const savedUser = localStorage.getItem('user')
  const user = ref<{ id: string; username: string } | null>(savedUser ? JSON.parse(savedUser) : null)
  const token = ref(localStorage.getItem('token') || '')
  const provider = ref(localStorage.getItem('provider') || 'deepseek')
  const model = ref(localStorage.getItem('model') || 'deepseek-chat')

  const isLoggedIn = computed(() => !!token.value && !!user.value)

  function setAuth(u: { id: string; username: string }, t: string) {
    user.value = u
    token.value = t
    localStorage.setItem('token', t)
    localStorage.setItem('user', JSON.stringify(u))
  }

  function logout() {
    user.value = null
    token.value = ''
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  function setProvider(p: string) {
    provider.value = p
    localStorage.setItem('provider', p)
  }

  function setModel(m: string) {
    model.value = m
    localStorage.setItem('model', m)
  }

  return { user, token, provider, model, isLoggedIn, setAuth, logout, setProvider, setModel }
})
