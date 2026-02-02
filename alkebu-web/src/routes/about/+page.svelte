<script>
    import Meta from '$lib/components/Meta.svelte'
	import { urlFor } from '$lib/payload';
     
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

</script>

<Meta {metadata} />

<section class="about_two">
	<div class="mx-24 ">
		<div class="flex flex-col md:flex-row gap-3 ">
			<div class="basis-1 md:basis-1/2 ">
				<div class="block-title text-left">
					<p>About Alkebu-Lan Images</p>
					<h3>Nashville's Center for Black Lifestyles</h3>
					<div class="leaf">
						<img loading="lazy" src="/assets/images/resources/leaf.png" alt="">
					</div>
				</div>
			</div>
			<div class="basis-1 md:basis-1/2 ">
				<div class="">
					<p class="text-lg">{description}</p>
				</div>
			</div>
		</div>
		<div class="grid grid-cols-1 lg:grid-cols-12 items-stretch gap-5 my-6 pb-40">
			<div class="lg:col-span-5">
				<div class="about_two_left h-full">
					<img
						loading="lazy"
						class="w-full h-full object-cover rounded-lg"
						src="{urlFor(image2).width(800).height(1024).auto('format').url()}"
						alt={image2?.alt ?? 'Alkebu-Lan Images'}
					>
				</div>
			</div>
			<div class="lg:col-span-5">
				<div class="about_two_middle h-full">
					<img
						loading="lazy"
						class="w-full h-full object-cover rounded-lg"
						src="{urlFor(image0).width(800).height(1024).auto('format').url()}"
						alt={image0?.alt ?? 'Alkebu-Lan Images'}
					>
				</div>
			</div>
			<div class="lg:col-span-2">
				<div class="about_two-right h-full relative overflow-hidden rounded-lg">
					<img
						loading="lazy"
						class="absolute inset-0 w-full h-full object-cover opacity-40"
						src="{urlFor(image1).auto('format').url()}"
						alt={image1?.alt ?? 'Alkebu-Lan Images'}
					>
					<div class="about_two_content relative z-10 flex h-full items-center justify-center text-center p-7 text-white text-lg">
						<h2>Proudly serving Nashville and beyond for 35 years!</h2>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Business Highlights -->
<section class="benefits">
	<div class="benefits_bg" style="background-image: url(assets/images/resources/benifits_bg.png)"></div>
	<div class="w-screen mx-auto">
		<div class="mx-24 flex flex-col md:flex-row">
			<div class="basis-1 md:basis-1/2 px-3">
				<div class="block-title text-left">
					<p>Our principles</p>
					<h3>Uplifting Black Consciousness<br>& Culture</h3>
					<div class="leaf">
						<img loading="lazy" src="/assets/images/resources/leaf.png" alt="">
					</div>
				</div>
			</div>
			<div class="basis-1 md:basis-1/2 px-3 flex">
				<div class="my-auto">
					<div class="benefits_text">
						<p class="text-lg">Alkebu-Lan Images seeks to support the local Black community and beyond by sourcing our products
						where possible from other Black-owned businesses in the spirit of the Kwanzaa principle of Ujima. As
						a result one can find a wide range of rare books, handmade jewelry, and other items not found in your
						typical retail establishment. With a focus on sourcing products by Black businesses and for Black
						people we hope to shine a light on a market that is both under-served and under-valued.</p>
					</div>
				</div><!-- /.my-auto -->
			</div>
		</div>
		<div class="mt-12 mx-12">
			<div class="mx-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 align-middle justify-between gap-4">
				<div class="">
					<div class="benefits_single wow fadeInUp h-full animated flex justify-between align-middle text-right" data-wow-delay="300ms">
						<div class="icon-box " >
							<i class="fa fa-fist-raised fa-4x"></i>
						</div>
						<h3>Black Owned & Operated</h3>
					</div>
				</div>
				<div class="">
					<div class="benefits_single wow fadeInUp h-full flex justify-between align-middle text-right" data-wow-delay="300ms">
						<div class="icon-box " >
							<i class="fa fa-hands-helping fa-4x"></i>
						</div>
						<h3>Cooperative Economics</h3>
					</div>
				</div>
				<div class="">
					<div class="benefits_single wow fadeInUp h-full flex justify-between align-middle text-right" data-wow-delay="300ms">
						<div class="icon-box " >
							<i class="fa fa-book-reader fa-4x"></i>
						</div>
						<h3>Knowledge is Power</h3>
					</div>
				</div>
				<div class="">
					<div class="benefits_single wow fadeInUp h-full flex justify-between align-middle text-right" data-wow-delay="300ms">
						<div class="icon-box " >
							<i class="fa fa-leaf fa-4x"></i>
						</div>
						<h3>Natural Lifestyles</h3>
					</div>
				</div>
			</div>
		</div>
	</div>
</section>

<!-- Testimonials -->
<!-- <section class="bx-testimonial bx-testimonial2 about_bx-testimonial2">
	<div class="bx-testimonial_bg" style="background-image: url(assets/images/testimonials/bx-testi-bg.png)">
	</div>
	<div class="container">
		<div class="block-title text-center">
			<p>testimonails</p>
			<h3>What people say</h3>
			<div class="leaf">
				<img loading="lazy" src="/assets/images/resources/leaf.png" alt="">
			</div>
		</div>
		<div class="row">
			<div class="col-xl-12">
				<div class="bx_testimonial_slider">

					<div class="slider-pager">
						<ul class="thumb-box list-unstyled text-center">
							<li>
								<a class="active" data-slide-index="0" href="#">
									<div class="img-holder">
										<img loading="lazy" src="/assets/images/testimonials/bx-testi-1.png" alt="">
										<div class="quote_testimonial">
											<img loading="lazy" src="/assets/images/icon/quote_1.png" alt="">
										</div>
									</div>
								</a>
							</li>
							<li>
								<a data-slide-index="1" href="#">
									<div class="img-holder">
										<img loading="lazy" src="/assets/images/testimonials/bx-testi-2.png" alt="">
										<div class="quote_testimonial">
											<img loading="lazy" src="/assets/images/icon/quote_1.png" alt="">
										</div>
									</div>
								</a>
							</li>
							<li>
								<a data-slide-index="2" href="#">
									<div class="img-holder">
										<img loading="lazy" src="/assets/images/testimonials/bx-testi-3.png" alt="">
										<div class="quote_testimonial">
											<img loading="lazy" src="/assets/images/icon/quote_1.png" alt="">
										</div>
									</div>
								</a>
							</li>
						</ul>
					</div>

					<ul class="slider-content clearfix bxslider list-unstyled text-center">
						<li>
							<div class="bx_testimonial_single clearfix">
								<div class="bx_testimonial_text">
									<p>This is due to their excellent service, competitive pricing and customer
										support. It’s throughly refresing to get such a personal touch.</p>
									<h3>christine rose</h3>
									<h6>Customer</h6>
								</div>
							</div>
						</li>
						<li>
							<div class="bx_testimonial_single clearfix">
								<div class="bx_testimonial_text">
									<p>This is due to their excellent service, competitive pricing and customer
										support. It’s throughly refresing to get such a personal touch.</p>
									<h3>christine rose</h3>
									<h6>Customer</h6>
								</div>
							</div>
						</li>
						<li>
							<div class="bx_testimonial_single clearfix">
								<div class="bx_testimonial_text">
									<p>This is due to their excellent service, competitive pricing and customer
										support. It’s throughly refresing to get such a personal touch.</p>
									<h3>christine rose</h3>
									<h6>Customer</h6>
								</div>
							</div>
						</li>
					</ul>

				</div>
			</div>
		</div>
	</div>
</section> -->

<section class="cta-one" style="background-image: url({urlFor(section2.section2image).width(1894).height(582).auto('format').url()})">
	<div class="">
		<div class="cta_one_content">
			<h1>Providing our customers a Well-Curated <br>range of products that elevate Black Lifestyles</h1>
			<p>Browse our online store to see just what we're talking about</p>
			<div class="cta_one__button-block">
				<a href="." class="thm-btn cta_one__btn">Discover More</a>
			</div>
		</div>
	</div>
</section>


<style>
	.about_two-right {
		background: var(--thm-primary);
	}
	.icon-box i{
		color: var(--thm-base)
	}
	.benefits_single:hover .icon-box i{
		color: var(--thm-black)
	}
</style>
