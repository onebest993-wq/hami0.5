import { readSupabasePrivilegedKey, supabasePrivilegedKeyEnvName } from './supabasePrivilegedEnv.js';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
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
import { detectStolenTokenServer, extractDeviceIdFromRequest, isValidWifeDeviceId, registerTokenSessionServer, } from './stolenTokenServer.ts';
import { consumeRateLimitSlot } from './wifeRateLimitStore.ts';
import { extractJwtSessionFields } from '@/app/security/jwtFields.ts';
import { validateCsrfForSubject } from './csrfServerStore.ts';
import { applyWifeSecurityHeaders } from './wifeSecurityHeaders.ts';
import { recordWifeRejection } from './wifeSecurityMonitor.ts';
var HMAC_ALGORITHM = 'HMAC';
var HASH_ALGORITHM = 'SHA-256';
var MAX_TIMESTAMP_SKEW_MS = 2 * 60 * 1000; // 2 minutes
var NONCE_TTL_MS = 2 * 60 * 1000;
var USER_STATUS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
var userStatusCache = new Map();
var BASE64URL_SIGNATURE_RE = /^[A-Za-z0-9\-_]+$/;
var SHA256_HEX_RE = /^[a-f0-9]{64}$/;
var NONCE_RE = /^[A-Za-z0-9\-_]{8,128}$/;
// CSRF Protection — random double-submit (header + cookie must match)
var CSRF_HEADER = 'x-csrf-token';
var CSRF_COOKIE_NAME = 'hami_csrf_token';
/**
 * Server-side CSRF validation (double-submit cookie pattern).
 */
export function getCsrfTokenHeader(req) {
    var _a;
    return (_a = req.headers.get(CSRF_HEADER)) !== null && _a !== void 0 ? _a : null;
}
export function verifyCsrfToken(req, userToken) {
    return __awaiter(this, void 0, void 0, function () {
        var method, safeMethods, csrfToken, jwtFields, serverValid, cookieHeader, cookies, csrfCookieRaw, csrfCookie;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    method = normalizeMethod(req.method);
                    safeMethods = ['GET', 'HEAD', 'OPTIONS'];
                    if (safeMethods.includes(method))
                        return [2 /*return*/, true];
                    csrfToken = (_a = getCsrfTokenHeader(req)) === null || _a === void 0 ? void 0 : _a.trim();
                    if (!csrfToken || csrfToken.length < 16 || csrfToken.length > 128)
                        return [2 /*return*/, false];
                    if (!/^[A-Za-z0-9\-_]+$/.test(csrfToken))
                        return [2 /*return*/, false];
                    jwtFields = extractJwtSessionFields(userToken);
                    if (!(jwtFields === null || jwtFields === void 0 ? void 0 : jwtFields.sub)) return [3 /*break*/, 2];
                    return [4 /*yield*/, validateCsrfForSubject(jwtFields.sub, csrfToken)];
                case 1:
                    serverValid = _b.sent();
                    if (serverValid)
                        return [2 /*return*/, true];
                    _b.label = 2;
                case 2:
                    cookieHeader = req.headers.get('cookie');
                    if (!cookieHeader || !cookieHeader.trim()) {
                        return [2 /*return*/, !isProductionNodeEnv()];
                    }
                    cookies = parseCookieHeader(cookieHeader);
                    csrfCookieRaw = cookies[CSRF_COOKIE_NAME];
                    if (!csrfCookieRaw || !csrfCookieRaw.trim()) {
                        return [2 /*return*/, !isProductionNodeEnv()];
                    }
                    csrfCookie = csrfCookieRaw.trim();
                    try {
                        csrfCookie = decodeURIComponent(csrfCookie);
                    }
                    catch (_c) {
                        /* use raw */
                    }
                    if (csrfCookie.length < 16 || csrfCookie.length > 128)
                        return [2 /*return*/, false];
                    if (!/^[A-Za-z0-9\-_]+$/.test(csrfCookie))
                        return [2 /*return*/, false];
                    return [2 /*return*/, timingSafeEqual(csrfToken, csrfCookie)];
            }
        });
    });
}
function isProductionNodeEnv() {
    var _a;
    return ((_a = process.env.NODE_ENV) !== null && _a !== void 0 ? _a : '').toLowerCase() === 'production';
}
function normalizeMethod(method) {
    return (method !== null && method !== void 0 ? method : 'GET').toUpperCase();
}
function toBase64Url(data) {
    var binary = Array.from(data, function (b) { return String.fromCharCode(b); }).join('');
    var base64 = btoa(binary);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
function toBufferSource(bytes) {
    var buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    return buffer;
}
/**
 * Canonical payload MUST match client exactly.
 * Current client order is:
 * method, canonicalPathAndQuery, timestamp, nonce, body (joined by '\n')
 */
function canonicalPayload(method, canonicalPathAndQuery, timestamp, nonce, body) {
    return [normalizeMethod(method), canonicalPathAndQuery, timestamp, nonce, body].join('\n');
}
/**
 * Canonical URL representation for WIFE payload.
 * Uses only normalized path + query and ignores protocol/origin.
 */
function canonicalPathAndQuery(url) {
    var resolved = new URL(url);
    var normalizedEntries = Array.from(resolved.searchParams.entries()).sort(function (_a, _b) {
        var ak = _a[0], av = _a[1];
        var bk = _b[0], bv = _b[1];
        if (ak === bk)
            return av.localeCompare(bv);
        return ak.localeCompare(bk);
    });
    var query = new URLSearchParams(normalizedEntries).toString();
    return query ? "".concat(resolved.pathname, "?").concat(query) : resolved.pathname;
}
/**
 * Convert timestamp string to milliseconds with compatibility fallback.
 * - Client currently sends milliseconds (Date.now()).
 * - If a seconds timestamp arrives, we normalize it to ms.
 */
function parseTimestampMs(rawTimestamp) {
    var parsed = Number(rawTimestamp);
    if (!Number.isFinite(parsed))
        return null;
    // Heuristic: values below 1e12 are likely seconds, not milliseconds.
    return parsed < 1000000000000 ? parsed * 1000 : parsed;
}
function isMultipartContentType(contentType) {
    return (contentType !== null && contentType !== void 0 ? contentType : '').toLowerCase().includes('multipart/form-data');
}
function parseBearerToken(authorizationHeader) {
    if (!authorizationHeader)
        return null;
    var _a = authorizationHeader.split(' '), scheme = _a[0], token = _a[1];
    if (!scheme || !token)
        return null;
    if (scheme.toLowerCase() !== 'bearer')
        return null;
    var normalized = token.trim();
    return normalized ? normalized : null;
}
function parseCookieHeader(cookieHeader) {
    var out = {};
    var parts = cookieHeader.split(';');
    for (var _i = 0, parts_1 = parts; _i < parts_1.length; _i++) {
        var part = parts_1[_i];
        var eqIndex = part.indexOf('=');
        if (eqIndex <= 0)
            continue;
        var name_1 = part.slice(0, eqIndex).trim();
        var value = part.slice(eqIndex + 1).trim();
        if (!name_1)
            continue;
        out[name_1] = value;
    }
    return out;
}
/**
 * Best-effort Supabase auth token extraction from cookie storage shapes.
 * Supports:
 * - sb-access-token (explicit token cookie)
 * - sb-*-auth-token (JSON payload used by some Supabase auth helpers)
 */
function extractTokenFromSupabaseCookies(cookieHeader) {
    var _a, _b, _c;
    if (!cookieHeader)
        return null;
    var cookies = parseCookieHeader(cookieHeader);
    var hamiAccess = (_a = cookies.hami_access_token) === null || _a === void 0 ? void 0 : _a.trim();
    if (hamiAccess) {
        try {
            return decodeURIComponent(hamiAccess);
        }
        catch (_d) {
            return hamiAccess;
        }
    }
    var directToken = (_b = cookies['sb-access-token']) === null || _b === void 0 ? void 0 : _b.trim();
    if (directToken)
        return decodeURIComponent(directToken);
    var authTokenCookieName = Object.keys(cookies).find(function (name) { return name.startsWith('sb-') && name.endsWith('-auth-token'); });
    if (!authTokenCookieName)
        return null;
    var raw = decodeURIComponent((_c = cookies[authTokenCookieName]) !== null && _c !== void 0 ? _c : '');
    if (!raw)
        return null;
    // Common helper format: JSON object containing access_token.
    try {
        var parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && 'access_token' in parsed) {
            var maybeToken = parsed.access_token;
            if (typeof maybeToken === 'string' && maybeToken.trim())
                return maybeToken.trim();
        }
    }
    catch (_e) {
        // Continue to alternate format.
    }
    // Alternate format: serialized array where first element may be access token.
    try {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && typeof parsed[0] === 'string' && parsed[0].trim()) {
            return parsed[0].trim();
        }
    }
    catch (_f) {
        return null;
    }
    return null;
}
function sha256Bytes(input) {
    return __awaiter(this, void 0, void 0, function () {
        var bytes, digest;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    bytes = new TextEncoder().encode(input);
                    return [4 /*yield*/, crypto.subtle.digest(HASH_ALGORITHM, toBufferSource(bytes))];
                case 1:
                    digest = _a.sent();
                    return [2 /*return*/, new Uint8Array(digest)];
            }
        });
    });
}
var hmacKeyCache = new Map();
var HMAC_KEY_CACHE_TTL_MS = 60000;
var HMAC_KEY_CACHE_MAX = 500;
function pruneHmacKeyCache(nowMs) {
    if (hmacKeyCache.size <= HMAC_KEY_CACHE_MAX)
        return;
    for (var _i = 0, _a = hmacKeyCache.entries(); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], entry = _b[1];
        if (entry.expiresAt <= nowMs)
            hmacKeyCache.delete(key);
        if (hmacKeyCache.size <= HMAC_KEY_CACHE_MAX * 0.75)
            break;
    }
}
function getOrCreateHmacKey(userToken) {
    return __awaiter(this, void 0, void 0, function () {
        var combinedKeyMaterial, tokenHash, cacheKey, nowMs, cached, key;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    combinedKeyMaterial = "".concat(userToken, ":wife-sign-v1");
                    return [4 /*yield*/, sha256Bytes(combinedKeyMaterial)];
                case 1:
                    tokenHash = _a.sent();
                    cacheKey = toBase64Url(tokenHash.slice(0, 16));
                    nowMs = Date.now();
                    pruneHmacKeyCache(nowMs);
                    cached = hmacKeyCache.get(cacheKey);
                    if (cached && cached.expiresAt > nowMs)
                        return [2 /*return*/, cached.key];
                    return [4 /*yield*/, crypto.subtle.importKey('raw', toBufferSource(tokenHash), { name: HMAC_ALGORITHM, hash: HASH_ALGORITHM }, false, ['sign'])];
                case 2:
                    key = _a.sent();
                    hmacKeyCache.set(cacheKey, { key: key, expiresAt: nowMs + HMAC_KEY_CACHE_TTL_MS });
                    return [2 /*return*/, key];
            }
        });
    });
}
function createHmacSignature(payload, userToken) {
    return __awaiter(this, void 0, void 0, function () {
        var key, payloadBytes, signature;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getOrCreateHmacKey(userToken)];
                case 1:
                    key = _a.sent();
                    payloadBytes = new TextEncoder().encode(payload);
                    return [4 /*yield*/, crypto.subtle.sign(HMAC_ALGORITHM, key, toBufferSource(payloadBytes))];
                case 2:
                    signature = _a.sent();
                    return [2 /*return*/, toBase64Url(new Uint8Array(signature))];
            }
        });
    });
}
/**
 * Timing-safe string comparison to avoid leaking signature match info
 * through early-return branching.
 */
function timingSafeEqual(a, b) {
    var aBytes = new TextEncoder().encode(a);
    var bBytes = new TextEncoder().encode(b);
    var maxLen = Math.max(aBytes.length, bBytes.length);
    var diff = aBytes.length ^ bBytes.length;
    for (var i = 0; i < maxLen; i++) {
        var av = i < aBytes.length ? aBytes[i] : 0;
        var bv = i < bBytes.length ? bBytes[i] : 0;
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
export function extractUserTokenFromRequest(req) {
    var _a;
    var authHeaderToken = parseBearerToken((_a = req.headers.get('authorization')) !== null && _a !== void 0 ? _a : req.headers.get('Authorization'));
    if (authHeaderToken)
        return authHeaderToken;
    var cookieToken = extractTokenFromSupabaseCookies(req.headers.get('cookie'));
    if (cookieToken)
        return cookieToken;
    return null;
}
/**
 * Standardized 403 response for failed cryptographic checks.
 */
export function wifeForbiddenResponse(meta) {
    if (meta)
        recordWifeRejection(meta);
    return applyWifeSecurityHeaders(new Response(JSON.stringify({ ok: false, error: 'Cryptographic verification failed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }));
}
export function wifeUnauthorizedResponse(meta) {
    if (meta)
        recordWifeRejection(meta);
    return applyWifeSecurityHeaders(new Response(JSON.stringify({ ok: false, error: 'Unauthorized user' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }));
}
/** 429 — too many WIFE-verified requests (distinct from signature failure). */
export function wifeRateLimitedResponse(meta) {
    if (meta)
        recordWifeRejection(meta);
    return applyWifeSecurityHeaders(new Response(JSON.stringify({
        ok: false,
        error: 'Too many requests',
        code: 'WIFE_RATE_LIMITED',
        message: 'تم تجاوز حد الطلبات. انتظر قليلاً ثم أعد المحاولة.',
    }), {
        status: 429,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Retry-After': '60',
        },
    }));
}
/** After verifyWifeSignature returns false — records signature_failed telemetry. */
export function wifeSignatureFailedResponse(request) {
    return wifeForbiddenResponse({ request: request, reason: 'signature_failed' });
}
/**
 * Returns detailed WIFE verification status (use for correct 429 vs 403).
 */
export function verifyWifeSignatureStatus(req, userToken) {
    return __awaiter(this, void 0, void 0, function () {
        var ok;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, verifyWifeSignatureInternal(req, userToken)];
                case 1:
                    ok = _a.sent();
                    if (ok === true)
                        return [2 /*return*/, 'valid'];
                    if (ok === 'rate_limited')
                        return [2 /*return*/, 'rate_limited'];
                    return [2 /*return*/, 'invalid'];
            }
        });
    });
}
/** Returns blocking Response when invalid/rate-limited; null when valid. */
export function assertWifeSignatureRequest(req, userToken) {
    return __awaiter(this, void 0, void 0, function () {
        var status;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, verifyWifeSignatureStatus(req, userToken)];
                case 1:
                    status = _a.sent();
                    if (status === 'valid')
                        return [2 /*return*/, null];
                    if (status === 'rate_limited')
                        return [2 /*return*/, wifeRateLimitedResponse({ request: req, reason: 'rate_limited' })];
                    return [2 /*return*/, wifeSignatureFailedResponse(req)];
            }
        });
    });
}
function readStringField(input, key) {
    if (!input)
        return null;
    var value = input[key];
    return typeof value === 'string' && value.trim() ? value.trim() : null;
}
function readCachedUserStatus(userId) {
    var cached = userStatusCache.get(userId);
    if (!cached)
        return null;
    if (Date.now() - cached.checkedAt > USER_STATUS_CACHE_TTL_MS) {
        userStatusCache.delete(userId);
        return null;
    }
    return cached.active;
}
function writeCachedUserStatus(userId, active) {
    userStatusCache.set(userId, { active: active, checkedAt: Date.now() });
}
function getSupabaseAuthConfig() {
    var _a, _b;
    var supabaseUrl = ((_a = process.env.SUPABASE_URL) !== null && _a !== void 0 ? _a : '').trim();
    var supabaseKey = ((_b = process.env.SUPABASE_ANON_KEY) !== null && _b !== void 0 ? _b : '').trim();
    if (!supabaseUrl || !supabaseKey)
        return null;
    return { url: supabaseUrl.replace(/\/+$/, ''), key: supabaseKey };
}
/**
 * Creates a Supabase admin client for internal DB queries.
 * لا يُستخدم fetch مباشر—بل مكتبة @supabase/supabase-js الآمنة
 */
var _adminClient = null;
function getSupabaseAdminClient() {
    var _a;
    if (_adminClient)
        return _adminClient;
    var supabaseUrl = ((_a = process.env.SUPABASE_URL) !== null && _a !== void 0 ? _a : '').trim();
    var serviceRoleKey = readSupabasePrivilegedKey();
    if (!supabaseUrl || !serviceRoleKey)
        return null;
    var createClient = require('@supabase/supabase-js').createClient;
    _adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    return _adminClient;
}
function fetchSingleUserRow(table, filterColumn, filterValue) {
    return __awaiter(this, void 0, void 0, function () {
        var admin, _a, data_1, error_1, _b, data, error, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    admin = getSupabaseAdminClient();
                    if (!admin)
                        return [2 /*return*/, null];
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 5, , 6]);
                    if (!(filterColumn === 'id,user_id')) return [3 /*break*/, 3];
                    return [4 /*yield*/, admin
                            .from(table)
                            .select('*')
                            .or("id.eq.".concat(filterValue, ",user_id.eq.").concat(filterValue))
                            .limit(1)
                            .maybeSingle()];
                case 2:
                    _a = _d.sent(), data_1 = _a.data, error_1 = _a.error;
                    if (error_1)
                        return [2 /*return*/, null];
                    return [2 /*return*/, data_1];
                case 3: return [4 /*yield*/, admin
                        .from(table)
                        .select('*')
                        .eq(filterColumn, filterValue)
                        .limit(1)
                        .maybeSingle()];
                case 4:
                    _b = _d.sent(), data = _b.data, error = _b.error;
                    if (error)
                        return [2 /*return*/, null];
                    return [2 /*return*/, data];
                case 5:
                    _c = _d.sent();
                    return [2 /*return*/, null];
                case 6: return [2 /*return*/];
            }
        });
    });
}
function isUserActiveFromRow(row) {
    var status = typeof row.status === 'string' ? row.status.trim().toLowerCase() : '';
    var deletedAt = row.deleted_at;
    var isBanned = row.is_banned === true;
    var isDeleted = row.is_deleted === true;
    var isActive = row.is_active;
    if (isBanned || isDeleted)
        return false;
    if (deletedAt !== null && deletedAt !== undefined && String(deletedAt).trim() !== '')
        return false;
    if (typeof isActive === 'boolean' && isActive === false)
        return false;
    if (status && ['banned', 'inactive', 'deleted', 'disabled', 'suspended', 'blocked'].includes(status))
        return false;
    return true;
}
function isUserActiveLive(userId) {
    return __awaiter(this, void 0, void 0, function () {
        var cached, profileRow, active, lawyerRow, active;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    cached = readCachedUserStatus(userId);
                    if (cached !== null)
                        return [2 /*return*/, cached];
                    return [4 /*yield*/, fetchSingleUserRow('profiles', 'id,user_id', userId)];
                case 1:
                    profileRow = _a.sent();
                    if (profileRow) {
                        active = isUserActiveFromRow(profileRow);
                        writeCachedUserStatus(userId, active);
                        return [2 /*return*/, active];
                    }
                    return [4 /*yield*/, fetchSingleUserRow('lawyers', 'id,user_id', userId)];
                case 2:
                    lawyerRow = _a.sent();
                    if (lawyerRow) {
                        active = isUserActiveFromRow(lawyerRow);
                        writeCachedUserStatus(userId, active);
                        return [2 /*return*/, active];
                    }
                    // JWT صالح لكن لا صف profile/lawyer بعد — لا نحجب (تسجيل جديد / ملف قيد الإنشاء)
                    writeCachedUserStatus(userId, true);
                    return [2 /*return*/, true];
            }
        });
    });
}
// Cache للتوكنات الموثقة
var verifiedTokenCache = new Map();
/** Test-only: clears token/user status caches between isolated scenarios. */
export function resetWifeValidatorCachesForTests() {
    verifiedTokenCache.clear();
    userStatusCache.clear();
}
var VERIFIED_TOKEN_CACHE_TTL = 60000; // 60 ثانية
var VERIFIED_TOKEN_CACHE_MAX = 5000;
function base64UrlDecode(str) {
    try {
        var base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        while (base64.length % 4)
            base64 += '=';
        return atob(base64);
    }
    catch (_a) {
        return '';
    }
}
function pruneVerifiedTokenCache(nowMs) {
    if (verifiedTokenCache.size <= VERIFIED_TOKEN_CACHE_MAX)
        return;
    for (var _i = 0, _a = verifiedTokenCache.entries(); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        if (value.expiresAt <= nowMs || value.subject === 'INVALID') {
            verifiedTokenCache.delete(key);
        }
        if (verifiedTokenCache.size <= VERIFIED_TOKEN_CACHE_MAX * 0.75)
            break;
    }
}
function decodeJwtPayload(token) {
    try {
        var parts = token.split('.');
        if (parts.length !== 3)
            return null;
        var decoded = base64UrlDecode(parts[1]);
        if (!decoded)
            return null;
        return JSON.parse(decoded);
    }
    catch (_a) {
        return null;
    }
}
/**
 * Strict token verification against Supabase auth endpoint.
 * Fails closed if verification backend is unavailable.
 */
var DEV_ACCESS_TOKEN_PREFIX = 'dev-access-token-';
/** محامٍ ضيف للنشر التجريبي — subject واحد فقط، لا يُستخدم لصلاحيات admin. */
var DEMO_GUEST_SUBJECT = 'guest-lawyer-1';
function parseDevAccessTokenSubject(userToken) {
    if (!userToken.startsWith(DEV_ACCESS_TOKEN_PREFIX))
        return null;
    var subject = userToken.slice(DEV_ACCESS_TOKEN_PREFIX.length).trim();
    return subject.length >= 8 ? subject : null;
}
function cacheVerifiedDevSubject(subject) {
    verifiedTokenCache.set(subject, {
        subject: subject,
        expiresAt: Date.now() + VERIFIED_TOKEN_CACHE_TTL,
    });
    return subject;
}
export function getVerifiedTokenSubject(userToken) {
    return __awaiter(this, void 0, void 0, function () {
        var devSubject, demoGuest, payload, cacheKey, cached, cfg, response, user, userId, isActive;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    if (!userToken || typeof userToken !== 'string' || userToken.length < 20)
                        return [2 /*return*/, null];
                    if (!isProductionNodeEnv()) {
                        devSubject = parseDevAccessTokenSubject(userToken);
                        if (devSubject) {
                            return [2 /*return*/, cacheVerifiedDevSubject(devSubject)];
                        }
                    }
                    else {
                        demoGuest = parseDevAccessTokenSubject(userToken);
                        if (demoGuest === DEMO_GUEST_SUBJECT) {
                            return [2 /*return*/, cacheVerifiedDevSubject(demoGuest)];
                        }
                    }
                    pruneVerifiedTokenCache(Date.now());
                    payload = decodeJwtPayload(userToken);
                    cacheKey = (_a = payload === null || payload === void 0 ? void 0 : payload.sub) !== null && _a !== void 0 ? _a : userToken.slice(-16);
                    cached = verifiedTokenCache.get(cacheKey);
                    if (cached) {
                        if (Date.now() >= cached.expiresAt) {
                            verifiedTokenCache.delete(cacheKey);
                        }
                        else {
                            if (cached.subject === 'INVALID')
                                return [2 /*return*/, null];
                            // تحقق من انتهاء صلاحية JWT حتى مع الـ cache
                            if ((payload === null || payload === void 0 ? void 0 : payload.exp) && Date.now() < payload.exp * 1000) {
                                return [2 /*return*/, cached.subject];
                            }
                            // JWT منتهي — نحتاج إلى التحقق من Supabase للتأكد من أن الـ refresh token لا يزال صالحاً
                        }
                    }
                    cfg = getSupabaseAuthConfig();
                    if (!cfg)
                        return [2 /*return*/, null];
                    return [4 /*yield*/, fetch("".concat(cfg.url, "/auth/v1/user"), {
                            method: 'GET',
                            headers: {
                                apikey: cfg.key,
                                Authorization: "Bearer ".concat(userToken),
                            },
                        })];
                case 1:
                    response = _b.sent();
                    if (!response.ok) {
                        // cache الفشل لمنع الطلبات المتكررة
                        verifiedTokenCache.set(cacheKey, {
                            subject: 'INVALID',
                            expiresAt: Date.now() + Math.min(VERIFIED_TOKEN_CACHE_TTL, 10000),
                        });
                        return [2 /*return*/, null];
                    }
                    return [4 /*yield*/, response.json().catch(function () { return null; })];
                case 2:
                    user = (_b.sent());
                    userId = readStringField(user, 'id');
                    if (!userId)
                        return [2 /*return*/, null];
                    return [4 /*yield*/, isUserActiveLive(userId)];
                case 3:
                    isActive = _b.sent();
                    if (!isActive)
                        return [2 /*return*/, null];
                    // cache النتيجة
                    verifiedTokenCache.set(cacheKey, {
                        subject: userId,
                        expiresAt: Date.now() + VERIFIED_TOKEN_CACHE_TTL,
                    });
                    return [2 /*return*/, userId];
            }
        });
    });
}
export function isTokenAuthorized(userToken) {
    return __awaiter(this, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = Boolean;
                    return [4 /*yield*/, getVerifiedTokenSubject(userToken)];
                case 1: return [2 /*return*/, _a.apply(void 0, [_b.sent()])];
            }
        });
    });
}
/**
 * Enforces that verified token subject matches actor identifiers in payload.
 */
export function enforceTokenActorBinding(userToken, payload) {
    return __awaiter(this, void 0, void 0, function () {
        var subject, body, lawyerId, clientId;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, getVerifiedTokenSubject(userToken)];
                case 1:
                    subject = _a.sent();
                    if (!subject)
                        return [2 /*return*/, false];
                    if (!payload || typeof payload !== 'object')
                        return [2 /*return*/, false];
                    body = payload;
                    lawyerId = typeof body.lawyer_id === 'string' ? body.lawyer_id.trim() : '';
                    clientId = typeof body.client_id === 'string' ? body.client_id.trim() : '';
                    if (!lawyerId && !clientId)
                        return [2 /*return*/, false];
                    if (lawyerId && subject !== lawyerId)
                        return [2 /*return*/, false];
                    if (clientId && subject !== clientId)
                        return [2 /*return*/, false];
                    return [2 /*return*/, true];
            }
        });
    });
}
// Server-side Rate Limiting (distributed when Redis configured)
/** GET/HEAD/OPTIONS: قراءة متكررة — حد أعلى. POST/PUT/DELETE: 250/min */
export var WIFE_RATE_READ_MAX = 400;
export var WIFE_RATE_WRITE_MAX = 250;
function checkRateLimit(req, userToken) {
    return __awaiter(this, void 0, void 0, function () {
        var method, isSafeRead;
        return __generator(this, function (_a) {
            method = normalizeMethod(req.method);
            isSafeRead = ['GET', 'HEAD', 'OPTIONS'].includes(method);
            return [2 /*return*/, consumeRateLimitSlot(userToken, {
                    scope: isSafeRead ? 'wife-read' : 'wife-write',
                    maxRequests: isSafeRead ? WIFE_RATE_READ_MAX : WIFE_RATE_WRITE_MAX,
                    windowMs: 60000,
                })];
        });
    });
}
/**
 * Server-side WIFE verification (boolean — rate limit returns false).
 */
export function verifyWifeSignature(req, userToken) {
    return __awaiter(this, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, verifyWifeSignatureInternal(req, userToken)];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result === true];
            }
        });
    });
}
function verifyWifeSignatureInternal(req, userToken) {
    return __awaiter(this, void 0, void 0, function () {
        var verifiedSubject, csrfValid, deviceId, method, incomingSignature, incomingTimestamp, incomingNonce, incomingContentHash, signature, nonce, timestamp, timestampMs, now, multipart, body, normalizedHash, payload, expectedSignature, isSignatureValid, stolenCheck, nonceAccepted, _a;
        var _b, _c, _d, _e, _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    _g.trys.push([0, 11, , 12]);
                    if (!userToken || !userToken.trim())
                        return [2 /*return*/, false];
                    return [4 /*yield*/, checkRateLimit(req, userToken)];
                case 1:
                    if (!(_g.sent())) {
                        recordWifeRejection({ reason: 'rate_limited', request: req });
                        return [2 /*return*/, 'rate_limited'];
                    }
                    return [4 /*yield*/, getVerifiedTokenSubject(userToken)];
                case 2:
                    verifiedSubject = _g.sent();
                    if (!verifiedSubject)
                        return [2 /*return*/, false];
                    return [4 /*yield*/, verifyCsrfToken(req, userToken)];
                case 3:
                    csrfValid = _g.sent();
                    if (!csrfValid)
                        return [2 /*return*/, false];
                    deviceId = extractDeviceIdFromRequest(req);
                    method = normalizeMethod(req.method);
                    if (isProductionNodeEnv() && !['GET', 'HEAD', 'OPTIONS'].includes(method)) {
                        if (!isValidWifeDeviceId(deviceId)) {
                            recordWifeRejection({ reason: 'device_id_missing', request: req });
                            return [2 /*return*/, false];
                        }
                    }
                    incomingSignature = (_b = req.headers.get('x-wife-signature')) !== null && _b !== void 0 ? _b : req.headers.get('X-WIFE-Signature');
                    incomingTimestamp = (_c = req.headers.get('x-wife-timestamp')) !== null && _c !== void 0 ? _c : req.headers.get('X-WIFE-Timestamp');
                    incomingNonce = (_d = req.headers.get('x-wife-nonce')) !== null && _d !== void 0 ? _d : req.headers.get('X-WIFE-Nonce');
                    incomingContentHash = (_e = req.headers.get('x-wife-content-hash')) !== null && _e !== void 0 ? _e : req.headers.get('X-WIFE-Content-Hash');
                    if (!incomingSignature || !incomingTimestamp || !incomingNonce) {
                        return [2 /*return*/, false];
                    }
                    signature = incomingSignature.trim();
                    nonce = incomingNonce.trim();
                    timestamp = incomingTimestamp.trim();
                    if (!signature || !BASE64URL_SIGNATURE_RE.test(signature) || signature.length > 1024)
                        return [2 /*return*/, false];
                    if (!nonce || !NONCE_RE.test(nonce))
                        return [2 /*return*/, false];
                    if (!timestamp || !/^\d{10,16}$/.test(timestamp))
                        return [2 /*return*/, false];
                    timestampMs = parseTimestampMs(timestamp);
                    if (timestampMs === null)
                        return [2 /*return*/, false];
                    now = Date.now();
                    if (now - timestampMs > MAX_TIMESTAMP_SKEW_MS)
                        return [2 /*return*/, false];
                    if (timestampMs - now > MAX_TIMESTAMP_SKEW_MS)
                        return [2 /*return*/, false];
                    multipart = isMultipartContentType((_f = req.headers.get('content-type')) !== null && _f !== void 0 ? _f : req.headers.get('Content-Type'));
                    body = '';
                    if (!multipart) return [3 /*break*/, 4];
                    if (!incomingContentHash || !incomingContentHash.trim())
                        return [2 /*return*/, false];
                    normalizedHash = incomingContentHash.trim().toLowerCase();
                    if (!SHA256_HEX_RE.test(normalizedHash))
                        return [2 /*return*/, false];
                    body = normalizedHash;
                    return [3 /*break*/, 6];
                case 4: return [4 /*yield*/, req.clone().text()];
                case 5:
                    body = _g.sent();
                    _g.label = 6;
                case 6:
                    payload = canonicalPayload(req.method, canonicalPathAndQuery(req.url), timestamp, nonce, body);
                    return [4 /*yield*/, createHmacSignature(payload, userToken)];
                case 7:
                    expectedSignature = _g.sent();
                    isSignatureValid = timingSafeEqual(expectedSignature, signature);
                    if (!isSignatureValid)
                        return [2 /*return*/, false];
                    return [4 /*yield*/, detectStolenTokenServer(userToken, deviceId)];
                case 8:
                    stolenCheck = _g.sent();
                    if (stolenCheck.status === 'stolen' || stolenCheck.status === 'cloned') {
                        recordWifeRejection({
                            reason: stolenCheck.status === 'cloned' ? 'cloned_token' : 'stolen_token',
                            request: req,
                            detail: stolenCheck.reason,
                        });
                        return [2 /*return*/, false];
                    }
                    return [4 /*yield*/, consumeNonceWithTtl(nonce, NONCE_TTL_MS)];
                case 9:
                    nonceAccepted = _g.sent();
                    if (!nonceAccepted) {
                        return [2 /*return*/, false];
                    }
                    return [4 /*yield*/, registerTokenSessionServer(userToken, deviceId)];
                case 10:
                    _g.sent();
                    return [2 /*return*/, true];
                case 11:
                    _a = _g.sent();
                    return [2 /*return*/, false];
                case 12: return [2 /*return*/];
            }
        });
    });
}
function randomWifeNonce() {
    var bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return toBase64Url(bytes);
}
/** Server-side WIFE header builder — used by /api/security/wife-sign (HttpOnly BFF). */
export function createWifeSignedHeaders(method, url, body, userToken, contentHash) {
    return __awaiter(this, void 0, void 0, function () {
        var timestamp, nonce, payload, signature, headers;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    timestamp = String(Date.now());
                    nonce = randomWifeNonce();
                    payload = canonicalPayload(method, canonicalPathAndQuery(url), timestamp, nonce, body);
                    return [4 /*yield*/, createHmacSignature(payload, userToken)];
                case 1:
                    signature = _a.sent();
                    headers = {
                        'X-WIFE-Signature': signature,
                        'X-WIFE-Timestamp': timestamp,
                        'X-WIFE-Nonce': nonce,
                    };
                    if (contentHash) {
                        headers['X-WIFE-Content-Hash'] = contentHash;
                    }
                    return [2 /*return*/, headers];
            }
        });
    });
}
