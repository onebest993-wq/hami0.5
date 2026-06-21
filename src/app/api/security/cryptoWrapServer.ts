/**
 * Server-side derivation of in-memory crypto wrap credential for BFF auth.
 * لا يُرسل JWT — فقط مادة اشتقاق مرتبطة بالجلسة تُخزَّن في RAM على العميل.
 */
function toBase64Url(data: Uint8Array): string {
  const binary = Array.from(data, (b) => String.fromCharCode(b)).join('');
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

async function sha256Bytes(input: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return new Uint8Array(digest);
}

export async function deriveClientCryptoWrapCredential(accessToken: string): Promise<string> {
  const token = accessToken.trim();
  if (!token) return '';
  const hash = await sha256Bytes(`${token}:hami-crypto-wrap-v1`);
  return `bff:${toBase64Url(hash)}`;
}
