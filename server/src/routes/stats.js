import { Router } from 'express'
import { dbGet, dbAll } from '../models/db.js'
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
  const lastActive = dbGet('SELECT MAX(created_at) as date FROM sessions WHERE user_id = ?', [req.userId])?.date || null

  res.json({
    totalSessions: sessionCount,
    totalMessages: messageCount,
    lastActive,
  })
})
