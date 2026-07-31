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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
/**
 * Server-side stolen/cloned JWT detection for WIFE.
 * Storage priority: Redis (Upstash) → Supabase → in-memory (non-production only).
 */
import { extractJwtSessionFields } from '@/app/security/jwtFields.ts';
import { getSupabaseAdminClient } from './supabaseAdminClient.ts';
import { supabasePrivilegedKeyEnvName } from './supabasePrivilegedEnv.js';
var IAT_GRACE_PERIOD_MS = 45000;
var SESSION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
var DEFAULT_SESSION_TABLE = 'wife_token_sessions';
var DEVICE_ID_RE = /^[A-Za-z0-9\-_]{8,128}$/;
var IN_MEMORY_SESSIONS = new Map();
function sessionKey(sub, jti) {
    return "".concat(sub, ":").concat(jti);
}
function getEnv(name) {
    var raw = process.env[name];
    return typeof raw === 'string' ? raw.trim() : '';
}
function isProduction() {
    return getEnv('NODE_ENV').toLowerCase() === 'production';
}
function normalizeDeviceId(raw) {
    var trimmed = (raw !== null && raw !== void 0 ? raw : '').trim();
    if (!trimmed || !DEVICE_ID_RE.test(trimmed))
        return '';
    return trimmed;
}
function pruneInMemory(nowMs) {
    for (var _i = 0, _a = IN_MEMORY_SESSIONS.entries(); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], record = _b[1];
        if (record.expiresAt <= nowMs)
            IN_MEMORY_SESSIONS.delete(key);
    }
}
var memoryStore = {
    listActiveBySub: function (sub, nowMs) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                pruneInMemory(nowMs);
                return [2 /*return*/, __spreadArray([], IN_MEMORY_SESSIONS.values(), true).filter(function (r) { return r.sub === sub && r.expiresAt > nowMs; })];
            });
        });
    },
    upsertSession: function (record) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                IN_MEMORY_SESSIONS.set(sessionKey(record.sub, record.jti), record);
                return [2 /*return*/];
            });
        });
    },
    deleteExpired: function (nowMs) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                pruneInMemory(nowMs);
                return [2 /*return*/];
            });
        });
    },
};
function hasRedisConfig() {
    return Boolean(getEnv('WIFE_REDIS_REST_URL') && getEnv('WIFE_REDIS_REST_TOKEN'));
}
function redisSessionKey(sub, jti) {
    return encodeURIComponent("wife:toksess:".concat(sub, ":").concat(jti));
}
var redisStore = {
    listActiveBySub: function (sub, nowMs) {
        return __awaiter(this, void 0, void 0, function () {
            var redisUrl, redisToken, prefix, scanUrl, scanRes, scanBody, keys, records, _i, keys_1, key, getUrl, getRes, getBody, parsed;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        redisUrl = getEnv('WIFE_REDIS_REST_URL');
                        redisToken = getEnv('WIFE_REDIS_REST_TOKEN');
                        if (!redisUrl || !redisToken)
                            throw new Error('Redis session store is not configured.');
                        prefix = encodeURIComponent("wife:toksess:".concat(sub, ":"));
                        scanUrl = "".concat(redisUrl.replace(/\/+$/, ''), "/keys/").concat(prefix, "*");
                        return [4 /*yield*/, fetch(scanUrl, {
                                headers: { Authorization: "Bearer ".concat(redisToken) },
                            })];
                    case 1:
                        scanRes = _a.sent();
                        if (!scanRes.ok)
                            throw new Error("Redis session scan failed: ".concat(scanRes.status));
                        return [4 /*yield*/, scanRes.json().catch(function () { return null; })];
                    case 2:
                        scanBody = (_a.sent());
                        keys = Array.isArray(scanBody === null || scanBody === void 0 ? void 0 : scanBody.result) ? scanBody.result.filter(function (k) { return typeof k === 'string'; }) : [];
                        records = [];
                        _i = 0, keys_1 = keys;
                        _a.label = 3;
                    case 3:
                        if (!(_i < keys_1.length)) return [3 /*break*/, 7];
                        key = keys_1[_i];
                        getUrl = "".concat(redisUrl.replace(/\/+$/, ''), "/get/").concat(encodeURIComponent(key));
                        return [4 /*yield*/, fetch(getUrl, { headers: { Authorization: "Bearer ".concat(redisToken) } })];
                    case 4:
                        getRes = _a.sent();
                        if (!getRes.ok)
                            return [3 /*break*/, 6];
                        return [4 /*yield*/, getRes.json().catch(function () { return null; })];
                    case 5:
                        getBody = (_a.sent());
                        if (typeof (getBody === null || getBody === void 0 ? void 0 : getBody.result) !== 'string' || !getBody.result)
                            return [3 /*break*/, 6];
                        try {
                            parsed = JSON.parse(getBody.result);
                            if (parsed.sub === sub && parsed.expiresAt > nowMs)
                                records.push(parsed);
                        }
                        catch (_b) {
                            /* skip malformed */
                        }
                        _a.label = 6;
                    case 6:
                        _i++;
                        return [3 /*break*/, 3];
                    case 7: return [2 /*return*/, records];
                }
            });
        });
    },
    upsertSession: function (record) {
        return __awaiter(this, void 0, void 0, function () {
            var redisUrl, redisToken, ttlMs, key, endpoint, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        redisUrl = getEnv('WIFE_REDIS_REST_URL');
                        redisToken = getEnv('WIFE_REDIS_REST_TOKEN');
                        if (!redisUrl || !redisToken)
                            throw new Error('Redis session store is not configured.');
                        ttlMs = Math.max(60000, record.expiresAt - Date.now());
                        key = redisSessionKey(record.sub, record.jti);
                        endpoint = "".concat(redisUrl.replace(/\/+$/, ''), "/set/").concat(key, "/").concat(encodeURIComponent(JSON.stringify(record)), "?PX=").concat(ttlMs);
                        return [4 /*yield*/, fetch(endpoint, {
                                method: 'POST',
                                headers: { Authorization: "Bearer ".concat(redisToken) },
                            })];
                    case 1:
                        response = _a.sent();
                        if (!response.ok)
                            throw new Error("Redis session set failed: ".concat(response.status));
                        return [2 /*return*/];
                }
            });
        });
    },
    deleteExpired: function (_nowMs) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/];
            });
        });
    },
};
function hasSupabaseConfig() {
    return Boolean(getEnv('SUPABASE_URL') && getEnv(supabasePrivilegedKeyEnvName()));
}
function getSupabaseAdminClientForSessions() {
    return getSupabaseAdminClient();
}
var supabaseStore = {
    listActiveBySub: function (sub, nowMs) {
        return __awaiter(this, void 0, void 0, function () {
            var admin, table, _a, data, error;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        admin = getSupabaseAdminClientForSessions();
                        if (!admin)
                            throw new Error('Supabase session store is not configured.');
                        table = getEnv('WIFE_TOKEN_SESSION_TABLE') || DEFAULT_SESSION_TABLE;
                        void admin.from(table).delete().lt('expires_at_ms', nowMs);
                        return [4 /*yield*/, admin
                                .from(table)
                                .select('sub,jti,iat_ms,device_id,expires_at_ms')
                                .eq('sub', sub)
                                .gt('expires_at_ms', nowMs)];
                    case 1:
                        _a = _b.sent(), data = _a.data, error = _a.error;
                        if (error)
                            throw new Error("Supabase session list failed: ".concat(error.message));
                        return [2 /*return*/, (data !== null && data !== void 0 ? data : []).map(function (row) {
                                var _a, _b, _c, _d, _e;
                                return ({
                                    sub: String((_a = row.sub) !== null && _a !== void 0 ? _a : ''),
                                    jti: String((_b = row.jti) !== null && _b !== void 0 ? _b : ''),
                                    iat: Number((_c = row.iat_ms) !== null && _c !== void 0 ? _c : 0),
                                    deviceId: String((_d = row.device_id) !== null && _d !== void 0 ? _d : ''),
                                    expiresAt: Number((_e = row.expires_at_ms) !== null && _e !== void 0 ? _e : 0),
                                });
                            })];
                }
            });
        });
    },
    upsertSession: function (record) {
        return __awaiter(this, void 0, void 0, function () {
            var admin, table, error;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        admin = getSupabaseAdminClientForSessions();
                        if (!admin)
                            throw new Error('Supabase session store is not configured.');
                        table = getEnv('WIFE_TOKEN_SESSION_TABLE') || DEFAULT_SESSION_TABLE;
                        return [4 /*yield*/, admin.from(table).upsert({
                                sub: record.sub,
                                jti: record.jti,
                                iat_ms: record.iat,
                                device_id: record.deviceId,
                                expires_at_ms: record.expiresAt,
                            }, { onConflict: 'sub,jti' })];
                    case 1:
                        error = (_a.sent()).error;
                        if (error)
                            throw new Error("Supabase session upsert failed: ".concat(error.message));
                        return [2 /*return*/];
                }
            });
        });
    },
    deleteExpired: function (nowMs) {
        return __awaiter(this, void 0, void 0, function () {
            var admin, table;
            return __generator(this, function (_a) {
                admin = getSupabaseAdminClientForSessions();
                if (!admin)
                    return [2 /*return*/];
                table = getEnv('WIFE_TOKEN_SESSION_TABLE') || DEFAULT_SESSION_TABLE;
                void admin.from(table).delete().lt('expires_at_ms', nowMs);
                return [2 /*return*/];
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
function withStore(fn) {
    return __awaiter(this, void 0, void 0, function () {
        var primary, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    primary = resolvePrimaryStore();
                    if (!primary)
                        return [2 /*return*/, null];
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fn(primary)];
                case 2: return [2 /*return*/, _b.sent()];
                case 3:
                    _a = _b.sent();
                    if (isProduction())
                        return [2 /*return*/, null];
                    return [2 /*return*/, fn(memoryStore)];
                case 4: return [2 /*return*/];
            }
        });
    });
}
export function isValidWifeDeviceId(raw) {
    return normalizeDeviceId(raw).length > 0;
}
export function extractDeviceIdFromRequest(req) {
    var _a, _b;
    var raw = (_b = (_a = req.headers.get('x-wife-device-id')) !== null && _a !== void 0 ? _a : req.headers.get('X-WIFE-Device-Id')) !== null && _b !== void 0 ? _b : '';
    return normalizeDeviceId(raw);
}
export function registerTokenSessionServer(token, deviceId) {
    return __awaiter(this, void 0, void 0, function () {
        var fields, record, result;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    fields = extractJwtSessionFields(token);
                    if (!fields)
                        return [2 /*return*/, false];
                    record = {
                        sub: fields.sub,
                        jti: fields.jti,
                        iat: fields.iat,
                        deviceId: normalizeDeviceId(deviceId),
                        expiresAt: fields.exp + SESSION_RETENTION_MS,
                    };
                    return [4 /*yield*/, withStore(function (store) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, store.upsertSession(record)];
                                    case 1:
                                        _a.sent();
                                        return [2 /*return*/, true];
                                }
                            });
                        }); })];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result !== null && result !== void 0 ? result : false];
            }
        });
    });
}
export function detectStolenTokenServer(token, deviceId) {
    return __awaiter(this, void 0, void 0, function () {
        var fields, nowMs, normalizedDeviceId, storeResult;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    fields = extractJwtSessionFields(token);
                    if (!fields)
                        return [2 /*return*/, { status: 'valid', reason: 'cannot-decode' }];
                    nowMs = Date.now();
                    normalizedDeviceId = normalizeDeviceId(deviceId);
                    return [4 /*yield*/, withStore(function (store) { return __awaiter(_this, void 0, void 0, function () {
                            var activeRecords, matchingRecord, latestRecord;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, store.deleteExpired(nowMs)];
                                    case 1:
                                        _a.sent();
                                        return [4 /*yield*/, store.listActiveBySub(fields.sub, nowMs)];
                                    case 2:
                                        activeRecords = _a.sent();
                                        if (activeRecords.length === 0) {
                                            return [2 /*return*/, { status: 'valid', reason: 'first-seen' }];
                                        }
                                        matchingRecord = activeRecords.find(function (r) { return r.jti === fields.jti; });
                                        if (matchingRecord) {
                                            if (normalizedDeviceId &&
                                                matchingRecord.deviceId &&
                                                matchingRecord.deviceId !== normalizedDeviceId) {
                                                return [2 /*return*/, {
                                                        status: 'cloned',
                                                        reason: "Same jti (".concat(fields.jti, ") from different device"),
                                                    }];
                                            }
                                            return [2 /*return*/, { status: 'valid', reason: 'match' }];
                                        }
                                        latestRecord = activeRecords.reduce(function (latest, r) { return (r.iat > latest.iat ? r : latest); }, activeRecords[0]);
                                        if (fields.iat < latestRecord.iat - IAT_GRACE_PERIOD_MS) {
                                            return [2 /*return*/, {
                                                    status: 'stolen',
                                                    reason: "Older jti (".concat(fields.jti, ") than active session (").concat(latestRecord.jti, ")"),
                                                }];
                                        }
                                        return [2 /*return*/, { status: 'valid', reason: 'new-token-pending-register' }];
                                }
                            });
                        }); })];
                case 1:
                    storeResult = _a.sent();
                    if (!storeResult) {
                        if (isProduction()) {
                            return [2 /*return*/, { status: 'stolen', reason: 'session-store-unavailable-fail-closed' }];
                        }
                        return [2 /*return*/, { status: 'valid', reason: 'store-unavailable' }];
                    }
                    if (!(storeResult.status === 'valid' && storeResult.reason === 'new-token-pending-register')) return [3 /*break*/, 3];
                    return [4 /*yield*/, registerTokenSessionServer(token, normalizedDeviceId)];
                case 2:
                    _a.sent();
                    return [2 /*return*/, { status: 'valid', reason: 'new-token-registered' }];
                case 3:
                    if (!(storeResult.status === 'valid' && storeResult.reason === 'first-seen')) return [3 /*break*/, 5];
                    return [4 /*yield*/, registerTokenSessionServer(token, normalizedDeviceId)];
                case 4:
                    _a.sent();
                    _a.label = 5;
                case 5: return [2 /*return*/, storeResult];
            }
        });
    });
}
/** Test-only: clears in-memory session fallback between isolated scenarios. */
export function resetStolenTokenServerForTests() {
    IN_MEMORY_SESSIONS.clear();
}
