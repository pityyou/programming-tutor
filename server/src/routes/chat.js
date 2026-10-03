import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { dbGet, dbAll, dbExec } from '../models/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { getAdapter } from '../adapters/index.js'
import { rateLimit } from '../middleware/rateLimit.js'

export const chatRouter = Router()

chatRouter.use(authMiddleware)
chatRouter.use(rateLimit({ windowMs: 60000, max: 60, message: '对话请求过于频繁，请稍后再试' }))

const MAX_MESSAGES = 50
const MAX_CONTENT_LEN = 20000

chatRouter.post('/', async (req, res) => {
  try {
    const { messages, provider = 'deepseek', model } = req.body

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: '消息不能为空' })
    }
    if (messages.length > MAX_MESSAGES) {
      return res.status(400).json({ error: `消息数量过多（最多 ${MAX_MESSAGES} 条）` })
    }
    const totalLen = messages.reduce((sum, m) => sum + (typeof m?.content === 'string' ? m.content.length : 0), 0)
    if (totalLen > MAX_CONTENT_LEN * 2) {
      return res.status(400).json({ error: '对话内容过长，请开启新对话' })
    }

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

    // 客户端提前断开（用户点"停止生成"/关闭页面）时中止上游 LLM 请求，
    // 否则服务端会继续拉取完整回复并持续消耗 token。
    const upstream = new AbortController()
    res.on('close', () => {
      if (!res.writableEnded) upstream.abort()
    })

    const streamFn = getAdapter(provider)
    const effectiveModel = model || (provider === 'deepseek' ? 'deepseek-chat' : undefined)

    for await (const chunk of streamFn(messages, effectiveModel, upstream.signal)) {
      const data = `data: ${JSON.stringify({ content: chunk })}\n\n`
      res.write(data)
    }

    if (!upstream.signal.aborted) {
      res.write('data: [DONE]\n\n')
      res.end()
    }
  } catch (err) {
    // 客户端主动断开导致的中止不算错误
    if (err?.name === 'AbortError' || err?.name === 'APIUserAbortError') {
      if (!res.writableEnded) res.end()
      return
    }
    console.error('Chat error:', err)
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || '对话失败' })
    } else if (!res.writableEnded) {
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
      for (let i = 0; i < msgs.length; i++) {
        const msg = msgs[i]
        dbExec('INSERT INTO messages (id, session_id, role, content, seq) VALUES (?, ?, ?, ?, ?)', [uuid(), sessionId, msg.role, msg.content, i])
      }
    }

    res.json({ sessionId })
  } catch (err) {
    console.error('Save session error:', err)
    res.status(500).json({ error: '保存失败' })
  }
})

// Append messages to an existing session (incremental save)
chatRouter.post('/sessions/:id/messages', (req, res) => {
  try {
    const { messages: msgs } = req.body
    const session = dbGet('SELECT * FROM sessions WHERE id = ? AND user_id = ?', [req.params.id, req.userId])
    if (!session) return res.status(404).json({ error: '会话不存在' })

    if (msgs?.length) {
      const lastSeq = dbGet('SELECT COALESCE(MAX(seq), -1) AS maxSeq FROM messages WHERE session_id = ?', [req.params.id]).maxSeq || 0
      for (let i = 0; i < msgs.length; i++) {
        const msg = msgs[i]
        dbExec('INSERT INTO messages (id, session_id, role, content, seq) VALUES (?, ?, ?, ?, ?)', [uuid(), req.params.id, msg.role, msg.content, lastSeq + 1 + i])
      }
    }

    res.json({ success: true })
  } catch (err) {
    console.error('Append messages error:', err)
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
  const messages = dbAll('SELECT role, content FROM messages WHERE session_id = ? ORDER BY seq ASC, created_at ASC', [req.params.id])
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

// Truncate a session's messages from a given seq onward (used by "重新生成")
chatRouter.delete('/sessions/:id/messages', (req, res) => {
  const session = dbGet('SELECT * FROM sessions WHERE id = ? AND user_id = ?', [req.params.id, req.userId])
  if (!session) return res.status(404).json({ error: '会话不存在' })
  const fromSeq = parseInt(req.query.fromSeq, 10)
  if (!Number.isFinite(fromSeq) || fromSeq < 0) {
    return res.status(400).json({ error: 'fromSeq 无效' })
  }
  dbExec('DELETE FROM messages WHERE session_id = ? AND seq >= ?', [req.params.id, fromSeq])
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
