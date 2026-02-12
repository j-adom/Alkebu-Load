import type { EmailTemplate, OrderConfirmationData, AbandonedCartData, StaffNotificationData, DailyDigestData } from './emailService';

// Afrocentric brand constants matching alkebu-web design system
const BRAND = {
  name: 'Alkebu-Lan Images',
  tagline: "Nashville's Premier African-American Bookstore",
  gold: '#D4A030',
  terracotta: '#C2703B',
  forest: '#2E5C48',
  indigo: '#3E4F7F',
  cream: '#FFF8EC',
  warmBg: '#FDFAF5',
  darkText: '#372F2B',
  mutedText: '#6B5E58',
  borderLight: '#E8DDD4',
  address: 'Nashville, TN',
  phone: '(615) 299-1899',
  website: 'alkebulanimages.com',
  email: process.env.FROM_EMAIL || 'orders@alkebulanimages.com',
};

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function emailWrapper(title: string, content: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BRAND.warmBg}; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: ${BRAND.warmBg};">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; width: 100%; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color: ${BRAND.forest}; padding: 28px 24px; text-align: center;">
              <h1 style="color: ${BRAND.gold}; font-family: Georgia, 'Times New Roman', serif; margin: 0; font-size: 26px; letter-spacing: 1px;">
                Alkebu-Lan Images
              </h1>
              <p style="color: ${BRAND.cream}; font-family: Georgia, 'Times New Roman', serif; margin: 6px 0 0; font-size: 12px; letter-spacing: 2.5px; text-transform: uppercase;">
                ${BRAND.tagline}
              </p>
            </td>
          </tr>
          <!-- Kente gradient stripe -->
          <tr>
            <td style="height: 4px; background: linear-gradient(to right, ${BRAND.gold}, ${BRAND.terracotta}, ${BRAND.forest}, ${BRAND.indigo}); font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px 28px; color: ${BRAND.darkText}; line-height: 1.6; font-size: 15px;">
              ${content}
            </td>
          </tr>
          <!-- Kente gradient stripe -->
          <tr>
            <td style="height: 4px; background: linear-gradient(to right, ${BRAND.gold}, ${BRAND.terracotta}, ${BRAND.forest}, ${BRAND.indigo}); font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: ${BRAND.forest}; padding: 24px; text-align: center;">
              <p style="color: ${BRAND.cream}; font-family: Georgia, 'Times New Roman', serif; margin: 0; font-size: 14px; line-height: 1.8;">
                Alkebu-Lan Images<br>
                ${BRAND.address} &middot; ${BRAND.phone}<br>
                <a href="https://${BRAND.website}" style="color: ${BRAND.gold}; text-decoration: none;">${BRAND.website}</a>
                &middot;
                <a href="mailto:${BRAND.email}" style="color: ${BRAND.gold}; text-decoration: none;">${BRAND.email}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function sectionBox(content: string, bgColor: string = BRAND.cream): string {
  return `<div style="background-color: ${bgColor}; padding: 20px; border-radius: 6px; margin: 20px 0; border: 1px solid ${BRAND.borderLight};">
    ${content}
  </div>`;
}

function ctaButton(text: string, url: string): string {
  return `<div style="text-align: center; margin: 28px 0;">
    <a href="${url}" style="background-color: ${BRAND.gold}; color: ${BRAND.darkText}; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block; font-size: 15px; letter-spacing: 0.5px;">
      ${text}
    </a>
  </div>`;
}

function itemsTable(items: Array<{ productTitle: string; quantity: number; unitPrice: number; totalPrice: number }>): string {
  const rows = items.map(item => `
    <tr>
      <td style="padding: 10px 8px; border-bottom: 1px solid ${BRAND.borderLight}; color: ${BRAND.darkText};">${item.productTitle}</td>
      <td style="padding: 10px 8px; border-bottom: 1px solid ${BRAND.borderLight}; text-align: center; color: ${BRAND.mutedText};">${item.quantity}</td>
      <td style="padding: 10px 8px; border-bottom: 1px solid ${BRAND.borderLight}; text-align: right; color: ${BRAND.mutedText};">${formatCents(item.unitPrice)}</td>
      <td style="padding: 10px 8px; border-bottom: 1px solid ${BRAND.borderLight}; text-align: right; font-weight: 600; color: ${BRAND.darkText};">${formatCents(item.totalPrice)}</td>
    </tr>`).join('');

  return `<table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
    <thead>
      <tr style="background-color: ${BRAND.cream};">
        <th style="padding: 10px 8px; text-align: left; border-bottom: 2px solid ${BRAND.gold}; color: ${BRAND.forest}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Item</th>
        <th style="padding: 10px 8px; text-align: center; border-bottom: 2px solid ${BRAND.gold}; color: ${BRAND.forest}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Qty</th>
        <th style="padding: 10px 8px; text-align: right; border-bottom: 2px solid ${BRAND.gold}; color: ${BRAND.forest}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Price</th>
        <th style="padding: 10px 8px; text-align: right; border-bottom: 2px solid ${BRAND.gold}; color: ${BRAND.forest}; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Total</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function totalsBlock(subtotal: number, tax: number, shipping: number, total: number): string {
  return `<table style="width: 100%; margin-top: 8px;">
    <tr>
      <td style="text-align: right; padding: 4px 8px; color: ${BRAND.mutedText};">Subtotal:</td>
      <td style="text-align: right; padding: 4px 8px; width: 100px; color: ${BRAND.darkText};">${formatCents(subtotal)}</td>
    </tr>
    <tr>
      <td style="text-align: right; padding: 4px 8px; color: ${BRAND.mutedText};">Tax:</td>
      <td style="text-align: right; padding: 4px 8px; color: ${BRAND.darkText};">${formatCents(tax)}</td>
    </tr>
    <tr>
      <td style="text-align: right; padding: 4px 8px; color: ${BRAND.mutedText};">Shipping:</td>
      <td style="text-align: right; padding: 4px 8px; color: ${BRAND.darkText};">${shipping === 0 ? 'FREE' : formatCents(shipping)}</td>
    </tr>
    <tr>
      <td style="text-align: right; padding: 12px 8px; border-top: 2px solid ${BRAND.gold}; font-size: 18px; font-weight: bold; color: ${BRAND.forest};">Total:</td>
      <td style="text-align: right; padding: 12px 8px; border-top: 2px solid ${BRAND.gold}; font-size: 18px; font-weight: bold; color: ${BRAND.forest};">${formatCents(total)}</td>
    </tr>
  </table>`;
}

function addressBlock(addr: any): string {
  if (!addr) return '<p style="color: ' + BRAND.mutedText + ';">No address provided</p>';
  return `<p style="margin: 0; line-height: 1.8;">
    ${addr.firstName || ''} ${addr.lastName || ''}<br>
    ${addr.street || ''}${addr.street2 ? `<br>${addr.street2}` : ''}<br>
    ${addr.city || ''}, ${addr.state || ''} ${addr.zip || ''}<br>
    ${addr.country || 'US'}${addr.phone ? `<br>${addr.phone}` : ''}
  </p>`;
}

// ─── ORDER CONFIRMATION (Customer) ────────────────────────────────────

export function generateOrderConfirmationTemplate(data: OrderConfirmationData): EmailTemplate {
  const subject = `Order Confirmed - ${data.orderNumber} | Alkebu-Lan Images`;

  const content = `
    <h2 style="color: ${BRAND.forest}; font-family: Georgia, 'Times New Roman', serif; margin: 0 0 8px;">Thank You for Your Order</h2>
    <p style="margin: 0 0 24px; color: ${BRAND.mutedText};">We appreciate your support of our bookstore and community.</p>

    ${sectionBox(`
      <h3 style="margin: 0 0 12px; color: ${BRAND.forest}; font-family: Georgia, 'Times New Roman', serif; font-size: 16px;">Order Details</h3>
      <p style="margin: 0;"><strong>Order Number:</strong> ${data.orderNumber}</p>
      <p style="margin: 4px 0 0;"><strong>Date:</strong> ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      ${data.estimatedDelivery ? `<p style="margin: 4px 0 0;"><strong>Estimated Delivery:</strong> ${data.estimatedDelivery}</p>` : ''}
    `)}

    <h3 style="color: ${BRAND.forest}; font-family: Georgia, 'Times New Roman', serif; font-size: 16px; margin: 24px 0 8px;">Items Ordered</h3>
    ${itemsTable(data.items)}
    ${totalsBlock(data.subtotal, data.tax, data.shipping, data.total)}

    ${sectionBox(`
      <h3 style="margin: 0 0 8px; color: ${BRAND.forest}; font-family: Georgia, 'Times New Roman', serif; font-size: 16px;">Shipping Address</h3>
      ${addressBlock(data.shippingAddress)}
    `)}

    <p style="margin: 24px 0 0;">We'll send you another email when your order ships with tracking information.</p>
    <p style="margin: 8px 0 0; color: ${BRAND.mutedText};">Questions about your order? Reply to this email or contact us at ${BRAND.phone}.</p>
  `;

  const text = `Thank You for Your Order - ${data.orderNumber}

Dear ${data.customerName},

We appreciate your support of our bookstore and community.

Order Number: ${data.orderNumber}
Date: ${new Date().toLocaleDateString()}
${data.estimatedDelivery ? `Estimated Delivery: ${data.estimatedDelivery}` : ''}

Items Ordered:
${data.items.map(item => `  ${item.productTitle} (Qty: ${item.quantity}) - ${formatCents(item.totalPrice)}`).join('\n')}

Subtotal: ${formatCents(data.subtotal)}
Tax: ${formatCents(data.tax)}
Shipping: ${data.shipping === 0 ? 'FREE' : formatCents(data.shipping)}
Total: ${formatCents(data.total)}

Shipping Address:
${data.shippingAddress?.firstName || ''} ${data.shippingAddress?.lastName || ''}
${data.shippingAddress?.street || ''}
${data.shippingAddress?.city || ''}, ${data.shippingAddress?.state || ''} ${data.shippingAddress?.zip || ''}

We'll send you another email when your order ships with tracking information.

Questions? Contact us at ${BRAND.phone} or ${BRAND.email}

Alkebu-Lan Images | ${BRAND.address} | ${BRAND.website}`;

  return { subject, html: emailWrapper('Order Confirmation', content), text };
}

// ─── ABANDONED CART (Customer) ────────────────────────────────────────

export function generateAbandonedCartTemplate(data: AbandonedCartData): EmailTemplate {
  const subject = "Your books are waiting for you | Alkebu-Lan Images";

  const itemsList = data.items.map(item => `
    <tr>
      <td style="padding: 10px 8px; border-bottom: 1px solid ${BRAND.borderLight};">
        <strong style="color: ${BRAND.darkText};">${item.productTitle}</strong><br>
        <span style="color: ${BRAND.mutedText}; font-size: 13px;">Qty: ${item.quantity} &middot; ${formatCents(item.totalPrice)}</span>
      </td>
    </tr>`).join('');

  const content = `
    <h2 style="color: ${BRAND.forest}; font-family: Georgia, 'Times New Roman', serif; margin: 0 0 8px;">Your Books Are Waiting</h2>
    <p>Hello${data.customerName ? ` ${data.customerName}` : ''},</p>
    <p>You left some items in your cart. They're still available and ready for you.</p>

    ${sectionBox(`
      <table style="width: 100%; border-collapse: collapse;">
        ${itemsList}
      </table>
      <p style="font-size: 17px; font-weight: bold; margin: 16px 0 0; color: ${BRAND.forest}; text-align: right;">
        Cart Total: ${formatCents(data.subtotal)}
      </p>
    `)}

    ${ctaButton('Complete Your Purchase', data.recoveryUrl)}

    <p style="color: ${BRAND.mutedText}; font-size: 13px;">Your items are reserved for a limited time.</p>
  `;

  const text = `Your Books Are Waiting

Hello${data.customerName ? ` ${data.customerName}` : ''},

You left some items in your cart:

${data.items.map(item => `  ${item.productTitle} (Qty: ${item.quantity}) - ${formatCents(item.totalPrice)}`).join('\n')}

Cart Total: ${formatCents(data.subtotal)}

Complete your purchase: ${data.recoveryUrl}

Alkebu-Lan Images | ${BRAND.address} | ${BRAND.website}`;

  return { subject, html: emailWrapper('Complete Your Purchase', content), text };
}

// ─── ORDER STATUS UPDATE (Customer) ───────────────────────────────────

export function generateOrderStatusTemplate(
  orderNumber: string,
  oldStatus: string,
  newStatus: string,
  trackingNumber?: string
): EmailTemplate {
  const statusConfig: Record<string, { message: string; icon: string; color: string }> = {
    processing: { message: 'Your order is being prepared for shipment.', icon: '&#128230;', color: BRAND.indigo },
    shipped: { message: 'Your order has been shipped and is on its way!', icon: '&#128666;', color: BRAND.forest },
    delivered: { message: 'Your order has been delivered. Enjoy your new books!', icon: '&#127881;', color: BRAND.gold },
    cancelled: { message: 'Your order has been cancelled. If you have questions, please contact us.', icon: '&#10060;', color: BRAND.terracotta },
    completed: { message: 'Your order is complete. Thank you for your support!', icon: '&#9989;', color: BRAND.forest },
  };

  const config = statusConfig[newStatus] || { message: `Your order status has been updated to ${newStatus}.`, icon: '&#128172;', color: BRAND.indigo };
  const subject = newStatus === 'shipped'
    ? `Your Order Has Shipped - ${orderNumber} | Alkebu-Lan Images`
    : `Order Update - ${orderNumber} | Alkebu-Lan Images`;

  const content = `
    <h2 style="color: ${BRAND.forest}; font-family: Georgia, 'Times New Roman', serif; margin: 0 0 16px;">Order Update</h2>

    ${sectionBox(`
      <p style="margin: 0; font-size: 16px;">
        <span style="font-size: 24px;">${config.icon}</span>
        <strong style="color: ${config.color}; margin-left: 8px;">${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}</strong>
      </p>
      <p style="margin: 12px 0 0;">Order <strong>${orderNumber}</strong></p>
      <p style="margin: 8px 0 0; color: ${BRAND.mutedText};">${config.message}</p>
      ${trackingNumber ? `
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid ${BRAND.borderLight};">
          <p style="margin: 0;"><strong>Tracking Number:</strong> ${trackingNumber}</p>
        </div>
      ` : ''}
    `)}

    <p style="margin: 24px 0 0; color: ${BRAND.mutedText};">Questions? Reply to this email or call us at ${BRAND.phone}.</p>
  `;

  const text = `Order Update - ${orderNumber}

Status: ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}
${config.message}
${trackingNumber ? `Tracking Number: ${trackingNumber}` : ''}

Questions? Contact us at ${BRAND.phone} or ${BRAND.email}

Alkebu-Lan Images | ${BRAND.address} | ${BRAND.website}`;

  return { subject, html: emailWrapper('Order Update', content), text };
}

// ─── STAFF ORDER NOTIFICATION ─────────────────────────────────────────

export function generateStaffNotificationTemplate(data: StaffNotificationData): EmailTemplate {
  const adminUrl = `${process.env.ORDER_ADMIN_BASE_URL || process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'}/admin/collections/orders/${data.orderId || ''}`;

  const subject = `New Order: ${data.orderNumber} - ${formatCents(data.total)} - ${data.customerName}`;

  const itemsList = data.items.map(item =>
    `<tr>
      <td style="padding: 6px 8px; border-bottom: 1px solid ${BRAND.borderLight};">${item.productTitle}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid ${BRAND.borderLight}; text-align: center;">${item.quantity}</td>
      <td style="padding: 6px 8px; border-bottom: 1px solid ${BRAND.borderLight}; text-align: right;">${formatCents(item.totalPrice)}</td>
    </tr>`).join('');

  // Staff emails are information-dense, not marketing-styled
  const content = `
    <h2 style="color: ${BRAND.forest}; font-family: Georgia, 'Times New Roman', serif; margin: 0 0 4px;">New Online Order</h2>
    <p style="margin: 0 0 20px; color: ${BRAND.mutedText}; font-size: 13px;">${new Date().toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>

    <table style="width: 100%; margin-bottom: 20px;">
      <tr>
        <td style="padding: 4px 0; width: 120px; color: ${BRAND.mutedText}; font-size: 13px;">Order Number</td>
        <td style="padding: 4px 0; font-weight: bold;">${data.orderNumber}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: ${BRAND.mutedText}; font-size: 13px;">Customer</td>
        <td style="padding: 4px 0;">${data.customerName}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: ${BRAND.mutedText}; font-size: 13px;">Email</td>
        <td style="padding: 4px 0;"><a href="mailto:${data.customerEmail}" style="color: ${BRAND.indigo};">${data.customerEmail}</a></td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: ${BRAND.mutedText}; font-size: 13px;">Payment</td>
        <td style="padding: 4px 0;">${(data.paymentMethod || 'card').toUpperCase()} via ${(data.source || 'website').charAt(0).toUpperCase() + (data.source || 'website').slice(1)}</td>
      </tr>
      <tr>
        <td style="padding: 4px 0; color: ${BRAND.mutedText}; font-size: 13px;">Total</td>
        <td style="padding: 4px 0; font-weight: bold; font-size: 18px; color: ${BRAND.forest};">${formatCents(data.total)}</td>
      </tr>
    </table>

    <h3 style="color: ${BRAND.forest}; font-size: 14px; margin: 16px 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">Items (${data.items.length})</h3>
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      ${itemsList}
    </table>

    <div style="margin-top: 16px;">
      <table style="width: 100%; font-size: 13px;">
        <tr><td style="text-align: right; padding: 2px 8px; color: ${BRAND.mutedText};">Subtotal:</td><td style="text-align: right; width: 80px;">${formatCents(data.subtotal)}</td></tr>
        <tr><td style="text-align: right; padding: 2px 8px; color: ${BRAND.mutedText};">Tax:</td><td style="text-align: right;">${formatCents(data.tax)}</td></tr>
        <tr><td style="text-align: right; padding: 2px 8px; color: ${BRAND.mutedText};">Shipping:</td><td style="text-align: right;">${data.shipping === 0 ? 'FREE' : formatCents(data.shipping)}</td></tr>
      </table>
    </div>

    ${sectionBox(`
      <h3 style="margin: 0 0 8px; color: ${BRAND.forest}; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Ship To</h3>
      ${addressBlock(data.shippingAddress)}
    `)}

    ${ctaButton('View Order in Admin', adminUrl)}

    <p style="color: ${BRAND.mutedText}; font-size: 12px; text-align: center; margin-top: 0;">Process this order from the <a href="${process.env.ORDER_ADMIN_BASE_URL || process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'}/admin/order-dashboard" style="color: ${BRAND.indigo};">Order Dashboard</a></p>
  `;

  const text = `NEW ORDER: ${data.orderNumber}

Total: ${formatCents(data.total)}
Customer: ${data.customerName} (${data.customerEmail})
Payment: ${(data.paymentMethod || 'card').toUpperCase()} via ${data.source || 'website'}

Items:
${data.items.map(item => `  ${item.productTitle} x${item.quantity} - ${formatCents(item.totalPrice)}`).join('\n')}

Subtotal: ${formatCents(data.subtotal)}
Tax: ${formatCents(data.tax)}
Shipping: ${data.shipping === 0 ? 'FREE' : formatCents(data.shipping)}

Ship To:
${data.shippingAddress?.firstName || ''} ${data.shippingAddress?.lastName || ''}
${data.shippingAddress?.street || ''}
${data.shippingAddress?.city || ''}, ${data.shippingAddress?.state || ''} ${data.shippingAddress?.zip || ''}

View order: ${adminUrl}`;

  return { subject, html: emailWrapper('New Order', content), text };
}

// ─── DAILY ORDER DIGEST (Staff) ──────────────────────────────────────

export function generateDailyDigestTemplate(data: DailyDigestData): EmailTemplate {
  const dashboardUrl = `${process.env.ORDER_ADMIN_BASE_URL || process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000'}/admin/order-dashboard`;

  const subject = data.totalOrderCount > 0
    ? `Daily Orders: ${data.totalOrderCount} order${data.totalOrderCount === 1 ? '' : 's'} need attention - ${formatCents(data.totalRevenuePending)}`
    : `Daily Orders: All clear - no outstanding orders`;

  if (data.totalOrderCount === 0) {
    const content = `
      <h2 style="color: ${BRAND.forest}; font-family: Georgia, 'Times New Roman', serif; margin: 0 0 8px;">Daily Order Report</h2>
      <p style="margin: 0 0 24px; color: ${BRAND.mutedText};">${data.date}</p>

      ${sectionBox(`
        <p style="margin: 0; text-align: center; font-size: 16px; color: ${BRAND.forest};">
          &#9989; All orders have been processed. No outstanding orders today.
        </p>
      `)}

      <p style="color: ${BRAND.mutedText}; font-size: 13px; text-align: center;">This report is sent daily at 7:00 AM CT.</p>
    `;

    return { subject, html: emailWrapper('Daily Order Report', content), text: `Daily Order Report - ${data.date}\n\nAll clear - no outstanding orders.\n\nAlkebu-Lan Images` };
  }

  const orderRows = data.orders.map(order => {
    const isStale = order.ageHours >= 24;
    const rowBg = isStale ? '#FFF3CD' : 'transparent';
    const statusColors: Record<string, string> = {
      paid: BRAND.gold,
      processing: BRAND.indigo,
    };
    const statusColor = statusColors[order.status] || BRAND.mutedText;

    return `<tr style="background-color: ${rowBg};">
      <td style="padding: 10px 8px; border-bottom: 1px solid ${BRAND.borderLight};">
        <strong>${order.orderNumber}</strong>${isStale ? ' &#9888;' : ''}<br>
        <span style="color: ${BRAND.mutedText}; font-size: 12px;">${order.customerName}</span>
      </td>
      <td style="padding: 10px 8px; border-bottom: 1px solid ${BRAND.borderLight}; text-align: center;">
        <span style="background-color: ${statusColor}; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px; text-transform: uppercase;">${order.status}</span>
      </td>
      <td style="padding: 10px 8px; border-bottom: 1px solid ${BRAND.borderLight}; text-align: right; font-weight: 600;">${formatCents(order.totalAmount)}</td>
      <td style="padding: 10px 8px; border-bottom: 1px solid ${BRAND.borderLight}; text-align: right; color: ${isStale ? BRAND.terracotta : BRAND.mutedText}; font-size: 13px;">
        ${order.ageHours}h ago
      </td>
    </tr>`;
  }).join('');

  const staleCount = data.orders.filter(o => o.ageHours >= 24).length;

  const content = `
    <h2 style="color: ${BRAND.forest}; font-family: Georgia, 'Times New Roman', serif; margin: 0 0 8px;">Daily Order Report</h2>
    <p style="margin: 0 0 24px; color: ${BRAND.mutedText};">${data.date}</p>

    <table style="width: 100%; margin-bottom: 24px;">
      <tr>
        <td style="text-align: center; padding: 16px; background-color: ${BRAND.cream}; border-radius: 6px; border: 1px solid ${BRAND.borderLight};">
          <p style="margin: 0; font-size: 28px; font-weight: bold; color: ${BRAND.forest};">${data.totalOrderCount}</p>
          <p style="margin: 4px 0 0; font-size: 12px; color: ${BRAND.mutedText}; text-transform: uppercase; letter-spacing: 1px;">Orders Pending</p>
        </td>
        <td style="width: 16px;"></td>
        <td style="text-align: center; padding: 16px; background-color: ${BRAND.cream}; border-radius: 6px; border: 1px solid ${BRAND.borderLight};">
          <p style="margin: 0; font-size: 28px; font-weight: bold; color: ${BRAND.forest};">${formatCents(data.totalRevenuePending)}</p>
          <p style="margin: 4px 0 0; font-size: 12px; color: ${BRAND.mutedText}; text-transform: uppercase; letter-spacing: 1px;">Revenue Pending</p>
        </td>
      </tr>
    </table>

    ${staleCount > 0 ? `<p style="background-color: #FFF3CD; padding: 10px 14px; border-radius: 6px; border-left: 4px solid ${BRAND.gold}; font-size: 13px; color: ${BRAND.darkText};">
      &#9888; <strong>${staleCount} order${staleCount === 1 ? '' : 's'}</strong> older than 24 hours
    </p>` : ''}

    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <thead>
        <tr style="background-color: ${BRAND.cream};">
          <th style="padding: 8px; text-align: left; border-bottom: 2px solid ${BRAND.gold}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: ${BRAND.forest};">Order</th>
          <th style="padding: 8px; text-align: center; border-bottom: 2px solid ${BRAND.gold}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: ${BRAND.forest};">Status</th>
          <th style="padding: 8px; text-align: right; border-bottom: 2px solid ${BRAND.gold}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: ${BRAND.forest};">Amount</th>
          <th style="padding: 8px; text-align: right; border-bottom: 2px solid ${BRAND.gold}; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; color: ${BRAND.forest};">Age</th>
        </tr>
      </thead>
      <tbody>
        ${orderRows}
      </tbody>
    </table>

    ${ctaButton('Open Order Dashboard', dashboardUrl)}

    <p style="color: ${BRAND.mutedText}; font-size: 12px; text-align: center;">This report is sent daily at 7:00 AM CT.</p>
  `;

  const text = `Daily Order Report - ${data.date}

${data.totalOrderCount} orders need attention | ${formatCents(data.totalRevenuePending)} pending revenue
${staleCount > 0 ? `WARNING: ${staleCount} order(s) older than 24 hours\n` : ''}
Outstanding Orders:
${data.orders.map(o => `  ${o.orderNumber} | ${o.status.toUpperCase()} | ${formatCents(o.totalAmount)} | ${o.customerName} | ${o.ageHours}h ago`).join('\n')}

Open dashboard: ${dashboardUrl}

Alkebu-Lan Images`;

  return { subject, html: emailWrapper('Daily Order Report', content), text };
}
