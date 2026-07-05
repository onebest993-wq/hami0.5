/**
 * Distributed nonce store adapter for WIFE anti-replay protection.
 *
 * Priority:
 * 1) Redis (Upstash REST) when configured
 * 2) Supabase PostgREST table fallback
 * 3) Ephemeral in-memory fallback (development safety net)
 *
 * Notes:
 * - Redis path is atomic using SET NX PX.
 * - Supabase path expects a unique constraint on "nonce" column to enforce atomicity.
 */
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
var DEFAULT_NONCE_TABLE = 'wife_nonce_store';
var IN_MEMORY_NONCE_FALLBACK = new Map();
function getEnv(name) {
    var raw = process.env[name];
    return typeof raw === 'string' ? raw.trim() : '';
}
function isProduction() {
    return getEnv('NODE_ENV').toLowerCase() === 'production';
}
function buildNonceKey(nonce) {
    return "wife:nonce:".concat(nonce);
}
function pruneInMemory(nowMs) {
    for (var _i = 0, _a = IN_MEMORY_NONCE_FALLBACK.entries(); _i < _a.length; _i++) {
        var _b = _a[_i], nonce = _b[0], expiresAt = _b[1];
        if (expiresAt <= nowMs)
            IN_MEMORY_NONCE_FALLBACK.delete(nonce);
    }
}
var memoryStore = {
    consumeNonce: function (nonce, nowMs, ttlMs) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                pruneInMemory(nowMs);
                if (IN_MEMORY_NONCE_FALLBACK.has(nonce))
                    return [2 /*return*/, false];
                IN_MEMORY_NONCE_FALLBACK.set(nonce, nowMs + ttlMs);
                return [2 /*return*/, true];
            });
        });
    },
};
function hasRedisConfig() {
    return Boolean(getEnv('WIFE_REDIS_REST_URL') && getEnv('WIFE_REDIS_REST_TOKEN'));
}
var redisStore = {
    consumeNonce: function (nonce, _nowMs, ttlMs) {
        return __awaiter(this, void 0, void 0, function () {
            var redisUrl, redisToken, key, endpoint, response, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        redisUrl = getEnv('WIFE_REDIS_REST_URL');
                        redisToken = getEnv('WIFE_REDIS_REST_TOKEN');
                        if (!redisUrl || !redisToken)
                            throw new Error('Redis nonce store is not configured.');
                        key = encodeURIComponent(buildNonceKey(nonce));
                        endpoint = "".concat(redisUrl.replace(/\/+$/, ''), "/set/").concat(key, "/1?NX=true&PX=").concat(ttlMs);
                        return [4 /*yield*/, fetch(endpoint, {
                                method: 'POST',
                                headers: {
                                    Authorization: "Bearer ".concat(redisToken),
                                },
                            })];
                    case 1:
                        response = _a.sent();
                        if (!response.ok) {
                            throw new Error("Redis nonce store failed: ".concat(response.status));
                        }
                        return [4 /*yield*/, response.json().catch(function () { return null; })];
                    case 2:
                        result = (_a.sent());
                        // Upstash returns { result: "OK" } when SET NX succeeds.
                        return [2 /*return*/, (result === null || result === void 0 ? void 0 : result.result) === 'OK'];
                }
            });
        });
    },
};
function hasSupabaseConfig() {
    return Boolean(getEnv('SUPABASE_URL') && (getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_ANON_KEY')));
}
var supabaseStore = {
    consumeNonce: function (nonce, nowMs, ttlMs) {
        return __awaiter(this, void 0, void 0, function () {
            var supabaseUrl, supabaseKey, table, baseUrl, restTableUrl, expiresAt, response, rows;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        supabaseUrl = getEnv('SUPABASE_URL');
                        supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('SUPABASE_ANON_KEY');
                        if (!supabaseUrl || !supabaseKey)
                            throw new Error('Supabase nonce store is not configured.');
                        table = getEnv('WIFE_NONCE_TABLE') || DEFAULT_NONCE_TABLE;
                        baseUrl = supabaseUrl.replace(/\/+$/, '');
                        restTableUrl = "".concat(baseUrl, "/rest/v1/").concat(encodeURIComponent(table));
                        // Best-effort cleanup for expired rows.
                        void fetch("".concat(restTableUrl, "?expires_at_ms=lt.").concat(nowMs), {
                            method: 'DELETE',
                            headers: {
                                apikey: supabaseKey,
                                Authorization: "Bearer ".concat(supabaseKey),
                            },
                        }).catch(function () { return undefined; });
                        expiresAt = nowMs + ttlMs;
                        return [4 /*yield*/, fetch(restTableUrl, {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json',
                                    apikey: supabaseKey,
                                    Authorization: "Bearer ".concat(supabaseKey),
                                    Prefer: 'resolution=ignore-duplicates,return=representation',
                                },
                                body: JSON.stringify([{ nonce: nonce, expires_at_ms: expiresAt }]),
                            })];
                    case 1:
                        response = _a.sent();
                        if (!response.ok) {
                            throw new Error("Supabase nonce store failed: ".concat(response.status));
                        }
                        return [4 /*yield*/, response.json().catch(function () { return []; })];
                    case 2:
                        rows = (_a.sent());
                        // Insert succeeded only when row is returned; empty means duplicate nonce.
                        return [2 /*return*/, Array.isArray(rows) && rows.length > 0];
                }
            });
        });
    },
};
function resolvePrimaryStore() {
    if (hasRedisConfig())
        return redisStore;
    if (hasSupabaseConfig())
        return supabaseStore;
    if (!isProduction())
        return memoryStore;
    return null;
}
/**
 * Returns true only when nonce is new and successfully persisted for TTL window.
 * Returns false for replay attempts.
 */
export function consumeNonceWithTtl(nonce, ttlMs) {
    return __awaiter(this, void 0, void 0, function () {
        var nowMs, primary, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    nowMs = Date.now();
                    primary = resolvePrimaryStore();
                    if (!!primary) return [3 /*break*/, 2];
                    if (isProduction())
                        return [2 /*return*/, false];
                    return [4 /*yield*/, memoryStore.consumeNonce(nonce, nowMs, ttlMs)];
                case 1: return [2 /*return*/, _b.sent()];
                case 2:
                    _b.trys.push([2, 4, , 6]);
                    return [4 /*yield*/, primary.consumeNonce(nonce, nowMs, ttlMs)];
                case 3: return [2 /*return*/, _b.sent()];
                case 4:
                    _a = _b.sent();
                    if (isProduction())
                        return [2 /*return*/, false];
                    return [4 /*yield*/, memoryStore.consumeNonce(nonce, nowMs, ttlMs)];
                case 5: return [2 /*return*/, _b.sent()];
                case 6: return [2 /*return*/];
            }
        });
    });
}
/** Test-only: clears in-memory nonce fallback between isolated scenarios. */
export function resetNonceStoreForTests() {
    IN_MEMORY_NONCE_FALLBACK.clear();
}
