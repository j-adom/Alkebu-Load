import { P as PUBLIC_SITE_URL } from "./public.js";
function ldScript(obj) {
  return `<script type="application/ld+json">${JSON.stringify(obj, null, 2)}<\/script>`;
}
function buildProductJsonLd(product, slug) {
  const productName = product.name || product.title;
  const productDesc = product.shortDescription || product.seoDescription || product.description || product.synopsis;
  const descText = typeof productDesc === "string" ? productDesc : "";
  const price = product.price || (product.pricing?.retailPrice ? product.pricing.retailPrice / 100 : null);
  const productType = product.primaryType === "clothing-design" ? "apparel" : "books";
  const offers = price ? {
    "@type": "Offer",
    priceCurrency: "USD",
    price: price.toFixed(2),
    availability: product.inventory?.stockLevel > 0 || product.isActive !== false ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    url: `${PUBLIC_SITE_URL}/shop/${productType}/${slug}`,
    priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0]
    // 30 days from now
  } : void 0;
  const imageUrl = product.scrapedImageUrls?.[0]?.url || product.images?.[0]?.url;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: productName,
    description: descText,
    sku: product.variations?.[0]?.sku || product.editions?.[0]?.isbn13 || product.editions?.[0]?.isbn10 || product.id,
    isbn: product.editions?.[0]?.isbn13 || product.editions?.[0]?.isbn10,
    brand: {
      "@type": "Organization",
      name: product.brand || product.publisher?.name || "Alkebu-Lan Images"
    },
    image: imageUrl,
    url: `${PUBLIC_SITE_URL}/shop/${productType}/${slug}`,
    offers,
    aggregateRating: product.averageRating ? {
      "@type": "AggregateRating",
      ratingValue: product.averageRating,
      reviewCount: product.reviewCount || 0
    } : void 0,
    // Book-specific properties
    ...product.authors && product.authors.length > 0 && {
      author: product.authors.map((author) => ({
        "@type": "Person",
        name: author.name,
        url: `${PUBLIC_SITE_URL}/shop/books/authors/${author.slug}`
      }))
    },
    ...product.editions?.[0]?.pages && {
      numberOfPages: product.editions[0].pages
    },
    ...product.editions?.[0]?.publishedDate && {
      datePublished: product.editions[0].publishedDate
    },
    ...product.categories && product.categories.length > 0 && {
      genre: product.categories
    }
  };
}
function buildEventJsonLd(event, slug) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.description,
    startDate: event.startDate,
    endDate: event.endDate || event.startDate,
    url: `${PUBLIC_SITE_URL}/events/${slug}`,
    location: event.location ? {
      "@type": "Place",
      name: event.location.name,
      address: {
        "@type": "PostalAddress",
        streetAddress: event.location.address,
        addressLocality: event.location.city,
        addressRegion: event.location.state,
        postalCode: event.location.zip,
        addressCountry: "US"
      }
    } : {
      "@type": "Place",
      name: "Alkebu-Lan Images",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Nashville",
        addressRegion: "TN",
        addressCountry: "US"
      }
    },
    organizer: {
      "@type": "Organization",
      name: "Alkebu-Lan Images",
      url: PUBLIC_SITE_URL
    },
    offers: event.price ? {
      "@type": "Offer",
      priceCurrency: "USD",
      price: (event.price / 100).toFixed(2),
      availability: "https://schema.org/InStock",
      url: `${PUBLIC_SITE_URL}/events/${slug}`
    } : {
      "@type": "Offer",
      priceCurrency: "USD",
      price: "0.00",
      availability: "https://schema.org/InStock",
      url: `${PUBLIC_SITE_URL}/events/${slug}`
    }
  };
}
function buildLocalBusinessJsonLd(business, slug) {
  return {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: business.name,
    description: business.description,
    url: business.contact?.website || `${PUBLIC_SITE_URL}/directory/${slug}`,
    telephone: business.contact?.phone,
    email: business.contact?.email,
    address: business.contact?.address ? {
      "@type": "PostalAddress",
      streetAddress: business.contact.address,
      addressLocality: business.contact.city,
      addressRegion: business.contact.state,
      postalCode: business.contact.zip,
      addressCountry: "US"
    } : void 0,
    image: business.images?.[0]?.url ? `${PUBLIC_SITE_URL}${business.images[0].url}` : void 0,
    aggregateRating: business.averageRating ? {
      "@type": "AggregateRating",
      ratingValue: business.averageRating,
      reviewCount: business.reviewCount || 0
    } : void 0,
    openingHours: business.hours ? Object.entries(business.hours).map(([day, hours]) => {
      if (hours.closed) return null;
      const dayName = day.charAt(0).toUpperCase() + day.slice(1);
      return `${dayName} ${hours.open}-${hours.close}`;
    }).filter(Boolean) : void 0
  };
}
function buildBreadcrumbJsonLd(breadcrumbs) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: crumb.url
    }))
  };
}
function buildSEOData({
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
}) {
  return {
    title: `${title} | Alkebu-Lan Images`,
    description: description.slice(0, 160),
    canonical,
    image: image ? image.startsWith("http") ? image : `${PUBLIC_SITE_URL}${image}` : `${PUBLIC_SITE_URL}/og-image.png`,
    imageAlt: imageAlt || title,
    noIndex: noIndex || false,
    jsonLd: jsonLd ? ldScript(jsonLd) : null,
    breadcrumbsJsonLd: breadcrumbs ? ldScript(buildBreadcrumbJsonLd(breadcrumbs)) : null,
    publishedTime,
    modifiedTime,
    authorName
  };
}
export {
  buildLocalBusinessJsonLd as a,
  buildSEOData as b,
  buildEventJsonLd as c,
  buildProductJsonLd as d
};
