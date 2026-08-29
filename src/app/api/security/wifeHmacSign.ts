import {
  buildWifeTokenCanonicalPayload,
  canonicalWifePathAndQuery,
  randomWifeNonce,
  sha256Bytes,
  toBase64Url,
  toBufferSource,
} from '@/app/security/wifeRequestSigningShared.ts';

const HMAC_ALGORITHM = 'HMAC';
const HASH_ALGORITHM = 'SHA-256';
const HMAC_KEY_CACHE_TTL_MS = 60_000;
const HMAC_KEY_CACHE_MAX = 500;

const hmacKeyCache = new Map<string, { key: CryptoKey; expiresAt: number }>();

function pruneHmacKeyCache(nowMs: number): void {
  if (hmacKeyCache.size <= HMAC_KEY_CACHE_MAX) return;
  for (const [key, entry] of hmacKeyCache.entries()) {
    if (entry.expiresAt <= nowMs) hmacKeyCache.delete(key);
    if (hmacKeyCache.size <= HMAC_KEY_CACHE_MAX * 0.75) break;
  }
}

async function getOrCreateHmacKey(userToken: string): Promise<CryptoKey> {
  const combinedKeyMaterial = `${userToken}:wife-sign-v1`;
  const tokenHash = await sha256Bytes(combinedKeyMaterial);
  const cacheKey = toBase64Url(tokenHash);
  const nowMs = Date.now();
  pruneHmacKeyCache(nowMs);

  const cached = hmacKeyCache.get(cacheKey);
  if (cached && cached.expiresAt > nowMs) return cached.key;

  const key = await crypto.subtle.importKey(
    'raw',
    toBufferSource(tokenHash),
    { name: HMAC_ALGORITHM, hash: HASH_ALGORITHM },
    false,
    ['sign'],
  );
  hmacKeyCache.set(cacheKey, { key, expiresAt: nowMs + HMAC_KEY_CACHE_TTL_MS });
  return key;
}

export async function createHmacSignature(payload: string, userToken: string): Promise<string> {
  const key = await getOrCreateHmacKey(userToken);
  const payloadBytes = new TextEncoder().encode(payload);
  const signature = await crypto.subtle.sign(HMAC_ALGORITHM, key, toBufferSource(payloadBytes));
  return toBase64Url(new Uint8Array(signature));
}

/** Server-side WIFE header builder — used by /api/security/wife-sign (HttpOnly BFF). */
export async function createWifeSignedHeaders(
  method: string,
  url: string,
  body: string,
  userToken: string,
  contentHash?: string,
): Promise<Record<string, string>> {
  const timestamp = String(Date.now());
  const nonce = randomWifeNonce();
  const payload = buildWifeTokenCanonicalPayload(method, canonicalWifePathAndQuery(url), timestamp, nonce, body);
  const signature = await createHmacSignature(payload, userToken);
  const headers: Record<string, string> = {
    'X-WIFE-Signature': signature,
    'X-WIFE-Timestamp': timestamp,
    'X-WIFE-Nonce': nonce,
  };
  if (contentHash) {
    headers['X-WIFE-Content-Hash'] = contentHash;
  }
  return headers;
}

export function resetWifeHmacKeyCacheForTests(): void {
  hmacKeyCache.clear();
}
