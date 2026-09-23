type QueryValue = string | number | boolean | null | undefined;

/**
 * Builds "?a=1&b=x" from an object: drops undefined, null and "" values and
 * sorts keys so equal queries give equal strings. Returns "" when empty.
 */
export function toQueryString(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  for (const key of Object.keys(params).sort()) {
    const value = params[key];
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : "";
}
