<script lang="ts">
  import { onMount } from 'svelte';

  import Nav from "$lib/components/Nav.svelte";
  import Footer from "$lib/components/Footer.svelte";
  // import Loader from 'static/assets/images/loader.png'
  import { goto } from "$app/navigation";
  import { page } from "$app/stores";
  import { writable } from "svelte/store";
  import { setContext } from "svelte";
  import "../app.postcss";
  import { cart } from '$lib/stores/cart';
  import CartDrawer from '$lib/components/cart/CartDrawer.svelte';

  let { settings, children, user } = $props();
  const settings$ = writable(settings);

  // Keep the writable store in sync with the settings prop
  $effect(() => {
    $settings$ = settings;
  });

  setContext("settings", settings$);

  onMount(() => {
    cart.initialize(user?.id);
  });

  function changeZ() {
    let x = Array.from(
      document.getElementsByClassName(
        "algolia-autocomplete"
      ) as HTMLCollectionOf<HTMLElement>
    );
    x.forEach((element) => {
      element.style.zIndex = "1000";
    });
    document.getElementById("search").focus();
  }

  let searchInput: string = $state("");
  function handleSubmit(event: Event) {
    event.preventDefault();
    goto(`/search?q=${searchInput}`);
  }
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

  <a
    href="."
    data-target="html"
    class="scroll-to-target scroll-to-top"
    aria-label="Scroll back to top"
  >
    <i class="fa fa-angle-up" aria-hidden="true"></i>
  </a>

  <div class="search-popup">
    <div class="search-popup__overlay custom-cursor__overlay">
      <div class="cursor"></div>
      <div class="cursor-follower"></div>
    </div>
    <!-- /.search-popup__overlay -->
    <div class="search-popup__inner">
      <form onsubmit={handleSubmit} class="search-popup__form" method="GET">
        <input
          oninput={changeZ}
          bind:value={searchInput}
          type="search"
          name="q"
          id="search"
          placeholder="Type here to Search...."
          aria-label="Search through site content"
        />
        <button type="submit" aria-label="Submit search">
          <i class="fa fa-search" aria-hidden="true"></i>
        </button>
      </form>
    </div>
    <!-- /.search-popup__inner -->
  </div>
  <!-- /.search-popup -->

  <CartDrawer {user} />
</div>

<style>
</style>
