import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getEmailRuntimeConfig } from '@/app/utils/emailConfig';

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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = sanitizeText(body?.name);
    const email = sanitizeEmail(body?.email);
    const phone = sanitizeText(body?.phone);
    const subject = sanitizeText(body?.subject);
    const message = sanitizeText(body?.message);
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

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: 'Enter a valid email address.' },
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
