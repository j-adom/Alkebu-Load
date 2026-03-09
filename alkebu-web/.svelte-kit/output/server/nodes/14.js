import * as server from '../entries/pages/events/_slug_/_page.server.ts.js';

export const index = 14;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/events/_slug_/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/events/[slug]/+page.server.ts";
export const imports = ["_app/immutable/nodes/14.D-o9wZNz.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/Bmew28_A.js","_app/immutable/chunks/9p2O56ug.js","_app/immutable/chunks/mNN9vv1_.js","_app/immutable/chunks/CDyV6-Dx.js","_app/immutable/chunks/D7jLpdzQ.js","_app/immutable/chunks/4lj9WCA3.js","_app/immutable/chunks/BP9ifZc-.js","_app/immutable/chunks/DzmNqlgH.js","_app/immutable/chunks/Dga7b2p1.js","_app/immutable/chunks/Bj5IXHnP.js","_app/immutable/chunks/BLxk13I2.js"];
export const stylesheets = ["_app/immutable/assets/14.C5G8gizv.css"];
export const fonts = [];
