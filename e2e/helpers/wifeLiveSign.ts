import { buildWifeTokenCanonicalPayload, canonicalWifePathAndQuery, toBase64Url } from '@/app/security/wifeRequestSigningShared';

/** توكن ضيف التطوير — الخادم يقبله خارج الإنتاج فقط (subject ≥ 8). */
export const WIFE_LIVE_GUEST_TOKEN = 'dev-access-token-guest-lawyer-1';
/** surrogate staging lawyer — UUID subject accepted in dev only */
export const WIFE_LIVE_LAWYER_UUID = '11111111-2222-4333-8444-555555555555';
export const WIFE_LIVE_UUID_TOKEN = `dev-access-token-${WIFE_LIVE_LAWYER_UUID}`;
export const WIFE_LIVE_DEVICE_ID = '0123456789abcdef0123456789abcdef';

export async function signWifeLivePayload(input: {
  method: string;
  url: string;
  timestamp: string;
  nonce: string;
  body: string;
  token?: string;
}): Promise<string> {
  const token = input.token ?? WIFE_LIVE_GUEST_TOKEN;
  const payload = buildWifeTokenCanonicalPayload(
    input.method,
    canonicalWifePathAndQuery(input.url),
    input.timestamp,
    input.nonce,
    input.body,
  );
  const keyMaterial = `${token}:wife-sign-v1`;
  const tokenHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(keyMaterial));
  const key = await crypto.subtle.importKey('raw', tokenHash, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

export async function wifeLiveAuthHeaders(input: {
  method: 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH';
  url: string;
  body?: string;
  token?: string;
  timestamp?: string;
  nonce?: string;
  csrf?: string;
}): Promise<Record<string, string>> {
  const timestamp = input.timestamp ?? String(Date.now());
  const nonce = input.nonce ?? `live_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
  const body = input.body ?? '';
  const signature = await signWifeLivePayload({
    method: input.method,
    url: input.url,
    timestamp,
    nonce,
    body,
    token: input.token,
  });
  const headers: Record<string, string> = {
    authorization: `Bearer ${input.token ?? WIFE_LIVE_GUEST_TOKEN}`,
    'x-wife-signature': signature,
    'x-wife-timestamp': timestamp,
    'x-wife-nonce': nonce,
    'x-wife-device-id': WIFE_LIVE_DEVICE_ID,
  };
  if (input.csrf) {
    headers['x-csrf-token'] = input.csrf;
    headers.cookie = `hami_csrf_token=${encodeURIComponent(input.csrf)}`;
  }
  if (input.method !== 'GET' && input.method !== 'HEAD') {
    headers['content-type'] = 'application/json';
  }
  return headers;
}
