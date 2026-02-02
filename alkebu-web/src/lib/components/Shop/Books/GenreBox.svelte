<script>
    let { genres } = $props();
</script>

<div class="single-sidebar wow fadeInUp animated" data-wow-delay="0.3s"
    data-wow-duration="1200ms">
    <div class="categories-box">
        <div class="title">
            <h3>Genres</h3>
        </div>
        <ul class="categories clearfix">
            {#each genres as genre}   
                <li><a href="/shop/books/genres/{genre.slug.current}/">{genre.name}</a></li>
            {/each}
        </ul>
    </div>
</div>