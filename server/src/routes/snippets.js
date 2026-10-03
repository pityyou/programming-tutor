import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { dbGet, dbAll, dbExec } from '../models/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { rateLimit } from '../middleware/rateLimit.js'

export const snippetsRouter = Router()
snippetsRouter.use(authMiddleware)
snippetsRouter.use(rateLimit({ windowMs: 60000, max: 30, message: '操作过于频繁，请稍后再试' }))

// Get all snippets
snippetsRouter.get('/', (req, res) => {
  const snippets = dbAll(
    'SELECT * FROM snippets WHERE user_id = ? ORDER BY created_at DESC',
    [req.userId]
  )
  res.json({ snippets })
})

// Save a snippet
snippetsRouter.post('/', (req, res) => {
  const { language, code, title, tags } = req.body
  if (!code) return res.status(400).json({ error: '代码不能为空' })
  if (typeof code !== 'string' || code.length > 50000) {
    return res.status(400).json({ error: '代码过长（最多 50000 字符）' })
  }
  // tags 可能是数组或字符串，避免直接 .join 崩溃
  const tagStr = Array.isArray(tags) ? tags.join(',') : String(tags || '')
  const id = uuid()
  dbExec(
    'INSERT INTO snippets (id, user_id, language, code, title, tags) VALUES (?, ?, ?, ?, ?, ?)',
    [id, req.userId, String(language || ''), code, String(title || '').slice(0, 200), tagStr.slice(0, 500)]
  )
  res.json({ id })
})

// Delete a snippet
snippetsRouter.delete('/:id', (req, res) => {
  const snippet = dbGet('SELECT * FROM snippets WHERE id = ? AND user_id = ?', [req.params.id, req.userId])
  if (!snippet) return res.status(404).json({ error: '代码片段不存在' })
  dbExec('DELETE FROM snippets WHERE id = ?', [req.params.id])
  res.json({ success: true })
})
