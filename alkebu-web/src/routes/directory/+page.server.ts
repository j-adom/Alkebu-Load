import { payloadGet } from '$lib/server/payload';
import { buildSEOData } from '$lib/seo';
import { PUBLIC_SITE_URL } from '$env/static/public';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, setHeaders }) => {
  const page = parseInt(url.searchParams.get('page') || '1');
  const category = url.searchParams.get('category') || undefined;
  const directoryCategory = url.searchParams.get('directory') || undefined;
  const location = url.searchParams.get('location') || undefined;
  const verified = url.searchParams.get('verified') === 'true';
  const limit = 24;

  try {
    // Build query parameters - ONLY include businesses that are in the directory
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      depth: '2',
      sort: verified ? '-verified,-featured,-createdAt' : '-featured,-createdAt',
      'where[inDirectory][equals]': 'true', // Only show directory businesses
      'where[status][equals]': 'published' // Only show published businesses
    });

    // Filter by business category (restaurants, retail, etc.)
    if (category) {
      params.append('where[category][equals]', category);
    }

    // Filter by directory category (black-owned, minority-owned, etc.)
    if (directoryCategory) {
      params.append('where[directoryCategory][equals]', directoryCategory);
    }

    if (location) {
      params.append('where[address.city][contains]', location);
    }

    if (verified) {
      params.append('where[verified][equals]', 'true');
    }

    const businesses = await payloadGet<any>(`/api/businesses?${params.toString()}`);
    
    // Get business categories for filter (main business types)
    const businessCategories = [
      { value: 'restaurants-food', label: 'Restaurants & Food' },
      { value: 'retail-shopping', label: 'Retail & Shopping' },
      { value: 'professional-services', label: 'Professional Services' },
      { value: 'health-wellness', label: 'Health & Wellness' },
      { value: 'beauty-personal-care', label: 'Beauty & Personal Care' },
      { value: 'arts-entertainment', label: 'Arts & Entertainment' },
      { value: 'spiritual-religious', label: 'Spiritual & Religious' },
      { value: 'education-childcare', label: 'Education & Childcare' },
      { value: 'home-garden', label: 'Home & Garden' },
      { value: 'automotive', label: 'Automotive' },
      { value: 'technology', label: 'Technology' },
      { value: 'financial-services', label: 'Financial Services' },
      { value: 'real-estate', label: 'Real Estate' },
      { value: 'non-profit', label: 'Non-Profit' }
    ];

    // Get directory categories for filter (ownership/community classification)
    const directoryCategories = [
      { value: 'black-owned', label: 'Black-Owned Business' },
      { value: 'minority-owned', label: 'Minority-Owned Business' },
      { value: 'community-partner', label: 'Community Partner' },
      { value: 'local-business', label: 'Local Business' },
      { value: 'cultural-institution', label: 'Cultural Institution' }
    ];

    // Get common locations
    const locations = ['Nashville', 'Memphis', 'Knoxville', 'Chattanooga', 'Murfreesboro'];

    // Set strong edge caching (3 hours) with long stale window (24 hours)
    setHeaders({
      'Cache-Control': 'public, s-maxage=10800, stale-while-revalidate=86400, stale-if-error=10800',
      'Vary': 'Accept-Encoding',
      // Surrogate key for targeted purge
      'x-key': `directory${category ? `,category:${category}` : ''}${directoryCategory ? `,directory:${directoryCategory}` : ''}${location ? `,location:${location}` : ''}${verified ? ',verified' : ''}`
    });

    // Build SEO data
    let title = 'Local Business Directory';
    let description = 'Discover and support local businesses in Tennessee. Find Black-owned businesses, minority-owned enterprises, and community partners in our directory.';

    // Build title and description based on filters
    if (directoryCategory) {
      const dirCategoryLabel = directoryCategories.find(c => c.value === directoryCategory)?.label || directoryCategory;
      title = `${dirCategoryLabel} Directory`;
      description = `Find ${dirCategoryLabel.toLowerCase()} listings in Tennessee. Support local businesses and community partners.`;
      
      if (category) {
        const categoryLabel = businessCategories.find(c => c.value === category)?.label || category;
        title = `${dirCategoryLabel} - ${categoryLabel}`;
        description = `Find ${dirCategoryLabel.toLowerCase()} in the ${categoryLabel.toLowerCase()} industry across Tennessee.`;
      }
      
      if (location) {
        title += ` in ${location}`;
        description = description.replace('across Tennessee', `in ${location}, Tennessee`);
      }
    } else if (category && location) {
      const categoryLabel = businessCategories.find(c => c.value === category)?.label || category;
      title = `${categoryLabel} in ${location}`;
      description = `Find local ${categoryLabel.toLowerCase()} in ${location}, Tennessee. Support community businesses in our directory.`;
    } else if (category) {
      const categoryLabel = businessCategories.find(c => c.value === category)?.label || category;
      title = `${categoryLabel} Directory`;
      description = `Discover ${categoryLabel.toLowerCase()} across Tennessee. Support local businesses in our community.`;
    } else if (location) {
      title = `Local Businesses in ${location}`;
      description = `Find and support local businesses in ${location}, Tennessee. Browse our community business directory.`;
    }

    const seoData = buildSEOData({
      title,
      description,
      canonical: `${PUBLIC_SITE_URL}/directory${category ? `?category=${encodeURIComponent(category)}` : ''}${location ? `${category ? '&' : '?'}location=${encodeURIComponent(location)}` : ''}`,
      noIndex: page > 1 // Don't index pagination pages
    });

    return {
      businesses: businesses.docs || [],
      pagination: {
        page: businesses.page || 1,
        totalPages: businesses.totalPages || 1,
        hasNextPage: businesses.hasNextPage || false,
        hasPrevPage: businesses.hasPrevPage || false,
        totalDocs: businesses.totalDocs || 0
      },
      businessCategories,
      directoryCategories,
      locations,
      currentCategory: category,
      currentDirectoryCategory: directoryCategory,
      currentLocation: location,
      showVerified: verified,
      seo: seoData
    };
  } catch (error) {
    console.error('Error loading business directory:', error);
    
    // Return fallback data on error
    setHeaders({
      'Cache-Control': 'public, s-maxage=300' // Short cache on error
    });

    return {
      businesses: [],
      pagination: {
        page: 1,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
        totalDocs: 0
      },
      businessCategories: [],
      directoryCategories: [],
      locations: [],
      currentCategory: category,
      currentDirectoryCategory: directoryCategory,
      currentLocation: location,
      showVerified: verified,
      seo: buildSEOData({
        title: 'Local Business Directory',
        description: 'Discover and support local businesses in Tennessee.',
        canonical: `${PUBLIC_SITE_URL}/directory`,
        noIndex: false
      })
    };
  }
};