<script>

    import BookList from '$lib/components/Shop/Books/BookList.svelte'
    import FeaturedBar from '$lib/components/Shop/FeaturedBar.svelte'
    import Meta from '$lib/components/Meta.svelte'
    // import GenreBox from '$lib/components/Shop/Books/GenreBox.svelte'
	import { Search } from 'lucide-svelte'

    import { page } from '$app/stores'
    import { urlFor } from "$lib/payload";

    let { data } = $props();

    let {title, bookCount, books, genres, featured} = $derived(data.books)
    const settings = data.settings
    let perPage = 12;
    let pageCount = $state(Math.ceil(bookCount/perPage))

    let currentPage = $derived(parseInt($page.url.searchParams.get('p')) || 1) 
       
    
    let sort = $page.url.searchParams.get('query') || ''
    let slug = $page.params.slug

    let baseURL = `/shop/books/collections/${slug}/`
    let metaURL = parseInt($page.url.searchParams.get('p')) > 1 ? baseURL + '?p=' + $page.url.searchParams.get('p')
                :  baseURL 
    let metaImg ="https://cdn.sanity.io/images/nrl6nc45/production/87f3a18c04e9e50a99b0e4e46b0e08a0e9c0ae57-4160x2340.jpg?&w=400&h=300&auto=format"

    let thisPage = parseInt($page.url.searchParams.get('p')) > 1 ? `| Page ${$page.url.searchParams.get('p')} ` : ''
    const metadata = {
		title: `Collection: ${title} ${thisPage}| Alkebu-Lan Images`,
        description: `A curated selection of books from the collection ${title} `,
		image: metaImg,
		imageAlt: 'bookshelf',
        url: metaURL,
    }

</script>

<Meta {metadata}/>

<section class="page-header" style="background-image: url({urlFor(settings.banner).width(1920).height(300).auto('format').url()});">
    <div class="container">
        <h2><small>Collection:</small><br>{title}</h2>
        <ul class="flex items-center gap-2 text-sm text-white/80">
            <li><a href="/shop/">Shop</a></li>
            <li><a href="/shop/books/" class="shop_style">Books</a></li>
            <li><span>Collections</span></li>
        </ul>
    </div>
</section>

<section class="product mx-auto">
    <BookList {books} {genres} {featured} {bookCount} {sort} {currentPage} {perPage} />
</section>