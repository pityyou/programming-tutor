import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { authRouter } from './routes/auth.js'
import { chatRouter } from './routes/chat.js'
import { executeRouter } from './routes/execute.js'
import { statsRouter } from './routes/stats.js'
import { snippetsRouter } from './routes/snippets.js'
import { practiceRouter } from './routes/practice.js'
import { initDb } from './models/db.js'
import { rateLimit } from './middleware/rateLimit.js'
import { initMailer } from './services/mailer.js'

const app = express()
const PORT = process.env.PORT || 3000

// CORS：本地学习平台，允许任意来源（含局域网 IP 访问），credentials 场景需反射来源
app.use(cors({
  origin: true,
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json({ limit: '1mb' }))

// Routes (auth rate-limited by IP; authed routes limit per-user inside routers)
// 注意：auth 限流按 IP 计数，多人共用出口 IP（校园网 NAT）时会互相影响，
// 因此放宽到 60/分钟，仍足以拦截脚本化暴力破解。
app.use('/api/auth', rateLimit({ windowMs: 60000, max: 60, message: '操作过于频繁，请稍后再试' }), authRouter)
app.use('/api/chat', chatRouter)
app.use('/api/execute', executeRouter)
app.use('/api/stats', statsRouter)
app.use('/api/snippets', snippetsRouter)
app.use('/api/practice', practiceRouter)

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

// Initialize database + mailer and start server
Promise.all([initDb(), initMailer()]).then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}).catch(err => {
  console.error('Failed to initialize:', err)
  process.exit(1)
})

export default app
