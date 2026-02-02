import nodemailer from 'nodemailer';
import type { Payload } from 'payload';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface OrderConfirmationData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  items: Array<{
    productTitle: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  shippingAddress: any;
  estimatedDelivery?: string;
}

export interface AbandonedCartData {
  customerName?: string;
  customerEmail: string;
  cartId: string;
  items: Array<{
    productTitle: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  subtotal: number;
  recoveryUrl: string;
}

// Create reusable transporter using Resend SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmation(data: OrderConfirmationData): Promise<boolean> {
  try {
    const template = generateOrderConfirmationTemplate(data);
    
    await transporter.sendMail({
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: data.customerEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    console.log(`Order confirmation sent to ${data.customerEmail} for order ${data.orderNumber}`);
    return true;
  } catch (error) {
    console.error('Error sending order confirmation email:', error);
    return false;
  }
}

/**
 * Send abandoned cart recovery email
 */
export async function sendAbandonedCartEmail(data: AbandonedCartData): Promise<boolean> {
  try {
    const template = generateAbandonedCartTemplate(data);
    
    await transporter.sendMail({
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: data.customerEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    console.log(`Abandoned cart email sent to ${data.customerEmail} for cart ${data.cartId}`);
    return true;
  } catch (error) {
    console.error('Error sending abandoned cart email:', error);
    return false;
  }
}

/**
 * Send order status update email
 */
export async function sendOrderStatusUpdate(
  customerEmail: string,
  orderNumber: string,
  oldStatus: string,
  newStatus: string,
  trackingNumber?: string
): Promise<boolean> {
  try {
    const template = generateOrderStatusTemplate(orderNumber, oldStatus, newStatus, trackingNumber);
    
    await transporter.sendMail({
      from: `${process.env.FROM_NAME} <${process.env.FROM_EMAIL}>`,
      to: customerEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    console.log(`Order status update sent to ${customerEmail} for order ${orderNumber}: ${oldStatus} → ${newStatus}`);
    return true;
  } catch (error) {
    console.error('Error sending order status update email:', error);
    return false;
  }
}

/**
 * Generate order confirmation email template
 */
function generateOrderConfirmationTemplate(data: OrderConfirmationData): EmailTemplate {
  const subject = `Order Confirmation - ${data.orderNumber}`;
  
  const itemsHtml = data.items.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">
        ${item.productTitle}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">
        ${item.quantity}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">
        $${(item.unitPrice / 100).toFixed(2)}
      </td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">
        $${(item.totalPrice / 100).toFixed(2)}
      </td>
    </tr>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmation</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2c5aa0;">Alkebu-Lan Images</h1>
        <h2 style="color: #555;">Order Confirmation</h2>
      </div>
      
      <p>Dear ${data.customerName},</p>
      
      <p>Thank you for your order! We've received your order and are processing it now.</p>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Order Details</h3>
        <p><strong>Order Number:</strong> ${data.orderNumber}</p>
        <p><strong>Order Date:</strong> ${new Date().toLocaleDateString()}</p>
        ${data.estimatedDelivery ? `<p><strong>Estimated Delivery:</strong> ${data.estimatedDelivery}</p>` : ''}
      </div>
      
      <h3>Items Ordered:</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="padding: 10px; text-align: left; border-bottom: 2px solid #dee2e6;">Item</th>
            <th style="padding: 10px; text-align: center; border-bottom: 2px solid #dee2e6;">Qty</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #dee2e6;">Price</th>
            <th style="padding: 10px; text-align: right; border-bottom: 2px solid #dee2e6;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      
      <div style="border-top: 2px solid #dee2e6; padding-top: 10px;">
        <table style="width: 100%;">
          <tr>
            <td style="text-align: right; padding: 5px;"><strong>Subtotal:</strong></td>
            <td style="text-align: right; padding: 5px; width: 100px;">$${(data.subtotal / 100).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="text-align: right; padding: 5px;"><strong>Tax:</strong></td>
            <td style="text-align: right; padding: 5px;">$${(data.tax / 100).toFixed(2)}</td>
          </tr>
          <tr>
            <td style="text-align: right; padding: 5px;"><strong>Shipping:</strong></td>
            <td style="text-align: right; padding: 5px;">$${(data.shipping / 100).toFixed(2)}</td>
          </tr>
          <tr style="border-top: 1px solid #dee2e6; font-size: 18px; font-weight: bold;">
            <td style="text-align: right; padding: 10px 5px;"><strong>Total:</strong></td>
            <td style="text-align: right; padding: 10px 5px;">$${(data.total / 100).toFixed(2)}</td>
          </tr>
        </table>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Shipping Address</h3>
        <p>
          ${data.shippingAddress.firstName} ${data.shippingAddress.lastName}<br>
          ${data.shippingAddress.street}<br>
          ${data.shippingAddress.street2 ? `${data.shippingAddress.street2}<br>` : ''}
          ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.zip}<br>
          ${data.shippingAddress.country || 'US'}
        </p>
      </div>
      
      <p>We'll send you another email when your order ships with tracking information.</p>
      
      <p>Thank you for shopping with Alkebu-Lan Images!</p>
      
      <div style="border-top: 1px solid #dee2e6; padding-top: 20px; margin-top: 30px; text-align: center; color: #666;">
        <p>Alkebu-Lan Images<br>
        Nashville, TN<br>
        <a href="mailto:${process.env.FROM_EMAIL}">${process.env.FROM_EMAIL}</a></p>
      </div>
    </body>
    </html>
  `;

  const text = `
    Order Confirmation - ${data.orderNumber}
    
    Dear ${data.customerName},
    
    Thank you for your order! We've received your order and are processing it now.
    
    Order Details:
    Order Number: ${data.orderNumber}
    Order Date: ${new Date().toLocaleDateString()}
    ${data.estimatedDelivery ? `Estimated Delivery: ${data.estimatedDelivery}` : ''}
    
    Items Ordered:
    ${data.items.map(item => 
      `${item.productTitle} (Qty: ${item.quantity}) - $${(item.totalPrice / 100).toFixed(2)}`
    ).join('\n')}
    
    Order Total:
    Subtotal: $${(data.subtotal / 100).toFixed(2)}
    Tax: $${(data.tax / 100).toFixed(2)}
    Shipping: $${(data.shipping / 100).toFixed(2)}
    Total: $${(data.total / 100).toFixed(2)}
    
    Shipping Address:
    ${data.shippingAddress.firstName} ${data.shippingAddress.lastName}
    ${data.shippingAddress.street}
    ${data.shippingAddress.street2 ? `${data.shippingAddress.street2}` : ''}
    ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.zip}
    
    We'll send you another email when your order ships with tracking information.
    
    Thank you for shopping with Alkebu-Lan Images!
  `;

  return { subject, html, text };
}

/**
 * Generate abandoned cart email template
 */
function generateAbandonedCartTemplate(data: AbandonedCartData): EmailTemplate {
  const subject = "You left something in your cart";
  
  const itemsHtml = data.items.map(item => `
    <li style="margin-bottom: 10px;">
      <strong>${item.productTitle}</strong><br>
      Quantity: ${item.quantity} - $${(item.totalPrice / 100).toFixed(2)}
    </li>
  `).join('');

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Complete Your Purchase</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2c5aa0;">Alkebu-Lan Images</h1>
        <h2 style="color: #555;">Don't forget your books!</h2>
      </div>
      
      <p>Hello${data.customerName ? ` ${data.customerName}` : ''},</p>
      
      <p>We noticed you left some items in your cart. Don't let these great books get away!</p>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0;">Your Cart Items:</h3>
        <ul style="list-style: none; padding: 0;">
          ${itemsHtml}
        </ul>
        <p style="font-size: 18px; font-weight: bold; margin-top: 20px;">
          Total: $${(data.subtotal / 100).toFixed(2)}
        </p>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.recoveryUrl}" 
           style="background-color: #2c5aa0; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
          Complete Your Purchase
        </a>
      </div>
      
      <p>This link will take you directly to your cart to complete your order. Your items are reserved for a limited time.</p>
      
      <p>Thank you for choosing Alkebu-Lan Images for your reading journey!</p>
      
      <div style="border-top: 1px solid #dee2e6; padding-top: 20px; margin-top: 30px; text-align: center; color: #666;">
        <p>Alkebu-Lan Images<br>
        Nashville, TN<br>
        <a href="mailto:${process.env.FROM_EMAIL}">${process.env.FROM_EMAIL}</a></p>
      </div>
    </body>
    </html>
  `;

  const text = `
    Don't forget your books!
    
    Hello${data.customerName ? ` ${data.customerName}` : ''},
    
    We noticed you left some items in your cart. Don't let these great books get away!
    
    Your Cart Items:
    ${data.items.map(item => 
      `${item.productTitle} (Qty: ${item.quantity}) - $${(item.totalPrice / 100).toFixed(2)}`
    ).join('\n')}
    
    Total: $${(data.subtotal / 100).toFixed(2)}
    
    Complete your purchase: ${data.recoveryUrl}
    
    This link will take you directly to your cart to complete your order. Your items are reserved for a limited time.
    
    Thank you for choosing Alkebu-Lan Images for your reading journey!
  `;

  return { subject, html, text };
}

/**
 * Generate order status update template
 */
function generateOrderStatusTemplate(
  orderNumber: string,
  oldStatus: string,
  newStatus: string,
  trackingNumber?: string
): EmailTemplate {
  const statusMessages = {
    processing: "Your order is being prepared for shipment.",
    shipped: "Your order has been shipped and is on its way!",
    delivered: "Your order has been delivered.",
    cancelled: "Your order has been cancelled."
  };

  const subject = `Order Update - ${orderNumber}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Update</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2c5aa0;">Alkebu-Lan Images</h1>
        <h2 style="color: #555;">Order Update</h2>
      </div>
      
      <p>Your order <strong>${orderNumber}</strong> has been updated.</p>
      
      <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
        <p><strong>Status:</strong> ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}</p>
        <p>${statusMessages[newStatus] || `Your order status has been updated to ${newStatus}.`}</p>
        ${trackingNumber ? `<p><strong>Tracking Number:</strong> ${trackingNumber}</p>` : ''}
      </div>
      
      <p>Thank you for your business!</p>
      
      <div style="border-top: 1px solid #dee2e6; padding-top: 20px; margin-top: 30px; text-align: center; color: #666;">
        <p>Alkebu-Lan Images<br>
        Nashville, TN<br>
        <a href="mailto:${process.env.FROM_EMAIL}">${process.env.FROM_EMAIL}</a></p>
      </div>
    </body>
    </html>
  `;

  const text = `
    Order Update - ${orderNumber}
    
    Your order ${orderNumber} has been updated.
    
    Status: ${newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}
    ${statusMessages[newStatus] || `Your order status has been updated to ${newStatus}.`}
    ${trackingNumber ? `Tracking Number: ${trackingNumber}` : ''}
    
    Thank you for your business!
  `;

  return { subject, html, text };
}

/**
 * Test email configuration
 */
export async function testEmailConnection(): Promise<boolean> {
  try {
    await transporter.verify();
    console.log('Email server connection verified');
    return true;
  } catch (error) {
    console.error('Email server connection failed:', error);
    return false;
  }
}