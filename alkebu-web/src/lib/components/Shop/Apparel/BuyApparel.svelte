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
    color = undefined,
    size = undefined,
    icon = false,
  }: Props = $props();

  const colors = $derived(product.colors?.map((c) => c.color) || []);
  const sizes = $derived(product.sizes || []);

  const resolvedSize = $derived(size ?? sizes[0]);
  const resolvedColor = $derived(color ?? colors[0]);
  const sizeOptions = $derived(sizes.length > 1 ? sizes.join('|') : sizes[0]);
  const colorOptions = $derived(colors.length > 1 ? colors.join('|') : colors[0]);
  const weight = $derived(product.weight ? product.weight : '2');
  const productId = $derived(product?.id || product?._id);
  const customization = $derived.by(() => ({
    size: resolvedSize,
    color: resolvedColor,
  }));
  const buttonClass = $derived(icon ? 'all_product_icon' : 'btn-primary');
</script>

<AddToCartButton
  productId={productId}
  productType="fashion-jewelry"
  quantity={quantity}
  customization={customization}
  className={buttonClass}
  disabled={!resolvedColor || !resolvedSize}
  iconOnly={icon}
  label="Add to Cart"
/>
