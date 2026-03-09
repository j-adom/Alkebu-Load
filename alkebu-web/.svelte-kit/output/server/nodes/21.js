import * as server from '../entries/pages/shop/apparel/_...slug_/_page.server.ts.js';

export const index = 21;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/shop/apparel/_...slug_/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/shop/apparel/[...slug]/+page.server.ts";
export const imports = ["_app/immutable/nodes/21.BkFjsQhN.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/Bmew28_A.js","_app/immutable/chunks/9p2O56ug.js","_app/immutable/chunks/mNN9vv1_.js","_app/immutable/chunks/CDyV6-Dx.js","_app/immutable/chunks/BP9ifZc-.js","_app/immutable/chunks/4lj9WCA3.js","_app/immutable/chunks/DzmNqlgH.js","_app/immutable/chunks/Dga7b2p1.js","_app/immutable/chunks/92YharXR.js","_app/immutable/chunks/BHQzBQfU.js","_app/immutable/chunks/Uakqo1Ve.js","_app/immutable/chunks/DcdIBE9g.js","_app/immutable/chunks/CSUW6ieN.js","_app/immutable/chunks/-9i346L8.js","_app/immutable/chunks/CJcHuEif.js","_app/immutable/chunks/BNc2r4vw.js","_app/immutable/chunks/Bs3lJvAj.js","_app/immutable/chunks/C0e1NB9p.js","_app/immutable/chunks/CkIiP2Id.js","_app/immutable/chunks/BWzq-gQm.js","_app/immutable/chunks/Bj5IXHnP.js"];
export const stylesheets = ["_app/immutable/assets/PayloadImage.D_Q6Blln.css","_app/immutable/assets/21.DJqxGCIz.css"];
export const fonts = [];
