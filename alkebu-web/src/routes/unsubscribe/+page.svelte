<script lang="ts">
  import { enhance } from '$app/forms';
  import Meta from '$lib/components/Meta.svelte';

  let { data, form } = $props();
  let submitting = $state(false);
</script>

<Meta title="Unsubscribe" description="Stop reminder emails from Alkebu-Lan Images" noIndex />

<div class="min-h-[60vh] bg-background">
  <div class="container mx-auto max-w-xl px-4 py-16 text-center">
    {#if form?.done}
      <h1 class="text-3xl font-bold text-foreground font-display">You're unsubscribed</h1>
      <p class="mt-4 text-muted-foreground">
        We won't send you cart or quote reminders again. You'll still get receipts and updates about orders you place.
      </p>
      <a href="/shop" class="btn-primary mt-8 inline-flex">Back to the shop</a>
    {:else if !data.token}
      <h1 class="text-3xl font-bold text-foreground font-display">Unsubscribe link incomplete</h1>
      <p class="mt-4 text-muted-foreground">
        Please use the full link from the email, or reply to that email and we'll take you off the list.
      </p>
    {:else}
      <h1 class="text-3xl font-bold text-foreground font-display">Stop reminder emails?</h1>
      <p class="mt-4 text-muted-foreground">
        You'll no longer get abandoned-cart or quote reminders from Alkebu-Lan Images. Order receipts and shipping
        updates aren't affected.
      </p>
      {#if form?.error}
        <p class="mt-4 text-sm text-destructive" role="alert">{form.error}</p>
      {/if}
      <form
        method="POST"
        class="mt-8"
        use:enhance={() => {
          submitting = true;
          return async ({ update }) => {
            await update();
            submitting = false;
          };
        }}
      >
        <input type="hidden" name="token" value={data.token} />
        <button type="submit" class="btn-primary" disabled={submitting}>
          {submitting ? 'Unsubscribing…' : 'Unsubscribe'}
        </button>
      </form>
    {/if}
  </div>
</div>
