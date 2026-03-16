export type BookAvailabilityStatus = 'available' | 'request-only' | 'discontinued';

export function getPrimaryBookEdition(book: any) {
  return book?.editions?.find((edition: any) => edition?.isPrimary) || book?.editions?.[0] || null;
}

export function getBookAvailabilityStatus(book: any): BookAvailabilityStatus {
  const status = String(book?.availabilityStatus || 'available');

  if (status === 'request-only' || status === 'discontinued') {
    return status;
  }

  return 'available';
}

export function getBookStockLevel(book: any): number {
  const primaryEdition = getPrimaryBookEdition(book);

  if (typeof primaryEdition?.inventory?.stockLevel === 'number') {
    return primaryEdition.inventory.stockLevel;
  }

  if (typeof book?.inventory?.stockLevel === 'number') {
    return book.inventory.stockLevel;
  }

  return 0;
}

export function isBookPurchasable(book: any): boolean {
  return getBookAvailabilityStatus(book) === 'available';
}

export function getBookAvailabilityMessage(book: any): string {
  const availabilityStatus = getBookAvailabilityStatus(book);

  if (availabilityStatus === 'request-only') {
    return 'Available by request. Contact us to inquire about this title.';
  }

  if (availabilityStatus === 'discontinued') {
    return 'This title is no longer available.';
  }

  return getBookStockLevel(book) > 0
    ? 'In store & ships in 3-8 days'
    : 'Ships in 3-8 days';
}

export function buildBookInquiryHref(book: any): string {
  const primaryEdition = getPrimaryBookEdition(book);
  const isbn = primaryEdition?.isbn || primaryEdition?.isbn10 || '';
  const binding = primaryEdition?.binding || '';
  const authorNames = (book?.authorsText || book?.authors || [])
    .map((author: any) => (typeof author === 'string' ? author : author?.name))
    .filter(Boolean)
    .join(', ');
  const params = new URLSearchParams({
    subject: `Request this title: ${book?.title || 'Book request'}`,
    message: [
      "I'm interested in requesting this title.",
      '',
      `Title: ${book?.title || ''}`,
      authorNames ? `Author: ${authorNames}` : '',
      isbn ? `ISBN: ${isbn}` : '',
      binding ? `Binding: ${binding}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  });

  return `/contact?${params.toString()}`;
}
