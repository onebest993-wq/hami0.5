import { supabase } from '@/app/lib/supabase-client';

type SigningHeaders = {
  'X-WIFE-Signature': string;
  'X-WIFE-Timestamp': string;
  'X-WIFE-Nonce': string;
  'X-WIFE-Content-Hash'?: string;
};

const NONCE_EXPIRY_MS = 60 * 1000;
const HMAC_ALGORITHM = 'HMAC';
const HASH_ALGORITHM = 'SHA-256';

function normalizeMethod(method: string | undefined): string {
  return (method ?? 'GET').toUpperCase();
}

function toBase64Url(data: Uint8Array): string {
  const binary = Array.from(data, (b) => String.fromCharCode(b)).join('');
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = (4 - (base64.length % 4)) % 4;
  const padded = base64 + '='.repeat(pad);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/**
 * SHA-256 helper.
 * We derive fixed-length key material from user token with protocol context.
 * Note: browser-side secrets are not treated as trusted security boundaries.
 */
async function sha256Bytes(input: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest(HASH_ALGORITHM, toBufferSource(bytes));
  return new Uint8Array(digest);
}

function randomNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return toBase64Url(bytes);
}

function toBufferSource(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function canonicalPayload(
  method: string,
  canonicalPathAndQuery: string,
  timestamp: string,
  nonce: string,
  body: string,
): string {
  return [normalizeMethod(method), canonicalPathAndQuery, timestamp, nonce, body].join('\n');
}

/**
 * Canonical URL representation for WIFE payload.
 * Intentionally excludes origin/protocol and keeps only:
 *   /path?normalized=query
 */
function canonicalPathAndQuery(url: string): string {
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

export class RequestSigningService {
  /**
   * Cache HMAC keys per token-hash to avoid re-importing keys on every request.
   */
  private static readonly keyCache = new Map<string, Promise<CryptoKey>>();
  private static readonly seenNonces = new Map<string, number>();

  /**
   * Resolve the active auth token used for signing.
   * Token priority:
   * 1) Explicit token passed by caller
   * 2) Supabase current session access token (JWT)
   */
  private static async resolveUserToken(explicitToken?: string): Promise<string> {
    const token = explicitToken?.trim();
    if (token) return token;

    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token?.trim() ?? '';
    if (!accessToken) {
      throw new Error('WIFE signing requires an authenticated user token.');
    }
    return accessToken;
  }

  /**
   * Build (or reuse) CryptoKey for HMAC by hashing user token first.
   * Hashing the JWT provides fixed-size key material and avoids directly
   * using token string bytes as raw key input.
   */
  private static async getKey(explicitToken?: string): Promise<CryptoKey> {
    const userToken = await this.resolveUserToken(explicitToken);
    const combinedKeyMaterial = `${userToken}:wife-sign-v1`;
    const tokenHashBytes = await sha256Bytes(combinedKeyMaterial);
    const keyCacheId = toBase64Url(tokenHashBytes);

    const cached = this.keyCache.get(keyCacheId);
    if (cached) return cached;

    const keyPromise = (async () => {
      return await crypto.subtle.importKey(
        'raw',
        toBufferSource(tokenHashBytes),
        { name: HMAC_ALGORITHM, hash: HASH_ALGORITHM },
        false,
        ['sign', 'verify'],
      );
    })();

    this.keyCache.set(keyCacheId, keyPromise);
    return keyPromise;
  }

  private static pruneNonces(nowMs: number): void {
    for (const [nonce, createdAt] of this.seenNonces.entries()) {
      if (nowMs - createdAt > NONCE_EXPIRY_MS) {
        this.seenNonces.delete(nonce);
      }
    }
  }

  private static async signRaw(data: string, explicitToken?: string): Promise<string> {
    const key = await this.getKey(explicitToken);
    const input = new TextEncoder().encode(data);
    const sig = await crypto.subtle.sign(HMAC_ALGORITHM, key, toBufferSource(input));
    return toBase64Url(new Uint8Array(sig));
  }

  public static async signRequest(
    method: string,
    url: string,
    timestamp: string,
    nonce: string,
    body: string,
    explicitToken?: string,
  ): Promise<string> {
    const payload = canonicalPayload(method, canonicalPathAndQuery(url), timestamp, nonce, body);
    return await this.signRaw(payload, explicitToken);
  }

  public static async createSignedHeaders(
    method: string,
    url: string,
    body: string,
    explicitToken?: string,
    contentHash?: string,
  ): Promise<SigningHeaders> {
    const timestamp = String(Date.now());
    const nonce = randomNonce();
    const signature = await this.signRequest(method, url, timestamp, nonce, body, explicitToken);
    const headers: SigningHeaders = {
      'X-WIFE-Signature': signature,
      'X-WIFE-Timestamp': timestamp,
      'X-WIFE-Nonce': nonce,
    };
    if (contentHash) {
      headers['X-WIFE-Content-Hash'] = contentHash;
    }
    return headers;
  }

  public static async verifyRequestSignature(input: {
    method: string;
    url: string;
    body: string;
    signature: string;
    timestamp: string;
    nonce: string;
    explicitToken?: string;
  }): Promise<boolean> {
    const now = Date.now();
    this.pruneNonces(now);

    const ts = Number(input.timestamp);
    if (!Number.isFinite(ts)) return false;
    if (Math.abs(now - ts) > NONCE_EXPIRY_MS) return false;
    if (this.seenNonces.has(input.nonce)) return false;

    const key = await this.getKey(input.explicitToken);
    const expectedPayload = canonicalPayload(
      input.method,
      canonicalPathAndQuery(input.url),
      input.timestamp,
      input.nonce,
      input.body,
    );
    const payloadBytes = new TextEncoder().encode(expectedPayload);
    const signatureBytes = fromBase64Url(input.signature);
    const valid = await crypto.subtle.verify(
      HMAC_ALGORITHM,
      key,
      toBufferSource(signatureBytes),
      toBufferSource(payloadBytes),
    );
    if (valid) {
      this.seenNonces.set(input.nonce, ts);
    }
    return valid;
  }
}

