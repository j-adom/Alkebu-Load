import * as server from '../entries/pages/_page.server.ts.js';

export const index = 2;
let component_cache;
export const component = async () => component_cache ??= (await import('../entries/pages/_page.svelte.js')).default;
export { server };
export const server_id = "src/routes/+page.server.ts";
export const imports = ["_app/immutable/nodes/2.BqLuWUWd.js","_app/immutable/chunks/CWj6FrbW.js","_app/immutable/chunks/Bmew28_A.js","_app/immutable/chunks/9p2O56ug.js","_app/immutable/chunks/mNN9vv1_.js","_app/immutable/chunks/CDyV6-Dx.js","_app/immutable/chunks/4lj9WCA3.js","_app/immutable/chunks/BP9ifZc-.js","_app/immutable/chunks/Uakqo1Ve.js","_app/immutable/chunks/Cd_Yc72e.js","_app/immutable/chunks/BHQzBQfU.js","_app/immutable/chunks/Bj5IXHnP.js","_app/immutable/chunks/CSUW6ieN.js","_app/immutable/chunks/Dga7b2p1.js","_app/immutable/chunks/-9i346L8.js","_app/immutable/chunks/CJcHuEif.js","_app/immutable/chunks/BNc2r4vw.js","_app/immutable/chunks/Bs3lJvAj.js","_app/immutable/chunks/C0e1NB9p.js","_app/immutable/chunks/BWzq-gQm.js","_app/immutable/chunks/DzmNqlgH.js","_app/immutable/chunks/D2a5VD-4.js"];
export const stylesheets = ["_app/immutable/assets/2.BYOxcyRq.css"];
export const fonts = [];
