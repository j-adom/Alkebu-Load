<script lang="ts">
  type ProductMeta = {
    price?: string | number | null;
  };

  type Metadata = {
    title?: string;
    description?: string;
    image?: string;
    imageAlt?: string;
    url?: string;
    canonical?: string;
    canonicalUrl?: string;
    twitterCard?: string;
    product?: ProductMeta | null;
    noIndex?: boolean;
    /** Pre-built application/ld+json script-tag string from $lib/seo ldScript(). */
    jsonLd?: string | null;
    breadcrumbsJsonLd?: string | null;
  };

  type Props = Metadata & {
    metadata?: Metadata | null;
  };

  let {
    metadata = {},
    title,
    description,
    image,
    imageAlt,
    url,
    canonical,
    canonicalUrl,
    twitterCard,
    product,
    noIndex,
    jsonLd,
    breadcrumbsJsonLd,
  }: Props = $props();

  const resolved = $derived({
    title: title ?? metadata?.title,
    description: description ?? metadata?.description,
    image: image ?? metadata?.image,
    imageAlt: imageAlt ?? metadata?.imageAlt,
    url: canonicalUrl ?? canonical ?? url ?? metadata?.canonicalUrl ?? metadata?.canonical ?? metadata?.url,
    twitterCard: twitterCard ?? metadata?.twitterCard ?? 'summary_large_image',
    product: product ?? metadata?.product,
    noIndex: noIndex ?? metadata?.noIndex ?? false,
    jsonLd: jsonLd ?? metadata?.jsonLd,
    breadcrumbsJsonLd: breadcrumbsJsonLd ?? metadata?.breadcrumbsJsonLd,
  });

  const productPrice = $derived(
    resolved.product?.price === undefined || resolved.product?.price === null
      ? undefined
      : String(resolved.product.price)
  );
</script>

<svelte:head>
  {#if resolved.title}
    <title>{resolved.title}</title>
    <meta name="title" content={resolved.title} />
    <meta property="og:title" content={resolved.title} />
    <meta property="twitter:title" content={resolved.title} />
  {/if}

  {#if resolved.description}
    <meta name="description" content={resolved.description} />
    <meta property="og:description" content={resolved.description} />
    <meta property="twitter:description" content={resolved.description} />
  {/if}

  {#if resolved.image}
    <meta property="og:image" content={resolved.image} />
    <meta property="twitter:image" content={resolved.image} />
  {/if}

  {#if resolved.imageAlt}
    <meta property="og:image:alt" content={resolved.imageAlt} />
    <meta property="twitter:image:alt" content={resolved.imageAlt} />
  {/if}

  {#if resolved.url}
    <link rel="canonical" href={resolved.url} />
    <meta property="og:url" content={resolved.url} />
    <meta property="twitter:url" content={resolved.url} />
  {/if}

  {#if productPrice}
    <meta property="og:type" content="og:product" />
    <meta property="product:price:amount" content={productPrice} />
    <meta property="product:price:currency" content="USD" />
  {/if}

  <meta property="twitter:card" content={resolved.twitterCard} />

  {#if resolved.noIndex}
    <!-- "follow" keeps product links on noindexed listing pages crawlable -->
    <meta name="robots" content="noindex, follow" />
  {/if}

  {#if resolved.jsonLd}
    {@html resolved.jsonLd}
  {/if}

  {#if resolved.breadcrumbsJsonLd}
    {@html resolved.breadcrumbsJsonLd}
  {/if}
</svelte:head>
