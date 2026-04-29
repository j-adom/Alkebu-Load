import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getEmailRuntimeConfig } from '@/app/utils/emailConfig';

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 5;
const MAX_FIELD_LENGTHS = {
  name: 120,
  email: 254,
  phone: 40,
  subject: 160,
  message: 5000,
};

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

const verifyTurnstileToken = async (
  token: string,
  remoteIp: string,
): Promise<{ success: boolean; error?: string }> => {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    // Fail-closed: if the secret isn't configured in production, every submission
    // is rejected. This is intentional — silently letting traffic through would
    // remove the protection without anyone noticing.
    console.error('TURNSTILE_SECRET_KEY is not set; rejecting contact submission.');
    return { success: false, error: 'Bot protection is not configured on the server.' };
  }

  try {
    const body = new URLSearchParams({ secret, response: token });
    if (remoteIp && remoteIp !== 'unknown') {
      body.set('remoteip', remoteIp);
    }

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    if (!response.ok) {
      console.warn('Turnstile siteverify returned non-2xx:', response.status);
      return { success: false, error: 'Bot check failed. Please try again.' };
    }

    const data = (await response.json()) as { success?: boolean; 'error-codes'?: string[] };
    if (data.success !== true) {
      console.warn('Turnstile verification rejected token:', data['error-codes']);
      return { success: false, error: 'Bot check failed. Please refresh the page and try again.' };
    }

    return { success: true };
  } catch (err) {
    console.error('Turnstile verification request failed:', err);
    return { success: false, error: 'Bot check failed. Please try again in a moment.' };
  }
};

const sanitizeText = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const sanitizeEmail = (value: unknown): string => sanitizeText(value).toLowerCase();

const isValidEmail = (value: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const getClientKey = (request: NextRequest): string =>
  request.headers.get('cf-connecting-ip') ||
  request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
  'unknown';

const isRateLimited = (key: string): boolean => {
  const now = Date.now();
  const current = rateLimitBuckets.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  current.count += 1;
  return current.count > RATE_LIMIT_MAX;
};

const fieldIsTooLong = (field: keyof typeof MAX_FIELD_LENGTHS, value: string): boolean =>
  value.length > MAX_FIELD_LENGTHS[field];

export async function POST(request: NextRequest) {
  try {
    const clientKey = getClientKey(request);

    const body = await request.json();

    const turnstileToken = sanitizeText(body?.turnstileToken);
    if (!turnstileToken) {
      return NextResponse.json(
        { error: 'Bot check is required. Please refresh the page and try again.' },
        { status: 400 },
      );
    }

    const turnstileResult = await verifyTurnstileToken(turnstileToken, clientKey);
    if (!turnstileResult.success) {
      return NextResponse.json(
        { error: turnstileResult.error || 'Bot check failed.' },
        { status: 403 },
      );
    }

    if (isRateLimited(clientKey)) {
      return NextResponse.json(
        { error: 'Too many messages. Please wait a few minutes and try again.' },
        { status: 429 },
      );
    }

    const name = sanitizeText(body?.name);
    const email = sanitizeEmail(body?.email);
    const phone = sanitizeText(body?.phone);
    const subject = sanitizeText(body?.subject);
    const message = sanitizeText(body?.message);
    const website = sanitizeText(body?.website);
    const escapedName = escapeHtml(name);
    const escapedEmail = escapeHtml(email);
    const escapedPhone = escapeHtml(phone);
    const escapedSubject = escapeHtml(subject);
    const escapedMessage = escapeHtml(message).replace(/\n/g, '<br />');

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: 'Name, email, subject, and message are required.' },
        { status: 400 },
      );
    }

    if (website) {
      return NextResponse.json({ success: true });
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Enter a valid email address.' },
        { status: 400 },
      );
    }

    if (
      fieldIsTooLong('name', name) ||
      fieldIsTooLong('email', email) ||
      fieldIsTooLong('phone', phone) ||
      fieldIsTooLong('subject', subject) ||
      fieldIsTooLong('message', message)
    ) {
      return NextResponse.json(
        { error: 'One or more fields is too long.' },
        { status: 400 },
      );
    }

    const config = getEmailRuntimeConfig();

    if (!config.configured) {
      return NextResponse.json(
        { error: 'Contact email is not configured on the server.' },
        { status: 503 },
      );
    }

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: config.password,
      },
    });

    await transporter.sendMail({
      from: `${config.fromName} <${config.fromEmail}>`,
      to: config.staffNotificationEmail,
      replyTo: `${name} <${email}>`,
      subject: `[Contact Form] ${subject}`,
      text: [
        `Name: ${name}`,
        `Email: ${email}`,
        phone ? `Phone: ${phone}` : '',
        '',
        message,
      ]
        .filter(Boolean)
        .join('\n'),
      html: `
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> ${escapedName}</p>
        <p><strong>Email:</strong> ${escapedEmail}</p>
        ${phone ? `<p><strong>Phone:</strong> ${escapedPhone}</p>` : ''}
        <p><strong>Subject:</strong> ${escapedSubject}</p>
        <hr />
        <p>${escapedMessage}</p>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Contact form submission failed:', error);
    return NextResponse.json(
      { error: 'Unable to send your message right now. Please try again later.' },
      { status: 500 },
    );
  }
}
