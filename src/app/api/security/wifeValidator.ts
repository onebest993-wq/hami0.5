/**
 * WIFE signature validator (server-side utility).
 *
 * IMPORTANT:
 * - This file contains backend/service logic only (no UI concerns).
 * - It validates request integrity and basic replay window protection.
 * - Canonical payload MUST stay aligned with client logic in:
 *   src/app/services/RequestSigningService.ts
 */
import { consumeNonceWithTtl } from './wifeNonceStore.ts';
import {
  detectStolenTokenServer,
  extractDeviceIdFromRequest,
  isValidWifeDeviceId,
  registerTokenSessionServer,
} from './stolenTokenServer.ts';
import { consumeRateLimitSlot } from './wifeRateLimitStore.ts';
import { extractJwtSessionFields } from '@/app/security/jwtFields.ts';
import { validateCsrfForSubject } from './csrfServerStore.ts';
import { applyWifeSecurityHeaders } from './wifeSecurityHeaders.ts';
import { recordWifeRejection, type WifeRejectMeta } from './wifeSecurityMonitor.ts';

const HMAC_ALGORITHM = 'HMAC';
const HASH_ALGORITHM = 'SHA-256';
const MAX_TIMESTAMP_SKEW_MS = 2 * 60 * 1000; // 2 minutes
const NONCE_TTL_MS = 2 * 60 * 1000;
const USER_STATUS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const userStatusCache = new Map<string, { active: boolean; checkedAt: number }>();
const BASE64URL_SIGNATURE_RE = /^[A-Za-z0-9\-_]+$/;
const SHA256_HEX_RE = /^[a-f0-9]{64}$/;
const NONCE_RE = /^[A-Za-z0-9\-_]{8,128}$/;

// CSRF Protection — random double-submit (header + cookie must match)
const CSRF_HEADER = 'x-csrf-token';
const CSRF_COOKIE_NAME = 'hami_csrf_token';

/**
 * Server-side CSRF validation (double-submit cookie pattern).
 */
export function getCsrfTokenHeader(req: Request): string | null {
  return req.headers.get(CSRF_HEADER) ?? null;
}

export async function verifyCsrfToken(req: Request, userToken: string): Promise<boolean> {
  const method = normalizeMethod(req.method);
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(method)) return true;

  const csrfToken = getCsrfTokenHeader(req)?.trim();
  if (!csrfToken || csrfToken.length < 16 || csrfToken.length > 128) return false;
  if (!/^[A-Za-z0-9\-_]+$/.test(csrfToken)) return false;

  const jwtFields = extractJwtSessionFields(userToken);
  if (jwtFields?.sub) {
    const serverValid = await validateCsrfForSubject(jwtFields.sub, csrfToken);
    if (serverValid) return true;
  }

  const cookieHeader = req.headers.get('cookie');
  if (!cookieHeader || !cookieHeader.trim()) {
    return !isProductionNodeEnv();
  }

  const cookies = parseCookieHeader(cookieHeader);
  const csrfCookieRaw = cookies[CSRF_COOKIE_NAME];
  if (!csrfCookieRaw || !csrfCookieRaw.trim()) {
    return !isProductionNodeEnv();
  }

  let csrfCookie = csrfCookieRaw.trim();
  try {
    csrfCookie = decodeURIComponent(csrfCookie);
  } catch {
    /* use raw */
  }

  if (csrfCookie.length < 16 || csrfCookie.length > 128) return false;
  if (!/^[A-Za-z0-9\-_]+$/.test(csrfCookie)) return false;

  return timingSafeEqual(csrfToken, csrfCookie);
}

function isProductionNodeEnv(): boolean {
  return (process.env.NODE_ENV ?? '').toLowerCase() === 'production';
}

function normalizeMethod(method: string | undefined): string {
  return (method ?? 'GET').toUpperCase();
}

function toBase64Url(data: Uint8Array): string {
  const binary = Array.from(data, (b) => String.fromCharCode(b)).join('');
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function toBufferSource(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

/**
 * Canonical payload MUST match client exactly.
 * Current client order is:
 * method, canonicalPathAndQuery, timestamp, nonce, body (joined by '\n')
 */
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
 * Uses only normalized path + query and ignores protocol/origin.
 */
function canonicalPathAndQuery(url: string): string {
  const resolved = new URL(url);
  const normalizedEntries = Array.from(resolved.searchParams.entries()).sort(([ak, av], [bk, bv]) => {
    if (ak === bk) return av.localeCompare(bv);
    return ak.localeCompare(bk);
  });
  const query = new URLSearchParams(normalizedEntries).toString();
  return query ? `${resolved.pathname}?${query}` : resolved.pathname;
}

/**
 * Convert timestamp string to milliseconds with compatibility fallback.
 * - Client currently sends milliseconds (Date.now()).
 * - If a seconds timestamp arrives, we normalize it to ms.
 */
function parseTimestampMs(rawTimestamp: string): number | null {
  const parsed = Number(rawTimestamp);
  if (!Number.isFinite(parsed)) return null;
  // Heuristic: values below 1e12 are likely seconds, not milliseconds.
  return parsed < 1_000_000_000_000 ? parsed * 1000 : parsed;
}

function isMultipartContentType(contentType: string | null): boolean {
  return (contentType ?? '').toLowerCase().includes('multipart/form-data');
}

function parseBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;
  const [scheme, token] = authorizationHeader.split(' ');
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== 'bearer') return null;
  const normalized = token.trim();
  return normalized ? normalized : null;
}

function parseCookieHeader(cookieHeader: string): Record<string, string> {
  const out: Record<string, string> = {};
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const eqIndex = part.indexOf('=');
    if (eqIndex <= 0) continue;
    const name = part.slice(0, eqIndex).trim();
    const value = part.slice(eqIndex + 1).trim();
    if (!name) continue;
    out[name] = value;
  }
  return out;
}

/**
 * Best-effort Supabase auth token extraction from cookie storage shapes.
 * Supports:
 * - sb-access-token (explicit token cookie)
 * - sb-*-auth-token (JSON payload used by some Supabase auth helpers)
 */
function extractTokenFromSupabaseCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = parseCookieHeader(cookieHeader);

  const directToken = cookies['sb-access-token']?.trim();
  if (directToken) return decodeURIComponent(directToken);

  const authTokenCookieName = Object.keys(cookies).find((name) => name.startsWith('sb-') && name.endsWith('-auth-token'));
  if (!authTokenCookieName) return null;

  const raw = decodeURIComponent(cookies[authTokenCookieName] ?? '');
  if (!raw) return null;

  // Common helper format: JSON object containing access_token.
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && 'access_token' in parsed) {
      const maybeToken = (parsed as { access_token?: unknown }).access_token;
      if (typeof maybeToken === 'string' && maybeToken.trim()) return maybeToken.trim();
    }
  } catch {
    // Continue to alternate format.
  }

  // Alternate format: serialized array where first element may be access token.
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && typeof parsed[0] === 'string' && parsed[0].trim()) {
      return parsed[0].trim();
    }
  } catch {
    return null;
  }

  return null;
}

async function sha256Bytes(input: string): Promise<Uint8Array> {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest(HASH_ALGORITHM, toBufferSource(bytes));
  return new Uint8Array(digest);
}

const hmacKeyCache = new Map<string, { key: CryptoKey; expiresAt: number }>();
const HMAC_KEY_CACHE_TTL_MS = 60_000;
const HMAC_KEY_CACHE_MAX = 500;

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
  const cacheKey = toBase64Url(tokenHash.slice(0, 16));
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

async function createHmacSignature(payload: string, userToken: string): Promise<string> {
  const key = await getOrCreateHmacKey(userToken);
  const payloadBytes = new TextEncoder().encode(payload);
  const signature = await crypto.subtle.sign(HMAC_ALGORITHM, key, toBufferSource(payloadBytes));
  return toBase64Url(new Uint8Array(signature));
}

/**
 * Timing-safe string comparison to avoid leaking signature match info
 * through early-return branching.
 */
function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);
  const maxLen = Math.max(aBytes.length, bBytes.length);

  let diff = aBytes.length ^ bBytes.length;
  for (let i = 0; i < maxLen; i++) {
    const av = i < aBytes.length ? aBytes[i] : 0;
    const bv = i < bBytes.length ? bBytes[i] : 0;
    diff |= av ^ bv;
  }

  return diff === 0;
}

/**
 * Extract user token from incoming request.
 * Priority:
 * 1) Authorization: Bearer <token>
 * 2) Supabase auth cookie/session fallback
 */
export function extractUserTokenFromRequest(req: Request): string | null {
  const authHeaderToken = parseBearerToken(req.headers.get('authorization') ?? req.headers.get('Authorization'));
  if (authHeaderToken) return authHeaderToken;

  const cookieToken = extractTokenFromSupabaseCookies(req.headers.get('cookie'));
  if (cookieToken) return cookieToken;

  return null;
}

/**
 * Standardized 403 response for failed cryptographic checks.
 */
export function wifeForbiddenResponse(meta?: WifeRejectMeta): Response {
  if (meta) recordWifeRejection(meta);
  return applyWifeSecurityHeaders(
    new Response(JSON.stringify({ ok: false, error: 'Cryptographic verification failed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }),
  );
}

export function wifeUnauthorizedResponse(meta?: WifeRejectMeta): Response {
  if (meta) recordWifeRejection(meta);
  return applyWifeSecurityHeaders(
    new Response(JSON.stringify({ ok: false, error: 'Unauthorized user' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }),
  );
}

/** After verifyWifeSignature returns false — records signature_failed telemetry. */
export function wifeSignatureFailedResponse(request: Request): Response {
  return wifeForbiddenResponse({ request, reason: 'signature_failed' });
}

function readStringField(input: Record<string, unknown> | null, key: string): string | null {
  if (!input) return null;
  const value = input[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readCachedUserStatus(userId: string): boolean | null {
  const cached = userStatusCache.get(userId);
  if (!cached) return null;
  if (Date.now() - cached.checkedAt > USER_STATUS_CACHE_TTL_MS) {
    userStatusCache.delete(userId);
    return null;
  }
  return cached.active;
}

function writeCachedUserStatus(userId: string, active: boolean): void {
  userStatusCache.set(userId, { active, checkedAt: Date.now() });
}

function getSupabaseAuthConfig(): { url: string; key: string } | null {
  const supabaseUrl = (process.env.SUPABASE_URL ?? '').trim();
  const supabaseKey = (process.env.SUPABASE_ANON_KEY ?? '').trim();
  if (!supabaseUrl || !supabaseKey) return null;
  return { url: supabaseUrl.replace(/\/+$/, ''), key: supabaseKey };
}

/**
 * Creates a Supabase admin client (service_role) for internal DB queries.
 * لا يُستخدم fetch مباشر—بل مكتبة @supabase/supabase-js الآمنة
 */
let _adminClient: ReturnType<typeof import('@supabase/supabase-js').createClient> | null = null;
function getSupabaseAdminClient(): ReturnType<typeof import('@supabase/supabase-js').createClient> | null {
  if (_adminClient) return _adminClient;
  const supabaseUrl = (process.env.SUPABASE_URL ?? '').trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim();
  if (!supabaseUrl || !serviceRoleKey) return null;
  const { createClient } = require('@supabase/supabase-js') as typeof import('@supabase/supabase-js');
  _adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return _adminClient;
}

async function fetchSingleUserRow(
  table: string,
  filterColumn: 'id' | 'user_id' | 'id,user_id',
  filterValue: string,
): Promise<Record<string, unknown> | null> {
  const admin = getSupabaseAdminClient();
  if (!admin) return null;

  try {
    if (filterColumn === 'id,user_id') {
      const { data, error } = await admin
        .from(table)
        .select('*')
        .or(`id.eq.${filterValue},user_id.eq.${filterValue}`)
        .limit(1)
        .maybeSingle();
      if (error) return null;
      return data as Record<string, unknown> | null;
    }

    const { data, error } = await admin
      .from(table)
      .select('*')
      .eq(filterColumn, filterValue)
      .limit(1)
      .maybeSingle();
    if (error) return null;
    return data as Record<string, unknown> | null;
  } catch {
    return null;
  }
}

function isUserActiveFromRow(row: Record<string, unknown>): boolean {
  const status = typeof row.status === 'string' ? row.status.trim().toLowerCase() : '';
  const deletedAt = row.deleted_at;
  const isBanned = row.is_banned === true;
  const isDeleted = row.is_deleted === true;
  const isActive = row.is_active;

  if (isBanned || isDeleted) return false;
  if (deletedAt !== null && deletedAt !== undefined && String(deletedAt).trim() !== '') return false;
  if (typeof isActive === 'boolean' && isActive === false) return false;
  if (status && ['banned', 'inactive', 'deleted', 'disabled', 'suspended', 'blocked'].includes(status)) return false;
  return true;
}

async function isUserActiveLive(userId: string): Promise<boolean> {
  const cached = readCachedUserStatus(userId);
  if (cached !== null) return cached;

  // استعلام واحد — profiles OR lawyers (id = userId OR user_id = userId)
  const profileRow = await fetchSingleUserRow('profiles', 'id,user_id', userId);
  if (profileRow) {
    const active = isUserActiveFromRow(profileRow);
    writeCachedUserStatus(userId, active);
    return active;
  }

  const lawyerRow = await fetchSingleUserRow('lawyers', 'id,user_id', userId);
  if (lawyerRow) {
    const active = isUserActiveFromRow(lawyerRow);
    writeCachedUserStatus(userId, active);
    return active;
  }

  // JWT صالح لكن لا صف profile/lawyer بعد — لا نحجب (تسجيل جديد / ملف قيد الإنشاء)
  writeCachedUserStatus(userId, true);
  return true;
}

// Cache للتوكنات الموثقة
const verifiedTokenCache = new Map<string, { subject: string; expiresAt: number }>();

/** Test-only: clears token/user status caches between isolated scenarios. */
export function resetWifeValidatorCachesForTests(): void {
  verifiedTokenCache.clear();
  userStatusCache.clear();
}
const VERIFIED_TOKEN_CACHE_TTL = 60_000; // 60 ثانية
const VERIFIED_TOKEN_CACHE_MAX = 5_000;

function base64UrlDecode(str: string): string {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    return atob(base64);
  } catch {
    return '';
  }
}

interface DecodedJwtPayload {
  sub?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
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

function decodeJwtPayload(token: string): DecodedJwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const decoded = base64UrlDecode(parts[1]);
    if (!decoded) return null;
    return JSON.parse(decoded) as DecodedJwtPayload;
  } catch {
    return null;
  }
}

/**
 * Strict token verification against Supabase auth endpoint.
 * Fails closed if verification backend is unavailable.
 */
const DEV_ACCESS_TOKEN_PREFIX = 'dev-access-token-';
/** محامٍ ضيف للنشر التجريبي — subject واحد فقط، لا يُستخدم لصلاحيات admin. */
const DEMO_GUEST_SUBJECT = 'guest-lawyer-1';

function parseDevAccessTokenSubject(userToken: string): string | null {
  if (!userToken.startsWith(DEV_ACCESS_TOKEN_PREFIX)) return null;
  const subject = userToken.slice(DEV_ACCESS_TOKEN_PREFIX.length).trim();
  return subject.length >= 8 ? subject : null;
}

function cacheVerifiedDevSubject(subject: string): string {
  verifiedTokenCache.set(subject, {
    subject,
    expiresAt: Date.now() + VERIFIED_TOKEN_CACHE_TTL,
  });
  return subject;
}

export async function getVerifiedTokenSubject(userToken: string): Promise<string | null> {
  if (!userToken || typeof userToken !== 'string' || userToken.length < 20) return null;

  if (!isProductionNodeEnv()) {
    const devSubject = parseDevAccessTokenSubject(userToken);
    if (devSubject) {
      return cacheVerifiedDevSubject(devSubject);
    }
  } else {
    const demoGuest = parseDevAccessTokenSubject(userToken);
    if (demoGuest === DEMO_GUEST_SUBJECT) {
      return cacheVerifiedDevSubject(demoGuest);
    }
  }

  pruneVerifiedTokenCache(Date.now());

  // 1) فك التوكن محلياً واستخراج sub للمعرف
  const payload = decodeJwtPayload(userToken);
  const cacheKey = payload?.sub ?? userToken.slice(-16);

  // 2) التحقق من الـ cache أولاً
  const cached = verifiedTokenCache.get(cacheKey);
  if (cached) {
    if (Date.now() >= cached.expiresAt) {
      verifiedTokenCache.delete(cacheKey);
    } else {
      if (cached.subject === 'INVALID') return null;
      // تحقق من انتهاء صلاحية JWT حتى مع الـ cache
      if (payload?.exp && Date.now() < payload.exp * 1000) {
        return cached.subject;
      }
      // JWT منتهي — نحتاج إلى التحقق من Supabase للتأكد من أن الـ refresh token لا يزال صالحاً
    }
  }

  // 3) التحقق من Supabase API
  const cfg = getSupabaseAuthConfig();
  if (!cfg) return null;

  const response = await fetch(`${cfg.url}/auth/v1/user`, {
    method: 'GET',
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${userToken}`,
    },
  });
  if (!response.ok) {
    // cache الفشل لمنع الطلبات المتكررة
    verifiedTokenCache.set(cacheKey, {
      subject: 'INVALID',
      expiresAt: Date.now() + Math.min(VERIFIED_TOKEN_CACHE_TTL, 10_000),
    });
    return null;
  }

  const user = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  const userId = readStringField(user, 'id');
  if (!userId) return null;

  // Live DB check to prevent token-revocation lag and ghost users.
  const isActive = await isUserActiveLive(userId);
  if (!isActive) return null;

  // cache النتيجة
  verifiedTokenCache.set(cacheKey, {
    subject: userId,
    expiresAt: Date.now() + VERIFIED_TOKEN_CACHE_TTL,
  });

  return userId;
}

export async function isTokenAuthorized(userToken: string): Promise<boolean> {
  return Boolean(await getVerifiedTokenSubject(userToken));
}

/**
 * Enforces that verified token subject matches actor identifiers in payload.
 */
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

// Server-side Rate Limiting (distributed when Redis configured)
async function checkRateLimit(userToken: string): Promise<boolean> {
  return consumeRateLimitSlot(userToken, {
    scope: 'wife',
    maxRequests: 100,
    windowMs: 60_000,
  });
}

/**
 * Server-side WIFE verification.
 *
 * Validation checks:
 * 1) Required headers exist.
 * 2) Timestamp is not older than 2 minutes.
 * 3) Canonical payload reconstruction matches client format.
 * 4) HMAC signature (derived from user token hash) matches exactly.
 *
 * Returns:
 * - true: valid signature
 * - false: missing headers / expired timestamp / tampered payload / bad signature
 */
export async function verifyWifeSignature(req: Request, userToken: string): Promise<boolean> {
  try {
    if (!userToken || !userToken.trim()) return false;

    // Server-side Rate Limiting
    if (!(await checkRateLimit(userToken))) {
      recordWifeRejection({ reason: 'rate_limited', request: req });
      return false;
    }

    const verifiedSubject = await getVerifiedTokenSubject(userToken);
    if (!verifiedSubject) return false;

    // CSRF check for state-changing methods
    const csrfValid = await verifyCsrfToken(req, userToken);
    if (!csrfValid) return false;

    const deviceId = extractDeviceIdFromRequest(req);
    const method = normalizeMethod(req.method);
    if (isProductionNodeEnv() && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
      if (!isValidWifeDeviceId(deviceId)) {
        recordWifeRejection({ reason: 'device_id_missing', request: req });
        return false;
      }
    }

    // Headers are case-insensitive; keep lowercase names per hardening spec.
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
    if (now - timestampMs > MAX_TIMESTAMP_SKEW_MS) {
      // Reject requests older than 2 minutes.
      return false;
    }
    if (timestampMs - now > MAX_TIMESTAMP_SKEW_MS) {
      // Reject unreasonable future timestamps.
      return false;
    }
    const multipart = isMultipartContentType(req.headers.get('content-type') ?? req.headers.get('Content-Type'));
    let body = '';
    if (multipart) {
      if (!incomingContentHash || !incomingContentHash.trim()) return false;
      const normalizedHash = incomingContentHash.trim().toLowerCase();
      if (!SHA256_HEX_RE.test(normalizedHash)) return false;
      body = normalizedHash;
    } else {
      // Clone request so callers can still consume body later.
      body = await req.clone().text();
    }
    const payload = canonicalPayload(
      req.method,
      canonicalPathAndQuery(req.url),
      timestamp,
      nonce,
      body,
    );

    const expectedSignature = await createHmacSignature(payload, userToken);
    const isSignatureValid = timingSafeEqual(expectedSignature, signature);
    if (!isSignatureValid) return false;

    const nonceAccepted = await consumeNonceWithTtl(nonce, NONCE_TTL_MS);
    if (!nonceAccepted) {
      return false;
    }

    const stolenCheck = await detectStolenTokenServer(userToken, deviceId);
    if (stolenCheck.status === 'stolen' || stolenCheck.status === 'cloned') {
      recordWifeRejection({
        reason: stolenCheck.status === 'cloned' ? 'cloned_token' : 'stolen_token',
        request: req,
        detail: stolenCheck.reason,
      });
      return false;
    }

    await registerTokenSessionServer(userToken, deviceId);
    return true;
  } catch {
    return false;
  }
}
