<script lang="ts">
  import Meta from '$lib/components/Meta.svelte';
  import { urlFor } from '$lib/payload';

  let { data } = $props();

  const businesses = data.businesses || [];
  const pagination = data.pagination || { page: 1, totalPages: 1, totalDocs: businesses.length };
  const businessCategories = data.businessCategories || [];
  const directoryCategories = data.directoryCategories || [];
  const locations = data.locations || [];
  const currentCategory = data.currentCategory || '';
  const currentDirectoryCategory = data.currentDirectoryCategory || '';
  const currentLocation = data.currentLocation || '';
  const showVerified = data.showVerified || false;
  const metadata = data.seo;

  const placeholderImage = '/assets/images/resources/placeholder.jpg';

  const formatLocation = (business: any) => {
    if (!business.location) return '';
    if (typeof business.location === 'string') return business.location;
    const parts = [
      business.location.name,
      [business.location.address, business.location.city, business.location.state, business.location.zip].filter(Boolean).join(', ')
    ].filter(Boolean);
    return parts.join(' - ');
  };

  const buildLink = (page: number) => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', String(page));
    if (currentCategory) params.set('category', currentCategory);
    if (currentDirectoryCategory) params.set('directory', currentDirectoryCategory);
    if (currentLocation) params.set('location', currentLocation);
    if (showVerified) params.set('verified', 'true');
    const query = params.toString();
    return `/directory${query ? `?${query}` : ''}`;
  };
</script>

<Meta metadata={metadata} />

<section class="page-header" style="background-image: url(/assets/images/resources/page-header-bg.jpg);">
  <div class="container">
    <h2>Local Business Directory</h2>
    <ul class="flex items-center gap-2 text-sm text-white/80">
      <li><a href="/">Home</a></li>
      <li><span>Directory</span></li>
    </ul>
  </div>
</section>

<section class="py-12">
  <div class="container mx-auto px-6 lg:px-12">
    <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-10">
      <div>
        <p class="text-sm text-gray-600">{pagination.totalDocs || 0} listings</p>
        <h1 class="text-3xl font-bold text-foreground">Support Local Businesses</h1>
      </div>

      <form method="GET" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label class="block text-sm text-gray-700 mb-1" for="category">Category</label>
          <select id="category" name="category" class="w-full border border-gray-300 rounded px-3 py-2">
            <option value="">All</option>
            {#each businessCategories as category}
              <option value={category.value} selected={category.value === currentCategory}>{category.label}</option>
            {/each}
          </select>
        </div>
        <div>
          <label class="block text-sm text-gray-700 mb-1" for="directory">Directory</label>
          <select id="directory" name="directory" class="w-full border border-gray-300 rounded px-3 py-2">
            <option value="">All</option>
            {#each directoryCategories as directory}
              <option value={directory.value} selected={directory.value === currentDirectoryCategory}>{directory.label}</option>
            {/each}
          </select>
        </div>
        <div>
          <label class="block text-sm text-gray-700 mb-1" for="location">Location</label>
          <select id="location" name="location" class="w-full border border-gray-300 rounded px-3 py-2">
            <option value="">Anywhere</option>
            {#each locations as location}
              <option value={location} selected={location === currentLocation}>{location}</option>
            {/each}
          </select>
        </div>
        <div class="flex items-center gap-2 mt-6">
          <input
            type="checkbox"
            id="verified"
            name="verified"
            value="true"
            checked={showVerified}
          />
          <label for="verified" class="text-sm text-gray-700">Verified only</label>
        </div>
        <div class="mt-2 md:mt-6">
          <button type="submit" class="btn-primary w-full">Apply filters</button>
        </div>
      </form>
    </div>

    {#if businesses.length === 0}
      <div class="bg-gray-50 rounded-lg p-8 text-center">
        <p class="text-gray-700">No businesses found for these filters.</p>
        <p class="text-sm text-gray-500 mt-2">Try widening your search or removing filters.</p>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each businesses as business}
          <a href="/directory/{business.slug}" class="group block bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
            <div class="flex items-center gap-4 p-5">
              <div class="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                {#if business.logo}
                  <img
                    src={urlFor(business.logo).width(180).height(180).auto('format').url()}
                    alt={`${business.name} logo`}
                    class="w-full h-full object-cover"
                    loading="lazy"
                  />
                {:else}
                  <img
                    src={placeholderImage}
                    alt="Placeholder logo"
                    class="w-full h-full object-cover"
                    loading="lazy"
                  />
                {/if}
              </div>
              <div class="flex-1">
                <h3 class="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                  {business.name}
                </h3>
                {#if business.category}
                  <p class="text-sm text-gray-600">
                    <i class="far fa-tag mr-2"></i>{business.category}
                  </p>
                {/if}
                {#if formatLocation(business)}
                  <p class="text-sm text-gray-600">
                    <i class="far fa-map-marker-alt mr-2"></i>{formatLocation(business)}
                  </p>
                {/if}
                {#if business.averageRating}
                  <p class="text-sm text-yellow-600">
                    <i class="fas fa-star mr-1"></i>{business.averageRating.toFixed(1)} ({business.reviewCount || 0})
                  </p>
                {/if}
              </div>
            </div>
            {#if business.description}
              <div class="px-5 pb-5 text-sm text-gray-700 line-clamp-2">
                {business.description}
              </div>
            {/if}
          </a>
        {/each}
      </div>
    {/if}

    {#if pagination.totalPages > 1}
      <div class="flex items-center justify-center gap-3 mt-10">
        {#if pagination.hasPrevPage}
          <a href={buildLink(pagination.page - 1)} class="px-4 py-2 border rounded hover:bg-gray-100">Previous</a>
        {/if}
        <span class="px-4 py-2 bg-muted rounded font-semibold text-foreground">
          Page {pagination.page} of {pagination.totalPages}
        </span>
        {#if pagination.hasNextPage}
          <a href={buildLink(pagination.page + 1)} class="px-4 py-2 border rounded hover:bg-gray-100">Next</a>
        {/if}
      </div>
    {/if}
  </div>
</section>
