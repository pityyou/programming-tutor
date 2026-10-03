import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import crypto from 'crypto'
import { dbGet, dbExec } from '../models/db.js'
import { signToken, authMiddleware } from '../middleware/auth.js'
import { sendPasswordResetCode, sendVerificationCode, mailerDevMode } from '../services/mailer.js'

export const authRouter = Router()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const RESET_TTL_MS = 15 * 60 * 1000 // 验证码 15 分钟有效

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function validateUsername(username) {
  return typeof username === 'string' && username.trim().length >= 3 && username.trim().length <= 20
}

// 发送注册邮箱验证码（发送前预检用户名/邮箱唯一性，避免向已注册邮箱发码）
authRouter.post('/register/send-code', async (req, res) => {
  try {
    const { username, email } = req.body
    if (!validateUsername(username)) {
      return res.status(400).json({ error: '用户名长度需为 3-20 个字符' })
    }
    const normalizedEmail = normalizeEmail(email)
    if (!EMAIL_RE.test(normalizedEmail)) {
      return res.status(400).json({ error: '请输入正确的邮箱地址' })
    }

    const existing = dbGet('SELECT id FROM users WHERE username = ? COLLATE NOCASE', [username.trim()])
    if (existing) return res.status(409).json({ error: '用户名已存在' })
    const emailTaken = dbGet('SELECT id FROM users WHERE email = ?', [normalizedEmail])
    if (emailTaken) return res.status(409).json({ error: '该邮箱已被注册' })

    // 防刷：已有未过期的验证码则不重复发送（返回剩余时间，避免前端误报"已发送"）
    const existingCode = dbGet('SELECT * FROM email_verifications WHERE email = ? ORDER BY created_at DESC', [normalizedEmail])
    if (existingCode && parseInt(existingCode.expires_at, 10) > Date.now()) {
      const remainSeconds = Math.max(0, Math.ceil((parseInt(existingCode.expires_at, 10) - Date.now()) / 1000))
      return res.json({
        ok: true,
        resent: false,
        remainSeconds,
        // 开发模式（未配置 SMTP）下把当前有效验证码一并返回，便于本地调试
        ...(mailerDevMode() ? { devCode: existingCode.code } : {}),
      })
    }

    dbExec('DELETE FROM email_verifications WHERE email = ?', [normalizedEmail])
    const code = String(crypto.randomInt(100000, 1000000))
    const expiresAt = Date.now() + RESET_TTL_MS
    dbExec('INSERT INTO email_verifications (id, email, code, expires_at) VALUES (?, ?, ?, ?)', [uuid(), normalizedEmail, code, String(expiresAt)])

    const result = await sendVerificationCode(normalizedEmail, code)
    if (result.delivered) return res.json({ ok: true, resent: true })
    // 开发模式：验证码随响应返回，便于本地调试
    return res.json({ ok: true, resent: true, devCode: result.devCode })
  } catch (err) {
    console.error('Send register code error:', err)
    res.status(500).json({ error: '发送失败，请稍后再试' })
  }
})

authRouter.post('/register', (req, res) => {
  try {
    const { username, password, email, emailCode } = req.body
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' })
    }
    if (!validateUsername(username)) {
      return res.status(400).json({ error: '用户名长度需为 3-20 个字符' })
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: '密码至少6位' })
    }
    if (password.length > 72) {
      return res.status(400).json({ error: '密码不能超过72位' })
    }

    const normalizedEmail = normalizeEmail(email)
    if (!EMAIL_RE.test(normalizedEmail)) {
      return res.status(400).json({ error: '请输入正确的邮箱地址（用于找回密码）' })
    }

    // 邮箱验证码校验
    if (!emailCode) {
      return res.status(400).json({ error: '请先获取并填写邮箱验证码' })
    }
    const verification = dbGet('SELECT * FROM email_verifications WHERE email = ? ORDER BY created_at DESC', [normalizedEmail])
    if (!verification || verification.code !== String(emailCode).trim()) {
      return res.status(400).json({ error: '验证码不正确' })
    }
    if (parseInt(verification.expires_at, 10) < Date.now()) {
      dbExec('DELETE FROM email_verifications WHERE email = ?', [normalizedEmail])
      return res.status(400).json({ error: '验证码已过期，请重新获取' })
    }

    // 唯一性：用户名大小写不敏感，邮箱唯一
    const existing = dbGet('SELECT id FROM users WHERE username = ? COLLATE NOCASE', [username.trim()])
    if (existing) {
      return res.status(409).json({ error: '用户名已存在' })
    }
    const emailTaken = dbGet('SELECT id FROM users WHERE email = ?', [normalizedEmail])
    if (emailTaken) {
      return res.status(409).json({ error: '该邮箱已被注册' })
    }

    const id = uuid()
    const passwordHash = bcrypt.hashSync(password, 10)
    dbExec('INSERT INTO users (id, username, password_hash, email) VALUES (?, ?, ?, ?)', [id, username.trim(), passwordHash, normalizedEmail])
    dbExec('DELETE FROM email_verifications WHERE email = ?', [normalizedEmail])

    const token = signToken(id)
    res.json({ token, user: { id, username: username.trim(), email: normalizedEmail } })
  } catch (err) {
    console.error('Register error:', err)
    res.status(500).json({ error: '注册失败' })
  }
})

authRouter.post('/login', (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' })
    }

    const user = dbGet('SELECT id, username, password_hash, email FROM users WHERE username = ? COLLATE NOCASE', [username.trim()])
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: '用户名或密码错误' })
    }

    const token = signToken(user.id)
    res.json({ token, user: { id: user.id, username: user.username, email: user.email || null } })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: '登录失败' })
  }
})

// 忘记密码：按邮箱发送 6 位重置验证码
// 无论邮箱是否存在都返回同样提示，防止用户枚举
authRouter.post('/forgot-password', async (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body?.email)
    if (!EMAIL_RE.test(normalizedEmail)) {
      return res.status(400).json({ error: '请输入正确的邮箱地址' })
    }

    const user = dbGet('SELECT id, email FROM users WHERE email = ?', [normalizedEmail])
    if (user) {
      // 已有未过期的验证码则不重复发送（返回剩余时间，避免前端误报"已发送"）
      const existing = dbGet('SELECT * FROM password_resets WHERE user_id = ? ORDER BY created_at DESC', [user.id])
      if (existing && parseInt(existing.expires_at, 10) > Date.now()) {
        const remainSeconds = Math.max(0, Math.ceil((parseInt(existing.expires_at, 10) - Date.now()) / 1000))
        return res.json({
          ok: true,
          resent: false,
          remainSeconds,
          ...(mailerDevMode() ? { devCode: existing.code } : {}),
        })
      }

      dbExec('DELETE FROM password_resets WHERE user_id = ?', [user.id])
      const code = String(crypto.randomInt(100000, 1000000))
      const expiresAt = Date.now() + RESET_TTL_MS
      dbExec('INSERT INTO password_resets (id, user_id, code, expires_at) VALUES (?, ?, ?, ?)', [uuid(), user.id, code, String(expiresAt)])

      const result = await sendPasswordResetCode(user.email, code)
      if (result.delivered) return res.json({ ok: true, resent: true })
      // 开发模式：验证码随响应返回，便于本地调试
      return res.json({ ok: true, resent: true, devCode: result.devCode })
    }
    res.json({ ok: true })
  } catch (err) {
    console.error('Forgot password error:', err)
    res.status(500).json({ error: '发送失败，请稍后再试' })
  }
})

// 重置密码：验证邮箱 + 验证码 + 新密码
authRouter.post('/reset-password', (req, res) => {
  try {
    const { email, code, newPassword } = req.body
    if (!code || !newPassword) {
      return res.status(400).json({ error: '请填写验证码和新密码' })
    }
    if (typeof newPassword !== 'string' || newPassword.length < 6) {
      return res.status(400).json({ error: '密码至少6位' })
    }
    if (newPassword.length > 72) {
      return res.status(400).json({ error: '密码不能超过72位' })
    }

    const normalizedEmail = normalizeEmail(email)
    const user = dbGet('SELECT id FROM users WHERE email = ?', [normalizedEmail])
    if (!user) {
      return res.status(400).json({ error: '邮箱或验证码不正确' })
    }

    const record = dbGet('SELECT * FROM password_resets WHERE user_id = ? ORDER BY created_at DESC', [user.id])
    if (!record || record.code !== String(code).trim()) {
      return res.status(400).json({ error: '验证码不正确' })
    }
    if (parseInt(record.expires_at, 10) < Date.now()) {
      dbExec('DELETE FROM password_resets WHERE user_id = ?', [user.id])
      return res.status(400).json({ error: '验证码已过期，请重新获取' })
    }

    const passwordHash = bcrypt.hashSync(newPassword, 10)
    dbExec('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, user.id])
    dbExec('DELETE FROM password_resets WHERE user_id = ?', [user.id])
    res.json({ ok: true })
  } catch (err) {
    console.error('Reset password error:', err)
    res.status(500).json({ error: '重置失败，请稍后再试' })
  }
})

// 老账号补绑邮箱（需登录）
authRouter.post('/bind-email', authMiddleware, (req, res) => {
  try {
    const normalizedEmail = normalizeEmail(req.body?.email)
    if (!EMAIL_RE.test(normalizedEmail)) {
      return res.status(400).json({ error: '请输入正确的邮箱地址' })
    }

    const existing = dbGet('SELECT id FROM users WHERE email = ?', [normalizedEmail])
    if (existing && existing.id !== req.userId) {
      return res.status(409).json({ error: '该邮箱已被其他账号绑定' })
    }

    dbExec('UPDATE users SET email = ? WHERE id = ?', [normalizedEmail, req.userId])
    const user = dbGet('SELECT id, username, email FROM users WHERE id = ?', [req.userId])
    res.json({ user })
  } catch (err) {
    console.error('Bind email error:', err)
    res.status(500).json({ error: '绑定失败' })
  }
})

authRouter.get('/profile', authMiddleware, (req, res) => {
  const user = dbGet('SELECT id, username, email FROM users WHERE id = ?', [req.userId])
  if (!user) {
    return res.status(404).json({ error: '用户不存在' })
  }
  res.json({ user })
})
