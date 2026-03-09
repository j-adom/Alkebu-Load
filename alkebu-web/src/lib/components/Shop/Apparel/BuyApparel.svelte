<script lang="ts">
  import AddToCartButton from '$lib/components/cart/AddToCartButton.svelte';

  interface Props {
    product: any;
    image?: any;
    quantity?: number;
    color?: string;
    size?: string;
    icon?: boolean;
  }

  let {
    product,
    image,
    quantity = 1,
    color = product.colors?.[0],
    size = product.sizes?.[0],
    icon = false,
  }: Props = $props();

  let colors = product.colors?.map((c) => c.color) || [];
  let sizes = product.sizes || [];

  let sizeOptions = sizes.length > 1 ? sizes.join('|') : sizes[0];
  let colorOptions = colors.length > 1 ? colors.join('|') : colors[0];
  let weight = product.weight ? product.weight : '2';
  const productId = $derived(product?.id || product?._id);
  const customization = $derived.by(() => ({
    size,
    color,
  }));
  const buttonClass = $derived(icon ? 'all_product_icon' : 'btn-primary');
</script>

<AddToCartButton
  productId={productId}
  productType="fashion-jewelry"
  quantity={quantity}
  customization={customization}
  className={buttonClass}
  disabled={!color || !size}
  iconOnly={icon}
  label="Add to Cart"
/>
