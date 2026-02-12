<script lang="ts">
  import Meta from '$lib/components/Meta.svelte';
  import { urlFor } from '$lib/payload';
  import { formatDateShort } from '$lib/utils/date';

  let { data } = $props();

  const events = data.events || [];
  const pagination = data.pagination || { page: 1, totalPages: 1, totalDocs: events.length };
  const eventTypes = data.eventTypes || [];
  const currentType = data.currentType || '';
  const upcoming = data.upcoming ?? true;
  const metadata = data.seo;

  const placeholderImage = '/assets/images/resources/placeholder.jpg';

  const formatLocation = (event: any) => {
    if (!event.location) return '';
    if (typeof event.location === 'string') return event.location;
    const parts = [
      event.location.name,
      [event.location.address, event.location.city, event.location.state, event.location.zip].filter(Boolean).join(', ')
    ].filter(Boolean);
    return parts.join(' - ');
  };

  const buildLink = (page: number) => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', String(page));
    if (currentType) params.set('type', currentType);
    if (upcoming === false) params.set('upcoming', 'false');
    const query = params.toString();
    return `/events${query ? `?${query}` : ''}`;
  };
</script>

<Meta metadata={metadata} />

<section class="page-header" style="background-image: url(/assets/images/resources/page-header-bg.jpg);">
  <div class="container">
    <h2>Events</h2>
    <ul class="flex items-center gap-2 text-sm text-white/80">
      <li><a href="/">Home</a></li>
      <li><span>Events</span></li>
    </ul>
  </div>
</section>

<section class="py-12">
  <div class="container mx-auto px-6 lg:px-12">
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
      <div>
        <p class="text-sm text-muted-foreground">
          {pagination.totalDocs || 0} {upcoming === false ? 'past' : 'upcoming'} event{(pagination.totalDocs || 0) === 1 ? '' : 's'}
        </p>
        <h1 class="text-3xl font-bold text-foreground">What&apos;s happening</h1>
      </div>

      <form method="GET" class="flex flex-wrap items-end gap-4">
        <div>
          <label class="block text-sm font-medium text-foreground mb-2" for="type">Event type</label>
          <select id="type" name="type" class="select-modern min-w-[140px]">
            <option value="">All</option>
            {#each eventTypes as type}
              <option value={type.value} selected={type.value === currentType}>{type.label}</option>
            {/each}
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-foreground mb-2" for="timing">Timing</label>
          <select id="timing" name="upcoming" class="select-modern min-w-[140px]">
            <option value="true" selected={upcoming !== false}>Upcoming</option>
            <option value="false" selected={upcoming === false}>Past</option>
          </select>
        </div>
        <div>
          <button type="submit" class="btn-primary btn-sm">Apply filters</button>
        </div>
      </form>
    </div>

    {#if events.length === 0}
      <div class="bg-gray-50 rounded-lg p-8 text-center">
        <p class="text-muted-foreground">No events found.</p>
        <p class="text-sm text-muted-foreground mt-2">Check back soon for new happenings.</p>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each events as event}
          <a href="/events/{event.slug}" class="group block bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden">
            <div class="relative">
              {#if event.featuredImage}
                <img
                  src={urlFor(event.featuredImage).width(600).height(360).auto('format').url()}
                  alt={event.featuredImage.alt || event.title}
                  class="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              {:else}
                <img
                  src={placeholderImage}
                  alt="Placeholder"
                  class="w-full h-48 object-cover"
                  loading="lazy"
                />
              {/if}
              <div class="absolute top-3 left-3 bg-primary text-white text-sm font-semibold px-3 py-1 rounded">
                {formatDateShort(event.startDate)}
              </div>
            </div>
            <div class="p-5 space-y-2">
              <h3 class="text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                {event.title}
              </h3>
              {#if event.type}
                <p class="text-sm text-muted-foreground">
                  <i class="far fa-tag mr-2"></i>{event.type}
                </p>
              {/if}
              {#if formatLocation(event)}
                <p class="text-sm text-muted-foreground">
                  <i class="far fa-map-marker-alt mr-2"></i>{formatLocation(event)}
                </p>
              {/if}
            </div>
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
