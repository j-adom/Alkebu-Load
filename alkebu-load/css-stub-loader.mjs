import { pathToFileURL } from 'node:url';
import { resolve as pathResolve } from 'node:path';

const cssStubUrl = pathToFileURL(pathResolve('css-stub.mjs')).href;

export async function resolve(specifier, context, nextResolve) {
  if (specifier.endsWith('.css')) {
    return {
      url: cssStubUrl,
      shortCircuit: true,
    };
  }
  return nextResolve(specifier, context);
}
