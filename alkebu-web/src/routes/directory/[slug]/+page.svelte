<script lang="ts">
  import Meta from '$lib/components/Meta.svelte';
  import { urlFor } from '$lib/payload';

  let { data } = $props();
  const { business, relatedBusinesses, reviews, seo } = data;

  // Format business hours
  function formatHours(hours: any) {
    if (!hours) return null;

    const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return daysOrder.map(day => ({
      day: day.charAt(0).toUpperCase() + day.slice(1),
      ...hours[day]
    }));
  }

  const formattedHours = formatHours(business.hours);
</script>

<Meta metadata={seo} />

<!-- Page Header -->
<section class="page-header" style="background-image: url({business.photos?.[0]?.url || '/assets/images/resources/page-header-bg.jpg'});">
  <div class="container">
    <h2>{business.name}</h2>
    <ul class="flex items-center gap-2 text-sm text-white/80">
      <li><a href="/">Home</a></li>
      <li><a href="/directory">Directory</a></li>
      <li><span>{business.name}</span></li>
    </ul>
  </div>
</section>

<!-- Business Detail -->
<section class="business-detail py-12">
  <div class="container mx-auto px-6 lg:px-12">
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">

      <!-- Main Content -->
      <div class="lg:col-span-2">

        <!-- Business Header -->
        <div class="flex items-start gap-6 mb-8">
          {#if business.logo}
            <div class="flex-shrink-0">
              <img
                src={urlFor(business.logo).width(120).height(120).auto('format').url()}
                alt="{business.name} logo"
                class="w-24 h-24 rounded-lg object-cover shadow-md"
                loading="eager"
              />
            </div>
          {/if}

          <div class="flex-1">
            <div class="flex items-center gap-3 mb-2">
              <h1 class="text-3xl lg:text-4xl font-bold text-foreground">{business.name}</h1>
              {#if business.verified}
                <span class="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                  <i class="fas fa-check-circle mr-1"></i>
                  Verified
                </span>
              {/if}
            </div>

            {#if business.category}
              <p class="text-lg text-gray-600 mb-2">
                <i class="far fa-tag mr-2"></i>
                {business.category}
              </p>
            {/if}

            {#if business.averageRating}
              <div class="flex items-center gap-2">
                <div class="flex">
                  {#each Array(5) as _, i}
                    <i class="fa{i < Math.round(business.averageRating) ? 's' : 'r'} fa-star text-yellow-400"></i>
                  {/each}
                </div>
                <span class="text-sm text-gray-600">
                  {business.averageRating.toFixed(1)} ({business.reviewCount || 0} reviews)
                </span>
              </div>
            {/if}
          </div>
        </div>

        <!-- Business Photos -->
        {#if business.photos && business.photos.length > 0}
          <div class="mb-8">
            <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
              {#each business.photos.slice(0, 6) as photo}
                <div class="aspect-square rounded-lg overflow-hidden">
                  <img
                    src={urlFor(photo).width(400).height(400).auto('format').url()}
                    alt={photo.alt || business.name}
                    class="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Description -->
        {#if business.description}
          <div class="mb-8">
            <h2 class="text-2xl font-bold mb-4 text-foreground">About</h2>
            <div class="prose max-w-none">
              <p class="text-gray-700 leading-relaxed">{business.description}</p>
            </div>
          </div>
        {/if}

        <!-- Specialties -->
        {#if business.specialties && business.specialties.length > 0}
          <div class="mb-8">
            <h2 class="text-2xl font-bold mb-4 text-foreground">Specialties</h2>
            <div class="flex flex-wrap gap-2">
              {#each business.specialties as specialty}
                <span class="inline-block px-3 py-1 bg-muted text-foreground rounded-full text-sm">
                  {specialty}
                </span>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Reviews Section -->
        <div class="mb-8">
          <h2 class="text-2xl font-bold mb-6 text-foreground">Reviews</h2>

          {#if reviews && reviews.length > 0}
            <div class="space-y-6">
              {#each reviews as review}
                <div class="bg-white rounded-lg shadow-md p-6">
                  <div class="flex items-start justify-between mb-3">
                    <div>
                      <p class="font-semibold text-foreground">{review.author?.name || 'Anonymous'}</p>
                      <div class="flex items-center gap-2 mt-1">
                        <div class="flex">
                          {#each Array(5) as _, i}
                            <i class="fa{i < review.rating ? 's' : 'r'} fa-star text-yellow-400 text-sm"></i>
                          {/each}
                        </div>
                        <span class="text-xs text-gray-500">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {#if review.title}
                    <h3 class="font-semibold mb-2 text-foreground">{review.title}</h3>
                  {/if}

                  {#if review.comment}
                    <p class="text-gray-700">{review.comment}</p>
                  {/if}
                </div>
              {/each}
            </div>

            <div class="mt-6 text-center">
              <button class="btn-primary">Load More Reviews</button>
            </div>
          {:else}
            <div class="bg-gray-50 rounded-lg p-8 text-center">
              <p class="text-gray-600">No reviews yet. Be the first to review this business!</p>
              <button class="btn-primary mt-4">Write a Review</button>
            </div>
          {/if}
        </div>
      </div>

      <!-- Sidebar -->
      <div class="lg:col-span-1">
        <div class="sticky top-24 space-y-6">

          <!-- Contact Card -->
          <div class="bg-white rounded-lg shadow-lg p-6">
            <h3 class="text-xl font-bold mb-4 text-foreground">Contact Information</h3>

            <div class="space-y-4">
              <!-- Address -->
              {#if business.address}
                <div class="flex items-start">
                  <i class="far fa-map-marker-alt text-primary text-xl mt-1 mr-3"></i>
                  <div>
                    <p class="font-semibold text-foreground">Address</p>
                    <p class="text-gray-700 text-sm">{business.address}</p>
                  </div>
                </div>
              {/if}

              <!-- Phone -->
              {#if business.phone}
                <div class="flex items-start">
                  <i class="far fa-phone text-primary text-xl mt-1 mr-3"></i>
                  <div>
                    <p class="font-semibold text-foreground">Phone</p>
                    <a href="tel:{business.phone}" class="text-gray-700 hover:text-primary text-sm">
                      {business.phone}
                    </a>
                  </div>
                </div>
              {/if}

              <!-- Email -->
              {#if business.email}
                <div class="flex items-start">
                  <i class="far fa-envelope text-primary text-xl mt-1 mr-3"></i>
                  <div>
                    <p class="font-semibold text-foreground">Email</p>
                    <a href="mailto:{business.email}" class="text-gray-700 hover:text-primary text-sm break-all">
                      {business.email}
                    </a>
                  </div>
                </div>
              {/if}

              <!-- Website -->
              {#if business.website}
                <div class="flex items-start">
                  <i class="far fa-globe text-primary text-xl mt-1 mr-3"></i>
                  <div>
                    <p class="font-semibold text-foreground">Website</p>
                    <a
                      href={business.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      class="text-gray-700 hover:text-primary text-sm break-all"
                    >
                      Visit Website
                      <i class="far fa-external-link ml-1 text-xs"></i>
                    </a>
                  </div>
                </div>
              {/if}

              <!-- Social Media -->
              {#if business.socialMedia}
                <div class="pt-4 border-t border-gray-200">
                  <p class="font-semibold text-foreground mb-3">Social Media</p>
                  <div class="flex gap-3">
                    {#if business.socialMedia.facebook}
                      <a
                        href={business.socialMedia.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-xl text-gray-600 hover:text-primary"
                        aria-label="Facebook"
                      >
                        <i class="fab fa-facebook"></i>
                      </a>
                    {/if}
                    {#if business.socialMedia.instagram}
                      <a
                        href={business.socialMedia.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-xl text-gray-600 hover:text-primary"
                        aria-label="Instagram"
                      >
                        <i class="fab fa-instagram"></i>
                      </a>
                    {/if}
                    {#if business.socialMedia.twitter}
                      <a
                        href={business.socialMedia.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-xl text-gray-600 hover:text-primary"
                        aria-label="Twitter"
                      >
                        <i class="fab fa-twitter"></i>
                      </a>
                    {/if}
                  </div>
                </div>
              {/if}
            </div>
          </div>

          <!-- Business Hours Card -->
          {#if formattedHours}
            <div class="bg-white rounded-lg shadow-lg p-6">
              <h3 class="text-xl font-bold mb-4 text-foreground">Business Hours</h3>
              <div class="space-y-2">
                {#each formattedHours as { day, open, close, closed }}
                  <div class="flex justify-between text-sm">
                    <span class="font-medium text-foreground">{day}</span>
                    <span class="text-gray-700">
                      {closed ? 'Closed' : `${open} - ${close}`}
                    </span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Action Buttons -->
          <div class="bg-muted rounded-lg p-6 space-y-3">
            <a href="tel:{business.phone}" class="btn-primary w-full text-center block">
              <i class="far fa-phone mr-2"></i>
              Call Now
            </a>
            {#if business.website}
              <a
                href={business.website}
                target="_blank"
                rel="noopener noreferrer"
                class="bg-white text-foreground hover:bg-primary hover:text-white transition-colors rounded px-6 py-3 font-semibold w-full text-center block"
              >
                <i class="far fa-external-link mr-2"></i>
                Visit Website
              </a>
            {/if}
          </div>
        </div>
      </div>
    </div>

    <!-- Related Businesses -->
    {#if relatedBusinesses && relatedBusinesses.length > 0}
      <div class="mt-16">
        <div class="block-title text-center mb-8">
          <p>Explore more</p>
          <h3>Related Businesses</h3>
          <div class="leaf">
            <img loading="lazy" src="/assets/images/resources/leaf.png" alt="">
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          {#each relatedBusinesses as relatedBusiness}
            <a href="/directory/{relatedBusiness.slug}" class="group block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden">
              {#if relatedBusiness.logo}
                <div class="aspect-square overflow-hidden bg-gray-100 p-4">
                  <img
                    src={urlFor(relatedBusiness.logo).width(200).height(200).auto('format').url()}
                    alt="{relatedBusiness.name} logo"
                    class="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>
              {/if}
              <div class="p-4">
                <h4 class="font-bold text-lg mb-1 text-foreground group-hover:text-primary transition-colors">
                  {relatedBusiness.name}
                </h4>
                {#if relatedBusiness.category}
                  <p class="text-sm text-gray-600 mb-2">{relatedBusiness.category}</p>
                {/if}
                {#if relatedBusiness.averageRating}
                  <div class="flex items-center gap-1">
                    <div class="flex text-xs">
                      {#each Array(5) as _, i}
                        <i class="fa{i < Math.round(relatedBusiness.averageRating) ? 's' : 'r'} fa-star text-yellow-400"></i>
                      {/each}
                    </div>
                    <span class="text-xs text-gray-600">
                      ({relatedBusiness.reviewCount || 0})
                    </span>
                  </div>
                {/if}
              </div>
            </a>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</section>
