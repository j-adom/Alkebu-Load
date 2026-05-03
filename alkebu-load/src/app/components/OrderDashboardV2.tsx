'use client'

import React, { useCallback, useEffect, useState } from 'react'

interface OrderItem {
  productTitle: string
  quantity: number
  unitPrice: number
  totalPrice: number
  productType: string
  identifiers?: {
    isbn?: string
    isbn10?: string
    gtin?: string
    sku?: string
    squareVariationId?: string
    stripePriceId?: string
    edition?: string
    publisher?: string
    publishedDate?: string
  }
}

interface Order {
  id: string
  orderNumber: string
  status: string
  customer?: { displayName?: string; email?: string; firstName?: string; lastName?: string } | string
  guestEmail?: string
  items: OrderItem[]
  subtotalAmount: number
  taxAmount: number
  shippingAmount: number
  totalAmount: number
  shippingAddress?: {
    firstName?: string
    lastName?: string
    street?: string
    street2?: string
    city?: string
    state?: string
    zip?: string
    phone?: string
  }
  fulfillment?: {
    trackingNumber?: string
    carrier?: string
    shippingMethod?: string
    shippingService?: string
    shippedAt?: string
    deliveredAt?: string
  }
  payment?: {
    provider?: string
    paymentMethod?: string
    paymentStatus?: string
  }
  emailNotifications?: {
    customerConfirmation?: {
      status?: string
      recipient?: string
      provider?: string
      sentAt?: string
      error?: string
    }
    staffNotification?: {
      status?: string
      recipient?: string
      provider?: string
      sentAt?: string
      error?: string
    }
  }
  internalNotes?: string
  customerNotes?: string
  source?: string
  createdAt: string
  updatedAt: string
}

type EmailNotificationState = NonNullable<Order['emailNotifications']>['customerConfirmation']
interface StripeSessionRecord {
  id: string
  created: number
  createdAt: string
  amountTotal: number
  currency: string
  customerEmail: string
  customerName: string
  paymentStatus: string
  checkoutStatus: string
  livemode: boolean
  paymentIntentId: string
  matchedOrderId: string | null
  matchedOrderNumber: string | null
  matchedOrderStatus: string | null
  metadata: {
    cartId: string
    shippingMethod: string
  }
}

type Tab = 'attention' | 'shipped' | 'all'

const STATUS_CONFIG: Record<string, { bg: string; border: string; text: string; label: string }> = {
  pending: { bg: '#f7eadf', border: '#d9b489', text: '#8a5925', label: 'Pending payment' },
  paid: { bg: '#fff3cd', border: '#e7c768', text: '#855d00', label: 'Paid' },
  processing: { bg: '#dcecff', border: '#8fb1eb', text: '#10438f', label: 'Processing' },
  shipped: { bg: '#dff3e5', border: '#7bbc8f', text: '#1f6b35', label: 'Shipped' },
  delivered: { bg: '#dff1f5', border: '#84bcc8', text: '#125968', label: 'Delivered' },
  completed: { bg: '#ececef', border: '#b5b4bd', text: '#45444c', label: 'Completed' },
  cancelled: { bg: '#fbe3e5', border: '#df9aa3', text: '#8a2430', label: 'Cancelled' },
  returned: { bg: '#f9e0e6', border: '#e0a0ae', text: '#892743', label: 'Returned' },
}

const EMAIL_STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  pending: { bg: '#fff8e7', text: '#8a5d00', border: '#e6c56f', label: 'Pending' },
  sent: { bg: '#e4f6e8', text: '#1e6b37', border: '#8cc59a', label: 'Sent' },
  failed: { bg: '#fde9eb', text: '#8b2733', border: '#dfa0a8', label: 'Failed' },
  skipped: { bg: '#f2efe8', text: '#5f5a4f', border: '#cbc2b2', label: 'Skipped' },
}

const CARRIERS = [
  { value: 'usps', label: 'USPS (Pirate Ship)' },
  { value: 'ups', label: 'UPS' },
  { value: 'fedex', label: 'FedEx' },
  { value: 'local', label: 'Local Delivery' },
]

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return 'Not set'
  return new Date(dateStr).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function getOrderAgeHours(order: Order): number {
  return Math.round((Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60))
}

function getCustomerName(order: Order): string {
  if (order.customer && typeof order.customer === 'object') {
    return order.customer.displayName
      || `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim()
      || order.customer.email
      || 'Customer'
  }
  return order.guestEmail || 'Guest'
}

function getCustomerEmail(order: Order): string {
  if (order.customer && typeof order.customer === 'object') {
    return order.customer.email || ''
  }
  return order.guestEmail || ''
}

function getAddressPreview(order: Order): string {
  if (!order.shippingAddress) return 'No shipping address'
  const cityState = [order.shippingAddress.city, order.shippingAddress.state].filter(Boolean).join(', ')
  return [order.shippingAddress.street, cityState, order.shippingAddress.zip].filter(Boolean).join(' ')
}

function formatPublishedDate(dateStr?: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return dateStr
  return date.getFullYear().toString()
}

function getItemIdentifierSummary(item: OrderItem): string {
  const identifiers = item.identifiers || {}
  const primary =
    identifiers.isbn
      ? `ISBN ${identifiers.isbn}`
      : identifiers.gtin
        ? `GTIN ${identifiers.gtin}`
        : identifiers.sku
          ? `SKU ${identifiers.sku}`
          : ''
  const detail = [
    identifiers.edition,
    formatPublishedDate(identifiers.publishedDate),
    identifiers.publisher,
  ].filter(Boolean).join(' • ')

  return [primary, detail].filter(Boolean).join(' · ')
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function formatOrderDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getPackingSlipHtml(order: Order): string {
  const shipTo = [
    `${order.shippingAddress?.firstName || ''} ${order.shippingAddress?.lastName || ''}`.trim(),
    order.shippingAddress?.street,
    order.shippingAddress?.street2,
    [
      order.shippingAddress?.city,
      order.shippingAddress?.state,
      order.shippingAddress?.zip,
    ].filter(Boolean).join(', ').replace(', ', ', '),
  ].filter(Boolean)

  const rows = (order.items || []).map((item) => {
    const identifiers = getItemIdentifierSummary(item)
    const secondary = [
      identifiers,
      item.identifiers?.isbn10 ? `ISBN-10 ${item.identifiers.isbn10}` : '',
      item.identifiers?.sku ? `SKU ${item.identifiers.sku}` : '',
    ].filter(Boolean).join(' | ')

    return `
      <tr>
        <td class="qty">${escapeHtml(item.quantity)}</td>
        <td>
          <div class="title">${escapeHtml(item.productTitle)}</div>
          ${secondary ? `<div class="meta">${escapeHtml(secondary)}</div>` : ''}
        </td>
        <td class="price">${escapeHtml(formatCents(item.totalPrice))}</td>
      </tr>
    `
  }).join('')

  return `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Packing Slip ${escapeHtml(order.orderNumber)}</title>
        <style>
          @page {
            size: 4in 6in;
            margin: 0.14in;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            color: #111;
            font-family: Arial, Helvetica, sans-serif;
            font-size: 9px;
            line-height: 1.25;
          }

          .slip {
            width: 3.72in;
            min-height: 5.72in;
            display: flex;
            flex-direction: column;
            gap: 8px;
          }

          .top {
            display: flex;
            justify-content: space-between;
            gap: 10px;
            border-bottom: 1px solid #111;
            padding-bottom: 6px;
          }

          .brand {
            font-size: 13px;
            font-weight: 800;
            letter-spacing: 0.2px;
          }

          .store {
            margin-top: 2px;
            color: #333;
          }

          .order {
            text-align: right;
            white-space: nowrap;
          }

          .order-number {
            font-size: 12px;
            font-weight: 800;
          }

          .section-title {
            font-size: 8px;
            font-weight: 800;
            letter-spacing: 0.8px;
            text-transform: uppercase;
            color: #333;
            margin-bottom: 2px;
          }

          .ship-to {
            border-bottom: 1px solid #bbb;
            padding-bottom: 6px;
          }

          .ship-name {
            font-size: 11px;
            font-weight: 800;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th {
            border-bottom: 1px solid #111;
            padding: 0 0 3px;
            text-align: left;
            font-size: 8px;
            text-transform: uppercase;
          }

          td {
            border-bottom: 1px solid #ddd;
            padding: 4px 0;
            vertical-align: top;
          }

          .qty {
            width: 0.28in;
            font-weight: 800;
            text-align: center;
          }

          .price {
            width: 0.55in;
            text-align: right;
            white-space: nowrap;
          }

          .title {
            font-weight: 800;
          }

          .meta {
            color: #444;
            font-size: 7.5px;
            margin-top: 1px;
          }

          .totals {
            margin-left: auto;
            width: 1.55in;
            display: grid;
            gap: 2px;
          }

          .total-row {
            display: flex;
            justify-content: space-between;
            gap: 8px;
          }

          .grand {
            border-top: 1px solid #111;
            padding-top: 3px;
            font-weight: 800;
            font-size: 11px;
          }

          .footer {
            margin-top: auto;
            border-top: 1px solid #111;
            padding-top: 6px;
            display: flex;
            justify-content: space-between;
            gap: 8px;
            color: #333;
            font-size: 8px;
          }

          @media screen {
            body {
              background: #ececec;
              padding: 20px;
            }

            .slip {
              background: #fff;
              min-height: 6in;
              padding: 0.14in;
              box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
            }
          }
        </style>
      </head>
      <body>
        <main class="slip">
          <header class="top">
            <div>
              <div class="brand">Alkebu-Lan Images</div>
              <div class="store">2721 Jefferson St<br />Nashville, TN 37208</div>
            </div>
            <div class="order">
              <div class="section-title">Packing Slip</div>
              <div class="order-number">${escapeHtml(order.orderNumber)}</div>
              <div>${escapeHtml(formatOrderDate(order.createdAt))}</div>
            </div>
          </header>

          <section class="ship-to">
            <div class="section-title">Ship To</div>
            <div class="ship-name">${escapeHtml(shipTo[0] || getCustomerName(order))}</div>
            ${shipTo.slice(1).map((line) => `<div>${escapeHtml(line)}</div>`).join('')}
            ${order.guestEmail || getCustomerEmail(order) ? `<div>${escapeHtml(order.guestEmail || getCustomerEmail(order))}</div>` : ''}
          </section>

          <section>
            <table>
              <thead>
                <tr>
                  <th class="qty">Qty</th>
                  <th>Item</th>
                  <th class="price">Total</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </section>

          <section class="totals">
            <div class="total-row"><span>Subtotal</span><strong>${escapeHtml(formatCents(order.subtotalAmount))}</strong></div>
            <div class="total-row"><span>Tax</span><strong>${escapeHtml(formatCents(order.taxAmount))}</strong></div>
            <div class="total-row"><span>Shipping</span><strong>${order.shippingAmount === 0 ? 'FREE' : escapeHtml(formatCents(order.shippingAmount))}</strong></div>
            <div class="total-row grand"><span>Total</span><strong>${escapeHtml(formatCents(order.totalAmount))}</strong></div>
          </section>

          <footer class="footer">
            <div>Thank you for supporting Alkebu-Lan Images.</div>
            <div>${escapeHtml(order.fulfillment?.shippingService || order.fulfillment?.shippingMethod || '')}</div>
          </footer>
        </main>
        <script>
          window.addEventListener('load', () => {
            window.focus();
            setTimeout(() => window.print(), 150);
          });
        </script>
      </body>
    </html>`
}

function printPackingSlip(order: Order): void {
  const printWindow = window.open('', `packing-slip-${order.orderNumber}`, 'width=480,height=720')

  if (!printWindow) {
    window.alert('Allow popups for Payload admin to print packing slips.')
    return
  }

  printWindow.document.open()
  printWindow.document.write(getPackingSlipHtml(order))
  printWindow.document.close()
}

function getToken(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('payload-token') || ''
  }
  return ''
}

async function fetchOrders(filter: string): Promise<Order[]> {
  const token = getToken()
  const res = await fetch(`/api/orders?${filter}&sort=-createdAt&limit=100&depth=1`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch orders')
  const data = await res.json()
  return data.docs || []
}

async function updateOrder(id: string, data: Record<string, unknown>): Promise<void> {
  const token = getToken()
  const res = await fetch(`/api/orders/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.message || 'Failed to update order')
  }
}

async function fetchStripeOrders(): Promise<{
  docs: StripeSessionRecord[]
  unmatchedCount: number
  matchedCount: number
}> {
  const token = getToken()
  const res = await fetch('/api/stripe-orders?limit=40', {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch Stripe orders')
  return res.json()
}

function EmailBadge({ label, value }: { label: string; value?: EmailNotificationState }) {
  const tone = EMAIL_STATUS_CONFIG[value?.status || 'pending'] || EMAIL_STATUS_CONFIG.pending

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      padding: '7px 10px',
      borderRadius: 999,
      backgroundColor: tone.bg,
      border: `1px solid ${tone.border}`,
      color: tone.text,
      fontSize: 12,
      fontWeight: 700,
    }}>
      <span>{label}</span>
      <span>{tone.label}</span>
    </div>
  )
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div style={{
      flex: '1 1 180px',
      minWidth: 180,
      background: '#fffdfa',
      border: '1px solid #eadfce',
      borderRadius: 18,
      padding: 18,
      boxShadow: '0 12px 30px rgba(55, 47, 43, 0.06)',
    }}>
      <div style={{ color: '#7f6d62', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ color: '#2b2725', fontSize: 28, fontWeight: 800, lineHeight: 1.1 }}>
        {value}
      </div>
      <div style={{ color: '#6f625a', fontSize: 13, marginTop: 6 }}>
        {detail}
      </div>
    </div>
  )
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      backgroundColor: '#fff',
      border: '1px solid #eadfce',
      borderRadius: 16,
      padding: 18,
    }}>
      <h3 style={{ margin: '0 0 14px', color: '#1d5843', fontSize: 15, textTransform: 'uppercase', letterSpacing: 0.8 }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

export const OrderDashboardV2: React.FC = () => {
  const [tab, setTab] = useState<Tab>('attention')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [stripeOrders, setStripeOrders] = useState<StripeSessionRecord[]>([])
  const [stripeLoading, setStripeLoading] = useState(true)
  const [stripeError, setStripeError] = useState<string | null>(null)
  const [stripeSummary, setStripeSummary] = useState({ unmatchedCount: 0, matchedCount: 0 })

  const loadOrders = useCallback(async () => {
    try {
      setError(null)
      let filter = ''
      switch (tab) {
        case 'attention':
          filter = 'where[status][in]=paid,processing'
          break
        case 'shipped':
          filter = 'where[status][in]=shipped,delivered'
          break
        default:
          filter = ''
      }
      const data = await fetchOrders(filter)
      setOrders(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [tab])

  const loadStripeOrders = useCallback(async () => {
    try {
      setStripeError(null)
      const data = await fetchStripeOrders()
      setStripeOrders(data.docs || [])
      setStripeSummary({
        unmatchedCount: data.unmatchedCount || 0,
        matchedCount: data.matchedCount || 0,
      })
    } catch (err: any) {
      setStripeError(err.message)
    } finally {
      setStripeLoading(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    loadOrders()
  }, [loadOrders])

  useEffect(() => {
    setStripeLoading(true)
    loadStripeOrders()
  }, [loadStripeOrders])

  useEffect(() => {
    const interval = setInterval(() => {
      loadOrders()
      loadStripeOrders()
    }, 60000)
    return () => clearInterval(interval)
  }, [loadOrders, loadStripeOrders])

  useEffect(() => {
    const onFocus = () => {
      loadOrders()
      loadStripeOrders()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [loadOrders, loadStripeOrders])

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setActionLoading(orderId)
    setMessage(null)
    try {
      await updateOrder(orderId, { status: newStatus })
      setMessage({ type: 'success', text: `Order updated to ${newStatus}` })
      await loadOrders()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setActionLoading(null)
    }
  }

  const handleShipOrder = async (orderId: string, trackingNumber: string, carrier: string) => {
    setActionLoading(orderId)
    setMessage(null)
    try {
      await updateOrder(orderId, {
        status: 'shipped',
        fulfillment: {
          trackingNumber,
          carrier,
          shippedAt: new Date().toISOString(),
        },
      })
      setMessage({ type: 'success', text: 'Order marked as shipped' })
      await loadOrders()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setActionLoading(null)
    }
  }

  const handleSaveNote = async (orderId: string, note: string) => {
    setActionLoading(orderId)
    setMessage(null)
    try {
      await updateOrder(orderId, { internalNotes: note })
      setMessage({ type: 'success', text: 'Internal note saved' })
      await loadOrders()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setActionLoading(null)
    }
  }

  const normalizedQuery = query.trim().toLowerCase()
  const visibleOrders = orders
    .filter((order) => statusFilter === 'all' || order.status === statusFilter)
    .filter((order) => {
      if (!normalizedQuery) return true
      const haystack = [
        order.orderNumber,
        getCustomerName(order),
        getCustomerEmail(order),
        order.shippingAddress?.city,
        order.shippingAddress?.state,
        order.fulfillment?.trackingNumber,
        order.internalNotes,
        ...(order.items || []).flatMap((item) => [
          item.productTitle,
          item.identifiers?.isbn,
          item.identifiers?.isbn10,
          item.identifiers?.gtin,
          item.identifiers?.sku,
          item.identifiers?.edition,
          item.identifiers?.publisher,
          item.identifiers?.squareVariationId,
        ]),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedQuery)
    })
    .sort((a, b) => {
      const aNeedsAttention = a.status === 'paid' || a.status === 'processing'
      const bNeedsAttention = b.status === 'paid' || b.status === 'processing'
      const aStale = aNeedsAttention ? getOrderAgeHours(a) : -1
      const bStale = bNeedsAttention ? getOrderAgeHours(b) : -1
      return bStale - aStale || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

  const staleCount = orders.filter((order) => {
    const actionable = order.status === 'paid' || order.status === 'processing'
    return actionable && getOrderAgeHours(order) >= 24
  }).length
  const missingCustomerEmailCount = orders.filter((order) => order.emailNotifications?.customerConfirmation?.status === 'failed').length
  const visibleRevenue = visibleOrders.reduce((sum, order) => sum + order.totalAmount, 0)
  const unmatchedStripeOrders = stripeOrders.filter((session) => session.paymentStatus === 'paid' && !session.matchedOrderId)

  return (
    <div style={{
      maxWidth: 1320,
      margin: '0 auto',
      padding: '32px 18px 56px',
      fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      color: '#332b27',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #214f3f 0%, #35644f 48%, #c97c44 100%)',
        color: '#fff8ec',
        borderRadius: 28,
        padding: '28px 24px',
        boxShadow: '0 24px 48px rgba(30, 65, 51, 0.22)',
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.85, marginBottom: 10 }}>
              Payload Order Operations
            </div>
            <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.05 }}>
              Order dashboard built for quick triage
            </h1>
            <p style={{ margin: '10px 0 0', maxWidth: 700, color: '#f4eadf', fontSize: 15, lineHeight: 1.55 }}>
              Review live checkout orders, see whether Amazon SES confirmations actually sent, and move fulfillment forward without digging through raw fields.
            </p>
          </div>
          <div style={{ color: '#f4eadf', fontSize: 13 }}>
            Last refreshed {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 24 }}>
        <MetricCard label="Visible Orders" value={String(visibleOrders.length)} detail="Current list after filters" />
        <MetricCard label="Visible Revenue" value={formatCents(visibleRevenue)} detail="Total of visible orders" />
        <MetricCard label="Stale Attention" value={String(staleCount)} detail="Paid or processing for 24h+" />
        <MetricCard label="Email Failures" value={String(missingCustomerEmailCount)} detail="Customer confirmations marked failed" />
        <MetricCard label="Stripe Unmatched" value={String(stripeSummary.unmatchedCount)} detail="Paid in Stripe, missing in Payload" />
      </div>

      {message && (
        <div style={{
          padding: '12px 16px',
          marginBottom: 18,
          borderRadius: 14,
          backgroundColor: message.type === 'success' ? '#e4f6e8' : '#fde9eb',
          color: message.type === 'success' ? '#1f6b35' : '#8b2733',
          border: `1px solid ${message.type === 'success' ? '#95cc9f' : '#e0a0a8'}`,
        }}>
          {message.text}
        </div>
      )}

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center',
        padding: 18,
        borderRadius: 20,
        backgroundColor: '#fffdfa',
        border: '1px solid #eadfce',
        marginBottom: 22,
      }}>
        {([
          { key: 'attention' as Tab, label: 'Needs Attention' },
          { key: 'shipped' as Tab, label: 'Shipped' },
          { key: 'all' as Tab, label: 'All Orders' },
        ]).map((item) => (
          <button
            key={item.key}
            onClick={() => setTab(item.key)}
            style={{
              padding: '11px 16px',
              borderRadius: 999,
              border: tab === item.key ? '1px solid #1f5a44' : '1px solid #d9ccb9',
              backgroundColor: tab === item.key ? '#1f5a44' : '#fff',
              color: tab === item.key ? '#fff8ec' : '#4f433d',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {item.label}
          </button>
        ))}

        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search order #, customer, ISBN, SKU, city, tracking, note"
          style={{
            flex: '1 1 260px',
            minWidth: 240,
            padding: '12px 14px',
            borderRadius: 12,
            border: '1px solid #d9ccb9',
            backgroundColor: '#fff',
            fontSize: 14,
          }}
        />

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          style={{
            padding: '12px 14px',
            borderRadius: 12,
            border: '1px solid #d9ccb9',
            backgroundColor: '#fff',
            fontSize: 14,
            color: '#4f433d',
          }}
        >
          <option value="all">Any status</option>
          <option value="paid">Paid</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="returned">Returned</option>
        </select>

        <button
          onClick={() => {
            setLoading(true)
            setStripeLoading(true)
            loadOrders()
            loadStripeOrders()
          }}
          style={{
            padding: '12px 16px',
            borderRadius: 12,
            border: '1px solid #d9ccb9',
            backgroundColor: '#fff',
            color: '#3f3733',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Refresh
        </button>
      </div>

      <div style={{
        marginBottom: 24,
        borderRadius: 20,
        backgroundColor: '#fffdfa',
        border: '1px solid #eadfce',
        padding: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 14 }}>
          <div>
            <h2 style={{ margin: 0, color: '#1d5843', fontSize: 20 }}>Stripe Reconciliation</h2>
            <p style={{ margin: '6px 0 0', color: '#6e6259', fontSize: 14 }}>
              Recent Stripe checkout sessions, matched against Payload orders so missing webhook/order cases stand out immediately.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <EmailBadge label="Matched" value={{ status: stripeSummary.matchedCount > 0 ? 'sent' : 'pending' }} />
            <EmailBadge label="Unmatched" value={{ status: stripeSummary.unmatchedCount > 0 ? 'failed' : 'sent' }} />
          </div>
        </div>

        {stripeError && (
          <div style={{ padding: 12, borderRadius: 12, backgroundColor: '#fde9eb', color: '#8b2733', marginBottom: 12 }}>
            {stripeError}
          </div>
        )}

        {stripeLoading ? (
          <div style={{ color: '#6e6259', fontSize: 14 }}>Loading Stripe sessions...</div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {unmatchedStripeOrders.length === 0 ? (
              <div style={{
                padding: 16,
                borderRadius: 14,
                backgroundColor: '#f3fbf5',
                border: '1px solid #b8dcc0',
                color: '#1f6b35',
              }}>
                No recent paid Stripe sessions are missing from Payload.
              </div>
            ) : (
              unmatchedStripeOrders.slice(0, 8).map((session) => (
                <div
                  key={session.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 14,
                    flexWrap: 'wrap',
                    padding: 14,
                    borderRadius: 14,
                    border: '1px solid #ebc98e',
                    backgroundColor: '#fff7e8',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, color: '#6e4d12', marginBottom: 4 }}>
                      Stripe payment missing in Payload
                    </div>
                    <div style={{ fontSize: 14, color: '#4b3e36', lineHeight: 1.5 }}>
                      {session.customerName || 'Customer'} • {session.customerEmail || 'No email'}<br />
                      Session {session.id}<br />
                      {formatDate(session.createdAt)}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#1d5843' }}>
                      {formatCents(session.amountTotal)}
                    </div>
                    <div style={{ color: '#6e6259', fontSize: 13 }}>
                      {session.paymentStatus} • {session.metadata.shippingMethod || 'shipping n/a'}
                    </div>
                    <div style={{ color: '#6e6259', fontSize: 13 }}>
                      Cart {session.metadata.cartId || 'n/a'}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: 20, borderRadius: 14, backgroundColor: '#fde9eb', color: '#8b2733', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ padding: 40, textAlign: 'center', color: '#6c5f58' }}>Loading orders...</div>
      )}

      {!loading && !error && visibleOrders.length === 0 && (
        <div style={{
          padding: 40,
          textAlign: 'center',
          backgroundColor: '#fffdfa',
          borderRadius: 16,
          border: '1px solid #eadfce',
          color: '#5e514a',
        }}>
          No orders match the current view.
        </div>
      )}

      {!loading && visibleOrders.map((order) => (
        <OrderCard
          key={order.id}
          order={order}
          isExpanded={expandedId === order.id}
          onToggle={() => setExpandedId(expandedId === order.id ? null : order.id)}
          onStatusChange={handleStatusChange}
          onShip={handleShipOrder}
          onSaveNote={handleSaveNote}
          isLoading={actionLoading === order.id}
        />
      ))}
    </div>
  )
}

interface OrderCardProps {
  order: Order
  isExpanded: boolean
  onToggle: () => void
  onStatusChange: (id: string, status: string) => void
  onShip: (id: string, tracking: string, carrier: string) => void
  onSaveNote: (id: string, note: string) => void
  isLoading: boolean
}

const OrderCard: React.FC<OrderCardProps> = ({ order, isExpanded, onToggle, onStatusChange, onShip, onSaveNote, isLoading }) => {
  const [tracking, setTracking] = useState(order.fulfillment?.trackingNumber || '')
  const [carrier, setCarrier] = useState(order.fulfillment?.carrier || 'usps')
  const [note, setNote] = useState(order.internalNotes || '')
  const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending
  const ageHours = getOrderAgeHours(order)
  const isStale = (order.status === 'paid' || order.status === 'processing') && ageHours >= 24

  return (
    <div style={{
      borderRadius: 22,
      marginBottom: 16,
      backgroundColor: '#fff',
      border: isStale ? '2px solid #d6a446' : '1px solid #e8dcc9',
      boxShadow: '0 18px 36px rgba(55, 47, 43, 0.06)',
      overflow: 'hidden',
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          padding: 20,
          border: 'none',
          background: isExpanded ? '#fffaf2' : '#fff',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', gap: 16, justifyContent: 'space-between', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 280px' }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#2b2725' }}>{order.orderNumber}</span>
              <span style={{
                backgroundColor: status.bg,
                color: status.text,
                border: `1px solid ${status.border}`,
                padding: '5px 10px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 800,
              }}>
                {status.label}
              </span>
              {isStale && (
                <span style={{
                  backgroundColor: '#fff0cf',
                  color: '#865b00',
                  border: '1px solid #e5be63',
                  padding: '5px 10px',
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 800,
                }}>
                  {ageHours}h old
                </span>
              )}
            </div>

            <div style={{ color: '#3d342f', fontSize: 15, fontWeight: 700 }}>
              {getCustomerName(order)}
            </div>
            <div style={{ color: '#6e6259', fontSize: 14, marginTop: 4 }}>
              {getAddressPreview(order)}
            </div>
          </div>

          <div style={{ flex: '1 1 320px', display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <EmailBadge label="Customer email" value={order.emailNotifications?.customerConfirmation} />
            <EmailBadge label="Staff email" value={order.emailNotifications?.staffNotification} />
          </div>

          <div style={{ minWidth: 180, textAlign: 'right' }}>
            <div style={{ color: '#1d5843', fontSize: 22, fontWeight: 800 }}>
              {formatCents(order.totalAmount)}
            </div>
            <div style={{ color: '#6e6259', fontSize: 13 }}>
              {order.items?.length || 0} item{(order.items?.length || 0) === 1 ? '' : 's'} • {timeAgo(order.createdAt)}
            </div>
          </div>
        </div>
      </button>

      {isExpanded && (
        <div style={{ padding: 20, borderTop: '1px solid #eadfce', backgroundColor: '#fff' }}>
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', marginBottom: 18 }}>
            <SectionCard title="Customer">
              <div style={{ display: 'grid', gap: 8, fontSize: 14, lineHeight: 1.5 }}>
                <div><strong>Name:</strong> {getCustomerName(order)}</div>
                <div><strong>Email:</strong> {getCustomerEmail(order) || 'Not provided'}</div>
                <div><strong>Phone:</strong> {order.shippingAddress?.phone || 'Not provided'}</div>
                <div><strong>Source:</strong> {order.source || 'website'}</div>
              </div>
            </SectionCard>

            <SectionCard title="Shipping">
              <div style={{ display: 'grid', gap: 8, fontSize: 14, lineHeight: 1.5 }}>
                <div>
                  <strong>Ship to:</strong><br />
                  {order.shippingAddress?.firstName} {order.shippingAddress?.lastName}<br />
                  {order.shippingAddress?.street}<br />
                  {order.shippingAddress?.street2 ? <>{order.shippingAddress?.street2}<br /></> : null}
                  {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zip}
                </div>
                <div><strong>Method:</strong> {order.fulfillment?.shippingService || order.fulfillment?.shippingMethod || 'Standard'}</div>
                <div><strong>Tracking:</strong> {order.fulfillment?.trackingNumber || 'Not added yet'}</div>
              </div>
            </SectionCard>

            <SectionCard title="Payment & Email">
              <div style={{ display: 'grid', gap: 8, fontSize: 14, lineHeight: 1.5 }}>
                <div><strong>Payment:</strong> {(order.payment?.provider || 'stripe').toUpperCase()} • {order.payment?.paymentMethod || 'card'}</div>
                <div><strong>Payment status:</strong> {order.payment?.paymentStatus || 'pending'}</div>
                <div><strong>Customer email:</strong> {order.emailNotifications?.customerConfirmation?.status || 'pending'}</div>
                {order.emailNotifications?.customerConfirmation?.error && (
                  <div style={{ color: '#8b2733' }}><strong>Error:</strong> {order.emailNotifications.customerConfirmation.error}</div>
                )}
                <div><strong>Staff email:</strong> {order.emailNotifications?.staffNotification?.status || 'pending'}</div>
              </div>
            </SectionCard>
          </div>

          <SectionCard title="Items">
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: '#665951' }}>
                    <th style={{ padding: '0 0 10px' }}>Item</th>
                    <th style={{ padding: '0 0 10px' }}>Identifiers</th>
                    <th style={{ padding: '0 0 10px' }}>Type</th>
                    <th style={{ padding: '0 0 10px', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '0 0 10px', textAlign: 'right' }}>Unit</th>
                    <th style={{ padding: '0 0 10px', textAlign: 'right' }}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items?.map((item, index) => (
                    <tr key={`${order.id}-${index}`} style={{ borderTop: '1px solid #efe5d8' }}>
                      <td style={{ padding: '12px 0', fontWeight: 700 }}>
                        {item.productTitle}
                        {item.identifiers?.isbn10 && (
                          <div style={{ marginTop: 4, color: '#6e6259', fontSize: 12, fontWeight: 600 }}>
                            ISBN-10 {item.identifiers.isbn10}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 12px 12px 0', color: '#3d342f', minWidth: 220 }}>
                        {getItemIdentifierSummary(item) || 'Not captured'}
                        {(item.identifiers?.sku || item.identifiers?.squareVariationId || item.identifiers?.stripePriceId) && (
                          <div style={{ marginTop: 4, color: '#6e6259', fontSize: 12, lineHeight: 1.5 }}>
                            {item.identifiers?.sku ? <>SKU {item.identifiers.sku}<br /></> : null}
                            {item.identifiers?.squareVariationId ? <>Square {item.identifiers.squareVariationId}<br /></> : null}
                            {item.identifiers?.stripePriceId ? <>Stripe price {item.identifiers.stripePriceId}</> : null}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 0', color: '#6e6259' }}>{item.productType}</td>
                      <td style={{ padding: '12px 0', textAlign: 'center' }}>{item.quantity}</td>
                      <td style={{ padding: '12px 0', textAlign: 'right' }}>{formatCents(item.unitPrice)}</td>
                      <td style={{ padding: '12px 0', textAlign: 'right', fontWeight: 700 }}>{formatCents(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ minWidth: 260, display: 'grid', gap: 6, fontSize: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><strong>{formatCents(order.subtotalAmount)}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tax</span><strong>{formatCents(order.taxAmount)}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Shipping</span><strong>{order.shippingAmount === 0 ? 'FREE' : formatCents(order.shippingAmount)}</strong></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, color: '#1d5843', marginTop: 6 }}><span>Total</span><strong>{formatCents(order.totalAmount)}</strong></div>
              </div>
            </div>
          </SectionCard>

          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', marginTop: 18 }}>
            <SectionCard title="Notes">
              <div style={{ display: 'grid', gap: 10 }}>
                {order.customerNotes ? (
                  <div style={{ backgroundColor: '#fff7e7', border: '1px solid #ecd39b', borderRadius: 12, padding: 12 }}>
                    <strong>Customer note:</strong> {order.customerNotes}
                  </div>
                ) : (
                  <div style={{ color: '#756860' }}>No customer note on this order.</div>
                )}

                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={5}
                  placeholder="Internal staff notes"
                  style={{
                    width: '100%',
                    borderRadius: 12,
                    border: '1px solid #d9ccb9',
                    padding: 12,
                    fontSize: 14,
                    resize: 'vertical',
                  }}
                />
                <button
                  onClick={() => onSaveNote(order.id, note)}
                  disabled={isLoading}
                  style={{
                    padding: '11px 14px',
                    borderRadius: 12,
                    border: 'none',
                    backgroundColor: '#3c527c',
                    color: '#fff',
                    fontWeight: 700,
                    cursor: isLoading ? 'not-allowed' : 'pointer',
                    opacity: isLoading ? 0.7 : 1,
                  }}
                >
                  Save note
                </button>
              </div>
            </SectionCard>

            <SectionCard title="Actions">
              <div style={{ display: 'grid', gap: 12 }}>
                <button
                  onClick={() => printPackingSlip(order)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1px solid #1d5843',
                    backgroundColor: '#fff',
                    color: '#1d5843',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  Print 4x6 packing slip
                </button>

                {order.status === 'paid' && (
                  <button
                    onClick={() => onStatusChange(order.id, 'processing')}
                    disabled={isLoading}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: 'none',
                      backgroundColor: '#244f8f',
                      color: '#fff',
                      fontWeight: 800,
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      opacity: isLoading ? 0.7 : 1,
                    }}
                  >
                    Start processing
                  </button>
                )}

                {(order.status === 'paid' || order.status === 'processing') && (
                  <>
                    <input
                      type="text"
                      value={tracking}
                      onChange={(event) => setTracking(event.target.value)}
                      placeholder="Tracking number"
                      style={{
                        width: '100%',
                        borderRadius: 12,
                        border: '1px solid #d9ccb9',
                        padding: 12,
                        fontSize: 14,
                      }}
                    />
                    <select
                      value={carrier}
                      onChange={(event) => setCarrier(event.target.value)}
                      style={{
                        width: '100%',
                        borderRadius: 12,
                        border: '1px solid #d9ccb9',
                        padding: 12,
                        fontSize: 14,
                        backgroundColor: '#fff',
                      }}
                    >
                      {CARRIERS.map((item) => (
                        <option key={item.value} value={item.value}>{item.label}</option>
                      ))}
                    </select>
                    <button
                      onClick={() => onShip(order.id, tracking, carrier)}
                      disabled={isLoading || !tracking.trim()}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 12,
                        border: 'none',
                        backgroundColor: '#1f6b35',
                        color: '#fff',
                        fontWeight: 800,
                        cursor: isLoading || !tracking.trim() ? 'not-allowed' : 'pointer',
                        opacity: isLoading || !tracking.trim() ? 0.7 : 1,
                      }}
                    >
                      Save tracking and mark shipped
                    </button>
                  </>
                )}

                {order.status === 'shipped' && (
                  <button
                    onClick={() => onStatusChange(order.id, 'delivered')}
                    disabled={isLoading}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: 'none',
                      backgroundColor: '#0b6b7b',
                      color: '#fff',
                      fontWeight: 800,
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      opacity: isLoading ? 0.7 : 1,
                    }}
                  >
                    Mark delivered
                  </button>
                )}

                <div style={{ color: '#6e6259', fontSize: 13, lineHeight: 1.5 }}>
                  Placed {formatDate(order.createdAt)}<br />
                  Updated {formatDate(order.updatedAt)}
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      )}
    </div>
  )
}
