import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { config as loadEnv } from 'dotenv'

type Args = {
  dataFile: string
  envFile?: string
}

type OrderEmailPayload = {
  orderNumber: string
  orderId?: string
  customerName: string
  customerEmail: string
  items: Array<{
    productTitle: string
    quantity: number
    unitPrice: number
    totalPrice: number
  }>
  subtotal: number
  tax: number
  shipping: number
  total: number
  shippingAddress: {
    firstName?: string
    lastName?: string
    company?: string
    street?: string
    street2?: string
    city?: string
    state?: string
    zip?: string
    country?: string
    phone?: string
  }
  source: string
  paymentMethod?: string
  estimatedDelivery?: string
}

function parseArgs(argv: string[]): Args {
  let dataFile: string | undefined
  let envFile: string | undefined

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    const next = argv[index + 1]

    if ((arg === '--data-file' || arg === '-d') && next) {
      dataFile = next
      index += 1
      continue
    }

    if ((arg === '--env-file' || arg === '-e') && next) {
      envFile = next
      index += 1
    }
  }

  if (!dataFile) {
    throw new Error('Usage: tsx scripts/send-manual-order-notifications.ts --data-file <path> [--env-file <path>]')
  }

  return { dataFile, envFile }
}

async function readPayload(filePath: string): Promise<OrderEmailPayload> {
  const absolutePath = path.resolve(filePath)
  const raw = await readFile(absolutePath, 'utf8')
  return JSON.parse(raw) as OrderEmailPayload
}

async function main(): Promise<void> {
  const { dataFile, envFile } = parseArgs(process.argv.slice(2))

  if (envFile) {
    const result = loadEnv({ path: path.resolve(envFile) })
    if (result.error) {
      throw result.error
    }
  }

  const payload = await readPayload(dataFile)
  const {
    sendOrderConfirmation,
    sendStaffOrderNotification,
  } = await import('../src/app/utils/emailService')

  const customerSent = await sendOrderConfirmation({
    orderNumber: payload.orderNumber,
    customerName: payload.customerName,
    customerEmail: payload.customerEmail,
    items: payload.items,
    subtotal: payload.subtotal,
    tax: payload.tax,
    shipping: payload.shipping,
    total: payload.total,
    shippingAddress: payload.shippingAddress,
    estimatedDelivery: payload.estimatedDelivery,
  })

  const staffSent = await sendStaffOrderNotification({
    orderNumber: payload.orderNumber,
    orderId: payload.orderId,
    customerName: payload.customerName,
    customerEmail: payload.customerEmail,
    items: payload.items,
    subtotal: payload.subtotal,
    tax: payload.tax,
    shipping: payload.shipping,
    total: payload.total,
    shippingAddress: payload.shippingAddress,
    source: payload.source,
    paymentMethod: payload.paymentMethod,
  })

  if (!customerSent || !staffSent) {
    throw new Error(
      `Notification send failed (customer=${String(customerSent)}, staff=${String(staffSent)})`,
    )
  }

  console.log(`Sent customer and staff notifications for order ${payload.orderNumber}`)
}

await main()
