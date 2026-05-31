import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { dbGet, dbAll, dbExec } from '../models/db.js'
import { authMiddleware } from '../middleware/auth.js'

export const snippetsRouter = Router()
snippetsRouter.use(authMiddleware)

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
  const id = uuid()
  dbExec(
    'INSERT INTO snippets (id, user_id, language, code, title, tags) VALUES (?, ?, ?, ?, ?, ?)',
    [id, req.userId, language || '', code, title || '', (tags || []).join(',')]
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
