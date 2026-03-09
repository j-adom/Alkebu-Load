import { w as writable } from "./index.js";
function createCartDrawerStore() {
  const { subscribe, set, update } = writable(false);
  return {
    subscribe,
    open: () => set(true),
    close: () => set(false),
    toggle: () => update((value) => !value)
  };
}
createCartDrawerStore();
