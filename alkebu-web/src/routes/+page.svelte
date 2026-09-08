<script>
	import { fly } from "svelte/transition";
	import { expoOut } from "svelte/easing";
	import { prefersReducedMotion } from "svelte/motion";
	import { ArrowRight } from "lucide-svelte";

	import { urlFor } from "$lib/payload";
	import ProductCard from "$lib/components/Shop/ProductCard.svelte";
	import Meta from "$lib/components/Meta.svelte";
	import { PUBLIC_SITE_URL } from "$env/static/public";

	let { data } = $props();
	const banner = $derived(data.banner);
	const section2 = $derived(data.section2);
	const section3 = $derived(data.section3);
	const section4 = $derived(data.section4);
	const featured = $derived(data.featured ?? []);
	const newBooks = $derived(data.newBooks ?? []);

	// Hero image URLs at responsive widths (LCP element)
	const heroImageMobile = $derived(
		urlFor(banner?.bannerImages?.[0]).width(768).auto("format").url(),
	);
	const heroImageDesktop = $derived(
		urlFor(banner?.bannerImages?.[0]).width(1920).auto("format").url(),
	);
	const heroAlt = $derived(
		banner?.bannerImages?.[0]?.alt || "Bookshelves inside Alkebu-Lan Images",
	);

	const metadata = {
		title: `Alkebu-Lan Images, Nashville's only Black-owned bookstore`,
		description: `Alkebu-Lan Images is a Black-Owned bookstore that has been Nashville's center for promoting positivity in Black culture and empowering diverse Black lifestyles since 1986`,
		image: "/assets/images/resources/logo.png",
		imageAlt: "Alkebu-Lan Images Logo",
		url: `${PUBLIC_SITE_URL}/`,
	};

	// The hero is the page's one authored motion moment: the copy rises once,
	// staggered, from an already-visible default. Reduced-motion visitors get
	// the settled state immediately.
	const rise = (delay) => ({
		y: prefersReducedMotion.current ? 0 : 24,
		duration: prefersReducedMotion.current ? 0 : 700,
		delay,
		easing: expoOut,
	});

	// Shop categories data
	const shopCategories = [
		{
			title: "Books",
			desc: "Our extensive range of books on Black topics by Black authors.",
			href: "/shop/books",
			imageIndex: 0,
		},
		{
			title: "Apparel",
			desc: "Clothing and accessories for the Black esthetic.",
			href: "/shop/apparel",
			imageIndex: 1,
		},
		{
			title: "Health & Beauty",
			desc: "All-natural products for your skin, hair, and health.",
			href: "/shop/health-and-beauty",
			imageIndex: 2,
		},
		{
			title: "Art & Imports",
			desc: "Decorate your home with unique African imports and prints.",
			href: "/shop/home-goods",
			imageIndex: 3,
		},
	];

	// Bulk and partner ordering tracks. Each card names its destination and
	// the action the visitor is taking there; the routes are unchanged.
	const businessServices = $derived.by(() =>
		section4?.images
			? [
					{
						title: "Wholesale",
						href: "/wholesale",
						image: section4.images[0],
						desc: "Bulk pricing on books and cultural products for retailers and distributors.",
						cta: "See wholesale terms",
					},
					{
						title: "Schools & Libraries",
						href: "/institutional-contracts",
						image: section4.images[1],
						desc: "Bulk book orders for classrooms, libraries, and organizations, on institutional terms.",
						cta: "Request a bulk quote",
					},
					{
						title: "Non-profit Projects",
						href: "/non-profit-projects",
						image: section4.images[2],
						desc: "Books for community programs and mission-driven projects.",
						cta: "Start a project inquiry",
					},
				]
			: [],
	);
</script>

<Meta {metadata} />

<svelte:head>
	{#if heroImageMobile}
		<link
			rel="preload"
			as="image"
			href={heroImageMobile}
			imagesrcset="{heroImageMobile} 768w, {heroImageDesktop} 1920w"
			imagesizes="100vw"
			fetchpriority="high"
		/>
	{/if}
</svelte:head>

<!-- Hero -->
<section class="relative isolate overflow-hidden bg-[#111111] text-white">
	<img
		class="absolute inset-0 h-full w-full object-cover"
		src={heroImageMobile}
		srcset="{heroImageMobile} 768w, {heroImageDesktop} 1920w"
		sizes="100vw"
		alt={heroAlt}
		width="1920"
		height="780"
		fetchpriority="high"
		decoding="async"
	/>
	<!-- Legibility scrim, heaviest where the copy sits -->
	<div
		class="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/25"
		aria-hidden="true"
	></div>
	<div
		class="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/50 to-transparent"
		aria-hidden="true"
	></div>

	<div class="container relative mx-auto px-4">
		<div class="max-w-3xl py-24 md:py-32 lg:py-40">
			<h1
				class="hero-title font-display font-bold uppercase text-white"
				in:fly={rise(0)}
			>
				Nashville's <span class="whitespace-nowrap">Black-owned</span> bookstore, since 1986
			</h1>
			<p
				class="mt-6 max-w-xl text-lg leading-relaxed text-white/90 md:text-xl"
				in:fly={rise(90)}
			>
				Elevating Black lifestyles with books by Black authors, plus
				apparel, wellness, and African art. Visit us on Jefferson
				Street or shop online.
			</p>
			<div
				class="mt-8 flex flex-wrap items-center gap-x-8 gap-y-4"
				in:fly={rise(180)}
			>
				<a href="/shop" class="btn-primary btn-lg">Shop Now</a>
				<a
					href="/institutional-contracts"
					class="inline-flex items-center gap-2 font-semibold text-white underline decoration-primary/70 underline-offset-4 transition-colors hover:text-primary hover:decoration-primary"
				>
					Ordering for a school or organization?
					<ArrowRight class="h-4 w-4" />
				</a>
			</div>
		</div>
	</div>
</section>

<!-- Featured shelf: the first thing after the door is books -->
{#if featured.length > 0}
	<section class="section bg-background" aria-labelledby="featured-heading">
		<div class="container mx-auto px-4">
			<div class="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-3 md:mb-10">
				<div>
					<h2
						id="featured-heading"
						class="font-display text-3xl font-bold md:text-4xl"
					>
						Featured Titles
					</h2>
					<div class="mt-4 h-1 w-20 bg-primary"></div>
				</div>
				<a
					href="/shop/books"
					class="inline-flex items-center gap-2 font-semibold text-primary-strong transition-all hover:gap-3"
				>
					All books
					<ArrowRight class="h-4 w-4" />
				</a>
			</div>

			<ul
				class="shelf -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 scrollbar-hide md:mx-0 md:grid md:grid-cols-4 md:gap-6 md:overflow-visible md:px-0 md:pb-0"
			>
				{#each featured as book (book.id)}
					<li class="w-[58vw] max-w-[240px] flex-none snap-start md:w-auto md:max-w-none">
						<ProductCard
							product={book}
							productType="books"
							basePath="/shop/books"
						/>
					</li>
				{/each}
			</ul>
		</div>
	</section>
{/if}

<!-- Shop Categories -->
<section class="section bg-muted/30" aria-labelledby="categories-heading">
	<div class="container mx-auto px-4">
		<div class="mb-12 text-center">
			<h2
				id="categories-heading"
				class="font-display text-3xl font-bold md:text-4xl lg:text-5xl"
			>
				Shop the Store
			</h2>
			<div class="mx-auto mt-4 h-1 w-20 bg-primary"></div>
		</div>

		<div class="grid grid-cols-2 gap-4 md:gap-6 lg:grid-cols-4">
			{#each shopCategories as cat}
				<a href={cat.href} class="group">
					<div class="card-modern h-full overflow-hidden">
						<div class="relative aspect-[4/3] overflow-hidden">
							{#if section3.images?.[cat.imageIndex]}
								<img
									loading="lazy"
									width="400"
									height="300"
									src={urlFor(section3.images[cat.imageIndex])
										.width(400)
										.height(300)
										.auto("format")
										.url()}
									alt={section3.images[cat.imageIndex]?.alt ||
										cat.title}
									class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
								/>
							{:else}
								<img
									loading="lazy"
									width="400"
									height="300"
									src="/assets/images/resources/placeholder.jpg"
									alt={cat.title}
									class="h-full w-full object-cover"
								/>
							{/if}
							<div
								class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
							></div>
							<h3
								class="absolute bottom-4 left-4 right-4 text-xl font-bold text-white"
							>
								{cat.title}
							</h3>
						</div>
						<div class="p-4 md:p-5">
							<p class="mb-4 text-sm text-muted-foreground">
								{cat.desc}
							</p>
							<span
								class="inline-flex items-center gap-2 text-sm font-semibold text-primary-strong transition-all group-hover:gap-3"
							>
								Browse {cat.title}
								<ArrowRight class="h-4 w-4" />
							</span>
						</div>
					</div>
				</a>
			{/each}
		</div>
	</div>
</section>

<!-- About: a short proof of who we are, now that the books have led -->
<section class="section overflow-hidden bg-background" aria-labelledby="about-heading">
	<div class="container mx-auto px-4">
		<div class="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
			<!-- Image composition -->
			<div class="relative pb-12 md:pb-16">
				<!-- Decorative background circle -->
				<div
					class="absolute -bottom-4 -left-8 -z-10 h-48 w-48 rounded-full bg-muted/60 md:h-72 md:w-72"
				></div>

				<!-- Tall main image (mask) -->
				<div class="relative w-[65%]">
					<img
						class="aspect-[3/4] w-full rounded-2xl object-cover shadow-medium"
						loading="lazy"
						width="480"
						height="640"
						src={urlFor(section2?.images?.[0])
							.width(480)
							.height(640)
							.auto("format")
							.url()}
						alt={section2?.images?.[0]?.alt || "Alkebu-Lan Images"}
					/>
				</div>

				<!-- Smaller overlapping mudcloth image -->
				<div class="absolute bottom-0 right-0 w-[52%]">
					<img
						class="aspect-[19/13] w-full rounded-2xl border-4 border-background object-cover shadow-strong"
						loading="lazy"
						width="380"
						height="260"
						src={urlFor(section2?.images?.[1])
							.width(380)
							.height(260)
							.auto("format")
							.url()}
						alt={section2?.images?.[1]?.alt || "Mudcloth pattern"}
					/>
				</div>

				<!-- Gold circle with Sankofa at the image junction -->
				<div
					class="absolute bottom-[23%] left-[52%] z-10 flex h-24 w-24 -translate-x-1/2 items-center justify-center rounded-full border-4 border-background bg-primary shadow-glow md:h-36 md:w-36"
				>
					<img
						loading="lazy"
						class="h-16 w-16 md:h-24 md:w-24"
						width="96"
						height="96"
						src="/assets/images/alkebulan/sankofa.svg"
						alt="Sankofa"
					/>
				</div>
			</div>

			<!-- Content -->
			<div class="lg:pl-8">
				<h2
					id="about-heading"
					class="mb-6 font-display text-3xl font-bold md:text-4xl lg:text-5xl"
				>
					We curate the whole Black experience: mind, body, and soul
				</h2>
				<div class="mb-8 h-1 w-20 bg-primary"></div>

				<p class="mb-8 text-lg text-muted-foreground">
					Since 1986, Alkebu-Lan Images has gathered the accoutrements
					of the Black esthetic under one roof on Jefferson Street:
					books, apparel, wellness, and art that promote positive
					Black lifestyles.
				</p>

				<!-- Adinkra values -->
				<div class="mb-8 grid grid-cols-2 gap-6">
					<div class="flex items-center gap-4">
						<div
							class="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10"
						>
							<img
								loading="lazy"
								class="h-10 w-10"
								width="40"
								height="40"
								src="/assets/images/alkebulan/sankofa.svg"
								alt="Sankofa"
							/>
						</div>
						<p class="text-sm font-medium">
							Connecting our present to our past
						</p>
					</div>
					<div class="flex items-center gap-4">
						<div
							class="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10"
						>
							<img
								loading="lazy"
								class="h-10 w-10"
								width="40"
								height="40"
								src="/assets/images/alkebulan/crocs.svg"
								alt="Funtunfunefu-Denkyemfunefu"
							/>
						</div>
						<p class="text-sm font-medium">
							Strength and unity through knowledge
						</p>
					</div>
				</div>

				<a
					href="/about"
					class="btn-outline inline-flex items-center gap-2"
				>
					Our story
					<ArrowRight class="h-4 w-4" />
				</a>
			</div>
		</div>
	</div>
</section>

<!-- New arrivals -->
{#if newBooks.length > 0}
	<section class="section bg-muted/30" aria-labelledby="new-heading">
		<div class="container mx-auto px-4">
			<div class="mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-3 md:mb-10">
				<div>
					<h2
						id="new-heading"
						class="font-display text-3xl font-bold md:text-4xl"
					>
						New Arrivals
					</h2>
					<div class="mt-4 h-1 w-20 bg-primary"></div>
				</div>
				<a
					href="/shop/books"
					class="inline-flex items-center gap-2 font-semibold text-primary-strong transition-all hover:gap-3"
				>
					All books
					<ArrowRight class="h-4 w-4" />
				</a>
			</div>
			<div class="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
				{#each newBooks as book (book.id)}
					<ProductCard
						product={book}
						productType="books"
						basePath="/shop/books"
					/>
				{/each}
			</div>
		</div>
	</section>
{/if}

<!-- Bulk and partner ordering -->
{#if businessServices.length > 0}
	<section class="section bg-background" aria-labelledby="business-heading">
		<div class="container mx-auto px-4">
			<div class="mb-12 text-center">
				<h2
					id="business-heading"
					class="font-display text-3xl font-bold md:text-4xl lg:text-5xl"
				>
					Order for Your Store, School, or Organization
				</h2>
				<div class="mx-auto mt-4 h-1 w-20 bg-primary"></div>
				<p class="section-subtitle mt-6 !mb-0">
					Bulk pricing, institutional terms, and community projects,
					each with its own inquiry and a real person on the other end.
				</p>
			</div>
			<div class="grid grid-cols-1 gap-8 md:grid-cols-3">
				{#each businessServices as service}
					<a href={service.href || "/contact"} class="group">
						<div class="card-modern h-full overflow-hidden">
							<div class="relative aspect-[3/4] overflow-hidden">
								<img
									loading="lazy"
									width="370"
									height="484"
									src={urlFor(service.image)
										.width(370)
										.height(484)
										.auto("format")
										.url()}
									alt={service.image?.alt || service.title}
									class="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
								/>
								<div
									class="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent"
								></div>
								<div
									class="absolute bottom-0 left-0 right-0 p-6 text-white"
								>
									<h3
										class="mb-2 font-display text-2xl font-bold"
									>
										{service.title}
									</h3>
									<p class="mb-4 text-sm text-white/85">
										{service.desc}
									</p>
									<span
										class="inline-flex items-center gap-2 text-sm font-semibold text-primary transition-all group-hover:gap-3"
									>
										{service.cta}
										<ArrowRight class="h-4 w-4" />
									</span>
								</div>
							</div>
						</div>
					</a>
				{/each}
			</div>
		</div>
	</section>
{/if}

<style>
	.hero-title {
		font-size: clamp(2.5rem, 5.5vw, 4.5rem);
		line-height: 1.02;
		letter-spacing: -0.01em;
		text-wrap: balance;
	}

	h2 {
		text-wrap: balance;
	}

	.shelf {
		scroll-padding-inline: 1rem;
	}
</style>
