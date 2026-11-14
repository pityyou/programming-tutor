import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAppStore = defineStore('app', () => {
  const savedUser = localStorage.getItem('user')
  const user = ref<{ id: string; username: string; email?: string | null; is_guest?: boolean } | null>(savedUser ? JSON.parse(savedUser) : null)
  const token = ref(localStorage.getItem('token') || '')

  const isLoggedIn = computed(() => !!token.value && !!user.value)

  function setAuth(u: { id: string; username: string; email?: string | null; is_guest?: boolean }, t: string) {
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

  return { user, token, isLoggedIn, setAuth, logout }
})
