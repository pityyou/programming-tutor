import { Router } from 'express'
import { v4 as uuid } from 'uuid'
import { dbGet, dbAll, dbExec } from '../models/db.js'
import { authMiddleware } from '../middleware/auth.js'
import { rateLimit } from '../middleware/rateLimit.js'

export const practiceRouter = Router()
practiceRouter.use(authMiddleware)
practiceRouter.use(rateLimit({ windowMs: 60000, max: 30, message: '操作过于频繁，请稍后再试' }))

// Save a practice record (auto-saved after judging)
practiceRouter.post('/', (req, res) => {
  try {
    const { language, difficulty, topic, exercise, userCode, results, passed, feedback } = req.body
    if (!exercise) return res.status(400).json({ error: '题目内容不能为空' })

    const id = uuid()
    const summary = Array.isArray(results) ? JSON.stringify(results) : ''
    dbExec(
      `INSERT INTO practice_records
        (id, user_id, language, difficulty, topic, exercise, user_code, test_summary, passed, feedback)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, req.userId,
        String(language || ''),
        String(difficulty || ''),
        String(topic || '').slice(0, 100),
        String(exercise).slice(0, 20000),
        String(userCode || '').slice(0, 50000),
        summary,
        passed ? 1 : 0,
        String(feedback || '').slice(0, 20000),
      ]
    )
    res.json({ id })
  } catch (err) {
    console.error('Save practice error:', err)
    res.status(500).json({ error: '保存失败' })
  }
})

// List recent practice records
practiceRouter.get('/', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100)
  const records = dbAll(
    `SELECT id, language, difficulty, topic, exercise, passed, feedback, created_at, test_summary
     FROM practice_records WHERE user_id = ?
     ORDER BY created_at DESC, rowid DESC LIMIT ?`,
    [req.userId, limit]
  )
  for (const r of records) {
    // Trim exercise to a short preview for the list view
    r.exercise = (r.exercise || '').slice(0, 120)
    // 是否经过测试用例判题（无判题时前端显示"已练习"而非"未通过"）
    r.hasTests = !!r.test_summary
    delete r.test_summary
  }
  res.json({ records })
})

// Update an existing record (same exercise submitted again → overwrite instead of duplicating)
practiceRouter.put('/:id', (req, res) => {
  try {
    const { results, passed, feedback, userCode } = req.body
    const record = dbGet('SELECT id FROM practice_records WHERE id = ? AND user_id = ?', [req.params.id, req.userId])
    if (!record) return res.status(404).json({ error: '记录不存在' })

    const summary = Array.isArray(results) ? JSON.stringify(results) : ''
    dbExec(
      'UPDATE practice_records SET user_code = ?, test_summary = ?, passed = ?, feedback = ? WHERE id = ?',
      [
        String(userCode || '').slice(0, 50000),
        summary,
        passed ? 1 : 0,
        String(feedback || '').slice(0, 20000),
        req.params.id,
      ]
    )
    res.json({ success: true })
  } catch (err) {
    console.error('Update practice error:', err)
    res.status(500).json({ error: '更新失败' })
  }
})

// Get a single record with full details
practiceRouter.get('/:id', (req, res) => {
  const record = dbGet('SELECT * FROM practice_records WHERE id = ? AND user_id = ?', [req.params.id, req.userId])
  if (!record) return res.status(404).json({ error: '记录不存在' })
  let summary = []
  try { summary = JSON.parse(record.test_summary || '[]') } catch { summary = [] }
  res.json({ ...record, results: summary })
})

// Delete a record
practiceRouter.delete('/:id', (req, res) => {
  const record = dbGet('SELECT * FROM practice_records WHERE id = ? AND user_id = ?', [req.params.id, req.userId])
  if (!record) return res.status(404).json({ error: '记录不存在' })
  dbExec('DELETE FROM practice_records WHERE id = ?', [req.params.id])
  res.json({ success: true })
})
