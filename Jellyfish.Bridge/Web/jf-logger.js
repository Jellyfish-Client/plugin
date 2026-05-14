import { LOG_PREFIX } from './jf-constants.js';

export const debug = () => !!window.JELLYFISH_BRIDGE_DEBUG;
export const log = (...a) => console.log(LOG_PREFIX, ...a);
export const warn = (...a) => console.warn(LOG_PREFIX, ...a);
export const dbg = (...a) => { if (debug()) console.log(LOG_PREFIX, ...a); };
