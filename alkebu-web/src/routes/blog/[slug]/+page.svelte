<script>
  import {urlFor} from "$lib/payload";
  import { page } from '$app/stores'
  import LexicalRenderer from "$lib/components/LexicalRenderer.svelte";
  import dayjs from "dayjs";

  let { data } = $props();
  const { settings, post } = data;
</script>

<style>
	.news_detail_image_box{

	}
</style>

<section class="page-header" style="background-image: url({urlFor(settings.banner).width(1920).height(300).auto('format').url()});">
	<div class="container w-full p-3 mx-auto">
		<h2>{post.title}</h2>
		<ul class="thm-breadcrumb list-unstyled">
			<li><a href="index.html">Home</a></li>
			<li><span>News Article</span></li>
		</ul>
	</div>
</section>

<section class="news_detail">
	<div class="container  flex flex-col md:flex-row gap-3">
		<div class="news_detail_left md:w-2/3">
			<div class="news_detail_image_box">
				<img src={urlFor(post.mainImage).size(770,427).url()} alt="">
				<div class="news_detail_date_box">
					<p>{dayjs(post.publishedAt).format('MMM DD YYYY')}</p>
				</div>
			</div>
			<!-- <ul class="list-unstyled news_detail__meta">
				<li><a href="news_detail.html"><i class="far fa-user-circle"></i> Admin</a></li>
				<li><a href="news_detail.html"><i class="far fa-comments"></i> 2 Comments</a></li>
			</ul> -->
			<div class="news_detail_content">
				<!-- <h2>{post.title}</h2> -->
				<PortableText 
					value={post.body} 
					components={{
						types:{
							image: ImageBlock,
							mainImage: ImageBlock
						},
						marks: {
							link: Link
						},
						// list: {
						// 	// Swap only the list parts you need
						// 	bullet: UnorderedListWrapper,
						// },
						// listItem: {
						// 	bullet: ListItem,
						// }
					
					}}
				/>
			</div>
			<div class="news_detail__bottom">
				<!-- <p class="news_detail__tags">
					<span>Tags:</span>
					<a href="#">Agriculture,</a>
					<a href="#">Food,</a>
					<a href="#">Economy</a>
				</p> -->
				<div class="news_detail__social-list">
					<a href="https://www.facebook.com/sharer.php?u=https://www.alkebulanimages.com{$page.url.pathname}"><i class="fab fa-facebook-square"></i></a>
					<a href="https://twitter.com/share?text={post.title}&url=https://www.alkebulanimages.com{$page.url.pathname}"><i class="fab fa-twitter"></i></a>
					<!-- <a href="#"><i class="fab fa-instagram"></i></a>
					<a href="#"><i class="fab fa-dribbble"></i></a> -->
				</div>
			</div>
			<div class="author-one">
				<div class="author-one__image">
					<img src={urlFor(post.author.image).size(170,160).url()} alt="">
				</div>
				<div class="author-one__content prose">
					<h3>{post.author.name}</h3>
					<PortableText 
						value={post.author.bio} 
						components={{
						types:{
							image: ImageBlock,
							authorReference: Author
						},
						marks: {
							link: Link
						}
						}
					}/>
				</div>
			</div>
			<div class="comment-one">
				<!-- <h3 class="comment-one__title">2 Comments</h3>
				<div class="comment-one__single">
					<div class="comment-one__image">
						<img src="/assets/images/blog/comment-1-1.png" alt="">
					</div>
					<div class="comment-one__content">
						<h3>Sarah albert</h3>
						<p>It has survived not only five centuries, but also the leap into electronic
							typesetting unchanged. It was popularised in the sheets containing lorem
							ipsum is simply free text available in the martket to use now.</p>
						<a href="#" class="thm-btn comment-one__btn">Reply</a>
					</div>
				</div>
				<div class="comment-one__single">
					<div class="comment-one__image">
						<img src="/assets/images/blog/comment-1-2.png" alt="">
					</div>
					<div class="comment-one__content">
						<h3>Kevin Martin</h3>
						<p>It has survived not only five centuries, but also the leap into electronic
							typesetting
							unchanged. It was popularised in the sheets containing lorem ipsum is simply
							free text
							available in the martket to use now.</p>
						<a href="#" class="thm-btn comment-one__btn">Reply</a>
					</div>
				</div> -->
			</div>
			<!-- <div class="comment-form">
				<h3 class="comment-form__title">Leave a Comment</h3>
				<form action="inc/sendemail.php" class="comment-one__form">
					<div class="row">
						<div class="col-xl-6">
							<div class="comment_input_box">
								<input type="text" placeholder="Full name" name="name">
							</div>
						</div>
						<div class="col-xl-6">
							<div class="comment_input_box">
								<input type="text" placeholder="Email address" name="email">
							</div>
						</div>
					</div>
					<div class="row">
						<div class="col-xl-12">
							<div class="comment_input_box">
								<textarea name="message" placeholder="Write message"></textarea>
							</div>
							<button type="submit" class="thm-btn comment-form__btn">Submit
								Comment</button>
						</div>
					</div>
				</form>
			</div> -->
		</div>
	
	
		<div class="sidebar md:w-1/3">
			<!-- <div class="sidebar__single sidebar__search">
				<form action="#" class="sidebar__search-form">
					<input type="search" placeholder="Search">
					<button type="submit"><i class="icon-magnifying-glass"></i></button>
				</form>
			</div> -->
			<div class="sidebar__single sidebar__post">
				<h3 class="sidebar__title">Latest Posts</h3>
				<ul class="sidebar__post-list list-unstyled">
					{#each post.latest as l}
						<li>
							<div class="sidebar__post-image">
								<img src={urlFor(l.mainImage).size(80,77).url()} alt={l.mainImage.alt}>
							</div>
							<div class="sidebar__post-content">
								<h3>
									<!-- <a href="#" class="sidebar__post-content_meta"><i
											class="far fa-user-circle"></i> Admin</a> -->
									<a href="/blog/{l.slug}">{l.title}</a>
								</h3>
							</div>
						</li>
					{/each}
				</ul>
			</div>
			<!-- <div class="sidebar__single sidebar__category">
				<h3 class="sidebar__title">All Categories</h3>
				<ul class="sidebar__category-list list-unstyled">
					<li><a href="#">Agriculture</a></li>
					<li><a href="#">Organic Food</a></li>
					<li><a href="#">Dairy Farm</a></li>
					<li><a href="#">Economy Solution</a></li>
					<li><a href="#">Harvests Innovations</a></li>
				</ul>
			</div>
			<div class="sidebar__single sidebar__tags">
				<h3 class="sidebar__title">Popular Tags</h3>
				<div class="sidebar__tags-list">
					<a href="#">Agriculture,</a>
					<a href="#">Food,</a>
					<a href="#">Healthy,</a>
					<a href="#">Economy,</a>
					<a href="#">Organic,</a>
					<a href="#">Farm,</a>
					<a href="#">Dairy,</a>
				</div>
			</div> -->
		</div>
	</div>
</section>