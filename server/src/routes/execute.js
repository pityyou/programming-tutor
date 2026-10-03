import { Router } from 'express'
import { execSync } from 'child_process'
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuid } from 'uuid'
import { authMiddleware } from '../middleware/auth.js'
import { rateLimit } from '../middleware/rateLimit.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEMP_DIR = path.join(__dirname, '..', '..', 'temp')

const MAX_CODE_LEN = 50000

let dockerAvailable = false
try {
  execSync('docker info', { stdio: 'pipe', timeout: 3000 })
  // The sandbox container must actually exist and be running for `docker exec`
  execSync('docker exec code-sandbox echo ok', { stdio: 'pipe', timeout: 3000 })
  dockerAvailable = true
} catch {
  // Docker unavailable or sandbox container not running → fall back to local exec
  dockerAvailable = false
  console.warn('[execute] Docker 沙箱不可用（未启动 docker 或缺少 code-sandbox 容器），代码将在本机直接执行。')
}

function runInSandbox(command) {
  if (!dockerAvailable) return command
  // docker-compose 把宿主的 temp 目录挂载到沙箱容器的 /code，
  // 因此必须把命令里的宿主路径替换为容器内路径，否则容器里找不到源文件。
  const hostPathUnix = TEMP_DIR.replace(/\\/g, '/')
  const cmdInContainer = command
    .split(TEMP_DIR).join('/code')       // D:\...\temp\a.py → /code/a.py
    .split(hostPathUnix).join('/code')   // D:/.../temp/a.py → /code/a.py
  // -i      ：把学生程序的 stdin 传进容器（否则 input()/scanf/cin 读不到数据）
  // timeout ：在容器内限制执行时间，避免死循环进程在沙箱里残留、持续占用 CPU
  const safe = cmdInContainer.replace(/'/g, `'\\''`)
  return `docker exec -i --user sandbox code-sandbox bash -c "timeout 14 bash -c 'cd /code && ${safe}'"`
}

function runCommand(cmd, stdin = '') {
  return execSync(cmd, {
    timeout: 15000,
    encoding: 'utf-8',
    input: stdin || undefined,
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
    // 默认 1MB 上限：学生程序打印过多内容会直接抛 ENOBUFS
    maxBuffer: 5 * 1024 * 1024,
  })
}

export const executeRouter = Router()
executeRouter.use(authMiddleware)
executeRouter.use(rateLimit({ windowMs: 60000, max: 30, message: '代码执行过于频繁，请稍后再试' }))

const fileExtensions = {
  python: 'py',
  javascript: 'js',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  go: 'go',
}

function getJavaClassName(code) {
  const match = code.match(/(?:public\s+)?class\s+(\w+)/)
  return match ? match[1] : 'Main'
}

function buildCommand(language, filePath, code) {
  switch (language) {
    case 'python':
      return { cmd: `python3 "${filePath}" || python "${filePath}"`, need: 'python3' }
    case 'javascript':
      return { cmd: `node "${filePath}"`, need: 'node' }
    case 'java': {
      const className = getJavaClassName(code)
      const dir = path.dirname(filePath)
      const javaFile = path.join(dir, className + '.java')
      return {
        cmd: `javac -encoding utf-8 "${javaFile}" && java -cp "${dir}" ${className}`,
        need: 'JDK (javac + java)',
        setup: () => {
          if (javaFile !== filePath) {
            writeFileSync(javaFile, code, 'utf-8')
          }
          return { filePath: javaFile, className }
        },
      }
    }
    case 'cpp': {
      const exeFile = filePath.replace('.cpp', '.exe')
      return { cmd: `g++ -std=c++17 "${filePath}" -o "${exeFile}" && "${exeFile}"`, need: 'g++ (MinGW/GCC, 需支持 C++17)' }
    }
    case 'c': {
      const exeFile = filePath.replace('.c', '.exe')
      return { cmd: `gcc "${filePath}" -o "${exeFile}" && "${exeFile}"`, need: 'gcc (MinGW/GCC)' }
    }
    case 'go':
      return { cmd: `go run "${filePath}"`, need: 'Go (golang)' }
    default:
      return { cmd: null, need: null, error: `不支持的语言: ${language}` }
  }
}

/**
 * Run a piece of code in the sandbox and return { output?, error? }.
 * Never throws: runtime/compile errors are returned in `error`.
 */
function runCode(language, code, stdin = '') {
  if (!language || !code) {
    return { error: '语言和代码不能为空' }
  }
  if (typeof code !== 'string' || code.length > MAX_CODE_LEN) {
    return { error: `代码过长（最多 ${MAX_CODE_LEN} 字符）` }
  }

  const ext = fileExtensions[language]
  if (!ext) {
    return { error: `不支持的语言: ${language}` }
  }

  if (!existsSync(TEMP_DIR)) {
    mkdirSync(TEMP_DIR, { recursive: true })
  }

  const fileId = uuid()
  const fileName = `${fileId}.${ext}`
  const filePath = path.join(TEMP_DIR, fileName)

  const { cmd, need, error: configError, setup } = buildCommand(language, filePath, code)

  if (configError) {
    return { output: '', error: configError }
  }

  if (!cmd) {
    return {
      output: '',
      error: `${language} 运行时未安装。需要: ${need}\n请在服务器上安装对应的编译器。`,
    }
  }

  let actualFilePath = filePath
  let classInfo = null

  try {
    writeFileSync(filePath, code, 'utf-8')

    if (setup) {
      const result = setup()
      if (result.filePath) actualFilePath = result.filePath
      if (result.className) classInfo = result
    }

    const sandboxCmd = runInSandbox(cmd)
    const output = runCommand(sandboxCmd, stdin || '')

    return { output: output || '(无输出)' }
  } catch (err) {
    let msg = ''
    if (err.stderr) {
      msg = err.stderr
    } else if (err.stdout) {
      msg = err.stdout
    } else {
      msg = err.message || '执行出错'
    }

    // 超时：容器内 timeout 返回 124，或宿主机 execSync 超时
    const isTimeout = err.status === 124 || err.code === 'ETIMEDOUT' || /timed?\s?out/i.test(err.message || '')
    if (isTimeout) {
      msg = `执行超时（超过 14 秒）。请检查程序是否有死循环，或是否在等待输入。\n${msg}`
    } else if (err.code === 'ENOBUFS') {
      msg = '程序输出内容过多（超过 5MB），已中止执行。请检查是否有无限打印。'
    } else if (msg.includes('not found') || msg.includes('not recognized') || err.code === 'ENOENT') {
      // Detect missing compiler
      msg = `未找到 ${language} 编译器。需要安装: ${need || language + ' 运行时'}\n${msg}`
    }

    return { output: '', error: msg.slice(0, 2000) }
  } finally {
    // Cleanup
    try { unlinkSync(filePath) } catch { /* */ }
    if (actualFilePath && actualFilePath !== filePath) {
      try { unlinkSync(actualFilePath) } catch { /* */ }
    }
    // Clean .class and .exe files
    const exts = ['.class', '.exe']
    for (const ce of exts) {
      for (const fp of [filePath, actualFilePath]) {
        try { unlinkSync(fp.replace(new RegExp(`\\${ext}$`), ce)) } catch { /* */ }
      }
    }
    if (classInfo) {
      try { unlinkSync(path.join(path.dirname(filePath), classInfo.className + '.class')) } catch { /* */ }
    }
  }
}

// Normalize output for comparison: ignore extra blank lines / whitespace
function normalizeOutput(s) {
  return (s || '').replace(/\r/g, '').split('\n').map(l => l.trimEnd()).join('\n').trim()
}

executeRouter.post('/', (req, res) => {
  const { language, code, stdin } = req.body
  res.json(runCode(language, code, stdin))
})

// Auto-judge: run the student's code against a list of test cases.
// Body: { language, code, tests: [{ input, expected }] }
executeRouter.post('/test', (req, res) => {
  const { language, code, tests } = req.body

  if (!Array.isArray(tests) || tests.length === 0) {
    return res.status(400).json({ error: '缺少测试用例' })
  }
  if (tests.length > 20) {
    return res.status(400).json({ error: '测试用例过多（最多 20 个）' })
  }

  const results = tests.map((t, i) => {
    const run = runCode(language, code, t?.input ?? '')
    const actual = normalizeOutput(run.output || '')
    const expected = normalizeOutput(t?.expected || '')
    const passed = !run.error && actual === expected
    return {
      index: i + 1,
      input: t?.input ?? '',
      expected: t?.expected ?? '',
      actual: run.output || '',
      passed,
      error: run.error || '',
    }
  })

  res.json({ results })
})
