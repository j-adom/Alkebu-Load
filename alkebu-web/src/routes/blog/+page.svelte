<script lang="ts">
  import LexicalRenderer from '$lib/components/LexicalRenderer.svelte';
  import Meta from '$lib/components/Meta.svelte';
  import { urlFor } from '$lib/payload';
  import dayjs from "dayjs";

  let { data } = $props();
  const posts = data.posts || [];
  const settings = data.settings || {};
  const metadata = data.seo;

  const placeholderImage = '/assets/images/resources/placeholder.jpg';
  const bannerUrl = settings.banner
    ? urlFor(settings.banner).width(1920).height(300).auto('format').url()
    : '/assets/images/resources/page-header-bg.jpg';

  const imageForPost = (post: any) =>
    urlFor(post.mainImage || post.featuredImage || placeholderImage)
      .width(370)
      .height(309)
      .auto('format')
      .url();

</script>

<style>
  ul {
    margin: 0 0 1em 0;
    line-height: 1.5;
  }
</style>

<Meta metadata={metadata} />

<section class="page-header" style={`background-image: url(${bannerUrl});`}>
	<div class="container">
		<h2>Habari Gani?<br>(What's the News?)</h2>
		<ul class="thm-breadcrumb list-unstyled">
			<li><a href="/">Home</a></li>
			<li><span>News</span></li>
		</ul>
	</div>
</section>

<section class="blog-one news">
	
	<div class="container">
		<div class="row">
			{#each posts as post}
				<div class="grid lg:grid-cols-4">
					<div class="blog_one_single mb-30">
						<div class="blog_one_image">
							<div class="blog_image">
								<a href="/blog/{post.slug}">
                  {#if post.mainImage || post.featuredImage}
                    <img src={imageForPost(post)} alt={post.title} loading="lazy">
                  {:else}
                    <img src={placeholderImage} alt="Placeholder" loading="lazy">
                  {/if}
                </a>
								<div class="blog_one_date_box">
									<p>{dayjs(post.publishedAt).format('MMM DD YYYY')}</p>
								</div>
							</div>
							<div class="blog-one__content">
								<h3><a href="/blog/{post.slug}">{post.title}</a></h3>
								<div class="blog_one_text">
									<LexicalRenderer content={post.excerpt} />
								</div>
								<div class="read_more_btn">
									<a href="/blog/{post.slug}"><i class="fa fa-angle-right"></i>Read More</a>
								</div>
							</div>
						</div>
					</div>
				</div>	
			{/each}
		</div>
	</div>
</section>
