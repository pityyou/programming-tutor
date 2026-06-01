import { Router } from 'express'
import { execSync } from 'child_process'
import { writeFileSync, unlinkSync, existsSync, mkdirSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuid } from 'uuid'
import { authMiddleware } from '../middleware/auth.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const TEMP_DIR = path.join(__dirname, '..', '..', 'temp')

let dockerAvailable = false
try {
  execSync('docker info', { stdio: 'pipe', timeout: 3000 })
  dockerAvailable = true
} catch { /* Docker not available, fall back to local */ }

function runInSandbox(command) {
  if (dockerAvailable) {
    // Normalize path for Docker (Windows → Unix)
    const codePath = TEMP_DIR.replace(/\\/g, '/')
    const drivePrefix = codePath.match(/^([A-Z]):/i)
    let dockerPath = codePath
    if (drivePrefix) {
      dockerPath = '/' + drivePrefix[1].toLowerCase() + codePath.slice(2)
    }
    return `docker exec --user sandbox code-sandbox bash -c "cd /code && ${command.replace(/"/g, '\\"')}"`
  }
  return command
}

function runCommand(cmd, stdin = '') {
  return execSync(cmd, {
    timeout: 15000,
    encoding: 'utf-8',
    input: stdin || undefined,
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  })
}

export const executeRouter = Router()
executeRouter.use(authMiddleware)

const fileExtensions = {
  python: 'py',
  javascript: 'js',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  go: 'go',
}

function hasCommand(cmd) {
  try {
    execSync(`where ${cmd} 2>nul || which ${cmd} 2>/dev/null || echo notfound`, { encoding: 'utf-8', timeout: 3000 })
    return true
  } catch { return false }
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

executeRouter.post('/', (req, res) => {
  const { language, code, stdin } = req.body

  if (!language || !code) {
    return res.status(400).json({ error: '语言和代码不能为空' })
  }

  const ext = fileExtensions[language]
  if (!ext) {
    return res.status(400).json({ error: `不支持的语言: ${language}` })
  }

  if (!existsSync(TEMP_DIR)) {
    mkdirSync(TEMP_DIR, { recursive: true })
  }

  const fileId = uuid()
  const fileName = `${fileId}.${ext}`
  const filePath = path.join(TEMP_DIR, fileName)

  const { cmd, need, error: configError, setup } = buildCommand(language, filePath, code)

  if (configError) {
    return res.json({ output: '', error: configError })
  }

  if (!cmd) {
    return res.json({
      output: '',
      error: `${language} 运行时未安装。需要: ${need}\n请在服务器上安装对应的编译器。`,
    })
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

    res.json({ output: output || '(无输出)' })
  } catch (err) {
    let msg = ''
    if (err.stderr) {
      msg = err.stderr
    } else if (err.stdout) {
      msg = err.stdout
    } else {
      msg = err.message || '执行出错'
    }

    // Detect missing compiler
    if (msg.includes('not found') || msg.includes('not recognized') || err.code === 'ENOENT') {
      msg = `未找到 ${language} 编译器。需要安装: ${need || language + ' 运行时'}\n${msg}`
    }

    res.json({ output: '', error: msg.slice(0, 2000) })
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
})
