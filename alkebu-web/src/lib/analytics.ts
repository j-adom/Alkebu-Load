import { browser } from '$app/environment';

type RybbitValue = string | number;
type RybbitProperties = Record<string, RybbitValue | boolean | null | undefined>;

const cleanProperties = (properties: RybbitProperties = {}) => {
  const clean: Record<string, RybbitValue> = {};

  for (const [key, value] of Object.entries(properties)) {
    if (typeof value === 'string' && value.trim()) {
      clean[key] = value.slice(0, 255);
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      clean[key] = value;
    } else if (typeof value === 'boolean') {
      clean[key] = value ? 'true' : 'false';
    }
  }

  return clean;
};

export function trackEvent(name: string, properties?: RybbitProperties) {
  if (!browser || !name.trim()) return;

  window.rybbit?.event?.(name, cleanProperties(properties));
}
