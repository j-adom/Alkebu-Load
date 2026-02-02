<!-- Add component on Featured Products-->

<script>
    import Meta from '$lib/components/Meta.svelte'
    import { urlFor } from '$lib/payload';
    
    const metadata = {
		title: 'Shop | Alkebu-Lan Images',
		description: `Our store has 4 departments: Books, Apparel, Health & Beauty, and Art & Afrian Imports`,
		image: '/assets/images/resources/logo.png',
		imageAlt: 'Alkebu-Lan Images Logo',
		url: '/shop/'
    }

    let { data } = $props();
	const shop = data.shop ?? {};
	const bannerImage = shop.banner?.bannerImage ?? shop.banner;
	const sectionImages = shop.section1?.images ?? [];

</script>

<Meta {metadata}/>

<section class="page-header" style="background-image: url({urlFor(bannerImage).width(1920).height(300).auto('format').url()});">
    <div class="container">
        <h2>Categories</h2>
        <ul class="thm-breadcrumb list-unstyled">
            <li><a href="/">Home</a></li>
            <li><a href="/shop/" class="shop_style">Shop</a></li>
            <!-- <li><span>Categories</span></li> -->
        </ul>
    </div>
</section>

<section class="recent-project our_projects">
    <div class="mx-16">
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div class="">
                <div class="recent_project_single mrb-30">
                    <div class="project_img_box">
                        <img loading="lazy" src={urlFor(sectionImages?.[0]?.image ?? sectionImages?.[0]).width(370).height(484).auto('format').url()} alt={sectionImages?.[0]?.image?.alt ?? sectionImages?.[0]?.alt ?? 'Books'}>
                        <div class="project_content">
                            <h3>Book<br>catalogue</h3>
                        </div>
                        <div class="hover_box">
                            <a href="/shop/books" aria-label="View all books"><span class="icon-left-arrow"></span></a>
                        </div>
                    </div>
                </div>
            </div>
            <div class="">
                <div class="recent_project_single mrb-30">
                    <div class="project_img_box">
                        <img loading="lazy" src={urlFor(sectionImages?.[1]?.image ?? sectionImages?.[1]).width(370).height(484).auto('format').url()} alt={sectionImages?.[1]?.image?.alt ?? sectionImages?.[1]?.alt ?? 'Apparel'}>
                        <div class="project_content">
                            <h3>fashion<br>& apparel</h3>
                        </div>
                        <div class="hover_box">
                            <a href="/shop/apparel" aria-label="View apparel"><span class="icon-left-arrow"></span></a>
                        </div>
                    </div>
                </div>
            </div>
            <div class="">
                <div class="recent_project_single mrb-30">
                    <div class="project_img_box">
                        <img loading="lazy" src={urlFor(sectionImages?.[2]?.image ?? sectionImages?.[2]).width(370).height(484).saturation(-100).auto('format').url()} alt={sectionImages?.[2]?.image?.alt ?? sectionImages?.[2]?.alt ?? 'Health and Beauty'}>
                        <div class="project_content">
                            <h3>Health<br>& Beauty</h3>
                        </div>
                        <div class="hover_box">
                            <!-- <a href="/shop/health-and-beauty" aria-label="View health and beauty"><span class="icon-left-arrow"></span></a> -->
                        </div>
                    </div>
                </div>
            </div>
            <div class="">
                <div class="recent_project_single mrb-30">
                    <div class="project_img_box">
                        <img loading="lazy" src={urlFor(sectionImages?.[3]?.image ?? sectionImages?.[3]).width(370).height(484).saturation(-100).auto('format').url()} alt={sectionImages?.[3]?.image?.alt ?? sectionImages?.[3]?.alt ?? 'African Art'}>
                        <div class="project_content">
                            <h3>African art<br>& imports</h3>
                        </div>
                        <div class="hover_box">
                            <!-- <a href="/shop/art-and-imports" aria-label="View African art and imports"><span class="icon-left-arrow"></span></a> -->
                        </div>
                    </div>
                </div>
            </div>

        </div>

    </div>
</section>
