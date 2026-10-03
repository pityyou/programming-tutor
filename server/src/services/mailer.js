import nodemailer from 'nodemailer'
import dns from 'dns'
import { promisify } from 'util'

const lookup = promisify(dns.lookup)

let transporter = null
let devMode = false
let mailFrom = ''

// 部分网络环境（如 Clash 类代理的 fake-ip DNS）会让 `dns.resolve` 返回
// 虚假 IP（198.18.x.x），导致 SMTP 连接超时。这里用 `dns.lookup`
// （getaddrinfo，走系统解析）获取真实 IP 直连，并通过 SNI 保持证书校验。
async function resolveSmtpHost(host) {
  try {
    const { address } = await lookup(host, { family: 4 })
    if (address) return address
  } catch { /* fall through */ }
  try {
    const { address } = await lookup(host)
    if (address) return address
  } catch { /* fall through */ }
  return host
}

export async function initMailer() {
  const SMTP_HOST = process.env.SMTP_HOST || ''
  const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10)
  const SMTP_USER = process.env.SMTP_USER || ''
  const SMTP_PASS = process.env.SMTP_PASS || ''
  mailFrom = process.env.MAIL_FROM || SMTP_USER

  // 未配置 SMTP 时进入开发模式：验证码不真正发送，
  // 而是打印到服务端日志并通过接口响应返回（仅限非生产环境）。
  devMode = !SMTP_HOST && process.env.NODE_ENV !== 'production'

  if (!SMTP_HOST) {
    transporter = null
    return
  }

  const host = await resolveSmtpHost(SMTP_HOST)

  transporter = nodemailer.createTransport({
    host,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    tls: {
      servername: SMTP_HOST, // SNI 与证书域名
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 30000,
  })
}

export function mailerAvailable() {
  return !!transporter
}

export function mailerDevMode() {
  return devMode
}

/**
 * Send a password reset code by email.
 * Returns { delivered: true } when the mail was sent,
 * or { delivered: false, devCode } in dev mode (code returned for testing).
 */
export async function sendPasswordResetCode(to, code) {
  if (!transporter) {
    console.warn(`[mailer] 未配置 SMTP，验证码未发送（开发模式）。收件人: ${to}，验证码: ${code}`)
    return { delivered: false, devCode: code }
  }
  await transporter.sendMail({
    from: mailFrom,
    to,
    subject: '【编程助学智能体】密码重置验证码',
    text: `你的密码重置验证码是：${code}\n验证码 15 分钟内有效，请勿泄露给他人。`,
    html: `<p>你的密码重置验证码是：<b style="font-size:22px;letter-spacing:2px">${code}</b></p><p>验证码 15 分钟内有效，请勿泄露给他人。</p>`,
  })
  return { delivered: true }
}

/**
 * Send a registration verification code by email.
 */
export async function sendVerificationCode(to, code) {
  if (!transporter) {
    console.warn(`[mailer] 未配置 SMTP，验证码未发送（开发模式）。收件人: ${to}，验证码: ${code}`)
    return { delivered: false, devCode: code }
  }
  await transporter.sendMail({
    from: mailFrom,
    to,
    subject: '【编程助学智能体】注册验证码',
    text: `欢迎注册编程助学智能体！你的注册验证码是：${code}\n验证码 15 分钟内有效，请勿泄露给他人。`,
    html: `<p>欢迎注册编程助学智能体！</p><p>你的注册验证码是：<b style="font-size:22px;letter-spacing:2px">${code}</b></p><p>验证码 15 分钟内有效，请勿泄露给他人。</p>`,
  })
  return { delivered: true }
}
