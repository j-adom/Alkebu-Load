export type EmailProvider = 'amazon-ses-smtp' | 'smtp'

export interface EmailRuntimeConfig {
  host: string
  port: number
  secure: boolean
  user?: string
  password?: string
  fromEmail: string
  fromName: string
  replyToEmail?: string
  staffNotificationEmail: string
  provider: EmailProvider
  configured: boolean
  missing: string[]
}

const readEnv = (...keys: string[]): string | undefined => {
  for (const key of keys) {
    const value = process.env[key]?.trim()
    if (value) return value
  }

  return undefined
}

const isSesHost = (host: string): boolean => /amazonaws\.com$/i.test(host)

export function getEmailRuntimeConfig(): EmailRuntimeConfig {
  const host = readEnv('SMTP_HOST') || 'email-smtp.us-east-2.amazonaws.com'
  const port = parseInt(readEnv('SMTP_PORT') || '587', 10)
  const secure = port === 465
  const user = readEnv('SES_SMTP_USER', 'SMTP_USER')
  const password = readEnv('SES_SMTP_PASSWORD', 'SMTP_PASSWORD')
  const fromEmail = readEnv('FROM_EMAIL', 'SMTP_FROM') || 'orders@alkebulanimages.com'
  const fromName = readEnv('FROM_NAME') || 'Alkebu-Lan Images'
  const replyToEmail = readEnv('REPLY_TO_EMAIL', 'FROM_EMAIL', 'SMTP_FROM')
  const staffNotificationEmail = readEnv('STAFF_NOTIFICATION_EMAIL') || 'info@alkebulanimages.com'
  const missing: string[] = []

  if (!host) missing.push('SMTP_HOST')
  if (!user) missing.push('SES_SMTP_USER/SMTP_USER')
  if (!password) missing.push('SES_SMTP_PASSWORD/SMTP_PASSWORD')
  if (!fromEmail) missing.push('FROM_EMAIL/SMTP_FROM')

  return {
    host,
    port,
    secure,
    user,
    password,
    fromEmail,
    fromName,
    replyToEmail,
    staffNotificationEmail,
    provider: isSesHost(host) ? 'amazon-ses-smtp' : 'smtp',
    configured: missing.length === 0,
    missing,
  }
}

export function getEmailTransportOptions() {
  const config = getEmailRuntimeConfig()

  return {
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.user,
      pass: config.password,
    },
  }
}

export function shouldSkipEmailTransportVerify(): boolean {
  return process.env.NEXT_PHASE === 'phase-production-build' || process.env.SKIP_EMAIL_VERIFY === 'true'
}
