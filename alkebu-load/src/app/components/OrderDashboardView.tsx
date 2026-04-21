import React from 'react'
import { OrderDashboardV2 } from './OrderDashboardV2'

const OrderDashboardView: React.FC = () => {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #f6efe4 0%, #fcfaf6 42%, #f7f2ea 100%)' }}>
      <OrderDashboardV2 />
    </div>
  )
}

export default OrderDashboardView
