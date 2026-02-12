import nodemailer from 'nodemailer';
import type { Payload } from 'payload';
import {
  generateOrderConfirmationTemplate,
  generateAbandonedCartTemplate,
  generateOrderStatusTemplate,
  generateStaffNotificationTemplate,
  generateDailyDigestTemplate,
} from './emailTemplates';

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

export interface StaffNotificationData {
  orderNumber: string;
  orderId?: string;
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
  source: string;
  paymentMethod?: string;
}

export interface DailyDigestData {
  date: string;
  orders: Array<{
    orderNumber: string;
    customerName: string;
    status: string;
    totalAmount: number;
    itemCount: number;
    createdAt: string;
    ageHours: number;
  }>;
  totalOrderCount: number;
  totalRevenuePending: number;
  adminUrl: string;
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

const fromLine = () => `${process.env.FROM_NAME || 'Alkebu-Lan Images'} <${process.env.FROM_EMAIL || 'orders@alkebulanimages.com'}>`;

/**
 * Send order confirmation email to customer
 */
export async function sendOrderConfirmation(data: OrderConfirmationData): Promise<boolean> {
  try {
    const template = generateOrderConfirmationTemplate(data);

    await transporter.sendMail({
      from: fromLine(),
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
 * Send abandoned cart recovery email to customer
 */
export async function sendAbandonedCartEmail(data: AbandonedCartData): Promise<boolean> {
  try {
    const template = generateAbandonedCartTemplate(data);

    await transporter.sendMail({
      from: fromLine(),
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
 * Send order status update email to customer
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
      from: fromLine(),
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
 * Send new order notification email to staff
 */
export async function sendStaffOrderNotification(data: StaffNotificationData): Promise<boolean> {
  try {
    const staffEmail = process.env.STAFF_NOTIFICATION_EMAIL || 'info@alkebulanimages.com';
    const template = generateStaffNotificationTemplate(data);

    await transporter.sendMail({
      from: fromLine(),
      to: staffEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    console.log(`Staff order notification sent to ${staffEmail} for order ${data.orderNumber}`);
    return true;
  } catch (error) {
    console.error('Error sending staff order notification:', error);
    return false;
  }
}

/**
 * Send daily outstanding orders digest to staff
 */
export async function sendDailyOrderDigest(data: DailyDigestData): Promise<boolean> {
  try {
    const staffEmail = process.env.STAFF_NOTIFICATION_EMAIL || 'info@alkebulanimages.com';
    const template = generateDailyDigestTemplate(data);

    await transporter.sendMail({
      from: fromLine(),
      to: staffEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    console.log(`Daily order digest sent to ${staffEmail}: ${data.totalOrderCount} orders`);
    return true;
  } catch (error) {
    console.error('Error sending daily order digest:', error);
    return false;
  }
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
