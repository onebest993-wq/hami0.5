const HMAC_ALGORITHM = 'HMAC';
const HASH_ALGORITHM = 'SHA-256';

export function normalizeWifeMethod(method: string | undefined): string {
  return (method ?? 'GET').toUpperCase();
}

export function toBase64Url(data: Uint8Array): string {
  const binary = Array.from(data, (b) => String.fromCharCode(b)).join('');
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function toBufferSource(bytes: Uint8Array): ArrayBuffer {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export function buildWifeCanonicalPayload(
  method: string,
  canonicalPathAndQuery: string,
  timestamp: string,
  nonce: string,
  sessionId: string,
  body: string,
): string {
  return [normalizeWifeMethod(method), canonicalPathAndQuery, timestamp, nonce, sessionId, body].join('\n');
}

export function canonicalWifePathAndQuery(url: string): string {
  const base =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : 'http://localhost';
  const resolved = new URL(url, base);
  const normalizedEntries = Array.from(resolved.searchParams.entries()).sort(([ak, av], [bk, bv]) => {
    if (ak === bk) return av.localeCompare(bv);
    return ak.localeCompare(bk);
  });
  const query = new URLSearchParams(normalizedEntries).toString();
  return query ? `${resolved.pathname}?${query}` : resolved.pathname;
}

export function randomWifeNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

export async function signWifePayloadWithSecret(payload: string, sessionSecret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    toBufferSource(new TextEncoder().encode(sessionSecret)),
    { name: HMAC_ALGORITHM, hash: HASH_ALGORITHM },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign(
    HMAC_ALGORITHM,
    key,
    toBufferSource(new TextEncoder().encode(payload)),
  );
  return toBase64Url(new Uint8Array(signature));
}
