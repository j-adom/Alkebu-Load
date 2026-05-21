import React from 'react'
import Link from 'next/link'

const OrderDashboardNavLink: React.FC = () => {
  return (
    <div
      style={{
        marginTop: '0.75rem',
        paddingTop: '0.75rem',
        borderTop: '1px solid var(--theme-elevation-100)',
      }}
    >
      <Link
        href="/admin/order-dashboard"
        style={{
          display: 'block',
          padding: '0.65rem 0.85rem',
          borderRadius: '0.4rem',
          textDecoration: 'none',
          color: 'var(--theme-text)',
          background: 'var(--theme-elevation-50)',
          border: '1px solid var(--theme-elevation-100)',
          fontSize: '0.9rem',
          fontWeight: 600,
        }}
      >
        Order Dashboard
        <div
          style={{
            marginTop: '0.2rem',
            fontSize: '0.75rem',
            fontWeight: 400,
            color: 'var(--theme-text-dim)',
            lineHeight: 1.4,
          }}
        >
          Process orders, add tracking, mark shipped
        </div>
      </Link>
    </div>
  )
}

export default OrderDashboardNavLink
