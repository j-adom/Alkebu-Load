<script>
  import PartnershipLandingPage from '$lib/components/Partnership/PartnershipLandingPage.svelte';

  let { data, form } = $props();
</script>

<PartnershipLandingPage {data} {form} />
