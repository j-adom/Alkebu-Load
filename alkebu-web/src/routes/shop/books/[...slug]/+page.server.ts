import { getProductBySlug, payloadGet, getBooksByAuthor, getRelatedBooks } from '$lib/server/payload';
import { buildProductJsonLd, buildSEOData } from '$lib/seo';
import { PUBLIC_SITE_URL } from '$env/static/public';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { is404Error } from '$lib/utils/errors';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
  const slug = params.slug;

  try {
    const product = await getProductBySlug(slug, 'books');
    const settings = await payloadGet<any>('/api/globals/siteSettings?depth=1');

    if (!product) {
      throw error(404, 'Book not found');
    }

    // Get author IDs for related queries
    const authorIds = product.authors?.map((a: any) => typeof a === 'string' ? a : a.id) || [];

    // Fetch books by the same author(s)
    const booksByAuthor = await getBooksByAuthor(product.id, authorIds, 6);

    // Fetch related books based on categories/collections, excluding books already shown
    const booksByAuthorIds = booksByAuthor.map(b => b.id);
    const relatedBooks = await getRelatedBooks(
      product.id,
      product.categories || [],
      product.collections || [],
      booksByAuthorIds,
      6
    );

    // Build breadcrumbs
    const breadcrumbs = [
      { name: 'Home', url: `${PUBLIC_SITE_URL}/` },
      { name: 'Books', url: `${PUBLIC_SITE_URL}/shop/books` },
      { name: product.title, url: `${PUBLIC_SITE_URL}/shop/books/${slug}` }
    ];

    // Set strong edge caching (24 hours) with long stale window (7 days)
    setHeaders({
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800, stale-if-error=86400',
      'Vary': 'Accept-Encoding',
      // Surrogate keys for targeted purge
      'x-key': `product:${product.id}${product.authors?.length ? `,authors:${product.authors.map((a: any) => a.id).join(',')}` : ''}${product.publisher ? `,publisher:${product.publisher.id}` : ''}`
    });

    // Build structured data
    const jsonLd = buildProductJsonLd(product, slug);

    // Build SEO data with safe description
    const fallbackDesc = `${product.title} by ${product.authors?.map((a: any) => a.name).join(', ') || 'Various Authors'}`;
    const rawDescription = product.seoDescription || product.description || product.synopsis || fallbackDesc;
    const description = typeof rawDescription === 'string' ? rawDescription : fallbackDesc;
    const image = product.images?.[0]?.image?.url || product.images?.[0]?.url || product.scrapedImageUrls?.[0]?.url;

    const seoData = buildSEOData({
      title: product.titleLong || product.title,
      description,
      canonical: `${PUBLIC_SITE_URL}/shop/books/${slug}`,
      image,
      imageAlt: `Cover of ${product.title}`,
      jsonLd,
      breadcrumbs
    });

    return {
      book: product,
      settings: settings || {},
      seo: seoData,
      booksByAuthor,
      relatedBooks,
    };
  } catch (err: unknown) {
    if (is404Error(err)) {
      throw err;
    }

    console.error('Error loading book:', err);

    // Avoid double setting headers; rely on default error handling
    throw error(500, 'Failed to load book');
  }
};
