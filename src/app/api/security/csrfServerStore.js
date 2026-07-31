/**
 * Server-side CSRF token registry (Redis → Supabase → memory).
 * Binds CSRF token to authenticated subject (sub).
 */
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
var DEFAULT_CSRF_TABLE = 'wife_csrf_store';
var CSRF_TTL_MS = 24 * 60 * 60 * 1000;
var memoryStore = new Map();
function getEnv(name) {
    var raw = process.env[name];
    return typeof raw === 'string' ? raw.trim() : '';
}
function isProduction() {
    return getEnv('NODE_ENV').toLowerCase() === 'production';
}
function hasRedisConfig() {
    return Boolean(getEnv('WIFE_REDIS_REST_URL') && getEnv('WIFE_REDIS_REST_TOKEN'));
}
function redisKey(sub) {
    return encodeURIComponent("wife:csrf:".concat(sub));
}
function pruneMemory(nowMs) {
    for (var _i = 0, _a = memoryStore.entries(); _i < _a.length; _i++) {
        var _b = _a[_i], sub = _b[0], row = _b[1];
        if (row.expiresAtMs <= nowMs)
            memoryStore.delete(sub);
    }
}
function getSupabaseAdminClient() {
    var supabaseUrl = getEnv('SUPABASE_URL');
    var serviceRoleKey = getEnv(supabasePrivilegedKeyEnvName());
    if (!supabaseUrl || !serviceRoleKey)
        return null;
    var createClient = require('@supabase/supabase-js').createClient;
    return createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
}
function persistToken(sub, token, expiresAtMs) {
    return __awaiter(this, void 0, void 0, function () {
        var redisUrl, redisToken, ttlMs, endpoint, res, _a, admin, table, error, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!hasRedisConfig()) return [3 /*break*/, 4];
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    redisUrl = getEnv('WIFE_REDIS_REST_URL');
                    redisToken = getEnv('WIFE_REDIS_REST_TOKEN');
                    ttlMs = Math.max(60000, expiresAtMs - Date.now());
                    endpoint = "".concat(redisUrl.replace(/\/+$/, ''), "/set/").concat(redisKey(sub), "/").concat(encodeURIComponent(token), "?PX=").concat(ttlMs);
                    return [4 /*yield*/, fetch(endpoint, {
                            method: 'POST',
                            headers: { Authorization: "Bearer ".concat(redisToken) },
                        })];
                case 2:
                    res = _c.sent();
                    if (res.ok)
                        return [2 /*return*/, true];
                    return [3 /*break*/, 4];
                case 3:
                    _a = _c.sent();
                    if (isProduction())
                        return [2 /*return*/, false];
                    return [3 /*break*/, 4];
                case 4:
                    admin = getSupabaseAdminClient();
                    if (!admin) return [3 /*break*/, 8];
                    _c.label = 5;
                case 5:
                    _c.trys.push([5, 7, , 8]);
                    table = getEnv('WIFE_CSRF_TABLE') || DEFAULT_CSRF_TABLE;
                    return [4 /*yield*/, admin.from(table).upsert({ sub: sub, token: token, expires_at_ms: expiresAtMs }, { onConflict: 'sub' })];
                case 6:
                    error = (_c.sent()).error;
                    if (!error)
                        return [2 /*return*/, true];
                    return [3 /*break*/, 8];
                case 7:
                    _b = _c.sent();
                    if (isProduction())
                        return [2 /*return*/, false];
                    return [3 /*break*/, 8];
                case 8:
                    if (isProduction())
                        return [2 /*return*/, false];
                    memoryStore.set(sub, { token: token, expiresAtMs: expiresAtMs });
                    return [2 /*return*/, true];
            }
        });
    });
}
function readToken(sub) {
    return __awaiter(this, void 0, void 0, function () {
        var nowMs, redisUrl, redisToken, endpoint, res, body, _a, admin, table, _b, data, error, _c, cached;
        var _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    nowMs = Date.now();
                    pruneMemory(nowMs);
                    if (!hasRedisConfig()) return [3 /*break*/, 6];
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 5, , 6]);
                    redisUrl = getEnv('WIFE_REDIS_REST_URL');
                    redisToken = getEnv('WIFE_REDIS_REST_TOKEN');
                    endpoint = "".concat(redisUrl.replace(/\/+$/, ''), "/get/").concat(redisKey(sub));
                    return [4 /*yield*/, fetch(endpoint, { headers: { Authorization: "Bearer ".concat(redisToken) } })];
                case 2:
                    res = _e.sent();
                    if (!res.ok) return [3 /*break*/, 4];
                    return [4 /*yield*/, res.json().catch(function () { return null; })];
                case 3:
                    body = (_e.sent());
                    if (typeof (body === null || body === void 0 ? void 0 : body.result) === 'string' && body.result)
                        return [2 /*return*/, body.result];
                    _e.label = 4;
                case 4: return [3 /*break*/, 6];
                case 5:
                    _a = _e.sent();
                    if (isProduction())
                        return [2 /*return*/, null];
                    return [3 /*break*/, 6];
                case 6:
                    admin = getSupabaseAdminClient();
                    if (!admin) return [3 /*break*/, 10];
                    _e.label = 7;
                case 7:
                    _e.trys.push([7, 9, , 10]);
                    table = getEnv('WIFE_CSRF_TABLE') || DEFAULT_CSRF_TABLE;
                    return [4 /*yield*/, admin
                            .from(table)
                            .select('token, expires_at_ms')
                            .eq('sub', sub)
                            .maybeSingle()];
                case 8:
                    _b = _e.sent(), data = _b.data, error = _b.error;
                    if (!error && data && Number(data.expires_at_ms) > nowMs) {
                        return [2 /*return*/, String((_d = data.token) !== null && _d !== void 0 ? _d : '')];
                    }
                    return [3 /*break*/, 10];
                case 9:
                    _c = _e.sent();
                    if (isProduction())
                        return [2 /*return*/, null];
                    return [3 /*break*/, 10];
                case 10:
                    cached = memoryStore.get(sub);
                    if (cached && cached.expiresAtMs > nowMs)
                        return [2 /*return*/, cached.token];
                    return [2 /*return*/, null];
            }
        });
    });
}
export function generateCsrfTokenValue() {
    var bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    var binary = Array.from(bytes, function (b) { return String.fromCharCode(b); }).join('');
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
export function issueCsrfTokenForSubject(sub) {
    return __awaiter(this, void 0, void 0, function () {
        var token, expiresAtMs, ok;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!sub)
                        return [2 /*return*/, null];
                    token = generateCsrfTokenValue();
                    expiresAtMs = Date.now() + CSRF_TTL_MS;
                    return [4 /*yield*/, persistToken(sub, token, expiresAtMs)];
                case 1:
                    ok = _a.sent();
                    return [2 /*return*/, ok ? token : null];
            }
        });
    });
}
export function invalidateCsrfForSubject(sub) {
    return __awaiter(this, void 0, void 0, function () {
        var redisUrl, redisToken, endpoint, _a, admin, table, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!sub)
                        return [2 /*return*/];
                    memoryStore.delete(sub);
                    if (!hasRedisConfig()) return [3 /*break*/, 4];
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    redisUrl = getEnv('WIFE_REDIS_REST_URL');
                    redisToken = getEnv('WIFE_REDIS_REST_TOKEN');
                    endpoint = "".concat(redisUrl.replace(/\/+$/, ''), "/del/").concat(redisKey(sub));
                    return [4 /*yield*/, fetch(endpoint, {
                            method: 'POST',
                            headers: { Authorization: "Bearer ".concat(redisToken) },
                        })];
                case 2:
                    _c.sent();
                    return [3 /*break*/, 4];
                case 3:
                    _a = _c.sent();
                    return [3 /*break*/, 4];
                case 4:
                    admin = getSupabaseAdminClient();
                    if (!admin) return [3 /*break*/, 8];
                    _c.label = 5;
                case 5:
                    _c.trys.push([5, 7, , 8]);
                    table = getEnv('WIFE_CSRF_TABLE') || DEFAULT_CSRF_TABLE;
                    return [4 /*yield*/, admin.from(table).delete().eq('sub', sub)];
                case 6:
                    _c.sent();
                    return [3 /*break*/, 8];
                case 7:
                    _b = _c.sent();
                    return [3 /*break*/, 8];
                case 8: return [2 /*return*/];
            }
        });
    });
}
export function validateCsrfForSubject(sub, token) {
    return __awaiter(this, void 0, void 0, function () {
        var expected;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!sub || !token)
                        return [2 /*return*/, false];
                    return [4 /*yield*/, readToken(sub)];
                case 1:
                    expected = _a.sent();
                    if (!expected)
                        return [2 /*return*/, false];
                    return [2 /*return*/, timingSafeEqual(expected, token)];
            }
        });
    });
}
function timingSafeEqual(a, b) {
    var aBytes = new TextEncoder().encode(a);
    var bBytes = new TextEncoder().encode(b);
    var maxLen = Math.max(aBytes.length, bBytes.length);
    var diff = aBytes.length ^ bBytes.length;
    for (var i = 0; i < maxLen; i++) {
        diff |= (i < aBytes.length ? aBytes[i] : 0) ^ (i < bBytes.length ? bBytes[i] : 0);
    }
    return diff === 0;
}
export function resetCsrfServerStoreForTests() {
    memoryStore.clear();
}
