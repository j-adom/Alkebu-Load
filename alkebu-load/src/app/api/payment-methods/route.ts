import { NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@payload-config';
import { listAdapters } from '@/app/lib/payments/adapters';

export async function GET() {
  const methods = listAdapters().map((adapter) => {
    const labels: Record<string, { name: string; note?: string }> = {
      stripe: { name: 'Stripe', note: 'Card payments are processed securely by Stripe.' },
      square: { name: 'Square', note: 'Card payments are processed securely by Square.' },
    };

    const { name, note } = labels[adapter.slug] || { name: adapter.slug };

    return {
      slug: adapter.slug,
      name,
      note,
    };
  });

  let defaultProvider: string | undefined;

  try {
    const payload = await getPayload({ config });
    const settings = await payload.findGlobal({
      slug: 'siteSettings',
    });
    defaultProvider = (settings as any)?.paymentProvider;
  } catch (error) {
    console.warn('Unable to load site settings for payment provider:', error);
  }

  const availableSlugs = methods.map((m) => m.slug);
  if (!defaultProvider || !availableSlugs.includes(defaultProvider)) {
    defaultProvider = availableSlugs[0];
  }

  return NextResponse.json({ methods, defaultProvider });
}
