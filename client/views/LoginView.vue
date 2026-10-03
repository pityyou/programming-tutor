<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '../src/stores/app'
import * as authApi from '../src/api/auth'

const router = useRouter()
const store = useAppStore()

type View = 'login' | 'register' | 'forgot'
const view = ref<View>('login')

// 登录 / 注册
const username = ref('')
const password = ref('')
const email = ref('')
const emailCode = ref('')
const error = ref('')
const loading = ref(false)

// 注册验证码
const codeSending = ref(false)
const codeCountdown = ref(0)
const codeInfo = ref('')
let codeTimer: number | null = null

onUnmounted(() => {
  if (codeTimer) window.clearInterval(codeTimer)
})

async function sendRegisterCode() {
  error.value = ''
  codeInfo.value = ''
  if (!username.value.trim()) {
    error.value = '请先填写用户名'
    return
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
    error.value = '请输入正确的邮箱地址'
    return
  }
  codeSending.value = true
  try {
    const { data } = await authApi.registerSendCode(username.value.trim(), email.value.trim())
    if (data.devCode) {
      codeInfo.value = `开发模式：验证码 ${data.devCode}`
    } else if (data.resent === false) {
      // 服务端仍在有效期内未重发：如实告知，避免用户误以为邮件已发出
      const mins = Math.max(1, Math.ceil((data.remainSeconds || 0) / 60))
      codeInfo.value = `验证码仍然有效（剩余约 ${mins} 分钟），请检查邮箱`
    } else {
      codeInfo.value = '验证码已发送到邮箱，15 分钟内有效'
    }
    // 60s 倒计时防刷
    codeCountdown.value = 60
    if (codeTimer) window.clearInterval(codeTimer)
    codeTimer = window.setInterval(() => {
      codeCountdown.value -= 1
      if (codeCountdown.value <= 0 && codeTimer) {
        window.clearInterval(codeTimer)
        codeTimer = null
      }
    }, 1000)
  } catch (e: any) {
    error.value = e.response?.data?.error || e.message || '发送失败'
  } finally {
    codeSending.value = false
  }
}

// 忘记密码
const fpEmail = ref('')
const fpCode = ref('')
const fpNewPassword = ref('')
const fpStep = ref<'send' | 'reset'>('send')
const fpLoading = ref(false)
const fpError = ref('')
const fpInfo = ref('')
const fpDevCode = ref('')

async function submit() {
  if (view.value === 'login') {
    if (!username.value || !password.value) {
      error.value = '请填写用户名和密码'
      return
    }
  } else {
    if (!username.value || !password.value || !email.value) {
      error.value = '请填写用户名、密码和邮箱'
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
      error.value = '请输入正确的邮箱地址'
      return
    }
    if (!emailCode.value.trim()) {
      error.value = '请先获取并填写邮箱验证码'
      return
    }
  }
  loading.value = true
  error.value = ''
  try {
    const { data } = view.value === 'login'
      ? await authApi.login(username.value, password.value)
      : await authApi.register(username.value, password.value, email.value, emailCode.value.trim())
    store.setAuth(data.user, data.token)
    router.push('/chat')
  } catch (e: any) {
    error.value = e.response?.data?.error || e.message || '操作失败'
  } finally {
    loading.value = false
  }
}

function switchView(v: View) {
  view.value = v
  error.value = ''
  fpError.value = ''
  fpInfo.value = ''
  fpDevCode.value = ''
  codeInfo.value = ''
}

// 忘记密码：发送验证码
async function sendCode() {
  fpError.value = ''
  fpInfo.value = ''
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fpEmail.value.trim())) {
    fpError.value = '请输入正确的邮箱地址'
    return
  }
  fpLoading.value = true
  try {
    const { data } = await authApi.forgotPassword(fpEmail.value.trim())
    if (data.devCode) {
      fpDevCode.value = `开发模式：验证码 ${data.devCode}`
    }
    fpStep.value = 'reset'
    if (data.resent === false) {
      const mins = Math.max(1, Math.ceil((data.remainSeconds || 0) / 60))
      fpInfo.value = `验证码仍然有效（剩余约 ${mins} 分钟），请检查邮箱`
    } else {
      fpInfo.value = '验证码已发送（若该邮箱已注册），15 分钟内有效'
    }
  } catch (e: any) {
    fpError.value = e.response?.data?.error || e.message || '发送失败'
  } finally {
    fpLoading.value = false
  }
}

// 忘记密码：重置
async function submitReset() {
  fpError.value = ''
  if (!fpCode.value.trim() || !fpNewPassword.value) {
    fpError.value = '请填写验证码和新密码'
    return
  }
  if (fpNewPassword.value.length < 6) {
    fpError.value = '密码至少6位'
    return
  }
  fpLoading.value = true
  try {
    await authApi.resetPassword(fpEmail.value.trim(), fpCode.value.trim(), fpNewPassword.value)
    fpInfo.value = ''
    fpDevCode.value = ''
    view.value = 'login'
    fpEmail.value = ''
    fpCode.value = ''
    fpNewPassword.value = ''
    password.value = ''
    error.value = '密码已重置，请用新密码登录'
  } catch (e: any) {
    fpError.value = e.response?.data?.error || e.message || '重置失败'
  } finally {
    fpLoading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <h1>编程学习智能体</h1>
      <p class="subtitle">AI 驱动的多语言编程学习平台</p>

      <!-- 登录 -->
      <form v-if="view === 'login'" @submit.prevent="submit">
        <div class="field">
          <label>用户名</label>
          <input v-model="username" type="text" placeholder="请输入用户名" />
        </div>
        <div class="field">
          <label>密码</label>
          <input v-model="password" type="password" placeholder="请输入密码" />
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <button type="submit" :disabled="loading" class="btn-primary">
          {{ loading ? '处理中...' : '登录' }}
        </button>
        <div class="form-links">
          <a href="#" @click.prevent="switchView('forgot')">忘记密码？</a>
        </div>
      </form>

      <!-- 注册 -->
      <form v-else-if="view === 'register'" @submit.prevent="submit">
        <div class="field">
          <label>用户名</label>
          <input v-model="username" type="text" placeholder="3-20 个字符，不区分大小写" />
        </div>
        <div class="field">
          <label>邮箱</label>
          <div class="code-row">
            <input v-model="email" type="email" placeholder="用于找回密码" class="code-input" />
            <button
              type="button"
              class="code-btn"
              @click="sendRegisterCode"
              :disabled="codeSending || codeCountdown > 0"
            >
              {{ codeCountdown > 0 ? `${codeCountdown}s 后重发` : codeSending ? '发送中...' : '获取验证码' }}
            </button>
          </div>
          <p v-if="codeInfo" class="info">{{ codeInfo }}</p>
        </div>
        <div class="field">
          <label>邮箱验证码</label>
          <input v-model="emailCode" type="text" placeholder="输入收到的 6 位验证码" maxlength="6" />
        </div>
        <div class="field">
          <label>密码</label>
          <input v-model="password" type="password" placeholder="至少 6 位" />
        </div>
        <p v-if="error" class="error">{{ error }}</p>
        <button type="submit" :disabled="loading" class="btn-primary">
          {{ loading ? '处理中...' : '注册' }}
        </button>
      </form>

      <!-- 忘记密码 -->
      <form v-else @submit.prevent="fpStep === 'send' ? sendCode() : submitReset()">
        <template v-if="fpStep === 'send'">
          <div class="field">
            <label>注册邮箱</label>
            <input v-model="fpEmail" type="email" placeholder="输入注册时绑定的邮箱" />
          </div>
          <p v-if="fpError" class="error">{{ fpError }}</p>
          <button type="submit" :disabled="fpLoading" class="btn-primary">
            {{ fpLoading ? '发送中...' : '发送验证码' }}
          </button>
        </template>
        <template v-else>
          <div class="field">
            <label>验证码</label>
            <input v-model="fpCode" type="text" placeholder="6 位验证码" maxlength="6" />
          </div>
          <div class="field">
            <label>新密码</label>
            <input v-model="fpNewPassword" type="password" placeholder="至少 6 位" />
          </div>
          <p v-if="fpInfo" class="info">{{ fpInfo }}</p>
          <p v-if="fpDevCode" class="info dev">{{ fpDevCode }}</p>
          <p v-if="fpError" class="error">{{ fpError }}</p>
          <button type="submit" :disabled="fpLoading" class="btn-primary">
            {{ fpLoading ? '提交中...' : '重置密码' }}
          </button>
          <div class="form-links">
            <a href="#" @click.prevent="fpStep = 'send'">重新发送</a>
          </div>
        </template>
      </form>

      <p class="switch" v-if="view !== 'forgot'">
        {{ view === 'login' ? '没有账号？' : '已有账号？' }}
        <a href="#" @click.prevent="switchView(view === 'login' ? 'register' : 'login')">
          {{ view === 'login' ? '去注册' : '去登录' }}
        </a>
      </p>
      <p class="switch" v-else>
        <a href="#" @click.prevent="switchView('login')">← 返回登录</a>
      </p>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
}
.login-card {
  background: var(--bg-tertiary);
  padding: 40px;
  border-radius: 16px;
  width: 400px;
  max-width: 92vw;
  box-shadow: 0 8px 32px rgba(0,0,0,0.3);
}
h1 {
  text-align: center;
  color: var(--text-primary);
  font-size: 24px;
  margin-bottom: 4px;
}
.subtitle {
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
  margin-bottom: 32px;
}
.field {
  margin-bottom: 16px;
}
.field label {
  display: block;
  margin-bottom: 6px;
  color: var(--text-secondary);
  font-size: 14px;
}
.field input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid var(--border-secondary);
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 14px;
  outline: none;
}
.field input:focus {
  border-color: var(--accent);
}
.error {
  color: var(--danger);
  font-size: 13px;
  margin-bottom: 12px;
}
.info {
  color: var(--success);
  font-size: 13px;
  margin-top: 6px;
}
.code-row {
  display: flex;
  gap: 8px;
}
.code-input {
  flex: 1;
}
.code-btn {
  flex-shrink: 0;
  padding: 0 14px;
  border-radius: 8px;
  border: 1px solid var(--accent);
  background: transparent;
  color: var(--accent);
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
}
.code-btn:hover:not(:disabled) {
  background: var(--accent);
  color: var(--accent-text);
}
.code-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.info.dev {
  color: var(--warning);
}
.btn-primary {
  width: 100%;
  padding: 12px;
  border-radius: 8px;
  border: none;
  background: var(--accent);
  color: var(--bg-primary);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 8px;
}
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.form-links {
  text-align: right;
  margin-top: 10px;
  font-size: 13px;
}
.switch {
  text-align: center;
  margin-top: 16px;
  font-size: 13px;
  color: var(--text-secondary);
}
</style>
