import { payloadGet } from '$lib/server/payload';
import { buildSEOData } from '$lib/seo';
import { PUBLIC_SITE_URL } from '$env/static/public';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { is404Error } from '$lib/utils/errors';

function slugToName(slug: string): string {
  // Convert slug back to approximate name (e.g. "bell-hooks" → "bell hooks")
  return slug.replace(/-/g, ' ');
}

function nameToSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Convert a URL slug back to a display name by querying books with authorsText.name like the slug words
async function resolveAuthorName(slug: string): Promise<string | null> {
  const nameGuess = slugToName(slug);
  // Use 'like' operator to find books with a matching author name
  const res = await payloadGet<any>(
    `/api/books?where[authorsText.name][like]=${encodeURIComponent(nameGuess)}&limit=5&depth=0`
  );
  for (const book of res?.docs || []) {
    for (const a of book.authorsText || []) {
      if (!a.name) continue;
      if (nameToSlug(a.name) === slug) return a.name;
    }
  }
  return null;
}

export const load: PageServerLoad = async ({ params, url, setHeaders }) => {
  const authorSlug = params.slug;
  const page = parseInt(url.searchParams.get('p') || '1');
  const sortParam = url.searchParams.get('sort') || 'newest';
  const sortMap: Record<string, string> = {
    'title-asc': 'title',
    'title-desc': '-title',
    'newest': '-createdAt',
    'oldest': 'createdAt'
  };
  const sort = sortMap[sortParam] || '-createdAt';
  const limit = 24;

  try {
    // Resolve author name from slug by scanning authorsText entries
    const authorName = await resolveAuthorName(authorSlug);

    if (!authorName) {
      throw error(404, 'Author not found');
    }

    // Get books by this author using authorsText.name
    const booksParams = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      depth: '2',
      sort: sort,
      'where[authorsText.name][equals]': authorName
    });

    const booksData = await payloadGet<any>(`/api/books?${booksParams.toString()}`);

    // Build breadcrumbs
    const breadcrumbs = [
      { name: 'Home', url: `${PUBLIC_SITE_URL}/` },
      { name: 'Books', url: `${PUBLIC_SITE_URL}/shop/books` },
      { name: 'Authors', url: `${PUBLIC_SITE_URL}/shop/books/authors` },
      { name: authorName, url: `${PUBLIC_SITE_URL}/shop/books/authors/${authorSlug}` }
    ];

    // Set caching
    setHeaders({
      'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400, stale-if-error=86400',
      'Vary': 'Accept-Encoding',
      'x-key': `author:${authorSlug},books-by-author`
    });

    // Build SEO data
    const seoData = buildSEOData({
      title: `Books by ${authorName}`,
      description: `Discover books by ${authorName}. Explore the literary works of ${authorName} celebrating African diaspora voices and culture.`,
      canonical: `${PUBLIC_SITE_URL}/shop/books/authors/${authorSlug}`,
      breadcrumbs,
      noIndex: page > 1
    });

    return {
      author: { name: authorName, slug: authorSlug },
      books: booksData.docs || [],
      pagination: {
        page: booksData.page || 1,
        totalPages: booksData.totalPages || 1,
        hasNextPage: booksData.hasNextPage || false,
        hasPrevPage: booksData.hasPrevPage || false,
        totalDocs: booksData.totalDocs || 0,
        limit
      },
      currentSort: sortParam,
      seo: seoData
    };
  } catch (err: unknown) {
    if (is404Error(err)) {
      throw err;
    }

    console.error('Error loading author books:', err);

    throw error(500, 'Failed to load author');
  }
};
