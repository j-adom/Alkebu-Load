import { NextRequest, NextResponse } from 'next/server'
import { getPayload } from 'payload'
import config from '@payload-config'
import { filterVisibleSearchResults, getBookAuthorNames, productSearchPrice, searchEngine } from '../../utils/searchEngine'

const ISBN_RE = /^[\d\-X]{9,13}$/i


async function payloadSearch(payload: any, query: string, types: string[], limit: number) {
  const results: any[] = []
  let attempted = 0
  let succeeded = 0
  let hasMore = false

  const wantAll = types.length === 0
  const want = (t: string) => wantAll || types.includes(t)

  await Promise.all([
    // Books — synopsis and excerpt are textarea (plain text); description is richText (jsonb)
    want('books') && (async () => {
      attempted++
      try {
        const contentWhere: any = ISBN_RE.test(query)
          ? { or: [{ 'editions.isbn': { equals: query } }, { 'editions.isbn10': { equals: query } }] }
          : {
              or: [
                { title: { contains: query } },
                { synopsis: { contains: query } },
                { excerpt: { contains: query } },
                // authorsText is the denormalized array-of-{name} field that's
                // actually populated for imported books; the authors relationship
                // is mostly empty in production data.
                { 'authorsText.name': { contains: query } },
              ],
            }
        const where: any = {
          and: [
            { availabilityStatus: { not_equals: 'discontinued' } },
            contentWhere,
          ],
        };

        const res = await payload.find({
          collection: 'books',
          where,
          limit,
          depth: 2,
        })
        succeeded++
        hasMore ||= Boolean(res.hasNextPage)
        for (const doc of res.docs || []) {
          const slug = doc.slug || String(doc.id)
          const editions: any[] = doc.editions || []
          const best = editions.find((e: any) => (e.inventory?.stockLevel ?? 0) > 0) ||
            editions.filter((e: any) => e.datePublished).sort((a: any, b: any) => new Date(b.datePublished).getTime() - new Date(a.datePublished).getTime())[0] ||
            editions[0]
          // authorsText is [{name}], authors is relationship to Authors collection
          const authorNames = getBookAuthorNames(doc)
          // images[0].image is a Media doc (depth:2), scrapedImageUrls is fallback
          const imageUrl = doc.images?.[0]?.image?.url || doc.scrapedImageUrls?.[0]?.url || null
          results.push({
            id: doc.id,
            title: doc.title,
            type: 'books',
            excerpt: doc.synopsis || doc.excerpt || '',
            author: authorNames,
            imageUrl,
            price: best?.pricing?.retailPrice ? best.pricing.retailPrice / 100 : null,
            slug,
            score: 1,
            metadata: {
              isbn: best?.isbn || best?.isbn10,
              binding: best?.binding,
              stockLevel: best?.inventory?.stockLevel ?? 0,
              allowBackorders: Boolean(best?.inventory?.allowBackorders),
              availabilityStatus: doc.availabilityStatus || 'available',
              isAvailable: best?.isAvailable !== false,
            },
          })
        }
      } catch (err) {
        console.warn('Books Payload search error:', err)
      }
    })(),

    // Wellness Lifestyle
    want('wellnessLifestyle') && (async () => {
      attempted++
      try {
        const res = await payload.find({
          collection: 'wellness-lifestyle',
          where: {
            and: [
              // Curation gate: Square carries bulk supply SKUs and
              // miscategorized items that must stay hidden until a human
              // approves them via publishOnline.
              { publishOnline: { equals: true } },
              { or: [{ name: { contains: query } }, { shortDescription: { contains: query } }] },
            ],
          },
          limit,
          depth: 1,
        })
        succeeded++
        hasMore ||= Boolean(res.hasNextPage)
        for (const doc of res.docs || []) {
          results.push({
            id: doc.id,
            title: doc.title || doc.name,
            type: 'wellnessLifestyle',
            excerpt: doc.shortDescription || '',
            imageUrl: doc.images?.[0]?.url || null,
            price: productSearchPrice('wellnessLifestyle', doc),
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
      attempted++
      try {
        const res = await payload.find({
          collection: 'fashion-jewelry',
          where: { or: [{ name: { contains: query } }, { shortDescription: { contains: query } }] },
          limit,
          depth: 1,
        })
        succeeded++
        hasMore ||= Boolean(res.hasNextPage)
        for (const doc of res.docs || []) {
          results.push({
            id: doc.id,
            title: doc.name || doc.title,
            type: 'fashionJewelry',
            excerpt: doc.shortDescription || '',
            imageUrl: doc.images?.[0]?.url || null,
            price: productSearchPrice('fashionJewelry', doc),
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
      attempted++
      try {
        const res = await payload.find({
          collection: 'oils-incense',
          where: {
            and: [
              // Same curation gate as wellness-lifestyle.
              { publishOnline: { equals: true } },
              { or: [{ name: { contains: query } }, { shortDescription: { contains: query } }] },
            ],
          },
          limit,
          depth: 1,
        })
        succeeded++
        hasMore ||= Boolean(res.hasNextPage)
        for (const doc of res.docs || []) {
          results.push({
            id: doc.id,
            title: doc.title || doc.name,
            type: 'oilsIncense',
            excerpt: doc.shortDescription || '',
            imageUrl: doc.images?.[0]?.url || null,
            price: productSearchPrice('oilsIncense', doc),
            slug: doc.slug || doc.id,
            score: 1,
            // OilsIncense spans two storefront sections (fragrance-oil ->
            // health-and-beauty; incense-pack/sage-bundle/palo-santo ->
            // home-goods) -- resolveOilsIncenseShopSection on the frontend
            // needs this to link to the section that will actually resolve
            // the product instead of always guessing health-and-beauty.
            metadata: { productType: doc.productType },
          })
        }
      } catch (err) {
        console.warn('OilsIncense Payload search error:', err)
      }
    })(),

    // Blog Posts
    want('blogPosts') && (async () => {
      attempted++
      try {
        const res = await payload.find({
          collection: 'blogPosts',
          where: { or: [{ title: { contains: query } }, { excerpt: { contains: query } }] },
          limit,
          depth: 1,
        })
        succeeded++
        hasMore ||= Boolean(res.hasNextPage)
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
      attempted++
      try {
        const res = await payload.find({
          collection: 'events',
          where: { or: [{ title: { contains: query } }, { shortDescription: { contains: query } }] },
          limit,
          depth: 1,
        })
        succeeded++
        hasMore ||= Boolean(res.hasNextPage)
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
      attempted++
      try {
        const res = await payload.find({
          collection: 'businesses',
          where: { or: [{ name: { contains: query } }, { shortDescription: { contains: query } }] },
          limit,
          depth: 1,
        })
        succeeded++
        hasMore ||= Boolean(res.hasNextPage)
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

  if (attempted > 0 && succeeded === 0) {
    throw new Error('All Payload search collections failed')
  }

  return { results, hasMore }
}

export async function GET(req: NextRequest) {
  const start = Date.now()
  const { searchParams } = req.nextUrl

  const query = (searchParams.get('q') || '').trim()
  const typesParam = searchParams.get('types') || ''
  const parsedLimit = parseInt(searchParams.get('limit') || '20', 10)
  const limit = Math.min(Number.isFinite(parsedLimit) ? Math.max(parsedLimit, 1) : 20, 241)

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
  let hasMore = false

  // Wait on cold startup; retain a complete snapshot during background refresh.
  try {
    await searchEngine.prepareForSearch(payload)
    if (searchEngine.isReady) {
      const flexResponse = await searchEngine.search(query, {
        limit,
        types: types.length > 0 ? types : undefined,
      })
      internalResults = flexResponse.internal || []
      hasMore = flexResponse.totalResults > limit
    }
  } catch (err) {
    console.warn('FlexSearch error:', err)
  }

  // Fall back to Payload Local API if FlexSearch returned nothing
  if (internalResults.length === 0) {
    source = 'postgresql'
    const fallbackResponse = await payloadSearch(payload, query, types, limit)
    internalResults = fallbackResponse.results
    hasMore = fallbackResponse.hasMore
  }

  internalResults = await filterVisibleSearchResults(payload, internalResults)
  hasMore ||= internalResults.length > limit
  internalResults = internalResults.slice(0, limit)

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
    hasMore,
  })
}
