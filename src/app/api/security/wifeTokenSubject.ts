import { decodeJwtPayloadBase64 } from '@/app/security/jwtFields.ts';
import { sha256Bytes, toBase64Url } from '@/app/security/wifeRequestSigningShared.ts';
import { getSupabaseAuthConfigFromEnv } from './sessionCookie.ts';
import { isUserActiveLive } from './wifeUserStatus.ts';
import { isWifeProduction as isProductionNodeEnv } from './wifeStoreEnv.ts';

const verifiedTokenCache = new Map<string, { subject: string; expiresAt: number }>();
const VERIFIED_TOKEN_CACHE_TTL = 60_000;
const VERIFIED_TOKEN_CACHE_MAX = 5_000;
const DEV_ACCESS_TOKEN_PREFIX = 'dev-access-token-';
/** ضيف العرض — لا يُقبل في الإنتاج إلا براية صريحة (منتدى / تنفيذ / WIFE). */
const DEMO_GUEST_SUBJECT = 'guest-lawyer-1';

function readStringField(input: Record<string, unknown> | null, key: string): string | null {
  if (!input) return null;
  const value = input[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function pruneVerifiedTokenCache(nowMs: number): void {
  if (verifiedTokenCache.size <= VERIFIED_TOKEN_CACHE_MAX) return;
  for (const [key, value] of verifiedTokenCache.entries()) {
    if (value.expiresAt <= nowMs || value.subject === 'INVALID') {
      verifiedTokenCache.delete(key);
    }
    if (verifiedTokenCache.size <= VERIFIED_TOKEN_CACHE_MAX * 0.75) break;
  }
}

function parseDevAccessTokenSubject(userToken: string): string | null {
  if (!userToken.startsWith(DEV_ACCESS_TOKEN_PREFIX)) return null;
  const subject = userToken.slice(DEV_ACCESS_TOKEN_PREFIX.length).trim();
  return subject.length >= 8 ? subject : null;
}

function cacheVerifiedDevSubject(fingerprint: string, subject: string): string {
  verifiedTokenCache.set(fingerprint, {
    subject,
    expiresAt: Date.now() + VERIFIED_TOKEN_CACHE_TTL,
  });
  return subject;
}

function isProductionDemoGuestAllowed(subject: string): boolean {
  if (subject !== DEMO_GUEST_SUBJECT) return false;
  return (
    (process.env.WIFE_ALLOW_DEV_ACCESS_TOKEN ?? '').trim() === '1' ||
    (process.env.FORUM_ALLOW_DEMO_GUEST_READ ?? '').trim() === '1' ||
    (process.env.EXECUTION_ALLOW_DEMO_GUEST ?? '').trim() === '1'
  );
}

async function tokenFingerprint(userToken: string): Promise<string> {
  return toBase64Url(await sha256Bytes(userToken));
}

/**
 * هوية توكن GoTrue دون فحص القفل/الحذف.
 * القفل يُرفض برسالة صريحة في requireWifeUser/login لا كـ 401 عام.
 */
export async function getVerifiedTokenIdentity(userToken: string): Promise<string | null> {
    if (!userToken || typeof userToken !== 'string' || userToken.length < 20) return null;

    const fingerprint = await tokenFingerprint(userToken);

    const devSubject = parseDevAccessTokenSubject(userToken);
    if (devSubject) {
        if (!isProductionNodeEnv()) {
            return cacheVerifiedDevSubject(fingerprint, devSubject);
        }
        if (isProductionDemoGuestAllowed(devSubject)) {
            return cacheVerifiedDevSubject(fingerprint, devSubject);
        }
        return null;
    }

    pruneVerifiedTokenCache(Date.now());

    const cached = verifiedTokenCache.get(fingerprint);
    if (cached) {
        if (Date.now() >= cached.expiresAt) {
            verifiedTokenCache.delete(fingerprint);
        } else if (cached.subject === 'INVALID') {
            return null;
        } else {
            const payload = decodeJwtPayloadBase64(userToken);
            if (payload?.exp && Date.now() >= Number(payload.exp) * 1000) {
                verifiedTokenCache.delete(fingerprint);
            } else {
                return cached.subject;
            }
        }
    }

    const cfg = getSupabaseAuthConfigFromEnv();
    if (!cfg) return null;

    const response = await fetch(`${cfg.url}/auth/v1/user`, {
        method: 'GET',
        headers: {
            apikey: cfg.key,
            Authorization: `Bearer ${userToken}`,
        },
    });
    if (!response.ok) {
        verifiedTokenCache.set(fingerprint, {
            subject: 'INVALID',
            expiresAt: Date.now() + Math.min(VERIFIED_TOKEN_CACHE_TTL, 10_000),
        });
        return null;
    }

    const user = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    const userId = readStringField(user, 'id');
    if (!userId) return null;

    verifiedTokenCache.set(fingerprint, {
        subject: userId,
        expiresAt: Date.now() + VERIFIED_TOKEN_CACHE_TTL,
    });

    return userId;
}

/**
 * Strict token verification against Supabase auth endpoint.
 * Fails closed if verification backend is unavailable.
 * Locked/deleted accounts return null — callers that need a lock message use identity + restriction.
 */
export async function getVerifiedTokenSubject(userToken: string): Promise<string | null> {
    const userId = await getVerifiedTokenIdentity(userToken);
    if (!userId) return null;
    if (userToken.startsWith(DEV_ACCESS_TOKEN_PREFIX)) return userId;
    if (!(await isUserActiveLive(userId))) return null;
    return userId;
}

export async function isTokenAuthorized(userToken: string): Promise<boolean> {
  return Boolean(await getVerifiedTokenSubject(userToken));
}

/** Enforces that verified token subject matches actor identifiers in payload. */
export async function enforceTokenActorBinding(userToken: string, payload: unknown): Promise<boolean> {
  const subject = await getVerifiedTokenSubject(userToken);
  if (!subject) return false;
  if (!payload || typeof payload !== 'object') return false;

  const body = payload as Record<string, unknown>;
  const lawyerId = typeof body.lawyer_id === 'string' ? body.lawyer_id.trim() : '';
  const clientId = typeof body.client_id === 'string' ? body.client_id.trim() : '';

  if (!lawyerId && !clientId) return false;
  if (lawyerId && subject !== lawyerId) return false;
  if (clientId && subject !== clientId) return false;
  return true;
}

export function resetWifeTokenSubjectCacheForTests(): void {
  verifiedTokenCache.clear();
}
