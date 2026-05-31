import api from './index'

export function login(username: string, password: string) {
  return api.post<{ token: string; user: { id: string; username: string } }>('/auth/login', { username, password })
}

export function register(username: string, password: string) {
  return api.post<{ token: string; user: { id: string; username: string } }>('/auth/register', { username, password })
}

export function getProfile() {
  return api.get<{ user: { id: string; username: string } }>('/auth/profile')
}
