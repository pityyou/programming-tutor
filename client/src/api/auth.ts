import api from './index'

export interface UserInfo {
  id: string
  username: string
  email?: string | null
}

export function login(username: string, password: string) {
  return api.post<{ token: string; user: UserInfo }>('/auth/login', { username, password })
}

export interface SendCodeResult {
  ok: boolean
  /** false 表示因验证码仍在有效期内而未重复发送 */
  resent?: boolean
  /** 未重复发送时，当前验证码剩余有效秒数 */
  remainSeconds?: number
  devCode?: string
}

export function registerSendCode(username: string, email: string) {
  return api.post<SendCodeResult>('/auth/register/send-code', { username, email })
}

export function register(username: string, password: string, email: string, emailCode: string) {
  return api.post<{ token: string; user: UserInfo }>('/auth/register', { username, password, email, emailCode })
}

export function getProfile() {
  return api.get<{ user: UserInfo }>('/auth/profile')
}

export function forgotPassword(email: string) {
  return api.post<SendCodeResult>('/auth/forgot-password', { email })
}

export function resetPassword(email: string, code: string, newPassword: string) {
  return api.post<{ ok: boolean }>('/auth/reset-password', { email, code, newPassword })
}

export function bindEmail(email: string) {
  return api.post<{ user: UserInfo }>('/auth/bind-email', { email })
}
