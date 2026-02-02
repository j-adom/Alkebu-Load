import { writable } from 'svelte/store';

function createCartDrawerStore() {
  const { subscribe, set, update } = writable(false);

  return {
    subscribe,
    open: () => set(true),
    close: () => set(false),
    toggle: () => update((value) => !value),
  };
}

export const cartDrawer = createCartDrawerStore();
