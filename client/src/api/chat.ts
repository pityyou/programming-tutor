import api from './index'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatRequest {
  messages: ChatMessage[]
  provider?: string
  model?: string
  language?: string
}

export function sendMessage(
  req: ChatRequest,
  onChunk: (text: string) => void,
  signal?: AbortSignal
): Promise<void> {
  return new Promise((resolve, reject) => {
    // 开发模式直连后端（绕过代理，确保 SSE 流式不被缓冲）；
    // 用当前页面 hostname，保证通过局域网 IP 访问时也指向同一台服务器。
    const apiBase = import.meta.env.DEV
      ? `${window.location.protocol}//${window.location.hostname}:3000`
      : ''
    fetch(`${apiBase}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(req),
      signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Request failed' }))
          reject(new Error(err.error || 'Request failed'))
          return
        }
        const reader = res.body?.getReader()
        if (!reader) { resolve(); return }
        const decoder = new TextDecoder()
        let buffer = ''

        // 追加数据并归一化换行：SSE 允许 \r\n，部分代理也会改写换行符。
        // 需处理 \r 与 \n 被切分到两个 chunk 的边界情况。
        function appendChunk(text: string) {
          let t = text
          if (buffer.endsWith('\r') && t.startsWith('\n')) {
            buffer = buffer.slice(0, -1) + '\n'
            t = t.slice(1)
          }
          buffer += t.replace(/\r\n/g, '\n')
        }

        // Process every complete SSE event in the buffer (events are
        // separated by "\n\n"). Returns true when the [DONE] sentinel
        // was seen, so the caller can stop reading early.
        function processEvents(): boolean {
          let sep: number
          while ((sep = buffer.indexOf('\n\n')) !== -1) {
            const rawEvent = buffer.slice(0, sep)
            buffer = buffer.slice(sep + 2)
            for (const line of rawEvent.split('\n')) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') return true
                try {
                  const parsed = JSON.parse(data)
                  if (parsed.content) onChunk(parsed.content)
                  else if (parsed.error) reject(new Error(parsed.error))
                } catch { /* ignore incomplete/partial JSON */ }
              }
            }
          }
          return false
        }

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          appendChunk(decoder.decode(value, { stream: true }))
          if (processEvents()) {
            reader.cancel().catch(() => { /* ignore */ })
            resolve()
            return
          }
        }
        // Flush any remaining bytes (and a possible trailing event).
        appendChunk(decoder.decode())
        processEvents()
        resolve()
      })
      .catch(reject)
  })
}

export function executeCode(language: string, code: string, stdin?: string) {
  return api.post<{ output: string; error?: string }>('/execute', { language, code, stdin })
}
