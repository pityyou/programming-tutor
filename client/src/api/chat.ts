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

export function sendMessage(req: ChatRequest, onChunk: (text: string) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const apiBase = import.meta.env.DEV ? 'http://localhost:3000' : ''
    fetch(`${apiBase}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(req),
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
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          const text = decoder.decode(value, { stream: true })
          const lines = text.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') { resolve(); return }
              try {
                const parsed = JSON.parse(data)
                if (parsed.content) onChunk(parsed.content)
              } catch { /* ignore parse errors */ }
            }
          }
        }
        resolve()
      })
      .catch(reject)
  })
}

export function executeCode(language: string, code: string, stdin?: string) {
  return api.post<{ output: string; error?: string }>('/execute', { language, code, stdin })
}

export function getChatHistory() {
  return api.get<{ sessions: any[] }>('/sessions')
}

export function getSessionMessages(sessionId: string) {
  return api.get<{ messages: ChatMessage[] }>(`/sessions/${sessionId}`)
}
