function normalize(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function cleanResultDescription(description, title = '', author = '') {
  let text = normalize(description);
  const normalizedTitle = normalize(title);
  const normalizedAuthor = normalize(author);

  if (!text || text.localeCompare(normalizedTitle, undefined, { sensitivity: 'accent' }) === 0) {
    return '';
  }

  if (normalizedAuthor) {
    if (text.localeCompare(normalizedAuthor, undefined, { sensitivity: 'accent' }) === 0) {
      return '';
    }
    text = text.replace(
      new RegExp(`^(?:by\\s+)?${escapeRegExp(normalizedAuthor)}(?:\\s*[,;:|–—-]\\s*|\\s+)`, 'i'),
      '',
    ).trim();
  }

  return text.localeCompare(normalizedTitle, undefined, { sensitivity: 'accent' }) === 0 ? '' : text;
}

export function getBookMeta(metadata = {}) {
  const bindingLabels = {
    hardcover: 'Hardcover',
    paperback: 'Paperback',
    'mass-market': 'Mass market',
    ebook: 'eBook',
    audiobook: 'Audiobook',
  };
  const details = [];
  const binding = bindingLabels[metadata.binding] || normalize(metadata.binding);
  if (binding) details.push(binding);

  if (metadata.availabilityStatus === 'request-only') {
    details.push('Request only');
  } else if (metadata.isAvailable === false) {
    details.push('Ask about availability');
  } else if (Number(metadata.stockLevel) > 0) {
    details.push('In stock');
  } else if (metadata.allowBackorders) {
    details.push('Available to order');
  }

  return details;
}
