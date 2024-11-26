/**
 * Converts an IPv6 localhost address to a more commonly used format.
 * @param url The original URL to transform.
 * @returns The transformed URL.
 */
export function formatUrl(url: string): string {
  return url.replace('[::1]', 'localhost').replace('0.0.0.0', '127.0.0.1');
}