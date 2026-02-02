<script>
    /**
     * @typedef {Object} Props
     * @property {import('svelte').Snippet} [children]
     */

    /** @type {Props} */
    let { children } = $props();
</script>

<div class=" active-tab" id="desc">
    <div class="product-details-content min-w-full">
        {@render children?.()}
    </div>
</div>

<style>
    .product-details-content    {
        position: relative;
        display: block;
        border: 1px solid #f5f0e9;
        padding: 48px 60px 33px;
    }
    </style>