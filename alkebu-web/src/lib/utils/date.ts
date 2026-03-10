/**
 * Format a date string or Date object to a human-readable format
 */
export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const defaultOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  };

  return dateObj.toLocaleDateString('en-US', defaultOptions);
}

/**
 * Format date to short format (e.g., "Jan 15, 2024")
 */
export function formatDateShort(date: string | Date): string {
  return formatDate(date, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Check if a date is in the past
 */
export function isPast(date: string | Date): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj < new Date();
}

/**
 * Extract plain text from a Payload Lexical rich-text object or return the string as-is
 */
export function lexicalToText(content: any): string {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (typeof content !== 'object') return '';
  // Recursively extract text from Lexical node tree
  function extractText(node: any): string {
    if (!node) return '';
    if (node.text) return node.text;
    if (Array.isArray(node.children)) {
      return node.children.map(extractText).join(' ');
    }
    if (node.root) return extractText(node.root);
    return '';
  }
  return extractText(content).replace(/\s+/g, ' ').trim();
}

/**
 * Check if a date is within the next N days
 */
export function isWithinDays(date: string | Date, days: number): boolean {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const futureDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  return dateObj >= now && dateObj <= futureDate;
}
