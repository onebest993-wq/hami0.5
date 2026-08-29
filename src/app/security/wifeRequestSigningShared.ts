export function normalizeWifeMethod(method: string | undefined): string {
  return (method ?? 'GET').toUpperCase();
}

export function toBase64Url(data: Uint8Array): string {
  const binary = Array.from(data, (b) => String.fromCharCode(b)).join('');
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function toBufferSource(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

export async function sha256Bytes(input: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', toBufferSource(bytes));
  return new Uint8Array(digest);
}

/** حمولة التوقيع بمفتاح JWT — يجب أن تطابق wifeValidator */
export function buildWifeTokenCanonicalPayload(
  method: string,
  canonicalPathAndQuery: string,
  timestamp: string,
  nonce: string,
  body: string,
): string {
  return [normalizeWifeMethod(method), canonicalPathAndQuery, timestamp, nonce, body].join('\n');
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
