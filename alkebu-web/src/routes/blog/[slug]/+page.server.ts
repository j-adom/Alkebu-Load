import { getBlogPostBySlug, getBlogPosts, payloadGet } from '$lib/server/payload';
import { buildArticleJsonLd, buildSEOData } from '$lib/seo';
import { PUBLIC_SITE_URL } from '$env/static/public';
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { is404Error } from '$lib/utils/errors';

export const load: PageServerLoad = async ({ params, setHeaders }) => {
  const { slug } = params;

  try {
    const [post, latest, settings] = await Promise.all([
      getBlogPostBySlug(slug),
      getBlogPosts(1, 5),
      payloadGet<any>('/api/globals/siteSettings?depth=1'),
    ]);

    if (!post) {
      throw error(404, 'Post not found');
    }

    const latestPosts = (latest.docs || [])
      .filter((p) => p.id !== post.id)
      .slice(0, 4);

    const breadcrumbs = [
      { name: 'Home', url: `${PUBLIC_SITE_URL}/` },
      { name: 'News', url: `${PUBLIC_SITE_URL}/blog` },
      { name: post.title, url: `${PUBLIC_SITE_URL}/blog/${slug}` }
    ];

    setHeaders({
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=21600, stale-if-error=21600',
      'Vary': 'Accept-Encoding',
      // Surrogate key for targeted purge
      'x-key': `blog-post:${post.id}`
    });

    const jsonLd = buildArticleJsonLd(post, slug);
    const postAny = post as any;

    const seoData = buildSEOData({
      title: postAny.seo?.title || post.title,
      description: postAny.seo?.description || post.excerpt || post.title,
      canonical: `${PUBLIC_SITE_URL}/blog/${slug}`,
      image: post.featuredImage?.url,
      imageAlt: postAny.featuredImageAlt || post.featuredImage?.alt || post.title,
      jsonLd,
      breadcrumbs,
      publishedTime: postAny.publishDate || post.createdAt,
      modifiedTime: post.updatedAt
    });

    return {
      post,
      latestPosts,
      settings: settings || {},
      seo: seoData
    };
  } catch (err: unknown) {
    if (is404Error(err)) {
      throw err;
    }

    console.error('Error loading blog post:', err);

    setHeaders({
      'Cache-Control': 'public, s-maxage=300' // Short cache on error
    });

    throw error(500, 'Failed to load blog post');
  }
};
