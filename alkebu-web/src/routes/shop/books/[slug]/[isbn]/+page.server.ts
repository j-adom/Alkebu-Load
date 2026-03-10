import { getProductBySlug, payloadGet } from '$lib/server/payload';
import { buildProductJsonLd, buildSEOData } from '$lib/seo';
import { PUBLIC_SITE_URL } from '$env/static/public';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { is404Error } from '$lib/utils/errors';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
  const { slug, isbn } = params;

  try {
    const product = await getProductBySlug(slug, 'books');
    const settings = await payloadGet<any>('/api/globals/siteSettings?depth=1');

    if (!product) {
      throw error(404, 'Book not found');
    }

    // Verify ISBN matches one of the editions
    const matchingEdition = product.editions?.find(
      (edition: any) => edition.isbn === isbn || edition.isbn10 === isbn
    );

    if (!matchingEdition) {
      throw error(404, 'ISBN not found for this book');
    }

    // Build breadcrumbs
    const breadcrumbs = [
      { name: 'Home', url: `${PUBLIC_SITE_URL}/` },
      { name: 'Books', url: `${PUBLIC_SITE_URL}/shop/books` },
      { name: product.title, url: `${PUBLIC_SITE_URL}/shop/books/${slug}/${isbn}` }
    ];

    // Set strong edge caching (24 hours) with long stale window (7 days)
    setHeaders({
      'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800, stale-if-error=86400',
      'Vary': 'Accept-Encoding',
      // Surrogate keys for targeted purge
      'x-key': `product:${product.id}${product.authors?.length ? `,authors:${product.authors.map((a: any) => a.id).join(',')}` : ''}${product.publisher ? `,publisher:${product.publisher.id}` : ''}`
    });

    // Build structured data
    const jsonLd = buildProductJsonLd(product, `${slug}/${isbn}`);

    // Build description with fallback
    const authorNames = product.authors?.map((a: any) => a.name).join(', ') || 'Various Authors';
    const descriptionFallback = `${product.title} by ${authorNames}`;
    const rawDesc = product.seoDescription || product.synopsis || product.description || descriptionFallback;
    const description = typeof rawDesc === 'string' ? rawDesc : descriptionFallback;

    // Build SEO data
    const seoData = buildSEOData({
      title: product.titleLong || product.title,
      description,
      canonical: `${PUBLIC_SITE_URL}/shop/books/${slug}/${isbn}`,
      image: product.images?.[0]?.image?.url || product.images?.[0]?.url,
      imageAlt: `Cover of ${product.title}`,
      jsonLd,
      breadcrumbs
    });

    // Fetch related books by the same authors
    let relatedBooks: any[] = [];
    if (product.authors?.length > 0) {
      try {
        // Fetch books by each author and combine results
        const authorIds = product.authors.map((a: any) => a.id || a);
        const allRelatedBooks = new Map();

        // Query for each author (Payload's REST API handles OR queries differently)
        for (const authorId of authorIds) {
          try {
            const booksResult = await payloadGet<any>(
              `/api/books?where[authors][contains]=${authorId}&limit=20&depth=1`
            );

            // Add unique books (excluding current book)
            booksResult?.docs?.forEach((book: any) => {
              if (book.id !== product.id && book.slug && book.editions?.length > 0) {
                allRelatedBooks.set(book.id, book);
              }
            });
          } catch (err) {
            console.warn(`Failed to fetch books for author ${authorId}:`, err);
          }
        }

        relatedBooks = Array.from(allRelatedBooks.values()).slice(0, 12); // Limit to 12 related books
      } catch (err) {
        console.error('Error fetching related books:', err);
        // Don't fail the page load if related books fetch fails
      }
    }

    return {
      book: product,  // Return as 'book' to match Svelte component expectations
      settings: settings || {},
      seo: seoData,
      relatedBooks,
    };
  } catch (err: unknown) {
    if (is404Error(err)) {
      throw err;
    }

    console.error('Error loading book:', err);
    throw error(500, 'Failed to load book');
  }
};
