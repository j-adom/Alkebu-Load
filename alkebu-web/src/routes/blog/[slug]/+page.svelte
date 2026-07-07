<script>
  import {urlFor} from "$lib/payload";
  import { page } from '$app/stores'
  import LexicalRenderer from "$lib/components/LexicalRenderer.svelte";
  import Meta from "$lib/components/Meta.svelte";
  import { Calendar, ChevronRight, Facebook, Twitter, ArrowLeft } from 'lucide-svelte';
  import dayjs from "dayjs";

  let { data } = $props();
  const settings = $derived(data.settings || {});
  const post = $derived(data.post || {});
  const latestPosts = $derived(data.latestPosts || []);
  const authorName = $derived(post.author?.name || post.guestAuthor || "");
</script>

<Meta metadata={data.seo} />

<!-- Modern Page Header -->
<section
  class="relative py-16 md:py-24 bg-cover bg-center overflow-hidden"
  style="background-image: url({urlFor(settings.banner).width(1920).height(600).auto('format').url()});"
>
  <div class="absolute inset-0 bg-gradient-to-br from-kente-forest/90 via-kente-indigo/80 to-kente-forest/90"></div>
  <div class="container relative z-10 mx-auto px-4">
    <nav class="flex items-center gap-2 text-white/80 mb-6">
      <a href="/" class="hover:text-kente-gold transition-colors">Home</a>
      <ChevronRight class="w-4 h-4" />
      <a href="/blog" class="hover:text-kente-gold transition-colors">News</a>
      <ChevronRight class="w-4 h-4" />
      <span class="text-kente-gold line-clamp-1">{post.title}</span>
    </nav>
    <h1 class="text-3xl md:text-4xl lg:text-5xl font-bold text-white font-display max-w-4xl">
      {post.title}
    </h1>
  </div>
</section>

<!-- Article Content -->
<section class="section bg-background">
  <div class="container mx-auto px-4">
    <div class="flex flex-col lg:flex-row gap-8 lg:gap-12">
      <!-- Main Content -->
      <article class="lg:w-2/3">
        <!-- Featured Image -->
        {#if post.featuredImage}
          <div class="relative rounded-2xl overflow-hidden mb-8">
            <img
              src={urlFor(post.featuredImage).width(800).height(450).url()}
              alt={post.featuredImageAlt || post.title}
              class="w-full h-auto"
            >
            {#if post.publishDate}
              <div class="absolute bottom-4 left-4 bg-kente-gold text-primary-foreground px-4 py-2 rounded-lg font-semibold flex items-center gap-2">
                <Calendar class="w-4 h-4" />
                {dayjs(post.publishDate).format('MMMM DD, YYYY')}
              </div>
            {/if}
          </div>
        {:else if post.publishDate}
          <p class="flex items-center gap-2 text-muted-foreground font-medium mb-8">
            <Calendar class="w-4 h-4" />
            {dayjs(post.publishDate).format('MMMM DD, YYYY')}
          </p>
        {/if}

        <!-- Article Body -->
        <div class="prose prose-lg max-w-none prose-headings:font-display prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary hover:prose-a:text-primary/80 mb-8">
          <LexicalRenderer content={post.content} />
        </div>

        <!-- Share & Tags -->
        <div class="flex items-center justify-between py-6 border-t border-b border-border mb-8">
          <span class="text-muted-foreground font-medium">Share this article:</span>
          <div class="flex items-center gap-3">
            <a
              href="https://www.facebook.com/sharer.php?u=https://www.alkebulanimages.com{$page.url.pathname}"
              target="_blank"
              rel="noopener noreferrer"
              class="p-2 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
              aria-label="Share on Facebook"
            >
              <Facebook class="w-5 h-5" />
            </a>
            <a
              href="https://twitter.com/share?text={encodeURIComponent(post.title)}&url=https://www.alkebulanimages.com{$page.url.pathname}"
              target="_blank"
              rel="noopener noreferrer"
              class="p-2 rounded-full bg-muted hover:bg-primary hover:text-primary-foreground transition-colors"
              aria-label="Share on Twitter"
            >
              <Twitter class="w-5 h-5" />
            </a>
          </div>
        </div>

        <!-- Author Box -->
        {#if authorName}
          <div class="flex flex-col sm:flex-row gap-6 p-6 bg-muted rounded-2xl mb-8">
            <div>
              <h3 class="text-xl font-bold mb-2">{authorName}</h3>
              {#if post.authorBio}
                <p class="text-muted-foreground">{post.authorBio}</p>
              {/if}
            </div>
          </div>
        {/if}

        <!-- Back to Blog Link -->
        <a href="/blog" class="inline-flex items-center gap-2 text-primary font-semibold hover:gap-3 transition-all">
          <ArrowLeft class="w-4 h-4" />
          Back to all articles
        </a>
      </article>

      <!-- Sidebar -->
      <aside class="lg:w-1/3">
        <div class="sticky top-24">
          <!-- Latest Posts -->
          {#if latestPosts.length > 0}
            <div class="card-modern p-6">
              <h3 class="text-xl font-bold mb-6 pb-4 border-b border-border">Latest Posts</h3>
              <div class="space-y-4">
                {#each latestPosts as l}
                  <a href="/blog/{l.slug}" class="group flex gap-4">
                    {#if l.featuredImage}
                      <img
                        src={urlFor(l.featuredImage).width(80).height(80).url()}
                        alt={l.featuredImage.alt || l.title}
                        class="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                      >
                    {/if}
                    <div class="flex-grow">
                      <h4 class="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
                        {l.title}
                      </h4>
                      {#if l.publishDate}
                        <p class="text-sm text-muted-foreground mt-1">
                          {dayjs(l.publishDate).format('MMM DD, YYYY')}
                        </p>
                      {/if}
                    </div>
                  </a>
                {/each}
              </div>
            </div>
          {/if}
        </div>
      </aside>
    </div>
  </div>
</section>
