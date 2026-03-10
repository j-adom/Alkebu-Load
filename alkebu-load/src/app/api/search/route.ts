import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { searchEngine } from '../../utils/searchEngine'

// Determine best edition: in-stock → most recently published → first
function bestEditionSlug(doc: any): string {
  const editions: any[] = doc.editions || []
  const inStock = editions.find((e: any) => (e.inventory?.stockLevel ?? 0) > 0)
  const mostRecent = editions
    .filter((e: any) => e.datePublished)
    .sort((a: any, b: any) => new Date(b.datePublished).getTime() - new Date(a.datePublished).getTime())[0]
  const best = inStock || mostRecent || editions[0]
  const isbn = best?.isbn || best?.isbn10 || ''
  return isbn ? `${doc.slug || doc.id}/${isbn}` : (doc.slug || doc.id)
}

const ISBN_RE = /^[\d\-X]{9,13}$/i

async function payloadSearch(payload: any, query: string, types: string[], limit: number) {
  const results: any[] = []

  const wantAll = types.length === 0
  const want = (t: string) => wantAll || types.includes(t)

  await Promise.all([
    // Books — synopsis and excerpt are textarea (plain text); description is richText (jsonb)
    want('books') && (async () => {
      try {
        const where: any = ISBN_RE.test(query)
          ? { or: [{ 'editions.isbn': { equals: query } }, { 'editions.isbn10': { equals: query } }] }
          : { or: [{ title: { contains: query } }, { synopsis: { contains: query } }, { excerpt: { contains: query } }] }

        const res = await payload.find({
          collection: 'books',
          where,
          limit,
          depth: 1,
        })
        for (const doc of res.docs || []) {
          const slug = bestEditionSlug(doc)
          const editions: any[] = doc.editions || []
          const best = editions.find((e: any) => (e.inventory?.stockLevel ?? 0) > 0) ||
            editions.filter((e: any) => e.datePublished).sort((a: any, b: any) => new Date(b.datePublished).getTime() - new Date(a.datePublished).getTime())[0] ||
            editions[0]
          results.push({
            id: doc.id,
            title: doc.title,
            type: 'books',
            excerpt: doc.synopsis || doc.excerpt || '',
            author: (doc.authors || []).map((a: any) => a.name || a).join(', '),
            imageUrl: doc.images?.[0]?.url || doc.scrapedImageUrls?.[0]?.url || null,
            price: best?.pricing?.retailPrice ? best.pricing.retailPrice / 100 : null,
            slug,
            score: 1,
          })
        }
      } catch (err) {
        console.warn('Books Payload search error:', err)
      }
    })(),

    // Wellness Lifestyle
    want('wellnessLifestyle') && (async () => {
      try {
        const res = await payload.find({
          collection: 'wellness-lifestyle',
          where: { or: [{ title: { contains: query } }, { shortDescription: { contains: query } }] },
          limit,
          depth: 1,
        })
        for (const doc of res.docs || []) {
          results.push({
            id: doc.id,
            title: doc.title || doc.name,
            type: 'wellnessLifestyle',
            excerpt: doc.shortDescription || '',
            imageUrl: doc.images?.[0]?.url || null,
            price: doc.price || null,
            slug: doc.slug || doc.id,
            score: 1,
          })
        }
      } catch (err) {
        console.warn('WellnessLifestyle Payload search error:', err)
      }
    })(),

    // Fashion Jewelry
    want('fashionJewelry') && (async () => {
      try {
        const res = await payload.find({
          collection: 'fashion-jewelry',
          where: { or: [{ name: { contains: query } }, { shortDescription: { contains: query } }] },
          limit,
          depth: 1,
        })
        for (const doc of res.docs || []) {
          results.push({
            id: doc.id,
            title: doc.name || doc.title,
            type: 'fashionJewelry',
            excerpt: doc.shortDescription || '',
            imageUrl: doc.images?.[0]?.url || null,
            price: doc.price || null,
            slug: doc.slug || doc.id,
            score: 1,
          })
        }
      } catch (err) {
        console.warn('FashionJewelry Payload search error:', err)
      }
    })(),

    // Oils Incense
    want('oilsIncense') && (async () => {
      try {
        const res = await payload.find({
          collection: 'oils-incense',
          where: { or: [{ title: { contains: query } }, { shortDescription: { contains: query } }] },
          limit,
          depth: 1,
        })
        for (const doc of res.docs || []) {
          results.push({
            id: doc.id,
            title: doc.title || doc.name,
            type: 'oilsIncense',
            excerpt: doc.shortDescription || '',
            imageUrl: doc.images?.[0]?.url || null,
            price: doc.price || null,
            slug: doc.slug || doc.id,
            score: 1,
          })
        }
      } catch (err) {
        console.warn('OilsIncense Payload search error:', err)
      }
    })(),

    // Blog Posts
    want('blogPosts') && (async () => {
      try {
        const res = await payload.find({
          collection: 'blogPosts',
          where: { or: [{ title: { contains: query } }, { excerpt: { contains: query } }] },
          limit,
          depth: 1,
        })
        for (const doc of res.docs || []) {
          results.push({
            id: doc.id,
            title: doc.title,
            type: 'blogPosts',
            excerpt: doc.excerpt || '',
            imageUrl: doc.featuredImage?.url || null,
            slug: doc.slug || doc.id,
            score: 1,
          })
        }
      } catch (err) {
        console.warn('BlogPosts Payload search error:', err)
      }
    })(),

    // Events
    want('events') && (async () => {
      try {
        const res = await payload.find({
          collection: 'events',
          where: { or: [{ title: { contains: query } }, { shortDescription: { contains: query } }] },
          limit,
          depth: 1,
        })
        for (const doc of res.docs || []) {
          results.push({
            id: doc.id,
            title: doc.title,
            type: 'events',
            excerpt: doc.shortDescription || '',
            imageUrl: doc.featuredImage?.url || null,
            slug: doc.slug || doc.id,
            score: 1,
          })
        }
      } catch (err) {
        console.warn('Events Payload search error:', err)
      }
    })(),

    // Businesses
    want('businesses') && (async () => {
      try {
        const res = await payload.find({
          collection: 'businesses',
          where: { or: [{ name: { contains: query } }, { shortDescription: { contains: query } }] },
          limit,
          depth: 1,
        })
        for (const doc of res.docs || []) {
          results.push({
            id: doc.id,
            title: doc.name,
            type: 'businesses',
            excerpt: doc.shortDescription || '',
            imageUrl: doc.images?.[0]?.url || null,
            slug: doc.slug || doc.id,
            score: 1,
          })
        }
      } catch (err) {
        console.warn('Businesses Payload search error:', err)
      }
    })(),
  ].filter(Boolean))

  return results
}

export async function GET(req: NextRequest) {
  const start = Date.now()
  const { searchParams } = req.nextUrl

  const query = (searchParams.get('q') || '').trim()
  const typesParam = searchParams.get('types') || ''
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)

  const types = typesParam ? typesParam.split(',').map((t) => t.trim()).filter(Boolean) : []

  if (!query) {
    return NextResponse.json({
      internal: [],
      external: [],
      totalResults: 0,
      searchTime: 0,
    })
  }

  const payload = await getPayload({ config })

  let internalResults: any[] = []
  let source: 'flexsearch' | 'postgresql' = 'flexsearch'

  // Try FlexSearch first (in-memory, fast)
  try {
    const flexResponse = await searchEngine.search(query, {
      limit,
      types: types.length > 0 ? types : undefined,
    })
    internalResults = flexResponse.internal || []
  } catch (err) {
    console.warn('FlexSearch error:', err)
  }

  // Fall back to Payload Local API if FlexSearch returned nothing
  if (internalResults.length === 0) {
    source = 'postgresql'
    internalResults = await payloadSearch(payload, query, types, limit)
  }

  const searchTime = Date.now() - start

  // Log analytics (non-blocking, best-effort)
  const queryType = types.length === 1 && types[0] === 'books'
    ? 'books'
    : types.length === 1 && ['fashionJewelry', 'wellnessLifestyle', 'oilsIncense'].includes(types[0])
      ? 'products'
      : types.length === 1 && ['blogPosts'].includes(types[0])
        ? 'content'
        : types.length === 1 && types[0] === 'businesses'
          ? 'businesses'
          : types.length === 1 && types[0] === 'events'
            ? 'events'
            : 'general'

  payload.create({
    collection: 'searchAnalytics',
    data: {
      query,
      normalizedQuery: query.toLowerCase().trim(),
      queryType,
      searchSource: 'api',
      searchEngine: source === 'flexsearch' ? 'flexsearch' : 'postgresql',
      resultCount: internalResults.length,
      internalResultCount: internalResults.length,
      externalResultCount: 0,
      searchTime,
      searchDate: new Date().toISOString(),
      zeroResultsQuery: internalResults.length === 0,
    },
  }).catch((err: any) => console.warn('Analytics log error:', err))

  return NextResponse.json({
    internal: internalResults,
    external: [],
    totalResults: internalResults.length,
    searchTime,
    source,
  })
}
