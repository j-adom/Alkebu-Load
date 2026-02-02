<script lang="ts">
    import PayloadImage from "$lib/components/PayloadImage.svelte";
    import { getContext } from "svelte";
    
    interface Props {
        featured: any[];
    }

    let { featured }: Props = $props();
    
    const shuffle = (arr: any[], count: number) => {
        let _arr = [...arr];
        return[...Array(count)].map( ()=> _arr.splice(Math.floor(Math.random() * _arr.length), 1)[0] ).filter(Boolean); 
    }
    
    let randFeatured = shuffle(featured, 5);

    const getPrice = (product: any) => {
        const priceCents = product?.pricing?.retailPrice ?? product?.editions?.[0]?.price ?? 0;
        return (priceCents || 0) / 100;
    }
</script>

<div class="single-sidebar wow fadeInUp animated" data-wow-delay="0.5s"
    data-wow-duration="1200ms">
    <div class="top_sellers">
        <div class="title">
            <h3>Featured Products</h3>
        </div>
        <ul class="top-products">
            {#each randFeatured as product}
                {#if product}
                    <li>
                        <div class="product_item">
                            <div class="img-box">
                                <PayloadImage 
                                    image={product.images?.[0]?.image || product.images?.[0] || product.editions?.[0]?.images?.[0]} 
                                    alt={product.title}
                                    maxWidth={150}
                                />
                                <div class="overlay-content">
                                    <a href="/shop/books/{product.slug}" aria-label={`View ${product.title}`}><i class="fa fa-link" aria-hidden="true"></i></a>
                                </div>
                            </div>
                            <div class="title-box">
                                <h4><a href="/shop/books/{product.slug}">{product.title}</a></h4>
                                <div class="value">${getPrice(product).toFixed(2)}</div>
                            </div>
                        </div>
                    </li>
                {/if}
            {/each}
        </ul>
    </div>
</div>
