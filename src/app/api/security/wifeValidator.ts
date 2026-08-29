/**
 * WIFE signature orchestrator (server-side).
 *
 * Supporting machines live beside this file (CSRF, token extract, HMAC, subject,
 * live status, HTTP responses). Canonical payload MUST stay aligned with:
 *   src/app/security/wifeRequestSigningShared.ts
 *   src/app/services/RequestSigningService.ts
 */
import {
  buildWifeTokenCanonicalPayload,
  canonicalWifePathAndQuery,
  normalizeWifeMethod,
  toBufferSource,
} from '@/app/security/wifeRequestSigningShared.ts';
import {
  detectStolenTokenServer,
  extractDeviceIdFromRequest,
  isValidWifeDeviceId,
  registerTokenSessionServer,
} from './stolenTokenServer.ts';
import { consumeNonceWithTtl } from './wifeNonceStore.ts';
import { consumeRateLimitSlot } from './wifeRateLimitStore.ts';
import { recordWifeRejection } from './wifeSecurityMonitor.ts';
import { isWifeProduction as isProductionNodeEnv } from './wifeStoreEnv.ts';
import { wifeTimingSafeEqual } from './wifeTimingSafe.ts';
import { verifyCsrfToken } from './wifeCsrfVerify.ts';
import { createHmacSignature, resetWifeHmacKeyCacheForTests } from './wifeHmacSign.ts';
import { getVerifiedTokenSubject, resetWifeTokenSubjectCacheForTests } from './wifeTokenSubject.ts';
import { resetWifeUserStatusCacheForTests } from './wifeUserStatus.ts';

export { verifyCsrfToken } from './wifeCsrfVerify.ts';
export { extractUserTokenFromRequest } from './wifeRequestToken.ts';
export { createWifeSignedHeaders } from './wifeHmacSign.ts';
export {
  wifeForbiddenResponse,
  wifeUnauthorizedResponse,
  wifeRateLimitedResponse,
  wifeSignatureFailedResponse,
  wifeAccountLockedResponse,
  wifeAccountFrozenResponse,
} from './wifeAuthResponses.ts';
export {
  getVerifiedTokenSubject,
  getVerifiedTokenIdentity,
  isTokenAuthorized,
  enforceTokenActorBinding,
} from './wifeTokenSubject.ts';

const HASH_ALGORITHM = 'SHA-256';
const MAX_TIMESTAMP_SKEW_MS = 2 * 60 * 1000;
const NONCE_TTL_MS = 2 * 60 * 1000;
const BASE64URL_SIGNATURE_RE = /^[A-Za-z0-9\-_]+$/;
const SHA256_HEX_RE = /^[a-f0-9]{64}$/;
const NONCE_RE = /^[A-Za-z0-9\-_]{8,128}$/;

export type WifeSignatureStatus = 'valid' | 'rate_limited' | 'invalid';

const WIFE_RATE_READ_MAX = 400;
const WIFE_RATE_WRITE_MAX = 250;

export function resetWifeValidatorCachesForTests(): void {
  resetWifeTokenSubjectCacheForTests();
  resetWifeUserStatusCacheForTests();
  resetWifeHmacKeyCacheForTests();
}

function parseTimestampMs(rawTimestamp: string): number | null {
  const parsed = Number(rawTimestamp);
  if (!Number.isFinite(parsed)) return null;
  return parsed < 1_000_000_000_000 ? parsed * 1000 : parsed;
}

function isMultipartContentType(contentType: string | null): boolean {
  return (contentType ?? '').toLowerCase().includes('multipart/form-data');
}

async function sha256HexFromBuffer(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest(HASH_ALGORITHM, toBufferSource(bytes));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function pickMultipartFile(formData: FormData): { arrayBuffer: () => Promise<ArrayBuffer> } | null {
  const values: unknown[] = [formData.get('file')];
  formData.forEach((value) => {
    values.push(value);
  });
  for (const value of values) {
    if (
      value &&
      typeof value === 'object' &&
      typeof (value as { arrayBuffer?: unknown }).arrayBuffer === 'function'
    ) {
      return value as { arrayBuffer: () => Promise<ArrayBuffer> };
    }
  }
  return null;
}

async function checkRateLimit(req: Request, userToken: string): Promise<boolean> {
  const method = normalizeWifeMethod(req.method);
  const isSafeRead = ['GET', 'HEAD', 'OPTIONS'].includes(method);
  return consumeRateLimitSlot(userToken, {
    scope: isSafeRead ? 'wife-read' : 'wife-write',
    maxRequests: isSafeRead ? WIFE_RATE_READ_MAX : WIFE_RATE_WRITE_MAX,
    windowMs: 60_000,
  });
}

export async function verifyWifeSignatureStatus(req: Request, userToken: string): Promise<WifeSignatureStatus> {
  const ok = await verifyWifeSignatureInternal(req, userToken);
  if (ok === true) return 'valid';
  if (ok === 'rate_limited') return 'rate_limited';
  return 'invalid';
}

export async function verifyWifeSignature(req: Request, userToken: string): Promise<boolean> {
  const result = await verifyWifeSignatureInternal(req, userToken);
  return result === true;
}

async function verifyWifeSignatureInternal(
  req: Request,
  userToken: string,
): Promise<true | false | 'rate_limited'> {
  try {
    if (!userToken || !userToken.trim()) return false;

    if (!(await checkRateLimit(req, userToken))) {
      recordWifeRejection({ reason: 'rate_limited', request: req });
      return 'rate_limited';
    }

    const verifiedSubject = await getVerifiedTokenSubject(userToken);
    if (!verifiedSubject) return false;

    const csrfValid = await verifyCsrfToken(req, userToken);
    if (!csrfValid) return false;

    const deviceId = extractDeviceIdFromRequest(req);
    const method = normalizeWifeMethod(req.method);
    if (method !== 'OPTIONS' && !isValidWifeDeviceId(deviceId)) {
      recordWifeRejection({ reason: 'device_id_missing', request: req });
      return false;
    }

    const incomingSignature = req.headers.get('x-wife-signature') ?? req.headers.get('X-WIFE-Signature');
    const incomingTimestamp = req.headers.get('x-wife-timestamp') ?? req.headers.get('X-WIFE-Timestamp');
    const incomingNonce = req.headers.get('x-wife-nonce') ?? req.headers.get('X-WIFE-Nonce');
    const incomingContentHash = req.headers.get('x-wife-content-hash') ?? req.headers.get('X-WIFE-Content-Hash');

    if (!incomingSignature || !incomingTimestamp || !incomingNonce) {
      return false;
    }
    const signature = incomingSignature.trim();
    const nonce = incomingNonce.trim();
    const timestamp = incomingTimestamp.trim();
    if (!signature || !BASE64URL_SIGNATURE_RE.test(signature) || signature.length > 1024) return false;
    if (!nonce || !NONCE_RE.test(nonce)) return false;
    if (!timestamp || !/^\d{10,16}$/.test(timestamp)) return false;

    const timestampMs = parseTimestampMs(timestamp);
    if (timestampMs === null) return false;

    const now = Date.now();
    if (now - timestampMs > MAX_TIMESTAMP_SKEW_MS) return false;
    if (timestampMs - now > MAX_TIMESTAMP_SKEW_MS) return false;

    const multipart = isMultipartContentType(req.headers.get('content-type') ?? req.headers.get('Content-Type'));
    let body = '';
    if (multipart) {
      if (!incomingContentHash || !incomingContentHash.trim()) return false;
      const normalizedHash = incomingContentHash.trim().toLowerCase();
      if (!SHA256_HEX_RE.test(normalizedHash)) return false;
      const formData = await req.clone().formData().catch(() => null);
      if (!formData) {
        if (isProductionNodeEnv()) return false;
      } else {
        const file = pickMultipartFile(formData);
        if (file) {
          const fileHash = await sha256HexFromBuffer(new Uint8Array(await file.arrayBuffer()));
          if (!wifeTimingSafeEqual(fileHash, normalizedHash)) return false;
        }
      }
      body = normalizedHash;
    } else {
      body = await req.clone().text();
    }
    const payload = buildWifeTokenCanonicalPayload(
      req.method,
      canonicalWifePathAndQuery(req.url),
      timestamp,
      nonce,
      body,
    );

    const expectedSignature = await createHmacSignature(payload, userToken);
    const isSignatureValid = wifeTimingSafeEqual(expectedSignature, signature);
    if (!isSignatureValid) return false;

    const stolenCheck = await detectStolenTokenServer(userToken, deviceId);
    if (stolenCheck.status === 'stolen' || stolenCheck.status === 'cloned') {
      recordWifeRejection({
        reason: stolenCheck.status === 'cloned' ? 'cloned_token' : 'stolen_token',
        request: req,
        detail: stolenCheck.reason,
      });
      return false;
    }

    const nonceAccepted = await consumeNonceWithTtl(nonce, NONCE_TTL_MS);
    if (!nonceAccepted) {
      return false;
    }

    await registerTokenSessionServer(userToken, deviceId);
    return true;
  } catch {
    return false;
  }
}
