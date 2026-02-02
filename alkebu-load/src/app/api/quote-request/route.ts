import { NextRequest, NextResponse } from 'next/server';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { quoteRequestSystem, QuoteRequest } from '@/app/utils/quoteRequestSystem';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const requiredFields = ['bookTitle', 'customerName', 'customerEmail', 'quantity'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Field "${field}" is required` },
          { status: 400 }
        );
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.customerEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate quantity
    if (body.quantity < 1 || body.quantity > 100) {
      return NextResponse.json(
        { error: 'Quantity must be between 1 and 100' },
        { status: 400 }
      );
    }

    // Construct quote request
    const quoteRequest: QuoteRequest = {
      bookTitle: body.bookTitle.trim(),
      author: body.author?.trim(),
      isbn: body.isbn?.trim(),
      format: body.format || 'any',
      quantity: parseInt(body.quantity),
      urgency: body.urgency || 'normal',
      maxBudget: body.maxBudget ? parseFloat(body.maxBudget) : undefined,
      specialInstructions: body.specialInstructions?.trim(),
      customerName: body.customerName.trim(),
      customerEmail: body.customerEmail.trim().toLowerCase(),
      customerPhone: body.customerPhone?.trim(),
      preferredContact: body.preferredContact || 'email',
      requestSource: body.requestSource || 'website-search'
    };

    const payload = await getPayload({ config });
    
    // Process the quote request
    const result = await quoteRequestSystem.processQuoteRequest(
      payload,
      quoteRequest,
      body.searchAnalyticsId
    );

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