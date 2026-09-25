/**
 * Normalizes JavaScript values containing BigInt for JSON serialization.
 * Square SDK v43 returns priceMoney.amount as BigInt, which JSON.stringify
 * cannot handle. toJsonSafe transforms BigInt to a marker object; fromJsonSafe
 * reverses it losslessly.
 */

/**
 * Recursively replaces BigInt with { __bigint: string } so the object can be
 * stringified and stored in a json column. Handles Date and undefined gracefully.
 *
 * @param value Any JavaScript value, possibly containing BigInt
 * @returns A structure with all BigInts replaced, ready for JSON.stringify
 */
export function toJsonSafe(value: unknown): unknown {
  // Primitives (string, number, boolean, null)
  if (value === null || typeof value !== 'object') {
    // Handle special primitives
    if (typeof value === 'bigint') {
      return { __bigint: value.toString() };
    }
    if (typeof value === 'undefined') {
      return null; // undefined cannot be serialized in JSON
    }
    // Other primitives (string, number, boolean) and functions return as-is
    return value;
  }

  // Handle Date: convert to ISO string
  if (value instanceof Date) {
    return value.toISOString();
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map((item) => toJsonSafe(item));
  }

  // Handle objects
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    result[key] = toJsonSafe(val);
  }
  return result;
}

/**
 * Reverses toJsonSafe transformation: restores { __bigint: string } back to BigInt.
 * Only decodes when the object has exactly one key "__bigint" whose value is a
 * string matching /^-?\d+$/ (to avoid corrupting legitimate user data).
 *
 * @param value JSON-parsed object possibly containing { __bigint: string } markers
 * @returns Original structure with BigInts restored
 */
export function fromJsonSafe(value: unknown): unknown {
  // Primitives
  if (value === null || typeof value !== 'object') {
    return value;
  }

  // Check if this is a __bigint marker: exactly one key, and it's "__bigint"
  if (!Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj);

    if (keys.length === 1 && keys[0] === '__bigint') {
      const bigintStr = obj.__bigint;
      // Validate the string is a valid integer representation
      if (typeof bigintStr === 'string' && /^-?\d+$/.test(bigintStr)) {
        return BigInt(bigintStr);
      }
    }
  }

  // Handle arrays
  if (Array.isArray(value)) {
    return value.map((item) => fromJsonSafe(item));
  }

  // Handle objects (but not __bigint markers, already handled above)
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    result[key] = fromJsonSafe(val);
  }
  return result;
}
