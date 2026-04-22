import React from 'react'

const OrderDashboardNavLink: React.FC = () => {
  return (
    <div
      style={{
        marginTop: '0.75rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid rgba(122, 93, 59, 0.18)',
      }}
    >
      <a
        href="/admin/order-dashboard"
        style={{
          display: 'block',
          padding: '0.85rem 1rem',
          borderRadius: '0.85rem',
          textDecoration: 'none',
          background: 'linear-gradient(135deg, #5f3dc4 0%, #7c4dff 100%)',
          color: '#fff',
          boxShadow: '0 10px 24px rgba(95, 61, 196, 0.18)',
        }}
      >
        <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.08em', opacity: 0.82, textTransform: 'uppercase' }}>
          Quick Access
        </div>
        <div style={{ marginTop: '0.3rem', fontSize: '0.96rem', fontWeight: 700 }}>
          Order Dashboard
        </div>
        <div style={{ marginTop: '0.3rem', fontSize: '0.82rem', lineHeight: 1.45, opacity: 0.9 }}>
          Open the improved order workflow with filters, fulfillment actions, and Stripe reconciliation.
        </div>
      </a>
    </div>
  )
}

export default OrderDashboardNavLink
