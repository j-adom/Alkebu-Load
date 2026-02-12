'use client'

import React, { useState, useEffect, useCallback } from 'react'

interface OrderItem {
  productTitle: string
  quantity: number
  unitPrice: number
  totalPrice: number
  productType: string
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
    shippedAt?: string
    deliveredAt?: string
  }
  payment?: {
    provider?: string
    paymentMethod?: string
    paymentStatus?: string
  }
  internalNotes?: string
  customerNotes?: string
  source?: string
  createdAt: string
  updatedAt: string
}

type Tab = 'attention' | 'shipped' | 'all'

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: '#E8DDD4', text: '#6B5E58', label: 'Pending' },
  paid: { bg: '#FFF3CD', text: '#856404', label: 'Paid - Needs Processing' },
  processing: { bg: '#CCE5FF', text: '#004085', label: 'Processing' },
  shipped: { bg: '#D4EDDA', text: '#155724', label: 'Shipped' },
  delivered: { bg: '#D1ECF1', text: '#0C5460', label: 'Delivered' },
  completed: { bg: '#E2E3E5', text: '#383D41', label: 'Completed' },
  cancelled: { bg: '#F8D7DA', text: '#721C24', label: 'Cancelled' },
  returned: { bg: '#F8D7DA', text: '#721C24', label: 'Returned' },
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

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function getCustomerName(order: Order): string {
  if (order.customer && typeof order.customer === 'object') {
    return order.customer.displayName || `${order.customer.firstName || ''} ${order.customer.lastName || ''}`.trim() || order.customer.email || 'Customer'
  }
  return order.guestEmail || 'Guest'
}

function getCustomerEmail(order: Order): string {
  if (order.customer && typeof order.customer === 'object') {
    return order.customer.email || ''
  }
  return order.guestEmail || ''
}

function getToken(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('payload-token') || ''
  }
  return ''
}

async function fetchOrders(filter: string): Promise<Order[]> {
  const token = getToken()
  const res = await fetch(`/api/orders?${filter}&sort=-createdAt&limit=50&depth=1`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch orders')
  const data = await res.json()
  return data.docs || []
}

async function updateOrder(id: string, data: Record<string, any>): Promise<void> {
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

export const OrderDashboard: React.FC = () => {
  const [tab, setTab] = useState<Tab>('attention')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

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
        case 'all':
          filter = ''
          break
      }
      const data = await fetchOrders(filter)
      setOrders(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [tab])

  useEffect(() => {
    setLoading(true)
    loadOrders()
  }, [loadOrders])

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(loadOrders, 60000)
    return () => clearInterval(interval)
  }, [loadOrders])

  // Refresh on tab focus
  useEffect(() => {
    const onFocus = () => loadOrders()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [loadOrders])

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
    try {
      await updateOrder(orderId, { internalNotes: note })
      setMessage({ type: 'success', text: 'Note saved' })
      await loadOrders()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
    } finally {
      setActionLoading(null)
    }
  }

  const attentionCount = tab === 'attention' ? orders.length : 0

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px', fontFamily: "'Segoe UI', Tahoma, sans-serif" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, color: '#2E5C48', fontWeight: 700 }}>
          Order Dashboard
        </h1>
        <p style={{ margin: '4px 0 0', color: '#6B5E58', fontSize: 14 }}>
          Manage online orders &middot; Last refreshed: {new Date().toLocaleTimeString()}
        </p>
      </div>

      {/* Message banner */}
      {message && (
        <div style={{
          padding: '10px 16px',
          marginBottom: 16,
          borderRadius: 6,
          backgroundColor: message.type === 'success' ? '#D4EDDA' : '#F8D7DA',
          color: message.type === 'success' ? '#155724' : '#721C24',
          fontSize: 14,
        }}>
          {message.text}
          <button
            onClick={() => setMessage(null)}
            style={{ float: 'right', border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {([
          { key: 'attention' as Tab, label: 'Needs Attention' },
          { key: 'shipped' as Tab, label: 'Shipped' },
          { key: 'all' as Tab, label: 'All Orders' },
        ]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 20px',
              border: tab === t.key ? '2px solid #2E5C48' : '2px solid #E8DDD4',
              borderRadius: 8,
              backgroundColor: tab === t.key ? '#2E5C48' : '#fff',
              color: tab === t.key ? '#FFF8EC' : '#372F2B',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 14,
              minHeight: 44,
            }}
          >
            {t.label}
          </button>
        ))}
        <button
          onClick={() => { setLoading(true); loadOrders() }}
          style={{
            marginLeft: 'auto',
            padding: '10px 16px',
            border: '2px solid #E8DDD4',
            borderRadius: 8,
            backgroundColor: '#fff',
            cursor: 'pointer',
            fontSize: 14,
            minHeight: 44,
          }}
        >
          Refresh
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div style={{ padding: 20, textAlign: 'center', color: '#721C24', backgroundColor: '#F8D7DA', borderRadius: 8 }}>
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div style={{ padding: 40, textAlign: 'center', color: '#6B5E58' }}>Loading orders...</div>
      )}

      {/* Empty state */}
      {!loading && !error && orders.length === 0 && (
        <div style={{
          padding: 40,
          textAlign: 'center',
          backgroundColor: '#FFF8EC',
          borderRadius: 8,
          border: '1px solid #E8DDD4',
        }}>
          <p style={{ fontSize: 18, color: '#2E5C48', margin: 0 }}>
            {tab === 'attention' ? 'No orders need attention right now.' : 'No orders found.'}
          </p>
        </div>
      )}

      {/* Order cards */}
      {!loading && orders.map(order => (
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
  const isStale = (Date.now() - new Date(order.createdAt).getTime()) > 24 * 60 * 60 * 1000

  return (
    <div style={{
      border: isStale && (order.status === 'paid' || order.status === 'processing')
        ? '2px solid #D4A030'
        : '1px solid #E8DDD4',
      borderRadius: 8,
      marginBottom: 12,
      backgroundColor: '#fff',
      overflow: 'hidden',
    }}>
      {/* Card header - always visible */}
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'grid',
          gridTemplateColumns: '1fr auto auto auto',
          gap: 12,
          alignItems: 'center',
          padding: '16px 20px',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          textAlign: 'left',
          minHeight: 64,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, color: '#372F2B', fontSize: 15 }}>
            {order.orderNumber}
            {isStale && (order.status === 'paid' || order.status === 'processing') && (
              <span style={{ color: '#D4A030', marginLeft: 6 }} title="Order older than 24 hours">&#9888;</span>
            )}
          </div>
          <div style={{ color: '#6B5E58', fontSize: 13, marginTop: 2 }}>
            {getCustomerName(order)} &middot; {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
          </div>
        </div>
        <span style={{
          backgroundColor: status.bg,
          color: status.text,
          padding: '4px 12px',
          borderRadius: 12,
          fontSize: 12,
          fontWeight: 600,
          whiteSpace: 'nowrap',
        }}>
          {status.label}
        </span>
        <span style={{ fontWeight: 700, color: '#2E5C48', fontSize: 16, whiteSpace: 'nowrap' }}>
          {formatCents(order.totalAmount)}
        </span>
        <span style={{ color: '#6B5E58', fontSize: 13, whiteSpace: 'nowrap' }}>
          {timeAgo(order.createdAt)}
        </span>
      </button>

      {/* Expanded detail */}
      {isExpanded && (
        <div style={{ borderTop: '1px solid #E8DDD4', padding: '20px' }}>
          {/* Customer info */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            <div>
              <h4 style={{ margin: '0 0 8px', color: '#2E5C48', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>Customer</h4>
              <p style={{ margin: 0, fontSize: 14 }}>
                {getCustomerName(order)}<br />
                <a href={`mailto:${getCustomerEmail(order)}`} style={{ color: '#3E4F7F' }}>{getCustomerEmail(order)}</a>
                {order.shippingAddress?.phone && <><br />{order.shippingAddress.phone}</>}
              </p>
            </div>
            <div>
              <h4 style={{ margin: '0 0 8px', color: '#2E5C48', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>Ship To</h4>
              {order.shippingAddress ? (
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6 }}>
                  {order.shippingAddress.firstName} {order.shippingAddress.lastName}<br />
                  {order.shippingAddress.street}
                  {order.shippingAddress.street2 && <><br />{order.shippingAddress.street2}</>}<br />
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}
                </p>
              ) : (
                <p style={{ margin: 0, fontSize: 14, color: '#6B5E58' }}>No address provided</p>
              )}
            </div>
          </div>

          {/* Items */}
          <h4 style={{ margin: '0 0 8px', color: '#2E5C48', fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.5 }}>Items</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 12, fontSize: 14 }}>
            {order.items?.map((item, i) => (
              <tr key={i}>
                <td style={{ padding: '6px 0', borderBottom: '1px solid #E8DDD4' }}>{item.productTitle}</td>
                <td style={{ padding: '6px 8px', borderBottom: '1px solid #E8DDD4', textAlign: 'center', color: '#6B5E58' }}>x{item.quantity}</td>
                <td style={{ padding: '6px 0', borderBottom: '1px solid #E8DDD4', textAlign: 'right', fontWeight: 600 }}>{formatCents(item.totalPrice)}</td>
              </tr>
            ))}
          </table>
          <div style={{ textAlign: 'right', fontSize: 13, color: '#6B5E58', marginBottom: 20 }}>
            Subtotal: {formatCents(order.subtotalAmount)} &middot; Tax: {formatCents(order.taxAmount)} &middot; Shipping: {order.shippingAmount === 0 ? 'FREE' : formatCents(order.shippingAmount)}
            <div style={{ fontWeight: 700, fontSize: 16, color: '#2E5C48', marginTop: 4 }}>Total: {formatCents(order.totalAmount)}</div>
          </div>

          {/* Customer notes */}
          {order.customerNotes && (
            <div style={{ backgroundColor: '#FFF8EC', padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 14, border: '1px solid #E8DDD4' }}>
              <strong>Customer Note:</strong> {order.customerNotes}
            </div>
          )}

          {/* Fulfillment info (if shipped) */}
          {order.fulfillment?.trackingNumber && (
            <div style={{ backgroundColor: '#D4EDDA', padding: 12, borderRadius: 6, marginBottom: 16, fontSize: 14 }}>
              <strong>Tracking:</strong> {order.fulfillment.trackingNumber} ({order.fulfillment.carrier?.toUpperCase()})
              {order.fulfillment.shippedAt && <> &middot; Shipped {new Date(order.fulfillment.shippedAt).toLocaleDateString()}</>}
            </div>
          )}

          {/* Actions */}
          <div style={{ borderTop: '1px solid #E8DDD4', paddingTop: 16 }}>
            {/* Mark Processing (for paid orders) */}
            {order.status === 'paid' && (
              <button
                onClick={() => onStatusChange(order.id, 'processing')}
                disabled={isLoading}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#3E4F7F',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                  marginRight: 8,
                  marginBottom: 12,
                  minHeight: 44,
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                {isLoading ? 'Updating...' : 'Start Processing'}
              </button>
            )}

            {/* Ship order form (for paid or processing) */}
            {(order.status === 'paid' || order.status === 'processing') && (
              <div style={{ backgroundColor: '#FDFAF5', padding: 16, borderRadius: 6, border: '1px solid #E8DDD4', marginBottom: 12 }}>
                <h4 style={{ margin: '0 0 12px', color: '#2E5C48', fontSize: 14 }}>Add Tracking &amp; Ship</h4>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'end' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <label style={{ display: 'block', fontSize: 12, color: '#6B5E58', marginBottom: 4 }}>Tracking Number</label>
                    <input
                      type="text"
                      value={tracking}
                      onChange={e => setTracking(e.target.value)}
                      placeholder="Enter tracking number"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #E8DDD4',
                        borderRadius: 6,
                        fontSize: 14,
                        minHeight: 44,
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div style={{ minWidth: 160 }}>
                    <label style={{ display: 'block', fontSize: 12, color: '#6B5E58', marginBottom: 4 }}>Carrier</label>
                    <select
                      value={carrier}
                      onChange={e => setCarrier(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #E8DDD4',
                        borderRadius: 6,
                        fontSize: 14,
                        minHeight: 44,
                        backgroundColor: '#fff',
                      }}
                    >
                      {CARRIERS.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={() => {
                      if (!tracking.trim()) {
                        alert('Please enter a tracking number')
                        return
                      }
                      onShip(order.id, tracking.trim(), carrier)
                    }}
                    disabled={isLoading}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#2E5C48',
                      color: '#FFF8EC',
                      border: 'none',
                      borderRadius: 6,
                      cursor: isLoading ? 'not-allowed' : 'pointer',
                      fontWeight: 600,
                      fontSize: 14,
                      minHeight: 44,
                      whiteSpace: 'nowrap',
                      opacity: isLoading ? 0.6 : 1,
                    }}
                  >
                    {isLoading ? 'Shipping...' : 'Mark Shipped'}
                  </button>
                </div>
              </div>
            )}

            {/* Mark Delivered (for shipped orders) */}
            {order.status === 'shipped' && (
              <button
                onClick={() => onStatusChange(order.id, 'delivered')}
                disabled={isLoading}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#2E5C48',
                  color: '#FFF8EC',
                  border: 'none',
                  borderRadius: 6,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                  marginBottom: 12,
                  minHeight: 44,
                  opacity: isLoading ? 0.6 : 1,
                }}
              >
                {isLoading ? 'Updating...' : 'Mark Delivered'}
              </button>
            )}

            {/* Internal notes */}
            <div style={{ marginTop: 8 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#6B5E58', marginBottom: 4 }}>Internal Notes</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Add staff notes..."
                  rows={2}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid #E8DDD4',
                    borderRadius: 6,
                    fontSize: 14,
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
                <button
                  onClick={() => onSaveNote(order.id, note)}
                  disabled={isLoading || note === (order.internalNotes || '')}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: note !== (order.internalNotes || '') ? '#D4A030' : '#E8DDD4',
                    color: note !== (order.internalNotes || '') ? '#372F2B' : '#6B5E58',
                    border: 'none',
                    borderRadius: 6,
                    cursor: isLoading || note === (order.internalNotes || '') ? 'not-allowed' : 'pointer',
                    fontWeight: 600,
                    fontSize: 13,
                    minHeight: 44,
                    alignSelf: 'end',
                  }}
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
