import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { dbGet, dbAll, dbExec } from '../models/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { getAdapter } from '../adapters/index.js'

export const chatRouter = Router()

chatRouter.use(authMiddleware)

chatRouter.post('/', async (req, res) => {
  try {
    const { messages, provider = 'deepseek', model } = req.body

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no')
    res.setHeader('Transfer-Encoding', 'chunked')
    res.flushHeaders()

    const socket = res.socket
    if (socket) {
      socket.setNoDelay(true)
      socket.setTimeout(0)
    }

    const streamFn = getAdapter(provider)
    const effectiveModel = model || (provider === 'deepseek' ? 'deepseek-chat' : undefined)

    for await (const chunk of streamFn(messages, effectiveModel)) {
      const data = `data: ${JSON.stringify({ content: chunk })}\n\n`
      res.write(data)
    }

    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    console.error('Chat error:', err)
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || '对话失败' })
    } else {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`)
      res.end()
    }
  }
})

// Save session
chatRouter.post('/sessions', (req, res) => {
  try {
    const { title, messages: msgs } = req.body
    const sessionId = uuid()

    dbExec('INSERT INTO sessions (id, user_id, title) VALUES (?, ?, ?)', [sessionId, req.userId, title || 'New Chat'])

    if (msgs?.length) {
      for (const msg of msgs) {
        dbExec('INSERT INTO messages (id, session_id, role, content) VALUES (?, ?, ?, ?)', [uuid(), sessionId, msg.role, msg.content])
      }
    }

    res.json({ sessionId })
  } catch (err) {
    console.error('Save session error:', err)
    res.status(500).json({ error: '保存失败' })
  }
})

// Get sessions
chatRouter.get('/sessions', (req, res) => {
  const sessions = dbAll('SELECT * FROM sessions WHERE user_id = ? ORDER BY created_at DESC', [req.userId])
  res.json({ sessions })
})

// Get session messages
chatRouter.get('/sessions/:id', (req, res) => {
  const session = dbGet('SELECT * FROM sessions WHERE id = ? AND user_id = ?', [req.params.id, req.userId])
  if (!session) {
    return res.status(404).json({ error: '会话不存在' })
  }
  const messages = dbAll('SELECT role, content FROM messages WHERE session_id = ? ORDER BY created_at ASC', [req.params.id])
  res.json({ messages })
})

// Rename session
chatRouter.patch('/sessions/:id', (req, res) => {
  const { title } = req.body
  if (!title) return res.status(400).json({ error: '标题不能为空' })
  const session = dbGet('SELECT * FROM sessions WHERE id = ? AND user_id = ?', [req.params.id, req.userId])
  if (!session) return res.status(404).json({ error: '会话不存在' })
  dbExec('UPDATE sessions SET title = ? WHERE id = ?', [title, req.params.id])
  res.json({ success: true })
})

// Delete session
chatRouter.delete('/sessions/:id', (req, res) => {
  const session = dbGet('SELECT * FROM sessions WHERE id = ? AND user_id = ?', [req.params.id, req.userId])
  if (!session) return res.status(404).json({ error: '会话不存在' })
  dbExec('DELETE FROM messages WHERE session_id = ?', [req.params.id])
  dbExec('DELETE FROM sessions WHERE id = ?', [req.params.id])
  res.json({ success: true })
})
