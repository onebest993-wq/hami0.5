import { supabase } from '@/app/lib/supabase-client';
import {
  buildWifeTokenCanonicalPayload,
  canonicalWifePathAndQuery,
  randomWifeNonce,
  sha256Bytes,
  toBase64Url,
  toBufferSource,
} from '@/app/security/wifeRequestSigningShared';

type SigningHeaders = {
  'X-WIFE-Signature': string;
  'X-WIFE-Timestamp': string;
  'X-WIFE-Nonce': string;
  'X-WIFE-Content-Hash'?: string;
};

const HMAC_ALGORITHM = 'HMAC';
const HASH_ALGORITHM = 'SHA-256';

export class RequestSigningService {
  /**
   * Cache HMAC keys per token-hash to avoid re-importing keys on every request.
   */
  private static readonly keyCache = new Map<string, Promise<CryptoKey>>();

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
        ['sign'],
      );
    })();

    this.keyCache.set(keyCacheId, keyPromise);
    return keyPromise;
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
    const payload = buildWifeTokenCanonicalPayload(
      method,
      canonicalWifePathAndQuery(url),
      timestamp,
      nonce,
      body,
    );
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
    const nonce = randomWifeNonce();
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
}
