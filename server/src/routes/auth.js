import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { v4 as uuid } from 'uuid'
import { dbGet, dbAll, dbExec } from '../models/db.js'
import { signToken, authMiddleware } from '../middleware/auth.js'

export const authRouter = Router()

authRouter.post('/register', (req, res) => {
  try {
    const { username, password } = req.body
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' })
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '密码至少6位' })
    }

    const existing = dbGet('SELECT id FROM users WHERE username = ?', [username])
    if (existing) {
      return res.status(409).json({ error: '用户名已存在' })
    }

    const id = uuid()
    const passwordHash = bcrypt.hashSync(password, 10)
    dbExec('INSERT INTO users (id, username, password_hash) VALUES (?, ?, ?)', [id, username, passwordHash])

    const token = signToken(id)
    res.json({ token, user: { id, username } })
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

    const user = dbGet('SELECT id, username, password_hash FROM users WHERE username = ?', [username])
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: '用户名或密码错误' })
    }

    const token = signToken(user.id)
    res.json({ token, user: { id: user.id, username: user.username } })
  } catch (err) {
    console.error('Login error:', err)
    res.status(500).json({ error: '登录失败' })
  }
})

authRouter.get('/profile', authMiddleware, (req, res) => {
  const user = dbGet('SELECT id, username FROM users WHERE id = ?', [req.userId])
  if (!user) {
    return res.status(404).json({ error: '用户不存在' })
  }
  res.json({ user })
})
