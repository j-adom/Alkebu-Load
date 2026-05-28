import crypto from 'crypto'

export interface SquareWebhookSignatureInput {
  notificationUrl: string
  rawBody: string
  signatureKey: string
}

export interface SquareWebhookSignatureValidationInput {
  notificationUrl?: string
  rawBody?: string
  signature?: string | null
  signatureKey?: string
}

export function getSquareWebhookUrl(
  serverURL = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000',
  path = '/api/webhooks/square-catalog',
): string {
  const normalizedServerURL = serverURL.replace(/\/+$/, '')
  const normalizedPath = path.startsWith('/') ? path : '/' + path

  return normalizedServerURL + normalizedPath
}

export function buildSquareWebhookSignature({
  notificationUrl,
  rawBody,
  signatureKey,
}: SquareWebhookSignatureInput): string {
  return crypto
    .createHmac('sha256', signatureKey)
    .update(notificationUrl + rawBody)
    .digest('base64')
}

export function isValidSquareWebhookSignature({
  notificationUrl,
  rawBody,
  signature,
  signatureKey,
}: SquareWebhookSignatureValidationInput): boolean {
  if (!notificationUrl || !rawBody || !signature || !signatureKey) return false

  try {
    const expected = buildSquareWebhookSignature({ notificationUrl, rawBody, signatureKey })
    const expectedBuffer = Buffer.from(expected, 'utf8')
    const signatureBuffer = Buffer.from(signature, 'utf8')

    if (expectedBuffer.length !== signatureBuffer.length) return false

    return crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  } catch {
    return false
  }
}
