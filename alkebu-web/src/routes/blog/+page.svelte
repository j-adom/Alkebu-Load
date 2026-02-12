<script lang="ts">
  import LexicalRenderer from '$lib/components/LexicalRenderer.svelte';
  import Meta from '$lib/components/Meta.svelte';
  import { urlFor } from '$lib/payload';
  import { ArrowRight, Calendar, ChevronRight } from 'lucide-svelte';
  import dayjs from "dayjs";

  let { data } = $props();
  const posts = data.posts || [];
  const settings = data.settings || {};
  const metadata = data.seo;

  const placeholderImage = '/assets/images/resources/placeholder.jpg';
  const bannerUrl = settings.banner
    ? urlFor(settings.banner).width(1920).height(600).auto('format').url()
    : '/assets/images/resources/page-header-bg.jpg';

  const imageForPost = (post: any) =>
    urlFor(post.mainImage || post.featuredImage || placeholderImage)
      .width(400)
      .height(300)
      .auto('format')
      .url();

</script>

<Meta metadata={metadata} />

<!-- Modern Page Header -->
<section
  class="relative py-20 md:py-28 bg-cover bg-center overflow-hidden"
  style={`background-image: url(${bannerUrl});`}
>
  <div class="absolute inset-0 bg-gradient-to-br from-kente-forest/90 via-kente-indigo/80 to-kente-forest/90"></div>
  <div class="container relative z-10 mx-auto px-4 text-center">
    <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4 font-display">
      Habari Gani?
    </h1>
    <p class="text-xl md:text-2xl text-white/90 mb-6">(What's the News?)</p>
    <nav class="flex items-center justify-center gap-2 text-white/80">
      <a href="/" class="hover:text-kente-gold transition-colors">Home</a>
      <ChevronRight class="w-4 h-4" />
      <span class="text-kente-gold">News</span>
    </nav>
  </div>
</section>

<!-- Blog Posts Grid -->
<section class="section bg-background">
  <div class="container mx-auto px-4">
    {#if posts.length === 0}
      <div class="text-center py-16">
        <p class="text-muted-foreground text-lg">No posts available yet. Check back soon!</p>
      </div>
    {:else}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {#each posts as post}
          <article class="group card-modern flex flex-col">
            <!-- Image Container -->
            <a href="/blog/{post.slug}" class="block relative overflow-hidden aspect-[4/3]">
              {#if post.mainImage || post.featuredImage}
                <img
                  src={imageForPost(post)}
                  alt={post.title}
                  loading="lazy"
                  class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                >
              {:else}
                <img
                  src={placeholderImage}
                  alt="Placeholder"
                  loading="lazy"
                  class="w-full h-full object-cover"
                >
              {/if}
              <!-- Date Badge -->
              <div class="absolute top-4 left-4 bg-kente-gold text-primary-foreground px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-1.5">
                <Calendar class="w-4 h-4" />
                {dayjs(post.publishedAt).format('MMM DD, YYYY')}
              </div>
            </a>

            <!-- Content -->
            <div class="p-6 flex flex-col flex-grow">
              <h3 class="text-xl font-bold mb-3 line-clamp-2 group-hover:text-primary transition-colors">
                <a href="/blog/{post.slug}">{post.title}</a>
              </h3>
              <div class="text-muted-foreground mb-4 line-clamp-3 flex-grow">
                <LexicalRenderer content={post.excerpt} />
              </div>
              <a
                href="/blog/{post.slug}"
                class="inline-flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all"
              >
                Read More
                <ArrowRight class="w-4 h-4" />
              </a>
            </div>
          </article>
        {/each}
      </div>
    {/if}
  </div>
</section>
