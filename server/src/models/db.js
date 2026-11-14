import initSqlJs from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = path.join(__dirname, '..', '..', 'data', 'tutor.db')

let db

export async function initDb() {
  const SQL = await initSqlJs()

  const dir = path.dirname(DB_PATH)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }

  db.run('PRAGMA journal_mode = WAL')

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)

  // Migration: add email column for password recovery (old accounts have NULL)
  try {
    db.run('ALTER TABLE users ADD COLUMN email TEXT')
  } catch { /* column already exists */ }
  db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)')

  // Migration: mark guest (visitor) accounts. Guests are created by the
  // "游客登录" button without email/password; their data is purged after a TTL.
  try {
    db.run('ALTER TABLE users ADD COLUMN is_guest INTEGER DEFAULT 0')
  } catch { /* column already exists */ }

  // Case-insensitive unique index for usernames ('Bob' and 'bob' are the same account)
  try {
    db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_ci ON users(username COLLATE NOCASE)')
  } catch {
    // Existing duplicate usernames differ only in case → index cannot be created.
    // Registration/login still compare with COLLATE NOCASE as a fallback.
    console.warn('[db] 用户名大小写不敏感唯一索引创建失败（可能存在仅大小写不同的历史用户名）')
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS email_verifications (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      code TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS practice_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      language TEXT DEFAULT '',
      difficulty TEXT DEFAULT '',
      topic TEXT DEFAULT '',
      exercise TEXT NOT NULL,
      user_code TEXT DEFAULT '',
      test_summary TEXT DEFAULT '',
      passed INTEGER DEFAULT 0,
      feedback TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT DEFAULT 'New Chat',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      seq INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (session_id) REFERENCES sessions(id)
    );

    CREATE TABLE IF NOT EXISTS snippets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      language TEXT DEFAULT '',
      code TEXT NOT NULL,
      title TEXT DEFAULT '',
      tags TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)

  // Migration: add seq column to messages for stable ordering.
  // `datetime('now')` has second granularity, so messages inserted in the
  // same second could otherwise come back in arbitrary order.
  try {
    db.run('ALTER TABLE messages ADD COLUMN seq INTEGER DEFAULT 0')
  } catch { /* column already exists */ }

  // 查询索引：各表的过滤/排序字段在数据量增长后显著影响性能
  db.run('CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_messages_session_seq ON messages(session_id, seq)')
  db.run('CREATE INDEX IF NOT EXISTS idx_snippets_user ON snippets(user_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_practice_user ON practice_records(user_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_resets_user ON password_resets(user_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_verifications_email ON email_verifications(email)')

  persist()
  console.log('Database initialized')
}

export function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDb() first.')
  return db
}

function persist() {
  try {
    const data = db.export()
    const buffer = Buffer.from(data)
    fs.writeFileSync(DB_PATH, buffer)
  } catch (err) {
    console.error('DB persist error:', err)
  }
}

// Throttled persistence: coalesce writes within a short window, then write
// the whole DB file once. Exporting the full database on every single write
// gets slow as data grows. A final flush happens on process exit.
let dirty = false
let persistTimer = null

function schedulePersist() {
  dirty = true
  if (persistTimer) return
  persistTimer = setTimeout(() => {
    persistTimer = null
    if (dirty) {
      dirty = false
      persist()
    }
  }, 300)
}

function flushNow() {
  if (dirty) {
    dirty = false
    persist()
  }
}

process.on('exit', flushNow)
process.on('SIGINT', () => { flushNow(); process.exit(0) })
process.on('SIGTERM', () => { flushNow(); process.exit(0) })

// Wrap queries to auto-persist (throttled)
export function dbRun(sql, params = []) {
  const result = getDb().run(sql, params)
  schedulePersist()
  return result
}

export function dbGet(sql, params = []) {
  const stmt = getDb().prepare(sql)
  stmt.bind(params)
  let row = null
  if (stmt.step()) {
    row = stmt.getAsObject()
  }
  stmt.free()
  return row
}

export function dbAll(sql, params = []) {
  const stmt = getDb().prepare(sql)
  stmt.bind(params)
  const rows = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  return rows
}

// For INSERT/UPDATE/DELETE, persist (throttled)
export function dbExec(sql, params = []) {
  const result = getDb().run(sql, params)
  schedulePersist()
  return result
}
