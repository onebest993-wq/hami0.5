/**
 * CSRF token helpers — safe for browser + server (no Node-only deps).
 */

function toBase64Url(data: Uint8Array): string {
  const binary = Array.from(data, (b) => String.fromCharCode(b)).join('');
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function createCsrfToken(userToken: string): Promise<string> {
  const salt = 'hami-csrf-v1';
  const keyMaterial = new TextEncoder().encode(`${salt}:${userToken}`);
  const digest = await crypto.subtle.digest('SHA-256', keyMaterial);
  return toBase64Url(new Uint8Array(digest));
}
