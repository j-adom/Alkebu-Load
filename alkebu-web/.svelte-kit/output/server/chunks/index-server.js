import { b as ssr_context } from "./context.js";
import { n as noop } from "./utils2.js";
function onDestroy(fn) {
  /** @type {SSRContext} */
  ssr_context.r.on_destroy(fn);
}
function createEventDispatcher() {
  return noop;
}
async function tick() {
}
export {
  createEventDispatcher as c,
  onDestroy as o,
  tick as t
};
