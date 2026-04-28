<script lang="ts">
  import { onMount } from 'svelte';

  import Nav from "$lib/components/Nav.svelte";
  import Footer from "$lib/components/Footer.svelte";
  import { page } from "$app/stores";
  import { writable } from "svelte/store";
  import { setContext } from "svelte";
  import "../app.postcss";
  import { cart } from '$lib/stores/cart';
  import CartDrawer from '$lib/components/cart/CartDrawer.svelte';

  let { settings, children, user } = $props();
  const settings$ = writable<any>(undefined);

  // Keep the writable store in sync with the settings prop
  $effect(() => {
    $settings$ = settings;
  });

  setContext("settings", settings$);

  onMount(() => {
    cart.initialize(user?.id);
  });
</script>

<div class="page-wrapper ">
  <Nav />

  <main>
    {#if !$page.data}
      <div class="preloader">
        <img src="/assets/images/loader.png" class="preloader__image" alt="loading" />
      </div>
    {:else}
      {@render children?.()}
    {/if}
  </main>

  <Footer />

  <CartDrawer {user} />
</div>

<style>
</style>
