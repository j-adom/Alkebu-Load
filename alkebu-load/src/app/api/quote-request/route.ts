import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { quoteRequestSystem, parseQuoteRequestBody } from '@/app/utils/quoteRequestSystem';
import { getClientIp, verifyTurnstileToken } from '@/app/utils/turnstile';
import { createRateLimiter } from '@/app/utils/rateLimit';

// Each request emails the customer address it names and runs paid external
// lookups, so limit per client IP and per recipient address.
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const isIpRateLimited = createRateLimiter({ windowMs: RATE_LIMIT_WINDOW_MS, max: 5 });
const isRecipientRateLimited = createRateLimiter({ windowMs: RATE_LIMIT_WINDOW_MS, max: 3 });

export async function POST(request: NextRequest) {
  try {
    const clientKey = getClientIp(request.headers);

    const body = await request.json();

    const turnstileToken = typeof body?.turnstileToken === 'string' ? body.turnstileToken.trim() : '';
    if (!turnstileToken) {
      return NextResponse.json(
        { error: 'Bot check is required. Please refresh the page and try again.' },
        { status: 400 }
      );
    }

    const turnstileResult = await verifyTurnstileToken(turnstileToken, clientKey);
    if (!turnstileResult.success) {
      return NextResponse.json(
        { error: turnstileResult.error || 'Bot check failed.' },
        { status: 403 }
      );
    }

    if (isIpRateLimited(clientKey)) {
      return NextResponse.json(
        { error: 'Too many quote requests. Please wait a while and try again.' },
        { status: 429 }
      );
    }

    // searchAnalyticsId is deliberately not read from the body: an anonymous
    // caller could otherwise flag any SearchAnalytics row as converted.
    const parsed = parseQuoteRequestBody(body);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const quoteRequest = parsed.quoteRequest;

    if (isRecipientRateLimited(quoteRequest.customerEmail)) {
      return NextResponse.json(
        { error: 'Too many quote requests. Please wait a while and try again.' },
        { status: 429 }
      );
    }

    const payload = await getPayload({ config });
    
    // Process the quote request
    const result = await quoteRequestSystem.processQuoteRequest(payload, quoteRequest);

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
        quoteId: result.quoteId,
        estimatedResponseTime: result.estimatedResponseTime,
        externalResultsFound: result.externalSearchResults?.length || 0
      });
    } else {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Quote request API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const quoteId = searchParams.get('id');
    const customerEmail = searchParams.get('email');

    if (!quoteId || !customerEmail) {
      return NextResponse.json(
        { error: 'Quote ID and customer email are required' },
        { status: 400 }
      );
    }

    const payload = await getPayload({ config });

    // Find the quote request
    const quote = await payload.findByID({
      collection: 'bookQuotes',
      id: quoteId
    });

    // Verify the email matches (basic security check)
    if (quote.customerEmail.toLowerCase() !== customerEmail.toLowerCase()) {
      return NextResponse.json(
        { error: 'Quote not found' },
        { status: 404 }
      );
    }

    // Return sanitized quote information
    const sanitizedQuote = {
      id: quote.id,
      bookTitle: quote.bookTitle,
      author: quote.author,
      isbn: quote.isbn,
      format: quote.format,
      quantity: quote.quantity,
      urgency: quote.urgency,
      status: quote.status,
      requestDate: quote.requestDate,
      quoteDate: quote.quoteDate,
      quote: quote.status === 'quote-sent' || quote.status === 'approved' ? {
        pricePerBook: quote.quote?.pricePerBook,
        totalPrice: quote.quote?.totalPrice,
        estimatedArrival: quote.quote?.estimatedArrival,
        validUntil: quote.quote?.validUntil,
        terms: quote.quote?.terms
      } : undefined,
      externalSources: quote.externalSources?.map((source: any) => ({
        source: source.source,
        available: source.available,
        estimatedPrice: source.estimatedPrice,
        estimatedDelivery: source.estimatedDelivery
      }))
    };

    return NextResponse.json(sanitizedQuote);

  } catch (error) {
    console.error('Quote lookup API error:', error);
    return NextResponse.json(
      { error: 'Quote not found' },
      { status: 404 }
    );
  }
}