  
<script>
    import FeaturedBar from '$lib/components/Shop/FeaturedBar.svelte'
    import BookList from '$lib/components/Shop/Books/BookList.svelte'
    import Meta from '$lib/components/Meta.svelte'
    import { urlFor } from '$lib/payload';
	import { page, } from '$app/stores';
	import { Search } from 'lucide-svelte'
    
  let { data } = $props();
    const tag = data.tag
    let {bookCount, books, genres} = $derived(data.bks)
    
    const settings = data.settings
    const featured = data.featured
    let perPage = 12;
    let pageCount = $state(Math.ceil(bookCount/perPage))

    let currentPage = $derived(parseInt($page.url.searchParams.get('p')) || 1) 
    // @ts-ignore
       
    
    let sort = $page.url.searchParams.get('query') || ''
    let slug = $page.params.slug

    let urlTag = tag.replace('&','and')
    let baseURL = `/shop/books/tags/${encodeURI(urlTag)}/`
    let metaURL = parseInt($page.url.searchParams.get('p')) > 1 ? baseURL + '?p=' + $page.url.searchParams.get('p')
                :  baseURL 
    let metaImg ="https://cdn.sanity.io/images/nrl6nc45/production/87f3a18c04e9e50a99b0e4e46b0e08a0e9c0ae57-4160x2340.jpg?&w=400&h=300&auto=format"

    let thisPage = parseInt($page.url.searchParams.get('p')) > 1 ? `| Page ${$page.url.searchParams.get('p')} ` : ''
    const metadata = {
		title: `Tag: ${tag} ${thisPage}| Alkebu-Lan Images`,
        description: `${tag} Tagged Books`,
		image: metaImg,
		imageAlt: 'bookshelf',
        url: metaURL,
    }
</script>

<Meta {metadata}/>

<section class="page-header" style="background-image: url({urlFor(settings.banner).width(1920).height(300).auto('format').url()});">
    <div class="container">
        <h2><small>Tag:</small><br>{urlTag}</h2>
        <ul class="thm-breadcrumb list-unstyled">
            <li><a href="/shop/">Shop</a></li>
            <li><a href="/shop/books/" class="shop_style">Books</a></li>
            <li><span>Tags</span></li>
        </ul>
    </div>
</section>

<section class="product mx-auto">
    <BookList {books} {genres} {featured} {bookCount} {sort} {currentPage} {perPage} />
</section>