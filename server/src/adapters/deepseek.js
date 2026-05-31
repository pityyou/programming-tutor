import OpenAI from 'openai'

const API_KEY = process.env.DEEPSEEK_API_KEY || ''
const BASE_URL = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1'

let client
function getClient() {
  if (!client) {
    client = new OpenAI({ apiKey: API_KEY, baseURL: BASE_URL })
  }
  return client
}

export async function* streamDeepSeek(messages, model = 'deepseek-chat') {
  const stream = await getClient().chat.completions.create({
    model,
    messages: [{ role: 'system', content: getSystemPrompt() }, ...messages],
    stream: true,
  })

  for await (const chunk of stream) {
    const delta = chunk.choices?.[0]?.delta?.content
    if (delta) yield delta
  }
}

function getSystemPrompt() {
  return `你是一个编程学习助教，帮助学生掌握编程语言语法和编程思维。

规则：
1. 用中文回复，代码示例保留英文
2. 先引导学生思考，不要直接给完整答案
3. 结合代码示例讲解语法，示例尽量简洁
4. 鼓励学生自己动手修改代码验证理解
5. 遇到错误信息，先解释含义，再引导排查
6. 回复末尾必须附带1-2个B站教学视频搜索链接，格式为：📺 推荐视频：[视频标题](https://search.bilibili.com/all?keyword=搜索关键词)`
}
