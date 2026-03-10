import { PUBLIC_SITE_URL } from '$env/static/public';

export function ldScript(obj: unknown) {
  return `<script type="application/ld+json">${JSON.stringify(obj, null, 2)}</script>`;
}

export function buildProductJsonLd(product: any, slug: string) {
  // Determine product name and description (works for both books and fashion)
  const productName = product.name || product.title;
  const productDesc = product.shortDescription || product.seoDescription || product.description || product.synopsis;
  const descText = typeof productDesc === 'string' ? productDesc : '';

  // Determine price (fashion uses price field, books use pricing.retailPrice)
  const price = product.price || (product.pricing?.retailPrice ? product.pricing.retailPrice / 100 : null);

  // Determine product type URL path
  const productType = product.primaryType === 'clothing-design' ? 'apparel' : 'books';

  const offers = price ? {
    '@type': 'Offer',
    priceCurrency: 'USD',
    price: price.toFixed(2),
    availability: product.inventory?.stockLevel > 0 || product.isActive !== false ?
      'https://schema.org/InStock' :
      'https://schema.org/OutOfStock',
    url: `${PUBLIC_SITE_URL}/shop/${productType}/${slug}`,
    priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days from now
  } : undefined;

  // Get image URL (fashion uses scrapedImageUrls, books use images)
  const imageUrl = product.scrapedImageUrls?.[0]?.url || product.images?.[0]?.url;

  const editions: any[] = product.editions || [];
  // Best edition: in-stock first, then most recently published, then first
  const inStock = editions.find((e: any) => (e.inventory?.stockLevel ?? 0) > 0);
  const mostRecent = editions
    .filter((e: any) => e.datePublished)
    .sort((a: any, b: any) => new Date(b.datePublished).getTime() - new Date(a.datePublished).getTime())[0];
  const canonicalEdition = inStock || mostRecent || editions[0];
  const canonicalIsbn = canonicalEdition?.isbn || canonicalEdition?.isbn10;

  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: productName,
    description: descText,
    sku: product.variations?.[0]?.sku || canonicalIsbn || product.id,
    isbn: canonicalIsbn,
    brand: {
      '@type': 'Organization',
      name: product.brand || product.publisher?.name || 'Alkebu-Lan Images'
    },
    image: imageUrl,
    url: `${PUBLIC_SITE_URL}/shop/${productType}/${slug}`,
    offers: offers,
    aggregateRating: product.averageRating ? {
      '@type': 'AggregateRating',
      ratingValue: product.averageRating,
      reviewCount: product.reviewCount || 0
    } : undefined,
    // Book-specific properties
    ...(product.authors && product.authors.length > 0 && {
      author: product.authors.map((author: any) => ({
        '@type': 'Person',
        name: author.name,
        url: `${PUBLIC_SITE_URL}/shop/books/authors/${author.slug}`
      }))
    }),
    ...(canonicalEdition?.pages && { numberOfPages: canonicalEdition.pages }),
    ...(canonicalEdition?.datePublished && { datePublished: canonicalEdition.datePublished }),
    ...(product.categories && product.categories.length > 0 && { genre: product.categories }),
    // All edition ISBNs as workExample so Google can find any edition
    ...(editions.length > 1 && {
      workExample: editions
        .filter((e: any) => e.isbn || e.isbn10)
        .map((e: any) => ({
          '@type': 'Book',
          isbn: e.isbn || e.isbn10,
          bookEdition: e.edition || undefined,
          bookFormat: e.binding ? `https://schema.org/${e.binding === 'ebook' ? 'EBook' : e.binding === 'audiobook' ? 'AudiobookFormat' : 'Paperback'}` : undefined,
          datePublished: e.datePublished || undefined,
        }))
    }),
  };
}

export function buildArticleJsonLd(post: any, slug: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.seoDescription || post.excerpt,
    image: post.featuredImage?.url ? `${PUBLIC_SITE_URL}${post.featuredImage.url}` : undefined,
    author: post.author ? {
      '@type': 'Person',
      name: post.author.name,
      url: `${PUBLIC_SITE_URL}/authors/${post.author.slug}`
    } : {
      '@type': 'Organization',
      name: 'Alkebu-Lan Images',
      url: PUBLIC_SITE_URL
    },
    publisher: {
      '@type': 'Organization',
      name: 'Alkebu-Lan Images',
      url: PUBLIC_SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${PUBLIC_SITE_URL}/logo.png`
      }
    },
    datePublished: post.publishedAt || post.createdAt,
    dateModified: post.updatedAt,
    url: `${PUBLIC_SITE_URL}/blog/${slug}`,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${PUBLIC_SITE_URL}/blog/${slug}`
    }
  };
}

export function buildEventJsonLd(event: any, slug: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: event.title,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate || event.startDate,
    url: `${PUBLIC_SITE_URL}/events/${slug}`,
    location: event.location ? {
      '@type': 'Place',
      name: event.location.name,
      address: {
        '@type': 'PostalAddress',
        streetAddress: event.location.address,
        addressLocality: event.location.city,
        addressRegion: event.location.state,
        postalCode: event.location.zip,
        addressCountry: 'US'
      }
    } : {
      '@type': 'Place',
      name: 'Alkebu-Lan Images',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Nashville',
        addressRegion: 'TN',
        addressCountry: 'US'
      }
    },
    organizer: {
      '@type': 'Organization',
      name: 'Alkebu-Lan Images',
      url: PUBLIC_SITE_URL
    },
    offers: event.price ? {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: (event.price / 100).toFixed(2),
      availability: 'https://schema.org/InStock',
      url: `${PUBLIC_SITE_URL}/events/${slug}`
    } : {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: '0.00',
      availability: 'https://schema.org/InStock',
      url: `${PUBLIC_SITE_URL}/events/${slug}`
    }
  };
}

export function buildLocalBusinessJsonLd(business: any, slug: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name,
    description: business.description,
    url: business.contact?.website || `${PUBLIC_SITE_URL}/directory/${slug}`,
    telephone: business.contact?.phone,
    email: business.contact?.email,
    address: business.contact?.address ? {
      '@type': 'PostalAddress',
      streetAddress: business.contact.address,
      addressLocality: business.contact.city,
      addressRegion: business.contact.state,
      postalCode: business.contact.zip,
      addressCountry: 'US'
    } : undefined,
    image: business.images?.[0]?.url ? `${PUBLIC_SITE_URL}${business.images[0].url}` : undefined,
    aggregateRating: business.averageRating ? {
      '@type': 'AggregateRating',
      ratingValue: business.averageRating,
      reviewCount: business.reviewCount || 0
    } : undefined,
    openingHours: business.hours ? Object.entries(business.hours).map(([day, hours]: [string, any]) => {
      if (hours.closed) return null;
      const dayName = day.charAt(0).toUpperCase() + day.slice(1);
      return `${dayName} ${hours.open}-${hours.close}`;
    }).filter(Boolean) : undefined
  };
}

export function buildOrganizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Alkebu-Lan Images',
    url: PUBLIC_SITE_URL,
    description: 'Nashville-based Black-owned bookstore and cultural hub specializing in African diaspora literature, wellness products, and community events.',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Nashville',
      addressRegion: 'TN',
      addressCountry: 'US'
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'info@alkebulanimages.com'
    },
    sameAs: [
      'https://www.facebook.com/alkebulanimages',
      'https://www.instagram.com/alkebulanimages',
      'https://twitter.com/alkebulanimages'
    ],
    logo: {
      '@type': 'ImageObject',
      url: `${PUBLIC_SITE_URL}/logo.png`
    }
  };
}

export function buildWebsiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Alkebu-Lan Images',
    url: PUBLIC_SITE_URL,
    description: 'Nashville-based Black-owned bookstore and cultural hub',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${PUBLIC_SITE_URL}/search?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  };
}

export function buildBreadcrumbJsonLd(breadcrumbs: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: breadcrumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: crumb.url
    }))
  };
}

export interface SEOData {
  title: string;
  description: string;
  canonical: string;
  image?: string;
  imageAlt?: string;
  noIndex?: boolean;
  jsonLd?: any;
  breadcrumbs?: Array<{ name: string; url: string }>;
  publishedTime?: string;
  modifiedTime?: string;
  authorName?: string;
}

export function buildSEOData({
  title,
  description,
  canonical,
  image,
  imageAlt,
  noIndex,
  jsonLd,
  breadcrumbs,
  publishedTime,
  modifiedTime,
  authorName
}: SEOData) {
  return {
    title: `${title} | Alkebu-Lan Images`,
    description: String(description || '').slice(0, 160),
    canonical,
    image: image ? (image.startsWith('http') ? image : `${PUBLIC_SITE_URL}${image}`) : `${PUBLIC_SITE_URL}/og-image.png`,
    imageAlt: imageAlt || title,
    noIndex: noIndex || false,
    jsonLd: jsonLd ? ldScript(jsonLd) : null,
    breadcrumbsJsonLd: breadcrumbs ? ldScript(buildBreadcrumbJsonLd(breadcrumbs)) : null,
    publishedTime,
    modifiedTime,
    authorName
  };
}
