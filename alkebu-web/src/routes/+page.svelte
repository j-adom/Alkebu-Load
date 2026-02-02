<script>
	import {fly, fade} from 'svelte/transition'
	import { page } from '$app/stores';

	import { urlFor } from '$lib/payload';

	// import BookCarousel from '$lib/components/Shop/Books/BookCarousel.svelte'
	import BookCover from '$lib/components/Shop/Books/BookCover.svelte'
	import AddToCartButton from '$lib/components/cart/AddToCartButton.svelte';
	import { formatCurrency } from '$lib/utils/currency';

	import Meta from '$lib/components/Meta.svelte'

	let { data } = $props();
	const {banner, section2, section3, section4, featured, newBooks} = data;
	 
	const metadata = {
		title: `Alkebu-Lan Images, Nashville's only Black-owned bookstore`,
		description: `Alkebu-Lan Images is a Black-Owned bookstore that has been Nashville's center for promoting positivity in Black culture and empowering diverse Black lifestyles since 1986`,
		image: '/assets/images/resources/logo.png',
		imageAlt: 'Alkebu-Lan Images Logo',
		url: '/'
	}
</script>

<style>

</style>

<Meta {metadata} />

<!-- Banner Section -->
<section class="banner-section banner-one">

	<div class="banner-carousel">
		<!-- Slide Item -->
		<div class="slide-item">
			<div class="image-layer" style="background-image: url({urlFor(banner.bannerImages[0]).width(1920).height(780).auto('format').url()});"></div>
			<div class="container mx-auto">
				<div class="content-box">
					<div class="content">
						<div class="inner">
							<div class="sub-title" in:fly="{{y:200, delay: 1500, duration: 1500}}" >Elevating Black Lifestyles</div>
							<h1 in:fly="{{y:200, delay: 1000, duration: 1500}}">Welcome to<br> Alkebu-Lan Images</h1>
							<div class="link-box">
								<a href="/shop" class="btn-primary btn-lg" in:fly="{{y:200, delay: 2000, duration: 1500}}">Shop Now</a>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>

	</div>
</section>
<!--End Banner Section -->

<section class="about_one">
	<div class="container mx-auto">
		<div class="grid grid-cols-1 md:grid-cols-12">
			<div class="md:col-span-6 w-100 px-4 md:pb-20 md:mb-20">
				<div class="about1_img ">
					<div class="about1_shape_1 box-border"></div>
					<img class="object-fit align-middle box-border border-none " loading="lazy" src="{urlFor(section2.images[0]).width(450).height(573).auto('format').url()}" alt={section2.images[0].alt}>
					<div class="about1_icon-box">
						<div class="circle">
							<span class="icon-focus"></span>
						</div>
					</div>
					<div class="about_img_2 ">
						<img class="overflow-hidden" loading="lazy" src="{urlFor(section2.images[1]).width(370).height(276).auto('format').url()}" alt={section2.images[1].alt}>
					</div>
				</div>
			</div>
			<div class="md:col-span-6">
				<div class="block-title text-left">
					<p>About Alkebu-lan</p>
					<h3>We curate the whole black experience: mind, body, and soul</h3>
					<div class="leaf">
						<img loading="lazy" src="/assets/images/resources/leaf.png" alt="">
					</div>
				</div>
				<div class="about_content">
					<div class="text">
						<p>Over the last 35 years, Alkebu-Lan Images has created a shopping experience
						found in few places around the world. Our goal is to bring all the accoutrements
						of the Black esthetic under one roof to promote positive Black lifestyles for our
						customers.
						 </p>
					</div>
					<div class="about1_icon_wrap">
						<div class="about1_icon_single">
							<div class="about1_icon">
								<img loading="lazy" style="width:60px; height:60px" src="/assets/images/alkebulan/sankofa.svg" alt="SANKOFA">
							</div>
							<p>Connecting our present to our past</p>
						</div>
						<div class="about1_icon_single">
							<div class="about1_icon">
								<img loading="lazy" style="width:60px; height:60px" src="/assets/images/alkebulan/crocs.svg" alt="FUNTUNFUNEFU-DENKYEMFUNEFU">
							</div>
							<p>Strength and unity through knowledge</p>
						</div>
					</div>
					<div class="bottom_text">
						<p>As mainstream retailers provide less and less service to customers while at the 
						same time making it more and more difficult to find quality products, Alkebu-Lan Images 
						strives to empower our customers in their search for products that amplify diverse, 
						Afrocentric lifestyles.</p>
					</div>
					<div class="about1__button-block">
						<a href="/about" class="btn-outline">Learn More</a>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Shop Categories -->
<section class="service_one">
	<div class="container mx-auto">
		<div class="block-title flex flex-col gap-5 text-center justify-center">
			<p>Shop our store online</p>
			<h3>Products We Offer</h3>
			<img class="w-max pt-2 mx-auto" loading="lazy" src="/assets/images/resources/leaf.png" alt="">
		</div>
		<div class="flex flex-col lg:flex-row flex-wrap">
			<div class="basis-1/2 md:basis-1/4 px-4 py-2">
				<div class="service_1_single wow fadeInUp">
					<div class="content">
						<h3>Shop<br>books</h3>
						<p>Our extensive range of books on Black topics by Black authors.</p>
					</div>
					<div class="service_1_img">
						{#if section3.images?.[0]}
							<img loading="lazy" src="{urlFor(section3.images[0]).width(270).height(175).auto('format').url()}" alt={section3.images[0]?.alt || 'Books'}>
						{:else}
							<img loading="lazy" src="/assets/images/resources/placeholder.jpg" alt="Books">
						{/if}
						<div class="hover_box">
							<a href="/shop/books" aria-label="Browse books category"><span class="icon-left-arrow" aria-hidden="true"></span></a>
						</div>
					</div>
				</div>
			</div>
			<div class="basis-1/2 lg:basis-1/4 px-4 py-2">
				<div class="service_1_single wow fadeInUp" data-wow-delay="300ms">
					<div class="content">
						<h3>Shop<br>apparel</h3>
						<p>Clothing and Accessories for the Black esthetic</p>
					</div>
					<div class="service_1_img">
						{#if section3.images?.[1]}
							<img loading="lazy" src="{urlFor(section3.images[1]).width(270).height(175).auto('format').url()}" alt={section3.images[1]?.alt || 'Apparel'}>
						{:else}
							<img loading="lazy" src="/assets/images/resources/placeholder.jpg" alt="Apparel">
						{/if}
						<div class="hover_box">
							<a href="/shop/apparel" aria-label="Browse apparel category"><span class="icon-left-arrow" aria-hidden="true"></span></a>
						</div>
					</div>
				</div>
			</div>
			<div class="basis-1/2 lg:basis-1/4 px-4 py-2">
				<div class="service_1_single wow fadeInUp" data-wow-delay="600ms">
					<div class="content">
						<h3>Shop<br>health & beauty</h3>
						<p>All-natural products for your skin, hair, and health</p>
					</div>
					<div class="service_1_img">
						{#if section3.images?.[2]}
							<img loading="lazy" src="{urlFor(section3.images[2]).width(270).height(175).auto('format').url()}" alt={section3.images[2]?.alt || 'Health & Beauty'}>
						{:else}
							<img loading="lazy" src="/assets/images/resources/placeholder.jpg" alt="Health & Beauty">
						{/if}
						<div class="hover_box">
							<a href="/shop/health-and-beauty" aria-label="Browse health and beauty category"><span class="icon-left-arrow" aria-hidden="true"></span></a>
						</div>
					</div>
				</div>
			</div>
			<div class="basis-1/2 lg:basis-1/4 px-4 py-2">
				<div class="service_1_single wow fadeInUp" data-wow-delay="900ms">
					<div class="content">
						<h3>Shop<br>art and imports</h3>
						<p>Decorate your home with unique African imports and prints</p>
					</div>
					<div class="service_1_img">
						{#if section3.images?.[3]}
							<img loading="lazy" src="{urlFor(section3.images[3]).width(270).height(175).auto('format').url()}" alt={section3.images[3]?.alt || 'Art & Imports'}>
						{:else}
							<img loading="lazy" src="/assets/images/resources/placeholder.jpg" alt="Art & Imports">
						{/if}
						<div class="hover_box">
							<a href="/shop/home-goods" aria-label="Browse art and imports category"><span class="icon-left-arrow" aria-hidden="true"></span></a>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Featured products -->
<section class="all_products_two">
	<div class="container mx-auto">
		<div class="block-title flex flex-col gap-5 text-center justify-center">
			<!-- <p>Keep shopping</p> -->
			<h3>Our Featured Titles</h3>
			<div class="leaf">
				<img class="!inline" loading="lazy" src="/assets/images/resources/leaf.png" alt="">
			</div>
		</div>
		<div class="all_products">
			<div class="grid grid-cols-2 md:grid-cols-4 gap-6">
				{#each featured as book, index}
					{#if index < 8}
						<div class="col-xl-3 col-lg-3 col-md-6">
							<div class="all_products_single text-center">
								<div class="all_product_item_image">
									{#if book.images} <img loading="lazy" src="{urlFor(book.images).fit('fill').auto('format').url()}" alt={book.title}>
									{:else} <BookCover title={book.title} subtitle={book.sibtitle} />
									{/if}
									<div class="all_product_hover">
										<AddToCartButton
											className="all_product_icon"
											productId={book.id || book._id}
											productType="books"
											iconOnly={true}
											label={`Add ${book.title} to cart`}
										/>
									</div>
								</div>
								<h4><a rel=prefetch href="/shop/books/{book.slug}/{book.id}/">{book.title} ({book.binding})</a></h4>
								<!-- <StarRating 
									rating={book.gRating}
									{styleSmall}>
								</StarRating> -->
								<p>{formatCurrency(book.price || book.pricing?.retailPrice || 0)}</p>
							</div>
						</div>
					{/if}
				{/each}
			</div>
		</div>
	</div>
</section>

<!-- Recent products -->
<section class="all_products_two">
	<div class="container mx-auto">
		<div class="block-title flex flex-col gap-5 text-center justify-center">
			<!-- <p>Keep shopping</p> -->
			<h3>Newly Added Books</h3>
			<div class="leaf">
				<img class="w-max pt-2 mx-auto" loading="lazy" src="/assets/images/resources/leaf.png" alt="">
			</div>
		</div>
		<div class="all_products">
			<div class="grid grid-cols-2 md:grid-cols-4 gap-6">
				{#each newBooks as book, index}
					{#if index < 8}
						<div class="col-xl-3 col-lg-3 col-md-6">
							<div class="all_products_single text-center">
								<div class="all_product_item_image">
									{#if book.images} <img loading="lazy" src="{urlFor(book.images).fit('fill').auto('format').url()}" alt={book.title}>
									{:else} <BookCover title={book.title} subtitle={book.sibtitle} />
									{/if}
									<div class="all_product_hover">
										<AddToCartButton
											className="all_product_icon"
											productId={book.id || book._id}
											productType="books"
											iconOnly={true}
											label={`Add ${book.title} to cart`}
										/>
									</div>
								</div>
								<h4><a rel=prefetch href="/shop/books/{book.slug}/{book.id}/">{book.title} ({book.binding})</a></h4>
								<!-- <StarRating 
									rating={book.gRating}
									{styleSmall}>
								</StarRating> -->
								<p>{formatCurrency(book.price || book.pricing?.retailPrice || 0)}</p>
							</div>
						</div>
					{/if}
				{/each}
			</div>
		</div>
	</div>
</section>

<!-- Business Lines -->
<section class="recent-project">
	<div class="container mx-auto">
		<div class="block-title text-center">
			<p>let's work together</p>
			<h3>More than just Retail</h3>
			<div class="leaf">
				<img class="w-max pt-2 mx-auto" loading="lazy" src="/assets/images/resources/leaf.png" alt="">
			</div>
		</div>
		<div class="flex flex-col lg:flex-row">
			<div class="xl:basis-1/3 px-4 py-2">
				<div class="recent_project_single wow fadeInUp" data-wow-delay="300ms">
					<div class="project_img_box">
						<img loading="lazy" src="{urlFor(section4.images[0]).width(370).height(484).auto('format').url()}" alt={section4.images[0].alt}>
						<div class="project_content">
							<h3>Wholesale<br>solutions</h3>
						</div>
						<div class="hover_box">
							<a href="/contact" aria-label="Contact us about wholesale solutions"><span class="icon-left-arrow" aria-hidden="true"></span></a>
						</div>
					</div>
				</div>
			</div>
			<div class="xl:basis-1/3 px-4 py-2">
				<div class="recent_project_single wow fadeInUp" data-wow-delay="600ms">
					<div class="project_img_box">
						<img loading="lazy" src="{urlFor(section4.images[1]).width(370).height(484).auto('format').url()}" alt={section4.images[1].alt}>
						<div class="project_content">
							<h3>Institutional<br>Contracts</h3>
						</div>
						<div class="hover_box">
							<a href="/contact" aria-label="Contact us about institutional contracts"><span class="icon-left-arrow" aria-hidden="true"></span></a>
						</div>
					</div>
				</div>
			</div>
			<div class="xl:basis-1/3 px-4 py-2" >
				<div class="recent_project_single wow fadeInUp" data-wow-delay="900ms">
					<div class="project_img_box">
						<img loading="lazy" src="{urlFor(section4.images[2]).width(370).height(484).auto('format').url()}" alt={section4.images[2].alt}>
						<div class="project_content">
							<h3>Non-profit<br>projects</h3>
						</div>
						<div class="hover_box">
							<a href="/contact" aria-label="Contact us about non-profit projects"><span class="icon-left-arrow" aria-hidden="true"></span></a>
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>
<br>

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
					<a href="news.html" class="thm-btn">View All Posts</a>
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
