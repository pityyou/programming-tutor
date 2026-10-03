import jwt from 'jsonwebtoken'
import crypto from 'crypto'

// Placeholder secrets that must never be used in production
const INSECURE_SECRETS = [
  'dev-secret-change-in-production',
  'change-this-to-a-random-secret',
  'dev-secret',
]

let JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET || INSECURE_SECRETS.includes(JWT_SECRET)) {
  console.warn(
    '[auth] JWT_SECRET 未设置或仍为默认值，已生成临时随机密钥（重启后已登录用户需重新登录）。请在 server/.env 中配置强随机 JWT_SECRET。'
  )
  JWT_SECRET = crypto.randomBytes(32).toString('hex')
}

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未登录' })
  }
  try {
    const payload = jwt.verify(header.slice(7), JWT_SECRET)
    req.userId = payload.sub
    next()
  } catch {
    res.status(401).json({ error: 'token 无效或已过期' })
  }
}

export function signToken(userId) {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: '7d' })
}
