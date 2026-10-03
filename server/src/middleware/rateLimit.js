/**
 * Dependency-free in-memory rate limiter.
 * Keyed by authenticated user id (or IP for unauthenticated routes).
 * Periodically purges expired entries so the map never grows unbounded.
 */
export function rateLimit({ windowMs = 60000, max = 30, message = '请求过于频繁，请稍后再试' } = {}) {
  const hits = new Map()

  // Sweep expired entries every minute
  const sweep = setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of hits) {
      if (entry.resetAt < now) hits.delete(key)
    }
  }, 60000)
  // Don't keep the process alive just for the sweeper
  sweep.unref?.()

  return function rateLimitMiddleware(req, res, next) {
    const key = req.userId || req.ip || 'unknown'
    const now = Date.now()
    let entry = hits.get(key)
    if (!entry || entry.resetAt < now) {
      entry = { count: 0, resetAt: now + windowMs }
      hits.set(key, entry)
    }
    entry.count += 1
    if (entry.count > max) {
      return res.status(429).json({ error: message })
    }
    next()
  }
}
