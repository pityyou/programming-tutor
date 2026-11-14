/**
 * 剪贴板复制工具。
 *
 * 为什么不用 navigator.clipboard 直接复制：
 * - 该 API 只在**安全上下文**（https / localhost）可用；
 * - 本项目支持局域网 http://<内网IP>:5174 访问，此时 navigator.clipboard 为 undefined，
 *   原来的代码会静默失败（点了没反应）。
 * 所以这里优先用现代 API，失败时回退到 textarea + execCommand（http 下仍可用）。
 */
export async function copyText(text: string): Promise<boolean> {
  if (typeof window !== 'undefined' && window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // 权限被拒 / 文档失焦：继续尝试兼容方案
    }
  }
  return legacyCopy(text)
}

function legacyCopy(text: string): boolean {
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.top = '0'
    ta.style.left = '0'
    ta.style.width = '1px'
    ta.style.height = '1px'
    ta.style.padding = '0'
    ta.style.border = 'none'
    ta.style.outline = 'none'
    ta.style.boxShadow = 'none'
    ta.style.background = 'transparent'
    ta.style.opacity = '0'
    ta.style.zIndex = '-1'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    ta.setSelectionRange(0, text.length) // iOS Safari 需要
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
