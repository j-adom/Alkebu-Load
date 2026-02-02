<script lang="ts">
  import { X, Check, AlertCircle, Info, ShoppingCart } from 'lucide-svelte';
  import { fade, fly } from 'svelte/transition';

  interface Toast {
    id: string;
    type: 'success' | 'error' | 'info' | 'cart';
    message: string;
    duration?: number;
  }

  let toasts = $state<Toast[]>([]);

  export function addToast(toast: Omit<Toast, 'id'>) {
    const id = crypto.randomUUID();
    const newToast: Toast = { ...toast, id };
    toasts = [...toasts, newToast];

    // Auto-remove after duration
    const duration = toast.duration ?? 4000;
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }

  export function removeToast(id: string) {
    toasts = toasts.filter(t => t.id !== id);
  }

  // Expose for external use
  export const toast = {
    success: (message: string, duration?: number) => addToast({ type: 'success', message, duration }),
    error: (message: string, duration?: number) => addToast({ type: 'error', message, duration }),
    info: (message: string, duration?: number) => addToast({ type: 'info', message, duration }),
    cart: (message: string, duration?: number) => addToast({ type: 'cart', message, duration }),
  };

  const icons = {
    success: Check,
    error: AlertCircle,
    info: Info,
    cart: ShoppingCart,
  };

  const colors = {
    success: 'bg-accent text-accent-foreground border-accent',
    error: 'bg-destructive/10 text-destructive border-destructive/20',
    info: 'bg-primary/10 text-primary border-primary/20',
    cart: 'bg-secondary/10 text-secondary border-secondary/20',
  };
</script>

<div class="fixed bottom-6 right-6 z-50 flex flex-col-reverse gap-3 pointer-events-none">
  {#each toasts as toast (toast.id)}
    <div 
      class="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl 
             bg-card border shadow-medium backdrop-blur-sm
             min-w-[280px] max-w-[400px] {colors[toast.type]}"
      in:fly={{ x: 100, duration: 300 }}
      out:fade={{ duration: 200 }}
    >
      <svelte:component this={icons[toast.type]} size={20} class="shrink-0" />
      
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
