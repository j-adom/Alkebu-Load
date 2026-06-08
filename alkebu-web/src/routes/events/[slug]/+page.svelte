<script lang="ts">
  import Meta from '$lib/components/Meta.svelte';
  import LexicalRenderer from '$lib/components/LexicalRenderer.svelte';
  import ProductCard from '$lib/components/Shop/ProductCard.svelte';
  import { urlFor, getImageUrl } from '$lib/payload';
  import { formatDate } from '$lib/utils/date';

  let { data } = $props();
  const event = $derived(data.event || {});
  const relatedEvents = $derived(data.relatedEvents || []);

  // Products featured at this event. Relationship fields are populated to full docs
  // at depth>=1; when unpopulated they arrive as bare IDs (strings), so filter to objects.
  const featuredProducts = $derived.by(() => {
    const groups = [
      { items: event.relatedBooks, productType: 'books', basePath: '/shop/books' },
      { items: event.relatedWellnessProducts, productType: 'wellness-lifestyle', basePath: '/shop/health-and-beauty' },
      { items: event.relatedFashionJewelry, productType: 'fashion-jewelry', basePath: '/shop/apparel' },
      { items: event.relatedOilsIncense, productType: 'oils-incense', basePath: '/shop/home-goods' }
    ] as const;
    return groups.flatMap((g) =>
      (Array.isArray(g.items) ? g.items : [])
        .filter((p: any) => p && typeof p === 'object')
        .map((p: any) => ({ product: p, productType: g.productType, basePath: g.basePath }))
    );
  });

  const partnerBusinesses = $derived(
    (Array.isArray(event.relatedBusinesses) ? event.relatedBusinesses : []).filter(
      (b: any) => b && typeof b === 'object'
    )
  );
  const isPastEvent = $derived(Boolean(data.isPastEvent));
  const seo = $derived(data.seo);

  // Format event dates
  const startDate = $derived(event.startDate ? new Date(event.startDate) : null);
  const endDate = $derived(event.endDate ? new Date(event.endDate) : null);

  const dateDisplay = $derived.by(() =>
    startDate
      ? endDate && endDate.toDateString() !== startDate.toDateString()
        ? formatDate(startDate) + ' - ' + formatDate(endDate)
        : formatDate(startDate)
      : ''
  );

  const timeDisplay = $derived.by(() =>
    event.startDate
      ? new Date(event.startDate).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        })
      : ''
  );

  const venue = $derived(typeof event.venue === 'object' && event.venue ? event.venue : {});
  const venueName = $derived(typeof event.venue === 'string' ? event.venue : venue.name || '');
  const locationDisplay = $derived.by(() => {
    if (typeof event.location === 'string') return event.location;
    return event.location?.name || event.location?.address || venue.address || '';
  });
  const registrationDetails = $derived(event.registrationDetails || {});
  const eventPrice = $derived(registrationDetails.price ?? event.price ?? event.cost);
  const priceDisplay = $derived(
    eventPrice === undefined || eventPrice === null || eventPrice === ''
      ? ''
      : Number(eventPrice) === 0
        ? 'Free'
        : '$' + eventPrice
  );
  const registrationUrl = $derived(event.registrationUrl || '');
  const contactInfo = $derived(event.contactInfo || {});
  const contactEmail = $derived(contactInfo.email || event.contactEmail || '');
  const contactPhone = $derived(contactInfo.phone || event.contactPhone || '');
</script>

<Meta metadata={seo} />

<!-- Page Header -->
<section class="page-header event-hero" style="background-image: url({event.featuredImage?.url || '/assets/images/resources/page-header-bg.jpg'});">
  <div class="event-hero__scrim"></div>
  <div class="container event-hero__content">
    <ul class="event-hero__crumbs flex items-center gap-2 text-sm">
      <li><a href="/">Home</a></li>
      <li aria-hidden="true">/</li>
      <li><a href="/events">Events</a></li>
    </ul>
    <h2 class="event-hero__title">{event.title}</h2>
  </div>
</section>

<!-- Event Detail -->
<section class="event-detail py-12">
  <div class="container mx-auto px-6 lg:px-12">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">

      <!-- Main Content -->
      <div class="lg:col-span-2">
        <!-- Event Image -->
        {#if event.featuredImage}
          <div class="mb-8 rounded-lg overflow-hidden">
            <img
              src={urlFor(event.featuredImage).width(800).height(450).auto('format').url()}
              alt={event.featuredImage.alt || event.title}
              class="w-full h-auto"
              loading="eager"
            />
          </div>
        {/if}

        <!-- Event Info -->
        <div class="mb-8">
          <div class="flex flex-wrap gap-4 mb-6">
            {#if isPastEvent}
              <span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-200 text-gray-700">
                <i class="far fa-calendar-check mr-2"></i>
                Past Event
              </span>
            {:else}
              <span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-primary text-white">
                <i class="far fa-calendar-star mr-2"></i>
                Upcoming
              </span>
            {/if}

            {#if event.type}
              <span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-muted text-foreground">
                <i class="far fa-tag mr-2"></i>
                {event.type}
              </span>
            {/if}
          </div>

          <h1 class="text-3xl lg:text-4xl font-bold mb-4 text-foreground">{event.title}</h1>

          {#if event.description}
            <div class="prose prose-lg max-w-none prose-headings:font-display prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary hover:prose-a:text-primary/80 mb-8">
              <LexicalRenderer content={event.description} />
            </div>
          {/if}
        </div>
      </div>

      <!-- Sidebar -->
      <div class="lg:col-span-1">
        <div class="sticky top-24 space-y-6">

          <!-- Event Details Card -->
          <div class="bg-white rounded-lg shadow-lg p-6">
            <h3 class="text-xl font-bold mb-4 text-foreground">Event Details</h3>

            <div class="space-y-4">
              <!-- Date & Time -->
              <div class="flex items-start">
                <i class="far fa-calendar text-primary text-xl mt-1 mr-3"></i>
                <div>
                  <p class="font-semibold text-foreground">Date</p>
                  <p class="text-gray-700">{dateDisplay}</p>
                  <p class="text-sm text-gray-600">{timeDisplay}</p>
                </div>
              </div>

              <!-- Location -->
              {#if locationDisplay}
                <div class="flex items-start">
                  <i class="far fa-map-marker-alt text-primary text-xl mt-1 mr-3"></i>
                  <div>
                    <p class="font-semibold text-foreground">Location</p>
                    <p class="text-gray-700">{locationDisplay}</p>
                  </div>
                </div>
              {/if}

              <!-- Venue -->
              {#if venueName}
                <div class="flex items-start">
                  <i class="far fa-building text-primary text-xl mt-1 mr-3"></i>
                  <div>
                    <p class="font-semibold text-foreground">Venue</p>
                    <p class="text-gray-700">{venueName}</p>
                  </div>
                </div>
              {/if}

              <!-- Cost -->
              {#if priceDisplay}
                <div class="flex items-start">
                  <i class="far fa-ticket text-primary text-xl mt-1 mr-3"></i>
                  <div>
                    <p class="font-semibold text-foreground">Cost</p>
                    <p class="text-gray-700">
                      {priceDisplay}
                    </p>
                  </div>
                </div>
              {/if}

              <!-- Registration Link -->
              {#if registrationUrl && !isPastEvent}
                <div class="mt-6">
                  <a
                    href={registrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="btn-primary w-full text-center block"
                  >
                    Register Now
                    <i class="far fa-external-link ml-2"></i>
                  </a>
                </div>
              {/if}

              <!-- Contact -->
              {#if contactEmail || contactPhone}
                <div class="pt-4 border-t border-gray-200">
                  <p class="font-semibold text-foreground mb-2">Contact</p>
                  {#if contactEmail}
                    <p class="text-sm text-gray-700">
                      <i class="far fa-envelope mr-2"></i>
                      <a href="mailto:{contactEmail}" class="hover:text-primary">
                        {contactEmail}
                      </a>
                    </p>
                  {/if}
                  {#if contactPhone}
                    <p class="text-sm text-gray-700">
                      <i class="far fa-phone mr-2"></i>
                      <a href="tel:{contactPhone}" class="hover:text-primary">
                        {contactPhone}
                      </a>
                    </p>
                  {/if}
                </div>
              {/if}
            </div>
          </div>

          <!-- Share Card -->
          <div class="bg-muted rounded-lg p-6">
            <h3 class="text-lg font-bold mb-3 text-foreground">Share Event</h3>
            <div class="flex gap-3">
              <a
                href="https://www.facebook.com/sharer/sharer.php?u={encodeURIComponent(seo.canonical)}"
                target="_blank"
                rel="noopener noreferrer"
                class="flex-1 bg-white hover:bg-primary hover:text-white transition-colors rounded p-2 text-center"
                aria-label="Share on Facebook"
              >
                <i class="fab fa-facebook-f"></i>
              </a>
              <a
                href="https://twitter.com/intent/tweet?url={encodeURIComponent(seo.canonical)}&text={encodeURIComponent(event.title)}"
                target="_blank"
                rel="noopener noreferrer"
                class="flex-1 bg-white hover:bg-primary hover:text-white transition-colors rounded p-2 text-center"
                aria-label="Share on Twitter"
              >
                <i class="fab fa-twitter"></i>
              </a>
              <a
                href="mailto:?subject={encodeURIComponent(event.title)}&body={encodeURIComponent(seo.canonical)}"
                class="flex-1 bg-white hover:bg-primary hover:text-white transition-colors rounded p-2 text-center"
                aria-label="Share via Email"
              >
                <i class="far fa-envelope"></i>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Featured Products at this event -->
    {#if featuredProducts.length > 0}
      <div class="mt-16">
        <div class="block-title text-center mb-8">
          <p>Shop the event</p>
          <h3>Featured Products</h3>
          <div class="leaf">
            <img loading="lazy" src="/assets/images/resources/leaf.png" alt="">
          </div>
        </div>

        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {#each featuredProducts as entry (entry.productType + ':' + (entry.product.id ?? entry.product.slug))}
            <ProductCard
              product={entry.product}
              productType={entry.productType}
              basePath={entry.basePath}
            />
          {/each}
        </div>
      </div>
    {/if}

    <!-- Partner Businesses -->
    {#if partnerBusinesses.length > 0}
      <div class="mt-16">
        <div class="block-title text-center mb-8">
          <p>In partnership with</p>
          <h3>Event Partners</h3>
          <div class="leaf">
            <img loading="lazy" src="/assets/images/resources/leaf.png" alt="">
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each partnerBusinesses as business (business.id ?? business.slug)}
            {@const rawWebsite = business.contact?.website}
            {@const website = rawWebsite && /^https?:\/\//i.test(rawWebsite.trim()) ? rawWebsite.trim() : null}
            <svelte:element
              this={website ? 'a' : 'div'}
              href={website || undefined}
              target={website ? '_blank' : undefined}
              rel={website ? 'noopener noreferrer' : undefined}
              class="partner-card flex items-center gap-4 bg-white rounded-lg shadow-md p-4 {website ? 'hover:shadow-xl transition-shadow' : ''}"
            >
              {#if business.logo}
                <img
                  src={getImageUrl(business.logo, { fallback: '' })}
                  alt={business.name}
                  class="w-16 h-16 rounded-full object-cover flex-shrink-0 bg-muted"
                  loading="lazy"
                />
              {:else}
                <div class="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 text-xl font-bold">
                  {business.name?.charAt(0) || '?'}
                </div>
              {/if}
              <div class="min-w-0">
                <h4 class="font-bold text-foreground truncate">{business.name}</h4>
                {#if business.category}
                  <p class="text-sm text-primary capitalize">{business.category.replace(/-/g, ' ')}</p>
                {/if}
                {#if business.location}
                  <p class="text-sm text-gray-600 truncate">
                    <i class="far fa-map-marker-alt mr-1"></i>{business.location}
                  </p>
                {/if}
              </div>
            </svelte:element>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Related Events -->
    {#if relatedEvents && relatedEvents.length > 0}
      <div class="mt-16">
        <div class="block-title text-center mb-8">
          <p>Don't miss out</p>
          <h3>{isPastEvent ? 'Similar Events' : 'Upcoming Events'}</h3>
          <div class="leaf">
            <img loading="lazy" src="/assets/images/resources/leaf.png" alt="">
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
          {#each relatedEvents as relatedEvent}
            <a href="/events/{relatedEvent.slug}" class="group block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden">
              {#if relatedEvent.featuredImage}
                <div class="aspect-video overflow-hidden">
                  <img
                    src={urlFor(relatedEvent.featuredImage).width(400).height(225).auto('format').url()}
                    alt={relatedEvent.featuredImage.alt || relatedEvent.title}
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
              {/if}
              <div class="p-4">
                <p class="text-sm text-primary mb-2">
                  <i class="far fa-calendar mr-1"></i>
                  {formatDate(relatedEvent.startDate)}
                </p>
                <h4 class="font-bold text-lg mb-2 text-foreground group-hover:text-primary transition-colors">
                  {relatedEvent.title}
                </h4>
                {#if relatedEvent.description}
                  <p class="text-sm text-gray-600 line-clamp-2">
                    {relatedEvent.description}
                  </p>
                {/if}
              </div>
            </a>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</section>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Event hero: keep the flyer as background but guarantee the title is legible
     by laying a strong bottom-up gradient scrim over the (often busy) artwork. */
  .event-hero {
    min-height: 440px;
    display: flex;
    align-items: flex-end;
  }
  .event-hero__scrim {
    position: absolute;
    inset: 0;
    z-index: 1;
    background: linear-gradient(
      to top,
      rgba(12, 10, 9, 0.94) 0%,
      rgba(12, 10, 9, 0.7) 30%,
      rgba(12, 10, 9, 0.25) 65%,
      rgba(12, 10, 9, 0.05) 100%
    );
  }
  .event-hero__content {
    position: relative;
    z-index: 2;
    padding-bottom: 2.75rem;
  }
  .event-hero__crumbs {
    justify-content: center;
    color: rgba(255, 255, 255, 0.85);
    margin-bottom: 0.85rem;
  }
  .event-hero__crumbs a:hover {
    color: var(--thm-base, #ecdc5e);
  }
  /* Two classes (0,2,0) outrank the global `.page-header h2` (0,1,1),
     so these overrides win without !important. */
  .event-hero .event-hero__title {
    font-size: clamp(2rem, 5vw, 3.5rem);
    line-height: 1.08;
    padding-bottom: 0;
    max-width: 60rem;
    margin: 0 auto;
    text-shadow: 0 2px 20px rgba(0, 0, 0, 0.65);
  }
</style>
