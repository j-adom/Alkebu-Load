import * as server from '../entries/pages/about/_page.server.ts.js';

export const index = 3;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/about/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/about/+page.server.ts";
export const imports = ["_app/immutable/nodes/3.BYMy5A3H.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/Bmew28_A.js","_app/immutable/chunks/9p2O56ug.js","_app/immutable/chunks/CDyV6-Dx.js","_app/immutable/chunks/CYV9pcsX.js","_app/immutable/chunks/4lj9WCA3.js","_app/immutable/chunks/BP9ifZc-.js","_app/immutable/chunks/DzmNqlgH.js","_app/immutable/chunks/mNN9vv1_.js","_app/immutable/chunks/Dga7b2p1.js","_app/immutable/chunks/Bj5IXHnP.js","_app/immutable/chunks/BNc2r4vw.js","_app/immutable/chunks/Bs3lJvAj.js","_app/immutable/chunks/C0e1NB9p.js","_app/immutable/chunks/CHsaMiwT.js"];
export const stylesheets = [];
export const fonts = [];
