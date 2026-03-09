<script>
	import { fly, fade } from "svelte/transition";
	import { page } from "$app/stores";

	import { urlFor } from "$lib/payload";
	import {
		ArrowRight,
		BookOpen,
		Shirt,
		Sparkles,
		Home as HomeIcon,
	} from "lucide-svelte";

	import BookCover from "$lib/components/Shop/Books/BookCover.svelte";
	import AddToCartButton from "$lib/components/cart/AddToCartButton.svelte";
	import { formatCurrency } from "$lib/utils/currency";

	import Meta from "$lib/components/Meta.svelte";

	let { data } = $props();
	const { banner, section2, section3, section4, featured, newBooks } = data;

	const metadata = {
		title: `Alkebu-Lan Images, Nashville's only Black-owned bookstore`,
		description: `Alkebu-Lan Images is a Black-Owned bookstore that has been Nashville's center for promoting positivity in Black culture and empowering diverse Black lifestyles since 1986`,
		image: "/assets/images/resources/logo.png",
		imageAlt: "Alkebu-Lan Images Logo",
		url: "/",
	};

	const categoryIcons = [BookOpen, Shirt, Sparkles, HomeIcon];

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
			desc: "Clothing and Accessories for the Black esthetic",
			href: "/shop/apparel",
			imageIndex: 1,
		},
		{
			title: "Health & Beauty",
			desc: "All-natural products for your skin, hair, and health",
			href: "/shop/health-and-beauty",
			imageIndex: 2,
		},
		{
			title: "Art & Imports",
			desc: "Decorate your home with unique African imports and prints",
			href: "/shop/home-goods",
			imageIndex: 3,
		},
	];

	// Business services data
	const businessServices = section4?.images
		? [
				{
					title: "Wholesale",
					subtitle: "solutions",
					image: section4.images[0],
					desc: "Partner with us for bulk orders and wholesale pricing for retailers and distributors.",
				},
				{
					title: "Institutional",
					subtitle: "Contracts",
					image: section4.images[1],
					desc: "Libraries, schools, and organizations can benefit from our institutional partnerships.",
				},
				{
					title: "Non-profit",
					subtitle: "projects",
					image: section4.images[2],
					desc: "We support community initiatives and non-profit organizations with special programs.",
				},
			]
		: [];
</script>

<Meta {metadata} />

<!-- Banner Section -->
<section class="banner-section banner-one">
	<div class="banner-carousel">
		<!-- Slide Item -->
		<div class="slide-item">
			<div
				class="image-layer"
				style="background-image: url({urlFor(banner.bannerImages[0])
					.width(1920)
					.height(780)
					.auto('format')
					.url()});"
			></div>
			<div class="container mx-auto">
				<div class="content-box">
					<div class="content">
						<div class="inner">
							<div
								class="sub-title"
								in:fly={{ y: 200, delay: 1500, duration: 1500 }}
							>
								Elevating Black Lifestyles
							</div>
							<h1
								in:fly={{ y: 200, delay: 1000, duration: 1500 }}
							>
								Welcome to<br /> Alkebu-Lan Images
							</h1>
							<div class="link-box">
								<a
									href="/shop"
									class="btn-primary btn-lg"
									in:fly={{
										y: 200,
										delay: 2000,
										duration: 1500,
									}}>Shop Now</a
								>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>
<!--End Banner Section -->

<!-- About Section -->
<section class="section bg-background">
	<div class="container mx-auto px-4">
		<div
			class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center"
		>
			<!-- Image Grid -->
			<div class="relative">
				<div class="grid grid-cols-12 gap-4">
					<div class="col-span-8">
						<img
							class="w-full h-auto rounded-2xl shadow-medium"
							loading="lazy"
							src={urlFor(section2.images[0])
								.width(500)
								.height(600)
								.auto("format")
								.url()}
							alt={section2.images[0].alt}
						/>
					</div>
					<div class="col-span-4 flex items-end">
						<div
							class="w-20 h-20 bg-primary rounded-2xl flex items-center justify-center shadow-glow"
						>
							<span
								class="text-3xl text-primary-foreground font-bold"
								>35+</span
							>
						</div>
					</div>
				</div>
				<div class="absolute -bottom-8 right-8 w-2/3">
					<img
						class="w-full h-auto rounded-2xl shadow-strong border-4 border-background"
						loading="lazy"
						src={urlFor(section2.images[1])
							.width(400)
							.height(300)
							.auto("format")
							.url()}
						alt={section2.images[1].alt}
					/>
				</div>
			</div>

			<!-- Content -->
			<div class="lg:pl-8">
				<p
					class="text-primary font-semibold uppercase tracking-wide mb-2"
				>
					About Alkebu-lan
				</p>
				<h2
					class="text-3xl md:text-4xl lg:text-5xl font-bold font-display mb-6"
				>
					We curate the whole Black experience: mind, body, and soul
				</h2>
				<div class="w-20 h-1 bg-primary mb-8"></div>

				<p class="text-lg text-muted-foreground mb-8">
					Over the last 35 years, Alkebu-Lan Images has created a
					shopping experience found in few places around the world.
					Our goal is to bring all the accoutrements of the Black
					esthetic under one roof to promote positive Black lifestyles
					for our customers.
				</p>

				<!-- Feature Icons -->
				<div class="grid grid-cols-2 gap-6 mb-8">
					<div class="flex items-center gap-4">
						<div
							class="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"
						>
							<img
								loading="lazy"
								class="w-10 h-10"
								src="/assets/images/alkebulan/sankofa.svg"
								alt="SANKOFA"
							/>
						</div>
						<p class="font-medium text-sm">
							Connecting our present to our past
						</p>
					</div>
					<div class="flex items-center gap-4">
						<div
							class="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0"
						>
							<img
								loading="lazy"
								class="w-10 h-10"
								src="/assets/images/alkebulan/crocs.svg"
								alt="FUNTUNFUNEFU-DENKYEMFUNEFU"
							/>
						</div>
						<p class="font-medium text-sm">
							Strength and unity through knowledge
						</p>
					</div>
				</div>

				<p class="text-muted-foreground mb-8">
					As mainstream retailers provide less and less service to
					customers while at the same time making it more and more
					difficult to find quality products, Alkebu-Lan Images
					strives to empower our customers in their search for
					products that amplify diverse, Afrocentric lifestyles.
				</p>

				<a
					href="/about"
					class="btn-outline inline-flex items-center gap-2"
				>
					Learn More
					<ArrowRight class="w-4 h-4" />
				</a>
			</div>
		</div>
	</div>
</section>

<!-- Shop Categories -->
<section class="py-20 bg-muted/30">
	<div class="container mx-auto px-4">
		<div class="text-center mb-12">
			<p class="text-primary font-semibold uppercase tracking-wide mb-2">
				Shop Our Store Online
			</p>
			<h2
				class="text-3xl md:text-4xl lg:text-5xl font-bold font-display mb-4"
			>
				Products We Offer
			</h2>
			<div class="w-20 h-1 bg-primary mx-auto"></div>
		</div>

		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
			{#each shopCategories as cat, i}
				<a href={cat.href} class="group">
					<div class="card-modern overflow-hidden h-full">
						<div class="relative aspect-[4/3] overflow-hidden">
							{#if section3.images?.[cat.imageIndex]}
								<img
									loading="lazy"
									src={urlFor(section3.images[cat.imageIndex])
										.width(400)
										.height(300)
										.auto("format")
										.url()}
									alt={section3.images[cat.imageIndex]?.alt ||
										cat.title}
									class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
								/>
							{:else}
								<img
									loading="lazy"
									src="/assets/images/resources/placeholder.jpg"
									alt={cat.title}
									class="w-full h-full object-cover"
								/>
							{/if}
							<div
								class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
							></div>
							<div
								class="absolute bottom-4 left-4 right-4 text-white"
							>
								<h3 class="text-xl font-bold mb-1">
									Shop {cat.title}
								</h3>
							</div>
						</div>
						<div class="p-5">
							<p class="text-muted-foreground text-sm mb-4">
								{cat.desc}
							</p>
							<span
								class="inline-flex items-center gap-2 text-primary font-semibold text-sm group-hover:gap-3 transition-all"
							>
								Browse {cat.title}
								<ArrowRight class="w-4 h-4" />
							</span>
						</div>
					</div>
				</a>
			{/each}
		</div>
	</div>
</section>

<!-- Featured products -->
<section class="section bg-background">
	<div class="container mx-auto px-4">
		<div class="text-center mb-12">
			<p class="text-primary font-semibold uppercase tracking-wide mb-2">
				Keep Shopping
			</p>
			<h2
				class="text-3xl md:text-4xl lg:text-5xl font-bold font-display mb-4"
			>
				Our Featured Titles
			</h2>
			<div class="w-20 h-1 bg-primary mx-auto"></div>
		</div>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-6">
			{#each featured as book, index}
				{#if index < 8}
					{@const primaryEdition = book.editions?.find((e) => e.isPrimary) || book.editions?.[0] || {}}
					{@const bookBinding = primaryEdition?.binding || ''}
					{@const bookPriceCents = primaryEdition?.pricing?.retailPrice ?? book.pricing?.retailPrice ?? 0}
					{@const bookImage = book.images?.[0]?.image || book.images?.[0] || null}
					{@const bookIsbn = primaryEdition?.isbn || primaryEdition?.isbn13 || book.id}
					<a href="/shop/books/{book.slug}/{bookIsbn}/" class="group">
						<div class="card-modern overflow-hidden h-full">
							<div
								class="relative aspect-[3/4] overflow-hidden bg-muted"
							>
								{#if bookImage}
									<img
										loading="lazy"
										src={urlFor(bookImage)
											.fit("fill")
											.auto("format")
											.url()}
										alt={book.title}
										class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
									/>
								{:else}
									<BookCover
										title={book.title}
										subtitle={book.subtitle}
									/>
								{/if}
								<div
									class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
								>
									<div
										class="absolute bottom-4 left-0 right-0 flex justify-center"
									>
										<AddToCartButton
											className="btn-primary btn-sm"
											productId={book.id || book._id}
											productType="books"
											iconOnly={true}
											label={`Add ${book.title} to cart`}
										/>
									</div>
								</div>
							</div>
							<div class="p-4 text-center">
								<h4
									class="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-2"
								>
									{book.title}{bookBinding ? ` (${bookBinding})` : ''}
								</h4>
								<p class="text-lg font-bold text-primary">
									{formatCurrency(bookPriceCents / 100)}
								</p>
							</div>
						</div>
					</a>
				{/if}
			{/each}
		</div>
	</div>
</section>

<!-- Recent products -->
<section class="section bg-muted/30">
	<div class="container mx-auto px-4">
		<div class="text-center mb-12">
			<p class="text-primary font-semibold uppercase tracking-wide mb-2">
				Fresh Arrivals
			</p>
			<h2
				class="text-3xl md:text-4xl lg:text-5xl font-bold font-display mb-4"
			>
				Newly Added Books
			</h2>
			<div class="w-20 h-1 bg-primary mx-auto"></div>
		</div>
		<div class="grid grid-cols-2 md:grid-cols-4 gap-6">
			{#each newBooks as book, index}
				{#if index < 8}
					{@const primaryEdition = book.editions?.find((e) => e.isPrimary) || book.editions?.[0] || {}}
					{@const bookBinding = primaryEdition?.binding || ''}
					{@const bookPriceCents = primaryEdition?.pricing?.retailPrice ?? book.pricing?.retailPrice ?? 0}
					{@const bookImage = book.images?.[0]?.image || book.images?.[0] || null}
					{@const bookIsbn = primaryEdition?.isbn || primaryEdition?.isbn13 || book.id}
					<a href="/shop/books/{book.slug}/{bookIsbn}/" class="group">
						<div class="card-modern overflow-hidden h-full">
							<div
								class="relative aspect-[3/4] overflow-hidden bg-muted"
							>
								{#if bookImage}
									<img
										loading="lazy"
										src={urlFor(bookImage)
											.fit("fill")
											.auto("format")
											.url()}
										alt={book.title}
										class="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
									/>
								{:else}
									<BookCover
										title={book.title}
										subtitle={book.subtitle}
									/>
								{/if}
								<div
									class="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
								>
									<div
										class="absolute bottom-4 left-0 right-0 flex justify-center"
									>
										<AddToCartButton
											className="btn-primary btn-sm"
											productId={book.id || book._id}
											productType="books"
											iconOnly={true}
											label={`Add ${book.title} to cart`}
										/>
									</div>
								</div>
							</div>
							<div class="p-4 text-center">
								<h4
									class="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors mb-2"
								>
									{book.title}{bookBinding ? ` (${bookBinding})` : ''}
								</h4>
								<p class="text-lg font-bold text-primary">
									{formatCurrency(bookPriceCents / 100)}
								</p>
							</div>
						</div>
					</a>
				{/if}
			{/each}
		</div>
	</div>
</section>

<!-- Business Lines -->
<section class="section bg-background">
	<div class="container mx-auto px-4">
		<div class="text-center mb-12">
			<p class="text-primary font-semibold uppercase tracking-wide mb-2">
				Let's Work Together
			</p>
			<h2
				class="text-3xl md:text-4xl lg:text-5xl font-bold font-display mb-4"
			>
				More than just Retail
			</h2>
			<div class="w-20 h-1 bg-primary mx-auto"></div>
		</div>
		<div class="grid grid-cols-1 md:grid-cols-3 gap-8">
			{#each businessServices as service, i}
				<a href="/contact" class="group">
					<div class="card-modern overflow-hidden h-full">
						<div class="relative aspect-[3/4] overflow-hidden">
							<img
								loading="lazy"
								src={urlFor(service.image)
									.width(370)
									.height(484)
									.auto("format")
									.url()}
								alt={service.image?.alt ||
									`${service.title} ${service.subtitle}`}
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
									{service.title}<br />{service.subtitle}
								</h3>
								<p
									class="text-white/80 text-sm mb-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
								>
									{service.desc}
								</p>
								<span
									class="inline-flex items-center gap-2 text-primary font-semibold text-sm group-hover:gap-3 transition-all"
								>
									Contact Us
									<ArrowRight class="w-4 h-4" />
								</span>
							</div>
						</div>
					</div>
				</a>
			{/each}
		</div>
	</div>
</section>

<!-- Blog component -->
<!-- <div class="blog_two">
	<div class="container">
		<div class="row">
			<div class="col-xl-12">
				<div class="block-title">
					<p>check out our blog</p>
					<h3>latest news and articles</h3>
					<div class="leaf">
						<img loading="lazy" src="/assets/images/resources/leaf.png" alt="">
					</div>
				</div>
				<div class="all_posts_btn">
					<a href="/blog" class="btn-outline">View All Posts</a>
				</div>
			</div>
		</div>
		<div class="row">
			<div class="col-xl-4 col-lg-6">
				<div class="blog_two_single wow fadeInLeft" data-wow-delay="300ms">
					<div class="blog_two_image">
						<img loading="lazy" src="/assets/images/blog/blog-2-img-1.jpg" alt="">
						<div class="blog_two_date_box">
							<p>30 Oct, 2019</p>
						</div>
					</div>
					<div class="blog-two_content">
						<ul class="list-unstyled blog-two_meta">
							<li><a href="news_detail.html"><i class="far fa-user-circle"></i> Admin</a></li>
							<li><a href="news_detail.html"><i class="far fa-comments"></i> 2 Comments</a></li>
						</ul>
						<h3><a href="news_detail.html" class="blog_two_title">Agriculture Miracle you<br>Don't
								Know About</a></h3>
						<div class="blog_two_text">
							<p>There are lorem ipsum is simply free text available in the market to use it many
								variations of ipsum the majority suffered.</p>
						</div>
						<div class="blog_two_read_more_btn">
							<a href="news_detail.html"><i class="fa fa-angle-right"></i>Read More</a>
						</div>
					</div>
				</div>
			</div>
			<div class="col-xl-4  col-lg-6">
				<div class="blog_two_single wow fadeInLeft" data-wow-delay="600ms">
					<div class="blog_two_image">
						<img loading="lazy" src="/assets/images/blog/blog-2-img-2.jpg" alt="">
						<div class="blog_two_date_box">
							<p>30 Oct, 2019</p>
						</div>
					</div>
					<div class="blog-two_content">
						<ul class="list-unstyled blog-two_meta">
							<li><a href="news_detail.html"><i class="far fa-user-circle"></i> Admin</a></li>
							<li><a href="news_detail.html"><i class="far fa-comments"></i> 2 Comments</a></li>
						</ul>
						<h3><a href="news_detail.html" class="blog_two_title">Winter Wheat Harvest
								Gathering<br>Momentum</a></h3>
						<div class="blog_two_text">
							<p>There are lorem ipsum is simply free text available in the market to use it many
								variations of ipsum the majority suffered.</p>
						</div>
						<div class="blog_two_read_more_btn">
							<a href="news_detail.html"><i class="fa fa-angle-right"></i>Read More</a>
						</div>
					</div>
				</div>
			</div>
			<div class="col-xl-4">
				<div class="blog_two_right wow fadeInRight" data-wow-delay="300ms">
					<div class="blog_three_single">
						<ul class="list-unstyled blog-three_meta">
							<li><a href="news_detail.html"><i class="far fa-user-circle"></i> Admin</a></li>
							<li><a href="news_detail.html"><i class="far fa-comments"></i> 2 Comments</a></li>
						</ul>
						<h3><a href="news_detail.html" class="blog_three_title">Amount of Freak Bread or Other
								Fruits</a></h3>
					</div>
					<div class="blog_three_single">
						<ul class="list-unstyled blog-three_meta">
							<li><a href="news_detail.html"><i class="far fa-user-circle"></i> Admin</a></li>
							<li><a href="news_detail.html"><i class="far fa-comments"></i> 2 Comments</a></li>
						</ul>
						<h3><a href="news_detail.html" class="blog_three_title">Learn 10 Best Tips for New
								Formers</a></h3>
					</div>
					<div class="blog_three_single blgo_three_last">
						<ul class="list-unstyled blog-three_meta">
							<li><a href="news_detail.html"><i class="far fa-user-circle"></i> Admin</a></li>
							<li><a href="news_detail.html"><i class="far fa-comments"></i> 2 Comments</a></li>
						</ul>
						<h3><a href="news_detail.html" class="blog_three_title">Winter Wheat Harvest Gathering
								Momentum</a></h3>
					</div>
				</div>
			</div>
		</div>
	</div>
</div> -->
