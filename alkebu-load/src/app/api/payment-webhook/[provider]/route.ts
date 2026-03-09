import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { getAdapter } from '@/app/lib/payments/adapters';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;

  try {
    const adapter = getAdapter(provider);
    if (!adapter) {
      return NextResponse.json(
        { error: `Unsupported payment provider: ${provider}` },
        { status: 400 },
      );
    }

    const rawBody = await request.text();

    let event;
    try {
      event = adapter.validateWebhook(rawBody, request.headers);
    } catch (error) {
      console.error(`Error validating ${provider} webhook:`, error);
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 400 },
      );
    }

    const payload = await getPayload({ config });

    await adapter.handleWebhook(payload, event);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`${provider} webhook error:`, error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, stripe-signature',
    },
  });
}
