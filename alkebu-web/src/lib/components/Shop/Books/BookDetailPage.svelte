<script lang="ts">
  import Meta from "$lib/components/Meta.svelte";
  import AddToCartButton from "$lib/components/cart/AddToCartButton.svelte";
  import RelatedBooks from "./RelatedBooks.svelte";
  import { formatCurrency } from "$lib/utils/currency";
  import { getImageUrl } from "$lib/payload";
  import {
    Book,
    User,
    Calendar,
    FileText,
    Globe,
    Tag,
    Layers,
    ChevronRight,
  } from "lucide-svelte";

  interface Props {
    book: any;
    seo?: any;
    settings?: any;
    booksByAuthor?: any[];
    relatedBooks?: any[];
  }

  let {
    book,
    seo = {},
    settings = {},
    booksByAuthor = [],
    relatedBooks = [],
  }: Props = $props();

  const authors = $derived(book?.authors || []);
  const primaryEdition = $derived(
    book?.editions?.find((edition: any) => edition.isPrimary) ||
      book?.editions?.[0] ||
      {},
  );
  const binding = $derived((primaryEdition?.binding || "Book").toString());
  const isbn = $derived(primaryEdition?.isbn || primaryEdition?.isbn10 || "");
  const published = $derived(() => {
    const raw = primaryEdition?.datePublished;
    if (!raw) return "";
    const date = new Date(raw);
    if (isNaN(date.getTime())) return raw;
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    if (date >= twoYearsAgo) {
      return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    }
    return date.getFullYear().toString();
  })();
  const pages = $derived(primaryEdition?.pages);
  const language = $derived(primaryEdition?.language);
  const priceCents = $derived(book?.pricing?.retailPrice ?? 0);
  const price = $derived((priceCents || 0) / 100);
  const coverUrl = $derived(
    getImageUrl(
      book?.images?.[0]?.image ||
        book?.images?.[0] ||
        (book?.scrapedImageUrls?.[0]?.url
          ? { url: book.scrapedImageUrls[0].url }
          : null),
      { fallback: "/assets/images/resources/placeholder-book.jpg" },
    ),
  );
  const description = $derived(
    book?.synopsis || book?.description || "No description available.",
  );
  const subjects = $derived(
    book?.subjects?.map((s: any) => s.subject).filter(Boolean) || [],
  );
  const tags = $derived(book?.tags || []);
  const categories = $derived(book?.categories || []);

  const metadata = $derived(() => ({
    title: seo?.title || `${book?.title} | Alkebu-Lan Images`,
    description: seo?.description || description,
    image: seo?.image || coverUrl,
    imageAlt: seo?.imageAlt || book?.title,
    url: seo?.canonical || `/shop/books/${book?.slug || ""}`,
  }));
</script>

<Meta {metadata} />

<!-- Modern Page Header -->
<section class="page-header-modern">
  <div class="container mx-auto px-4">
    <nav class="flex items-center gap-2 text-sm text-white/80 mb-4">
      <a href="/shop/" class="hover:text-white transition-colors">Shop</a>
      <ChevronRight class="w-4 h-4" />
      <a href="/shop/books/" class="hover:text-white transition-colors">Books</a
      >
      <ChevronRight class="w-4 h-4" />
      <span class="text-white font-medium truncate max-w-[200px]"
        >{book?.title}</span
      >
    </nav>
    <h1 class="text-3xl md:text-4xl font-bold font-display">Book Details</h1>
  </div>
</section>

<!-- Product Detail Section -->
<section class="section bg-background">
  <div class="container mx-auto px-4">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
      <!-- Book Cover Image -->
      <div class="lg:sticky lg:top-24 lg:self-start">
        <div class="relative group">
          <div
            class="rounded-2xl overflow-hidden bg-muted shadow-strong flex items-center justify-center min-h-[300px]"
          >
            <img
              loading="lazy"
              src={coverUrl}
              alt={book?.title}
              class="w-full h-auto max-h-[520px] object-contain transition-transform duration-500 group-hover:scale-105"
            />
          </div>
          <!-- Format Badge -->
          <div class="absolute top-4 left-4 badge-primary">
            <Book class="w-3 h-3 mr-1" />
            {binding.charAt(0).toUpperCase() + binding.slice(1)}
          </div>
        </div>
      </div>

      <!-- Book Info -->
      <div class="space-y-6">
        <!-- Title & Author -->
        <div class="space-y-3">
          <h1
            class="text-3xl md:text-4xl font-bold font-display text-foreground"
          >
            {book?.title}
          </h1>
          {#if book?.titleLong}
            <p class="text-lg text-muted-foreground">{book.titleLong}</p>
          {/if}

          {#if authors.length}
            <p class="text-lg flex items-center gap-2">
              <User class="w-5 h-5 text-primary" />
              <span class="text-muted-foreground">by</span>
              {#each authors as author, i}
                {#if author.slug}
                  <a
                    href="/shop/books/authors/{author.slug}/"
                    class="text-foreground hover:text-primary transition-colors font-medium"
                    >{author.name}</a
                  >{i < authors.length - 1 ? ", " : ""}
                {:else}
                  <span class="font-medium">{author.name}</span>{i <
                  authors.length - 1
                    ? ", "
                    : ""}
                {/if}
              {/each}
            </p>
          {/if}
        </div>

        <!-- Price & Add to Cart -->
        <div class="bg-muted/50 rounded-2xl p-6 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-muted-foreground mb-1">Price</p>
              <p class="text-4xl font-bold text-primary">
                {formatCurrency(price)}
              </p>
            </div>
            <AddToCartButton
              productId={book?.id || book?._id}
              productType="books"
              className="btn-primary btn-lg"
              label="Add to Cart"
            />
          </div>
        </div>

        <!-- Book Details Grid -->
        <div class="grid grid-cols-2 gap-4">
          {#if isbn}
            <div class="bg-card rounded-xl p-4 border border-border/50">
              <p
                class="text-xs text-muted-foreground uppercase tracking-wide mb-1"
              >
                ISBN
              </p>
              <p class="font-medium text-foreground">{isbn}</p>
            </div>
          {/if}
          {#if published}
            <div class="bg-card rounded-xl p-4 border border-border/50">
              <div
                class="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide mb-1"
              >
                <Calendar class="w-3 h-3" />
                Published
              </div>
              <p class="font-medium text-foreground">{published}</p>
            </div>
          {/if}
          {#if pages}
            <div class="bg-card rounded-xl p-4 border border-border/50">
              <div
                class="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide mb-1"
              >
                <FileText class="w-3 h-3" />
                Pages
              </div>
              <p class="font-medium text-foreground">{pages}</p>
            </div>
          {/if}
          {#if language}
            <div class="bg-card rounded-xl p-4 border border-border/50">
              <div
                class="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide mb-1"
              >
                <Globe class="w-3 h-3" />
                Language
              </div>
              <p class="font-medium text-foreground capitalize">{language}</p>
            </div>
          {/if}
        </div>

        <!-- Categories & Tags -->
        {#if categories?.length || subjects?.length || tags?.length}
          <div class="space-y-4">
            {#if categories?.length}
              <div class="flex items-start gap-3">
                <Layers class="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p class="text-sm text-muted-foreground mb-2">Categories</p>
                  <div class="flex flex-wrap gap-2">
                    {#each categories as category}
                      <span class="badge-primary">{category}</span>
                    {/each}
                  </div>
                </div>
              </div>
            {/if}

            {#if subjects?.length}
              <div class="flex items-start gap-3">
                <Book class="w-5 h-5 text-secondary mt-0.5 flex-shrink-0" />
                <div>
                  <p class="text-sm text-muted-foreground mb-2">Subjects</p>
                  <div class="flex flex-wrap gap-2">
                    {#each subjects as subject}
                      <span class="badge-secondary">{subject}</span>
                    {/each}
                  </div>
                </div>
              </div>
            {/if}

            {#if tags?.length}
              <div class="flex items-start gap-3">
                <Tag class="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                <div>
                  <p class="text-sm text-muted-foreground mb-2">Tags</p>
                  <div class="flex flex-wrap gap-2">
                    {#each tags as tag}
                      <span
                        class="px-3 py-1 bg-muted text-muted-foreground rounded-full text-sm"
                        >{tag}</span
                      >
                    {/each}
                  </div>
                </div>
              </div>
            {/if}
          </div>
        {/if}

        <!-- Description -->
        <div class="pt-6 border-t border-border">
          <h3 class="text-xl font-bold font-display mb-4">About This Book</h3>
          <div class="prose prose-gray max-w-none">
            <p
              class="text-muted-foreground leading-relaxed whitespace-pre-line"
            >
              {description}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Books by the Same Author Section -->
{#if booksByAuthor && booksByAuthor.length > 0}
  <RelatedBooks books={booksByAuthor} title="More by this Author" />
{/if}

<!-- Related Books Section -->
{#if relatedBooks && relatedBooks.length > 0}
  <RelatedBooks books={relatedBooks} title="You May Also Like" />
{/if}
