import { Router } from 'express'
import { dbGet } from '../models/db.js'
import { authMiddleware } from '../middleware/auth.js'

export const statsRouter = Router()
statsRouter.use(authMiddleware)

statsRouter.get('/', (req, res) => {
  const sessionCount = dbGet('SELECT COUNT(*) as count FROM sessions WHERE user_id = ?', [req.userId])?.count || 0
  const messageCount = dbGet(
    `SELECT COUNT(*) as count FROM messages m
     JOIN sessions s ON m.session_id = s.id
     WHERE s.user_id = ?`, [req.userId]
  )?.count || 0
  // 最近活跃 = 最后一条消息时间（继续在旧会话里聊天也应更新），
  // 无消息时回退到会话创建时间
  const lastMessageAt = dbGet(
    `SELECT MAX(m.created_at) as date FROM messages m
     JOIN sessions s ON m.session_id = s.id
     WHERE s.user_id = ?`, [req.userId]
  )?.date || null
  const lastSessionAt = dbGet('SELECT MAX(created_at) as date FROM sessions WHERE user_id = ?', [req.userId])?.date || null
  const lastActive = lastMessageAt || lastSessionAt

  res.json({
    totalSessions: sessionCount,
    totalMessages: messageCount,
    lastActive,
  })
})
