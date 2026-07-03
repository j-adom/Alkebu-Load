import nodemailer from 'nodemailer';
import {
  generateOrderConfirmationTemplate,
  generateAbandonedCartTemplate,
  generateOrderStatusTemplate,
  generateStaffNotificationTemplate,
  generateDailyDigestTemplate,
  generateRefundNotificationTemplate,
  generateRecoveryAlertTemplate,
  type RecoveryAlertData,
} from './emailTemplates';
import { getEmailRuntimeConfig, type EmailProvider } from './emailConfig';

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailSendResult {
  success: boolean;
  provider: EmailProvider;
  host: string;
  port: number;
  secure: boolean;
  from: string;
  to: string;
  subject: string;
  messageId?: string;
  error?: string;
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

export interface RefundNotificationData {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  refundAmount: number; // cents
  reasonLabel: string; // human-readable reason
  note?: string;
  items: Array<{
    productTitle: string;
    quantity: number;
    amount: number; // cents attributed to this item
  }>;
  isPartial: boolean;
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

function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return typeof error === 'string' ? error : 'Unknown email error';
}

function getTransporter() {
  const config = getEmailRuntimeConfig();

  if (!config.configured) {
    throw new Error(`Email is not configured. Missing: ${config.missing.join(', ')}`);
  }

  return {
    config,
    transporter: nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
    }),
  };
}

const fromLine = () => {
  const config = getEmailRuntimeConfig();
  return `${config.fromName} <${config.fromEmail}>`;
};

async function sendTemplateEmail(params: {
  to: string;
  template: EmailTemplate;
}): Promise<EmailSendResult> {
  const { to, template } = params;

  try {
    const { config, transporter } = getTransporter();
    const info = await transporter.sendMail({
      from: fromLine(),
      to,
      replyTo: config.replyToEmail,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });

    return {
      success: true,
      provider: config.provider,
      host: config.host,
      port: config.port,
      secure: config.secure,
      from: fromLine(),
      to,
      subject: template.subject,
      messageId: info.messageId,
    };
  } catch (error) {
    const config = getEmailRuntimeConfig();
    const message = formatError(error);
    console.error(`Email delivery failed for "${template.subject}" to ${to}:`, error);

    return {
      success: false,
      provider: config.provider,
      host: config.host,
      port: config.port,
      secure: config.secure,
      from: fromLine(),
      to,
      subject: template.subject,
      error: message,
    };
  }
}

/**
 * Send order confirmation email to customer
 */
export async function sendOrderConfirmation(data: OrderConfirmationData): Promise<EmailSendResult> {
  const template = generateOrderConfirmationTemplate(data);
  const result = await sendTemplateEmail({
    to: data.customerEmail,
    template,
  });

  if (result.success) {
    console.log(`Order confirmation sent to ${data.customerEmail} for order ${data.orderNumber}`);
  }

  return result;
}

/**
 * Send abandoned cart recovery email to customer
 */
export async function sendAbandonedCartEmail(data: AbandonedCartData): Promise<EmailSendResult> {
  const template = generateAbandonedCartTemplate(data);
  const result = await sendTemplateEmail({
    to: data.customerEmail,
    template,
  });

  if (result.success) {
    console.log(`Abandoned cart email sent to ${data.customerEmail} for cart ${data.cartId}`);
  }

  return result;
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
): Promise<EmailSendResult> {
  const template = generateOrderStatusTemplate(orderNumber, oldStatus, newStatus, trackingNumber);
  const result = await sendTemplateEmail({
    to: customerEmail,
    template,
  });

  if (result.success) {
    console.log(`Order status update sent to ${customerEmail} for order ${orderNumber}: ${oldStatus} → ${newStatus}`);
  }

  return result;
}

/**
 * Send refund notification email to customer
 */
export async function sendRefundNotification(data: RefundNotificationData): Promise<EmailSendResult> {
  const template = generateRefundNotificationTemplate(data);
  const result = await sendTemplateEmail({
    to: data.customerEmail,
    template,
  });

  if (result.success) {
    console.log(
      `Refund notification sent to ${data.customerEmail} for order ${data.orderNumber}: $${(data.refundAmount / 100).toFixed(2)}`
    );
  }

  return result;
}

/**
 * Send new order notification email to staff
 */
export async function sendStaffOrderNotification(data: StaffNotificationData): Promise<EmailSendResult> {
  const staffEmail = getEmailRuntimeConfig().staffNotificationEmail;
  const template = generateStaffNotificationTemplate(data);
  const result = await sendTemplateEmail({
    to: staffEmail,
    template,
  });

  if (result.success) {
    console.log(`Staff order notification sent to ${staffEmail} for order ${data.orderNumber}`);
  }

  return result;
}

/**
 * Send an ad-hoc email with a pre-built subject/body (e.g. quote-request
 * notifications). Resolves with success:false rather than throwing when the
 * transport is unconfigured or delivery fails.
 */
export async function sendRawEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<EmailSendResult> {
  const { to, ...template } = params;
  return sendTemplateEmail({ to, template });
}

/**
 * Alert staff that the scheduled Stripe reconciliation recovered orders the
 * webhook missed. Recovery skips customer emails, so staff must follow up.
 */
export async function sendRecoveryAlert(data: RecoveryAlertData): Promise<EmailSendResult> {
  const staffEmail = getEmailRuntimeConfig().staffNotificationEmail;
  const template = generateRecoveryAlertTemplate(data);
  return sendTemplateEmail({ to: staffEmail, template });
}

/**
 * Send daily outstanding orders digest to staff
 */
export async function sendDailyOrderDigest(data: DailyDigestData): Promise<EmailSendResult> {
  const staffEmail = getEmailRuntimeConfig().staffNotificationEmail;
  const template = generateDailyDigestTemplate(data);
  const result = await sendTemplateEmail({
    to: staffEmail,
    template,
  });

  if (result.success) {
    console.log(`Daily order digest sent to ${staffEmail}: ${data.totalOrderCount} orders`);
  }

  return result;
}

/**
 * Test email configuration
 */
export async function testEmailConnection(): Promise<EmailSendResult> {
  try {
    const { config, transporter } = getTransporter();
    await transporter.verify();
    console.log('Email server connection verified');

    return {
      success: true,
      provider: config.provider,
      host: config.host,
      port: config.port,
      secure: config.secure,
      from: fromLine(),
      to: config.staffNotificationEmail,
      subject: 'SMTP connection test',
    };
  } catch (error) {
    const config = getEmailRuntimeConfig();
    console.error('Email server connection failed:', error);

    return {
      success: false,
      provider: config.provider,
      host: config.host,
      port: config.port,
      secure: config.secure,
      from: fromLine(),
      to: config.staffNotificationEmail,
      subject: 'SMTP connection test',
      error: formatError(error),
    };
  }
}
