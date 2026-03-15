#!/usr/bin/env tsx

import dotenv from 'dotenv';

dotenv.config({ path: './.env' });

const PAYLOAD_URL = process.env.PAYLOAD_PUBLIC_SERVER_URL || 'http://localhost:3000';
const PAYLOAD_API_KEY = process.env.PAYLOAD_API_KEY || '';
const PAYLOAD_ADMIN_EMAIL = process.env.PAYLOAD_ADMIN_EMAIL || '';
const PAYLOAD_ADMIN_PASSWORD = process.env.PAYLOAD_ADMIN_PASSWORD || '';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limitIndex = args.indexOf('--limit');
const LIMIT = limitIndex >= 0 ? Number.parseInt(args[limitIndex + 1], 10) : Number.POSITIVE_INFINITY;
const PAGE_SIZE = 100;

type Edition = {
  binding?: string | null;
  pricing?: {
    shippingWeight?: number | null;
  } | null;
};

type BookDoc = {
  id: string;
  title?: string | null;
  pricing?: {
    shippingWeight?: number | null;
  } | null;
  editions?: Edition[] | null;
};

let authToken = '';

const readString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
};

const normalizeBinding = (binding?: string | null): string =>
  binding?.toLowerCase().trim() || '';

const getBindingFallbackWeight = (binding?: string | null): number => {
  const normalizedBinding = normalizeBinding(binding);

  if (normalizedBinding === 'hardcover') return 16;
  if (normalizedBinding === 'ebook' || normalizedBinding === 'audiobook') return 0;
  return 8;
};

const isReliableTopLevelWeight = (weight: number | null | undefined, binding?: string | null): boolean => {
  if (typeof weight !== 'number' || weight <= 0) return false;
  if (weight !== 16) return true;
  return normalizeBinding(binding) === 'hardcover';
};

async function login(): Promise<void> {
  if (PAYLOAD_API_KEY) {
    authToken = PAYLOAD_API_KEY;
    return;
  }

  if (!PAYLOAD_ADMIN_EMAIL || !PAYLOAD_ADMIN_PASSWORD) {
    throw new Error('Set PAYLOAD_API_KEY or PAYLOAD_ADMIN_EMAIL + PAYLOAD_ADMIN_PASSWORD in .env');
  }

  const response = await fetch(`${PAYLOAD_URL}/api/users/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: PAYLOAD_ADMIN_EMAIL,
      password: PAYLOAD_ADMIN_PASSWORD,
    }),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.status} ${await response.text()}`);
  }

  const data = await response.json() as { token?: string };
  if (!data.token) {
    throw new Error('Login returned no token');
  }

  authToken = data.token;
}

async function payloadFetch(path: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = await fetch(`${PAYLOAD_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`Payload ${response.status} ${path}: ${(await response.text()).slice(0, 300)}`);
  }

  return response.json();
}

async function fetchBooks(page: number) {
  const params = new URLSearchParams({
    depth: '0',
    limit: String(PAGE_SIZE),
    page: String(page),
    sort: 'id',
  });

  return payloadFetch(`/api/books?${params.toString()}`) as Promise<{
    docs: BookDoc[];
    hasNextPage: boolean;
    nextPage?: number | null;
  }>;
}

type Stats = {
  processed: number;
  updated: number;
  editionWeightBooks: number;
  fallbackWeightBooks: number;
  manualReviewBooks: number;
};

const stats: Stats = {
  processed: 0,
  updated: 0,
  editionWeightBooks: 0,
  fallbackWeightBooks: 0,
  manualReviewBooks: 0,
};

function buildWeightUpdate(book: BookDoc) {
  const existingTopLevelWeight = book.pricing?.shippingWeight;
  const editions = Array.isArray(book.editions) ? book.editions : [];
  let usedFallback = false;
  let manualReview = false;
  let hasEditionWeight = false;

  const nextEditions = editions.map((edition) => {
    const existingEditionWeight = edition?.pricing?.shippingWeight;
    let resolvedWeight = existingEditionWeight;

    if (typeof existingEditionWeight === 'number' && existingEditionWeight > 0) {
      hasEditionWeight = true;
    } else if (isReliableTopLevelWeight(existingTopLevelWeight, edition?.binding)) {
      resolvedWeight = existingTopLevelWeight;
      hasEditionWeight = true;
    } else {
      resolvedWeight = getBindingFallbackWeight(edition?.binding);
      usedFallback = true;
      hasEditionWeight = true;

      if (!normalizeBinding(edition?.binding) && resolvedWeight === 8) {
        manualReview = true;
      }
    }

    return {
      ...edition,
      pricing: {
        ...(edition?.pricing || {}),
        shippingWeight: resolvedWeight,
      },
    };
  });

  let resolvedTopLevelWeight = existingTopLevelWeight;

  if (!isReliableTopLevelWeight(existingTopLevelWeight, nextEditions[0]?.binding)) {
    const firstEditionWeight = nextEditions.find(
      (edition) => typeof edition?.pricing?.shippingWeight === 'number' && edition.pricing.shippingWeight >= 0,
    )?.pricing?.shippingWeight;

    if (typeof firstEditionWeight === 'number') {
      resolvedTopLevelWeight = firstEditionWeight;
    } else {
      resolvedTopLevelWeight = getBindingFallbackWeight(nextEditions[0]?.binding);
      usedFallback = true;
      if (!nextEditions.length) {
        manualReview = true;
      }
    }
  }

  const changed =
    JSON.stringify(nextEditions) !== JSON.stringify(editions || []) ||
    resolvedTopLevelWeight !== existingTopLevelWeight;

  return {
    changed,
    data: {
      editions: nextEditions,
      pricing: {
        ...(book.pricing || {}),
        shippingWeight: resolvedTopLevelWeight,
      },
    },
    usedFallback,
    manualReview,
    hasEditionWeight,
  };
}

async function main() {
  await login();

  let page = 1;

  while (stats.processed < LIMIT) {
    const result = await fetchBooks(page);

    if (!result.docs.length) break;

    for (const book of result.docs) {
      if (stats.processed >= LIMIT) break;

      stats.processed += 1;
      const update = buildWeightUpdate(book);

      if (update.hasEditionWeight) stats.editionWeightBooks += 1;
      if (update.usedFallback) stats.fallbackWeightBooks += 1;
      if (update.manualReview) stats.manualReviewBooks += 1;

      if (update.changed) {
        stats.updated += 1;

        if (!DRY_RUN) {
          await payloadFetch(`/api/books/${book.id}`, {
            method: 'PATCH',
            body: JSON.stringify(update.data),
          });
        }
      }
    }

    if (!result.hasNextPage) break;
    page = result.nextPage || page + 1;
  }

  console.log(JSON.stringify({
    dryRun: DRY_RUN,
    ...stats,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
