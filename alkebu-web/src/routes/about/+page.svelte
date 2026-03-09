<script>
  import Meta from '$lib/components/Meta.svelte'
  import { urlFor } from '$lib/payload';
  import { Hand, Handshake, BookOpen, Leaf } from 'lucide-svelte';

  const metadata = {
    title: 'About Alkebu-Lan Images',
    description: `Nashville's Center for Black Lifestyles. Proudly serving Nashville and beyond for 35 years!`,
    image: '/assets/images/resources/logo.png',
    imageAlt: 'Alkebu-Lan Images Logo',
    url: '/about/'
  }

  let { data } = $props();
  const about = data.about ?? {};
  const description = about.description ?? '';
  const section1 = about.section1 ?? {};
  const section2 = about.section2 ?? {};
  const section1Images = section1.images ?? [];
  const image0 = section1Images?.[0]?.image ?? section1Images?.[0];
  const image1 = section1Images?.[1]?.image ?? section1Images?.[1];
  const image2 = section1Images?.[2]?.image ?? section1Images?.[2];
  const section2Image = section2.section2image ?? section2.image;

  const principles = [
    { icon: Hand, title: 'Black Owned & Operated' },
    { icon: Handshake, title: 'Cooperative Economics' },
    { icon: BookOpen, title: 'Knowledge is Power' },
    { icon: Leaf, title: 'Natural Lifestyles' }
  ];
</script>

<Meta {metadata} />

<!-- About Hero Section -->
<section class="section bg-background">
  <div class="container mx-auto px-4 lg:px-8">
    <!-- Header Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16 mb-12">
      <div>
        <p class="text-primary font-semibold uppercase tracking-wide mb-2">About Alkebu-Lan Images</p>
        <h1 class="text-4xl md:text-5xl font-bold font-display text-foreground">
          Nashville's Center for Black Lifestyles
        </h1>
        <div class="w-20 h-1 bg-primary mt-6"></div>
      </div>
      <div class="flex items-center">
        <p class="text-lg text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </div>

    <!-- Image Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-12 items-stretch gap-6 mb-16">
      <div class="lg:col-span-5">
        <div class="h-full min-h-[400px] lg:min-h-[500px]">
          <img
            loading="lazy"
            class="w-full h-full object-cover rounded-2xl shadow-medium"
            src="{urlFor(image2).width(800).height(1024).auto('format').url()}"
            alt={image2?.alt ?? 'Alkebu-Lan Images'}
          >
        </div>
      </div>
      <div class="lg:col-span-5">
        <div class="h-full min-h-[400px] lg:min-h-[500px]">
          <img
            loading="lazy"
            class="w-full h-full object-cover rounded-2xl shadow-medium"
            src="{urlFor(image0).width(800).height(1024).auto('format').url()}"
            alt={image0?.alt ?? 'Alkebu-Lan Images'}
          >
        </div>
      </div>
      <div class="lg:col-span-2">
        <div class="h-full min-h-[300px] lg:min-h-[500px] relative overflow-hidden rounded-2xl bg-primary">
          <img
            loading="lazy"
            class="absolute inset-0 w-full h-full object-cover opacity-30"
            src="{urlFor(image1).auto('format').url()}"
            alt={image1?.alt ?? 'Alkebu-Lan Images'}
          >
          <div class="relative z-10 flex h-full items-center justify-center text-center p-6">
            <h2 class="text-xl lg:text-2xl font-bold text-primary-foreground">
              Proudly serving Nashville and beyond for 35 years!
            </h2>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Principles Section -->
<section class="py-20 bg-kente-forest text-white relative overflow-hidden">
  <div class="absolute inset-0 bg-gradient-to-br from-kente-forest via-kente-indigo/50 to-kente-forest"></div>
  <div class="container mx-auto px-4 lg:px-8 relative z-10">
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 mb-16">
      <div>
        <p class="text-kente-gold font-semibold uppercase tracking-wide mb-2">Our Principles</p>
        <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold font-display">
          Uplifting Black Consciousness & Culture
        </h2>
        <div class="w-20 h-1 bg-kente-gold mt-6"></div>
      </div>
      <div class="flex items-center">
        <p class="text-lg text-white/80 leading-relaxed">
          Alkebu-Lan Images seeks to support the local Black community and beyond by sourcing our products
          where possible from other Black-owned businesses in the spirit of the Kwanzaa principle of Ujima. As
          a result one can find a wide range of rare books, handmade jewelry, and other items not found in your
          typical retail establishment. With a focus on sourcing products by Black businesses and for Black
          people we hope to shine a light on a market that is both under-served and under-valued.
        </p>
      </div>
    </div>

    <!-- Principles Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {#each principles as principle}
        <div class="group p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 hover:bg-white/20 transition-all duration-300 hover:-translate-y-1">
          <div class="flex items-center gap-4">
            <div class="w-14 h-14 rounded-xl bg-kente-gold/20 flex items-center justify-center group-hover:bg-kente-gold/30 transition-colors">
              <svelte:component this={principle.icon} class="w-7 h-7 text-kente-gold" />
            </div>
            <h3 class="font-semibold text-lg">{principle.title}</h3>
          </div>
        </div>
      {/each}
    </div>
  </div>
</section>

<!-- CTA Section -->
<section
  class="relative py-24 md:py-32 bg-cover bg-center overflow-hidden"
  style="background-image: url({urlFor(section2?.section2image).width(1920).height(600).auto('format').url()});"
>
  <div class="absolute inset-0 bg-gradient-to-r from-kente-forest/95 via-kente-indigo/90 to-kente-forest/95"></div>
  <div class="container mx-auto px-4 relative z-10 text-center">
    <h2 class="text-3xl md:text-4xl lg:text-5xl font-bold text-white font-display mb-6 max-w-4xl mx-auto">
      Providing our customers a Well-Curated range of products that elevate Black Lifestyles
    </h2>
    <p class="text-xl text-white/80 mb-8">Browse our online store to see just what we're talking about</p>
    <a href="/shop" class="btn-primary btn-lg">
      Discover More
    </a>
  </div>
</section>
