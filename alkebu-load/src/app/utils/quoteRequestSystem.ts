import { externalBookAPI, ExternalBookData } from './externalBookAPI';

export interface QuoteRequest {
  bookTitle: string;
  author?: string;
  isbn?: string;
  format?: 'any' | 'hardcover' | 'paperback' | 'mass-market' | 'ebook' | 'audiobook';
  quantity: number;
  urgency: 'normal' | 'rush' | 'asap';
  maxBudget?: number;
  specialInstructions?: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  preferredContact: 'email' | 'phone' | 'either';
  requestSource: 'website-search' | 'in-store' | 'phone' | 'email' | 'social-media';
}

export interface QuoteResponse {
  success: boolean;
  quoteId?: string;
  estimatedResponseTime?: string;
  message: string;
  externalSearchResults?: ExternalBookData[];
}

export interface QuoteEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

class QuoteRequestSystem {
  
  /**
   * Process a new quote request
   */
  async processQuoteRequest(
    payload: any,
    quoteRequest: QuoteRequest,
    searchAnalyticsId?: string
  ): Promise<QuoteResponse> {
    try {
      // Search external sources for the requested book
      const externalResults = await this.searchExternalSources(quoteRequest);

      // Create the quote request record
      const quoteRecord = await payload.create({
        collection: 'bookQuotes',
        data: {
          bookTitle: quoteRequest.bookTitle,
          author: quoteRequest.author,
          isbn: quoteRequest.isbn,
          format: quoteRequest.format,
          quantity: quoteRequest.quantity,
          urgency: quoteRequest.urgency,
          maxBudget: quoteRequest.maxBudget,
          specialInstructions: quoteRequest.specialInstructions,
          customerName: quoteRequest.customerName,
          customerEmail: quoteRequest.customerEmail,
          customerPhone: quoteRequest.customerPhone,
          preferredContact: quoteRequest.preferredContact,
          requestSource: quoteRequest.requestSource,
          status: 'pending',
          requestDate: new Date().toISOString(),
          externalSources: this.formatExternalSourcesForQuote(externalResults.results),
          searchAnalyticsId: searchAnalyticsId,
          communications: [{
            date: new Date().toISOString(),
            type: 'initial-request',
            subject: 'Book Quote Request Received',
            content: this.generateInitialRequestContent(quoteRequest)
          }]
        }
      });

      // Send confirmation email to customer
      await this.sendCustomerConfirmationEmail(quoteRequest, quoteRecord.id, externalResults.results);

      // Send notification email to staff
      await this.sendStaffNotificationEmail(payload, quoteRequest, quoteRecord.id, externalResults.results);

      // Update search analytics if provided
      if (searchAnalyticsId) {
        await this.updateSearchAnalytics(payload, searchAnalyticsId, quoteRecord.id);
      }

      // Determine estimated response time
      const estimatedResponseTime = this.calculateEstimatedResponseTime(quoteRequest.urgency);

      return {
        success: true,
        quoteId: quoteRecord.id,
        estimatedResponseTime,
        message: `Thank you for your quote request! We've found ${externalResults.results.length} potential matches and will respond within ${estimatedResponseTime}.`,
        externalSearchResults: externalResults.results
      };

    } catch (error) {
      console.error('Error processing quote request:', error);
      return {
        success: false,
        message: 'Sorry, there was an error processing your quote request. Please try again or contact us directly.'
      };
    }
  }

  /**
   * Search external sources for the requested book
   */
  private async searchExternalSources(quoteRequest: QuoteRequest): Promise<{
    results: ExternalBookData[];
    sources: string[];
    totalSearchTime: number;
  }> {
    // Try ISBN search first if available
    if (quoteRequest.isbn) {
      const isbnResult = await externalBookAPI.getBookByISBN(quoteRequest.isbn);
      if (isbnResult) {
        return {
          results: [isbnResult],
          sources: ['ISBN lookup'],
          totalSearchTime: 0
        };
      }
    }

    // Fall back to title and author search
    const searchQuery = [quoteRequest.bookTitle, quoteRequest.author].filter(Boolean).join(' ');
    
    return await externalBookAPI.searchAllSources(searchQuery, {
      includeISBNdb: true,
      includeGoogleBooks: true,
      includeOpenLibrary: true,
      includeBookshop: false, // Disabled for quote requests
      maxResults: 10
    });
  }

  /**
   * Format external search results for storage in quote record
   */
  private formatExternalSourcesForQuote(results: ExternalBookData[]) {
    return results.map(book => ({
      source: book.sourceData?.source || 'unknown',
      available: book.available,
      estimatedPrice: book.pricing?.[0]?.price,
      estimatedDelivery: book.available ? '3-5 business days' : 'Contact for availability',
      sourceUrl: this.generateSourceUrl(book)
    }));
  }

  /**
   * Generate source URL for external book
   */
  private generateSourceUrl(book: ExternalBookData): string | undefined {
    // This would generate links to the external sources
    // Implementation depends on the source's URL structure
    if (book.isbn) {
      switch (book.sourceData?.source) {
        case 'google-books':
          return `https://books.google.com/books?isbn=${book.isbn}`;
        case 'open-library':
          return `https://openlibrary.org/isbn/${book.isbn}`;
        case 'isbndb':
          return `https://isbndb.com/book/${book.isbn}`;
        default:
          return undefined;
      }
    }
    return undefined;
  }

  /**
   * Send confirmation email to customer
   */
  private async sendCustomerConfirmationEmail(
    quoteRequest: QuoteRequest,
    quoteId: string,
    externalResults: ExternalBookData[]
  ) {
    const email = this.generateCustomerConfirmationEmail(quoteRequest, quoteId, externalResults);
    
    // Here you would integrate with your email service (SendGrid, Nodemailer, etc.)
    console.log('Sending customer confirmation email:', email);
    
    // For now, just log the email content
    // In production, you'd send the actual email:
    // await emailService.send(email);
  }

  /**
   * Send notification email to staff
   */
  private async sendStaffNotificationEmail(
    payload: any,
    quoteRequest: QuoteRequest,
    quoteId: string,
    externalResults: ExternalBookData[]
  ) {
    // Get staff members who should receive quote notifications
    const staffMembers = await payload.find({
      collection: 'users',
      where: {
        role: { in: ['admin', 'staff'] }
      }
    });

    const email = this.generateStaffNotificationEmail(quoteRequest, quoteId, externalResults);

    for (const staffMember of staffMembers.docs) {
      if (staffMember.email) {
        console.log(`Sending staff notification to ${staffMember.email}:`, email);
        // await emailService.send({ ...email, to: staffMember.email });
      }
    }
  }

  /**
   * Generate customer confirmation email
   */
  private generateCustomerConfirmationEmail(
    quoteRequest: QuoteRequest,
    quoteId: string,
    externalResults: ExternalBookData[]
  ): QuoteEmail {
    const subject = `Quote Request Confirmed - ${quoteRequest.bookTitle}`;
    
    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Thank you for your book quote request!</h2>
          
          <p>Hi ${quoteRequest.customerName},</p>
          
          <p>We've received your request for a quote on "<strong>${quoteRequest.bookTitle}</strong>"${quoteRequest.author ? ` by ${quoteRequest.author}` : ''}.</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Request Details:</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Quote ID:</strong> ${quoteId}</li>
              <li><strong>Book:</strong> ${quoteRequest.bookTitle}</li>
              ${quoteRequest.author ? `<li><strong>Author:</strong> ${quoteRequest.author}</li>` : ''}
              ${quoteRequest.isbn ? `<li><strong>ISBN:</strong> ${quoteRequest.isbn}</li>` : ''}
              <li><strong>Quantity:</strong> ${quoteRequest.quantity}</li>
              <li><strong>Format:</strong> ${quoteRequest.format}</li>
              <li><strong>Urgency:</strong> ${quoteRequest.urgency}</li>
            </ul>
          </div>

          ${externalResults.length > 0 ? `
            <h3>We found ${externalResults.length} potential matches:</h3>
            <div style="margin: 20px 0;">
              ${externalResults.slice(0, 3).map(book => `
                <div style="border: 1px solid #ddd; padding: 10px; margin: 10px 0; border-radius: 5px;">
                  <strong>${book.title}</strong><br>
                  Author: ${book.author}<br>
                  ${book.pricing?.[0] ? `Estimated Price: $${book.pricing[0].price}` : 'Price: Contact for quote'}
                </div>
              `).join('')}
            </div>
          ` : ''}

          <p><strong>What happens next?</strong></p>
          <ol>
            <li>Our team will research the best sources and pricing for your book</li>
            <li>We'll prepare a detailed quote including price and delivery timeframe</li>
            <li>You'll receive your quote within ${this.calculateEstimatedResponseTime(quoteRequest.urgency)}</li>
          </ol>

          <p>If you have any questions, please don't hesitate to contact us:</p>
          <ul>
            <li>Email: books@alkebulanimages.com</li>
            <li>Phone: (615) 555-0123</li>
            <li>Visit us in store: 123 Music Row, Nashville, TN</li>
          </ul>

          <p>Thank you for choosing Alkebulanimages!</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
            <p>This is an automated confirmation. Please do not reply to this email.</p>
          </div>
        </body>
      </html>
    `;

    const text = `
      Thank you for your book quote request!

      Hi ${quoteRequest.customerName},

      We've received your request for a quote on "${quoteRequest.bookTitle}"${quoteRequest.author ? ` by ${quoteRequest.author}` : ''}.

      Request Details:
      - Quote ID: ${quoteId}
      - Book: ${quoteRequest.bookTitle}
      ${quoteRequest.author ? `- Author: ${quoteRequest.author}` : ''}
      ${quoteRequest.isbn ? `- ISBN: ${quoteRequest.isbn}` : ''}
      - Quantity: ${quoteRequest.quantity}
      - Format: ${quoteRequest.format}
      - Urgency: ${quoteRequest.urgency}

      ${externalResults.length > 0 ? `We found ${externalResults.length} potential matches for your request.` : ''}

      What happens next?
      1. Our team will research the best sources and pricing for your book
      2. We'll prepare a detailed quote including price and delivery timeframe
      3. You'll receive your quote within ${this.calculateEstimatedResponseTime(quoteRequest.urgency)}

      If you have questions, contact us:
      - Email: books@alkebulanimages.com
      - Phone: (615) 555-0123
      - Visit: 123 Music Row, Nashville, TN

      Thank you for choosing Alkebulanimages!
    `;

    return {
      to: quoteRequest.customerEmail,
      subject,
      html,
      text
    };
  }

  /**
   * Generate staff notification email
   */
  private generateStaffNotificationEmail(
    quoteRequest: QuoteRequest,
    quoteId: string,
    externalResults: ExternalBookData[]
  ): Omit<QuoteEmail, 'to'> {
    const subject = `New Book Quote Request - ${quoteRequest.bookTitle}`;
    
    const html = `
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">New Book Quote Request</h2>
          
          <div style="background-color: #e8f4f8; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Customer Information:</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Name:</strong> ${quoteRequest.customerName}</li>
              <li><strong>Email:</strong> ${quoteRequest.customerEmail}</li>
              ${quoteRequest.customerPhone ? `<li><strong>Phone:</strong> ${quoteRequest.customerPhone}</li>` : ''}
              <li><strong>Preferred Contact:</strong> ${quoteRequest.preferredContact}</li>
              <li><strong>Request Source:</strong> ${quoteRequest.requestSource}</li>
            </ul>
          </div>

          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Book Request Details:</h3>
            <ul style="list-style: none; padding: 0;">
              <li><strong>Quote ID:</strong> ${quoteId}</li>
              <li><strong>Book:</strong> ${quoteRequest.bookTitle}</li>
              ${quoteRequest.author ? `<li><strong>Author:</strong> ${quoteRequest.author}</li>` : ''}
              ${quoteRequest.isbn ? `<li><strong>ISBN:</strong> ${quoteRequest.isbn}</li>` : ''}
              <li><strong>Quantity:</strong> ${quoteRequest.quantity}</li>
              <li><strong>Format:</strong> ${quoteRequest.format}</li>
              <li><strong>Urgency:</strong> ${quoteRequest.urgency}</li>
              ${quoteRequest.maxBudget ? `<li><strong>Max Budget:</strong> $${quoteRequest.maxBudget}</li>` : ''}
            </ul>
            ${quoteRequest.specialInstructions ? `
              <p><strong>Special Instructions:</strong></p>
              <p style="background-color: white; padding: 10px; border-left: 3px solid #ccc;">${quoteRequest.specialInstructions}</p>
            ` : ''}
          </div>

          ${externalResults.length > 0 ? `
            <h3>External Search Results (${externalResults.length} found):</h3>
            <div style="margin: 20px 0;">
              ${externalResults.map(book => `
                <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;">
                  <h4 style="margin-top: 0;">${book.title}</h4>
                  <p><strong>Author:</strong> ${book.author}</p>
                  ${book.isbn ? `<p><strong>ISBN:</strong> ${book.isbn}</p>` : ''}
                  ${book.publisher ? `<p><strong>Publisher:</strong> ${book.publisher}</p>` : ''}
                  ${book.pricing?.[0] ? `
                    <p><strong>Price:</strong> $${book.pricing[0].price} (${book.pricing[0].source})</p>
                  ` : ''}
                  <p><strong>Available:</strong> ${book.available ? 'Yes' : 'Contact for availability'}</p>
                  ${book.description ? `
                    <p><strong>Description:</strong> ${book.description.substring(0, 200)}...</p>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          ` : '<p><strong>No external results found.</strong> Manual research will be required.</p>'}

          <div style="background-color: #fff2cc; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Next Steps:</h3>
            <ol>
              <li>Review external search results above</li>
              <li>Research additional sources if needed</li>
              <li>Prepare quote with pricing and availability</li>
              <li>Contact customer within ${this.calculateEstimatedResponseTime(quoteRequest.urgency)}</li>
            </ol>
          </div>

          <p><a href="${process.env.PAYLOAD_PUBLIC_SERVER_URL}/admin/collections/bookQuotes/${quoteId}" 
                style="background-color: #007cba; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                View Quote in Admin →
             </a></p>
        </body>
      </html>
    `;

    const text = `
      New Book Quote Request

      Customer Information:
      - Name: ${quoteRequest.customerName}
      - Email: ${quoteRequest.customerEmail}
      ${quoteRequest.customerPhone ? `- Phone: ${quoteRequest.customerPhone}` : ''}
      - Preferred Contact: ${quoteRequest.preferredContact}
      - Request Source: ${quoteRequest.requestSource}

      Book Request Details:
      - Quote ID: ${quoteId}
      - Book: ${quoteRequest.bookTitle}
      ${quoteRequest.author ? `- Author: ${quoteRequest.author}` : ''}
      ${quoteRequest.isbn ? `- ISBN: ${quoteRequest.isbn}` : ''}
      - Quantity: ${quoteRequest.quantity}
      - Format: ${quoteRequest.format}
      - Urgency: ${quoteRequest.urgency}
      ${quoteRequest.maxBudget ? `- Max Budget: $${quoteRequest.maxBudget}` : ''}

      ${quoteRequest.specialInstructions ? `Special Instructions: ${quoteRequest.specialInstructions}` : ''}

      ${externalResults.length > 0 ? `
      External Search Results (${externalResults.length} found):
      ${externalResults.map(book => `
        - ${book.title} by ${book.author}
          ISBN: ${book.isbn || 'N/A'}
          Available: ${book.available ? 'Yes' : 'Contact for availability'}
          ${book.pricing?.[0] ? `Price: $${book.pricing[0].price}` : ''}
      `).join('')}
      ` : 'No external results found. Manual research required.'}

      Next Steps:
      1. Review external search results
      2. Research additional sources if needed
      3. Prepare quote with pricing and availability
      4. Contact customer within ${this.calculateEstimatedResponseTime(quoteRequest.urgency)}

      View quote in admin: ${process.env.PAYLOAD_PUBLIC_SERVER_URL}/admin/collections/bookQuotes/${quoteId}
    `;

    return {
      subject,
      html,
      text
    };
  }

  /**
   * Generate initial request content for communications log
   */
  private generateInitialRequestContent(quoteRequest: QuoteRequest): string {
    return `
      <p>Customer ${quoteRequest.customerName} requested a quote for:</p>
      <ul>
        <li><strong>Book:</strong> ${quoteRequest.bookTitle}</li>
        ${quoteRequest.author ? `<li><strong>Author:</strong> ${quoteRequest.author}</li>` : ''}
        ${quoteRequest.isbn ? `<li><strong>ISBN:</strong> ${quoteRequest.isbn}</li>` : ''}
        <li><strong>Quantity:</strong> ${quoteRequest.quantity}</li>
        <li><strong>Format:</strong> ${quoteRequest.format}</li>
        <li><strong>Urgency:</strong> ${quoteRequest.urgency}</li>
      </ul>
      ${quoteRequest.specialInstructions ? `<p><strong>Special Instructions:</strong> ${quoteRequest.specialInstructions}</p>` : ''}
    `;
  }

  /**
   * Calculate estimated response time based on urgency
   */
  private calculateEstimatedResponseTime(urgency: string): string {
    switch (urgency) {
      case 'asap':
        return '24 hours';
      case 'rush':
        return '48 hours';
      case 'normal':
      default:
        return '3-5 business days';
    }
  }

  /**
   * Update search analytics with quote request information
   */
  private async updateSearchAnalytics(payload: any, searchAnalyticsId: string, quoteId: string) {
    try {
      await payload.update({
        collection: 'searchAnalytics',
        id: searchAnalyticsId,
        data: {
          conversion: true,
          conversionType: 'quote-request',
          'externalBookSearch.quoteRequested': true
        }
      });
    } catch (error) {
      console.error('Error updating search analytics:', error);
    }
  }

  /**
   * Follow up on quote requests
   */
  async processQuoteFollowups(payload: any) {
    try {
      // Find quotes that need follow-up
      const pendingQuotes = await payload.find({
        collection: 'bookQuotes',
        where: {
          status: { in: ['quote-sent', 'awaiting-response'] },
          quoteDate: {
            less_than: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days ago
          }
        }
      });

      for (const quote of pendingQuotes.docs) {
        // Check if we've already sent a follow-up recently
        const lastFollowup = quote.lastFollowup ? new Date(quote.lastFollowup) : null;
        const daysSinceFollowup = lastFollowup ? 
          (Date.now() - lastFollowup.getTime()) / (1000 * 60 * 60 * 24) : 
          Infinity;

        if (daysSinceFollowup >= 7) { // Follow up every 7 days
          await this.sendFollowupEmail(payload, quote);
          
          // Update last follow-up date
          await payload.update({
            collection: 'bookQuotes',
            id: quote.id,
            data: {
              lastFollowup: new Date().toISOString()
            }
          });
        }
      }
    } catch (error) {
      console.error('Error processing quote follow-ups:', error);
    }
  }

  /**
   * Send follow-up email to customer
   */
  private async sendFollowupEmail(payload: any, quote: any) {
    const email = {
      to: quote.customerEmail,
      subject: `Following up on your book quote - ${quote.bookTitle}`,
      html: `
        <p>Hi ${quote.customerName},</p>
        <p>We wanted to follow up on the quote we sent for "${quote.bookTitle}". 
           If you have any questions or would like to proceed with the order, please let us know!</p>
        <p>Quote ID: ${quote.id}</p>
        <p>Best regards,<br>The Alkebulanimages Team</p>
      `,
      text: `Hi ${quote.customerName}, we wanted to follow up on your quote for "${quote.bookTitle}". Quote ID: ${quote.id}. Please let us know if you have questions or would like to proceed!`
    };

    console.log('Sending follow-up email:', email);
    // await emailService.send(email);

    // Log the communication
    await payload.update({
      collection: 'bookQuotes',
      id: quote.id,
      data: {
        communications: [
          ...quote.communications,
          {
            date: new Date().toISOString(),
            type: 'followup-email',
            subject: email.subject,
            content: email.html
          }
        ]
      }
    });
  }
}

// Export singleton instance
export const quoteRequestSystem = new QuoteRequestSystem();
export default quoteRequestSystem;