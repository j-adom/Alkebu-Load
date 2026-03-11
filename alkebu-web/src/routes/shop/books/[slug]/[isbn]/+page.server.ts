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

    // authorsText is [{name}] from enrichment; authors is the relationship array (may be empty)
    const authorNamesFromText = product.authorsText?.map((a: any) => a.name).filter(Boolean) || [];
    const authorNamesFromRel = product.authors?.map((a: any) => a.name).filter(Boolean) || [];
    const authorNames = (authorNamesFromText.length ? authorNamesFromText : authorNamesFromRel).join(', ') || 'Various Authors';

    // Build description with fallback
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

    // Fetch books by the same author using authorsText name match
    let booksByAuthor: any[] = [];
    if (authorNamesFromText.length > 0) {
      try {
        const allByAuthor = new Map();
        for (const name of authorNamesFromText.slice(0, 2)) { // limit to first 2 authors
          try {
            const res = await payloadGet<any>(
              `/api/books?where[authorsText.name][equals]=${encodeURIComponent(name)}&limit=20&depth=1`
            );
            res?.docs?.forEach((book: any) => {
              if (book.id !== product.id && book.slug && book.editions?.length > 0) {
                allByAuthor.set(book.id, book);
              }
            });
          } catch (err) {
            console.warn(`Failed to fetch books for author "${name}":`, err);
          }
        }
        booksByAuthor = Array.from(allByAuthor.values()).slice(0, 12);
      } catch (err) {
        console.error('Error fetching books by author:', err);
      }
    }

    return {
      book: product,
      settings: settings || {},
      seo: seoData,
      booksByAuthor,
      relatedBooks: [],
    };
  } catch (err: unknown) {
    if (is404Error(err)) {
      throw err;
    }

    console.error('Error loading book:', err);
    throw error(500, 'Failed to load book');
  }
};
