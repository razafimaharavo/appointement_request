/** Next can normalize nextUrl's hostname to the bind address (0.0.0.0).
 * Compare against the actual HTTP Host, while still requiring the same scheme.
 */
export function isSameOrigin(
  origin: string | null,
  host: string | null,
  requestUrl: string,
) {
  if (!origin) return true;
  try {
    const source = new URL(origin);
    const target = new URL(requestUrl);
    return (
      source.origin === origin &&
      source.protocol === target.protocol &&
      source.host === (host || target.host)
    );
  } catch {
    return false;
  }
}
