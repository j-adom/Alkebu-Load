<script lang="ts">
  import Meta from '$lib/components/Meta.svelte';
  import { urlFor } from '$lib/payload';
  import { formatDate } from '$lib/utils/date';

  let { data } = $props();
  const { event, relatedEvents, isPastEvent, seo } = data;

  // Format event dates
  const startDate = new Date(event.startDate);
  const endDate = event.endDate ? new Date(event.endDate) : null;

  const dateDisplay = endDate && endDate.toDateString() !== startDate.toDateString()
    ? `${formatDate(event.startDate)} - ${formatDate(event.endDate)}`
    : formatDate(event.startDate);

  const timeDisplay = new Date(event.startDate).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
</script>

<Meta metadata={seo} />

<!-- Page Header -->
<section class="page-header" style="background-image: url({event.featuredImage?.url || '/assets/images/resources/page-header-bg.jpg'});">
  <div class="container">
    <h2>{event.title}</h2>
    <ul class="thm-breadcrumb list-unstyled">
      <li><a href="/">Home</a></li>
      <li><a href="/events">Events</a></li>
      <li><span>{event.title}</span></li>
    </ul>
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
              <span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-thm-primary text-white">
                <i class="far fa-calendar-star mr-2"></i>
                Upcoming
              </span>
            {/if}

            {#if event.type}
              <span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-thm-base text-thm-black">
                <i class="far fa-tag mr-2"></i>
                {event.type}
              </span>
            {/if}
          </div>

          <h1 class="text-3xl lg:text-4xl font-bold mb-4 text-thm-black">{event.title}</h1>

          {#if event.description}
            <div class="prose max-w-none mb-8">
              <p class="text-lg text-gray-700">{event.description}</p>
            </div>
          {/if}

          <!-- Event Content/Details -->
          {#if event.content}
            <div class="prose max-w-none">
              <!-- TODO: Add rich text renderer for event.content -->
              {@html event.content}
            </div>
          {/if}
        </div>
      </div>

      <!-- Sidebar -->
      <div class="lg:col-span-1">
        <div class="sticky top-24 space-y-6">

          <!-- Event Details Card -->
          <div class="bg-white rounded-lg shadow-lg p-6">
            <h3 class="text-xl font-bold mb-4 text-thm-black">Event Details</h3>

            <div class="space-y-4">
              <!-- Date & Time -->
              <div class="flex items-start">
                <i class="far fa-calendar text-thm-primary text-xl mt-1 mr-3"></i>
                <div>
                  <p class="font-semibold text-thm-black">Date</p>
                  <p class="text-gray-700">{dateDisplay}</p>
                  <p class="text-sm text-gray-600">{timeDisplay}</p>
                </div>
              </div>

              <!-- Location -->
              {#if event.location}
                <div class="flex items-start">
                  <i class="far fa-map-marker-alt text-thm-primary text-xl mt-1 mr-3"></i>
                  <div>
                    <p class="font-semibold text-thm-black">Location</p>
                    <p class="text-gray-700">{event.location}</p>
                  </div>
                </div>
              {/if}

              <!-- Venue -->
              {#if event.venue}
                <div class="flex items-start">
                  <i class="far fa-building text-thm-primary text-xl mt-1 mr-3"></i>
                  <div>
                    <p class="font-semibold text-thm-black">Venue</p>
                    <p class="text-gray-700">{event.venue.name}</p>
                  </div>
                </div>
              {/if}

              <!-- Cost -->
              {#if event.cost !== undefined}
                <div class="flex items-start">
                  <i class="far fa-ticket text-thm-primary text-xl mt-1 mr-3"></i>
                  <div>
                    <p class="font-semibold text-thm-black">Cost</p>
                    <p class="text-gray-700">
                      {event.cost === 0 || event.cost === '0' ? 'Free' : `$${event.cost}`}
                    </p>
                  </div>
                </div>
              {/if}

              <!-- Registration Link -->
              {#if event.registrationUrl && !isPastEvent}
                <div class="mt-6">
                  <a
                    href={event.registrationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="thm-btn w-full text-center block"
                  >
                    Register Now
                    <i class="far fa-external-link ml-2"></i>
                  </a>
                </div>
              {/if}

              <!-- Contact -->
              {#if event.contactEmail || event.contactPhone}
                <div class="pt-4 border-t border-gray-200">
                  <p class="font-semibold text-thm-black mb-2">Contact</p>
                  {#if event.contactEmail}
                    <p class="text-sm text-gray-700">
                      <i class="far fa-envelope mr-2"></i>
                      <a href="mailto:{event.contactEmail}" class="hover:text-thm-primary">
                        {event.contactEmail}
                      </a>
                    </p>
                  {/if}
                  {#if event.contactPhone}
                    <p class="text-sm text-gray-700">
                      <i class="far fa-phone mr-2"></i>
                      <a href="tel:{event.contactPhone}" class="hover:text-thm-primary">
                        {event.contactPhone}
                      </a>
                    </p>
                  {/if}
                </div>
              {/if}
            </div>
          </div>

          <!-- Share Card -->
          <div class="bg-thm-base rounded-lg p-6">
            <h3 class="text-lg font-bold mb-3 text-thm-black">Share Event</h3>
            <div class="flex gap-3">
              <a
                href="https://www.facebook.com/sharer/sharer.php?u={encodeURIComponent(seo.canonical)}"
                target="_blank"
                rel="noopener noreferrer"
                class="flex-1 bg-white hover:bg-thm-primary hover:text-white transition-colors rounded p-2 text-center"
                aria-label="Share on Facebook"
              >
                <i class="fab fa-facebook-f"></i>
              </a>
              <a
                href="https://twitter.com/intent/tweet?url={encodeURIComponent(seo.canonical)}&text={encodeURIComponent(event.title)}"
                target="_blank"
                rel="noopener noreferrer"
                class="flex-1 bg-white hover:bg-thm-primary hover:text-white transition-colors rounded p-2 text-center"
                aria-label="Share on Twitter"
              >
                <i class="fab fa-twitter"></i>
              </a>
              <a
                href="mailto:?subject={encodeURIComponent(event.title)}&body={encodeURIComponent(seo.canonical)}"
                class="flex-1 bg-white hover:bg-thm-primary hover:text-white transition-colors rounded p-2 text-center"
                aria-label="Share via Email"
              >
                <i class="far fa-envelope"></i>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>

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
                <p class="text-sm text-thm-primary mb-2">
                  <i class="far fa-calendar mr-1"></i>
                  {formatDate(relatedEvent.startDate)}
                </p>
                <h4 class="font-bold text-lg mb-2 text-thm-black group-hover:text-thm-primary transition-colors">
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
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>
