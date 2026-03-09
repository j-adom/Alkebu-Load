import * as server from '../entries/pages/shop/_page.server.ts.js';

export const index = 19;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/shop/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/shop/+page.server.ts";
export const imports = ["_app/immutable/nodes/19.D6Q21cOI.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/Bmew28_A.js","_app/immutable/chunks/9p2O56ug.js","_app/immutable/chunks/mNN9vv1_.js","_app/immutable/chunks/CDyV6-Dx.js","_app/immutable/chunks/4lj9WCA3.js","_app/immutable/chunks/BP9ifZc-.js","_app/immutable/chunks/DzmNqlgH.js","_app/immutable/chunks/Dga7b2p1.js","_app/immutable/chunks/Bj5IXHnP.js","_app/immutable/chunks/D2a5VD-4.js","_app/immutable/chunks/BNc2r4vw.js","_app/immutable/chunks/Bs3lJvAj.js","_app/immutable/chunks/C0e1NB9p.js"];
export const stylesheets = [];
export const fonts = [];
