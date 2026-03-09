import { getContext, hasContext, setContext } from "svelte";
const EMBLA_CAROUSEL_CONTEXT = Symbol("EMBLA_CAROUSEL_CONTEXT");

/**
 * @template T
 * @param {T} config
 * @returns {T}
 */
export function setEmblaContext(config) {
	setContext(EMBLA_CAROUSEL_CONTEXT, config);
	return config;
}

/**
 * @template T
 * @param {string} [name]
 * @returns {T}
 */
export function getEmblaContext(name = "This component") {
	if (!hasContext(EMBLA_CAROUSEL_CONTEXT)) {
		throw new Error(`${name} must be used within a <Carousel.Root> component`);
	}
	return /** @type {T} */ (getContext(EMBLA_CAROUSEL_CONTEXT));
}
