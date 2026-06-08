<script lang="ts">
  import { X, Check, AlertCircle, Info, ShoppingCart } from 'lucide-svelte';
  import { fade, fly } from 'svelte/transition';
  import { toasts, removeToast, type ToastType } from '$lib/stores/toast';

  const icons = {
    success: Check,
    error: AlertCircle,
    info: Info,
    cart: ShoppingCart,
  } satisfies Record<ToastType, typeof Check>;

  const colors = {
    success: 'bg-accent text-accent-foreground border-accent',
    error: 'bg-destructive/10 text-destructive border-destructive/20',
    info: 'bg-primary/10 text-primary border-primary/20',
    cart: 'bg-secondary/10 text-secondary border-secondary/20',
  } satisfies Record<ToastType, string>;
</script>

<div
  class="fixed bottom-6 right-6 z-50 flex flex-col-reverse gap-3 pointer-events-none"
  aria-live="polite"
  aria-atomic="false"
>
  {#each $toasts as toast (toast.id)}
    {@const Icon = icons[toast.type]}
    <div
      role={toast.type === 'error' ? 'alert' : 'status'}
      class="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl
             bg-card border shadow-medium backdrop-blur-sm
             min-w-[280px] max-w-[400px] {colors[toast.type]}"
      in:fly={{ x: 100, duration: 300 }}
      out:fade={{ duration: 200 }}
    >
      <Icon size={20} class="shrink-0" />

      <p class="flex-1 text-sm font-medium">{toast.message}</p>

      <button
        type="button"
        class="shrink-0 p-1 rounded-full hover:bg-muted/50 transition-colors"
        aria-label="Dismiss notification"
        onclick={() => removeToast(toast.id)}
      >
        <X size={16} />
      </button>
    </div>
  {/each}
</div>
