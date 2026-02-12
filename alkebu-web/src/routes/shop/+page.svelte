<!-- Shop Categories Page -->

<script>
    import Meta from "$lib/components/Meta.svelte";
    import { urlFor } from "$lib/payload";
    import { ArrowRight } from "lucide-svelte";

    const metadata = {
        title: "Shop | Alkebu-Lan Images",
        description: `Our store has 4 departments: Books, Apparel, Health & Beauty, and Art & African Imports`,
        image: "/assets/images/resources/logo.png",
        imageAlt: "Alkebu-Lan Images Logo",
        url: "/shop/",
    };

    let { data } = $props();
    const shop = data.shop ?? {};
    const sectionImages = shop.section1?.images ?? [];

    // Category card data
    const categories = [
        {
            title: "Book",
            subtitle: "Catalogue",
            href: "/shop/books",
            image: sectionImages?.[0],
            enabled: true,
        },
        {
            title: "Fashion",
            subtitle: "& Apparel",
            href: "/shop/apparel",
            image: sectionImages?.[1],
            enabled: true,
        },
        {
            title: "Health",
            subtitle: "& Beauty",
            href: "/shop/health-and-beauty",
            image: sectionImages?.[2],
            enabled: false,
        },
        {
            title: "African Art",
            subtitle: "& Imports",
            href: "/shop/home-goods",
            image: sectionImages?.[3],
            enabled: false,
        },
    ];
</script>

<Meta {metadata} />

<!-- Modern Page Header -->
<section class="page-header-modern">
    <div class="container mx-auto px-4">
        <nav class="flex items-center gap-2 text-sm text-white/80 mb-4">
            <a href="/" class="hover:text-white transition-colors">Home</a>
            <span class="text-white/60">›</span>
            <span class="text-white font-medium">Shop</span>
        </nav>
        <h1 class="text-3xl md:text-4xl font-bold font-display">
            Shop Categories
        </h1>
    </div>
</section>

<!-- Categories Grid -->
<section class="section bg-background">
    <div class="container mx-auto px-4">
        <div class="text-center mb-12">
            <p class="text-primary font-semibold uppercase tracking-wide mb-2">
                Browse Our Store
            </p>
            <h2 class="text-3xl md:text-4xl font-bold font-display mb-4">
                Shop by Department
            </h2>
            <div class="w-20 h-1 bg-primary mx-auto"></div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {#each categories as cat}
                {#if cat.enabled}
                    <a href={cat.href} class="group">
                        <div class="card-modern overflow-hidden h-full">
                            <div class="relative aspect-[3/4] overflow-hidden">
                                <img
                                    loading="lazy"
                                    src={urlFor(cat.image?.image ?? cat.image)
                                        .width(370)
                                        .height(484)
                                        .auto("format")
                                        .url()}
                                    alt={cat.image?.image?.alt ??
                                        cat.image?.alt ??
                                        `${cat.title} ${cat.subtitle}`}
                                    class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                />
                                <div
                                    class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
                                ></div>
                                <div
                                    class="absolute bottom-0 left-0 right-0 p-6 text-white"
                                >
                                    <h3
                                        class="text-2xl font-bold font-display mb-2"
                                    >
                                        {cat.title}<br />{cat.subtitle}
                                    </h3>
                                    <span
                                        class="inline-flex items-center gap-2 text-primary font-semibold text-sm group-hover:gap-3 transition-all"
                                    >
                                        Browse Now
                                        <ArrowRight class="w-4 h-4" />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </a>
                {:else}
                    <!-- Coming Soon Card -->
                    <div class="group">
                        <div
                            class="card-modern overflow-hidden h-full opacity-75"
                        >
                            <div class="relative aspect-[3/4] overflow-hidden">
                                <img
                                    loading="lazy"
                                    src={urlFor(cat.image?.image ?? cat.image)
                                        .width(370)
                                        .height(484)
                                        .saturation(-100)
                                        .auto("format")
                                        .url()}
                                    alt={cat.image?.image?.alt ??
                                        cat.image?.alt ??
                                        `${cat.title} ${cat.subtitle}`}
                                    class="w-full h-full object-cover grayscale"
                                />
                                <div
                                    class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/20"
                                ></div>
                                <div
                                    class="absolute top-4 left-4 badge-secondary"
                                >
                                    Coming Soon
                                </div>
                                <div
                                    class="absolute bottom-0 left-0 right-0 p-6 text-white"
                                >
                                    <h3
                                        class="text-2xl font-bold font-display mb-2"
                                    >
                                        {cat.title}<br />{cat.subtitle}
                                    </h3>
                                    <span class="text-white/60 text-sm">
                                        Check back soon
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                {/if}
            {/each}
        </div>
    </div>
</section>
