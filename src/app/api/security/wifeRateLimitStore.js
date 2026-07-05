/**
 * Distributed rate limiting for WIFE (Redis → in-memory fallback).
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
var DEFAULT_WINDOW_MS = 60000;
/** Default WIFE verify budget — overridden per scope in wifeValidator.checkRateLimit */
export var DEFAULT_MAX_REQUESTS = 250;
var memoryCounters = new Map();
var MEMORY_MAX_KEYS = 20000;
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
function hashKeyMaterial(input) {
    var hash = 2166136261;
    for (var i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
}
function buildRedisKey(scope, subjectKey, windowStartMs) {
    return encodeURIComponent("wife:ratelimit:".concat(scope, ":").concat(subjectKey, ":").concat(windowStartMs));
}
function pruneMemoryCounters(nowMs) {
    if (memoryCounters.size <= MEMORY_MAX_KEYS)
        return;
    for (var _i = 0, _a = memoryCounters.entries(); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], entry = _b[1];
        if (entry.resetAt <= nowMs)
            memoryCounters.delete(key);
        if (memoryCounters.size <= MEMORY_MAX_KEYS * 0.75)
            break;
    }
}
function consumeRedisSlot(scope, subjectKey, maxRequests, windowMs) {
    return __awaiter(this, void 0, void 0, function () {
        var redisUrl, redisToken, nowMs, windowStartMs, key, base, incrRes, incrBody, count;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    redisUrl = getEnv('WIFE_REDIS_REST_URL');
                    redisToken = getEnv('WIFE_REDIS_REST_TOKEN');
                    if (!redisUrl || !redisToken)
                        throw new Error('Redis rate limit store is not configured.');
                    nowMs = Date.now();
                    windowStartMs = Math.floor(nowMs / windowMs) * windowMs;
                    key = buildRedisKey(scope, subjectKey, windowStartMs);
                    base = redisUrl.replace(/\/+$/, '');
                    return [4 /*yield*/, fetch("".concat(base, "/incr/").concat(key), {
                            method: 'POST',
                            headers: { Authorization: "Bearer ".concat(redisToken) },
                        })];
                case 1:
                    incrRes = _b.sent();
                    if (!incrRes.ok)
                        throw new Error("Redis rate limit incr failed: ".concat(incrRes.status));
                    return [4 /*yield*/, incrRes.json().catch(function () { return null; })];
                case 2:
                    incrBody = (_b.sent());
                    count = Number((_a = incrBody === null || incrBody === void 0 ? void 0 : incrBody.result) !== null && _a !== void 0 ? _a : 0);
                    if (!Number.isFinite(count) || count <= 0)
                        return [2 /*return*/, false];
                    if (count === 1) {
                        void fetch("".concat(base, "/pexpire/").concat(key, "/").concat(windowMs), {
                            method: 'POST',
                            headers: { Authorization: "Bearer ".concat(redisToken) },
                        }).catch(function () { return undefined; });
                    }
                    return [2 /*return*/, count <= maxRequests];
            }
        });
    });
}
function consumeMemorySlot(scope, subjectKey, maxRequests, windowMs) {
    var nowMs = Date.now();
    pruneMemoryCounters(nowMs);
    var mapKey = "".concat(scope, ":").concat(subjectKey);
    var entry = memoryCounters.get(mapKey);
    if (!entry || nowMs > entry.resetAt) {
        memoryCounters.set(mapKey, { count: 1, resetAt: nowMs + windowMs });
        return true;
    }
    entry.count++;
    return entry.count <= maxRequests;
}
/**
 * Returns true when request is allowed under rate limit budget.
 */
export function consumeRateLimitSlot(subjectKey, options) {
    return __awaiter(this, void 0, void 0, function () {
        var scope, maxRequests, windowMs, hashedSubject, _a;
        var _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    scope = (_b = options === null || options === void 0 ? void 0 : options.scope) !== null && _b !== void 0 ? _b : 'wife';
                    maxRequests = (_c = options === null || options === void 0 ? void 0 : options.maxRequests) !== null && _c !== void 0 ? _c : DEFAULT_MAX_REQUESTS;
                    windowMs = (_d = options === null || options === void 0 ? void 0 : options.windowMs) !== null && _d !== void 0 ? _d : DEFAULT_WINDOW_MS;
                    hashedSubject = hashKeyMaterial(subjectKey);
                    if (!hasRedisConfig()) return [3 /*break*/, 4];
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, consumeRedisSlot(scope, hashedSubject, maxRequests, windowMs)];
                case 2: return [2 /*return*/, _e.sent()];
                case 3:
                    _a = _e.sent();
                    if (isProduction())
                        return [2 /*return*/, false];
                    return [3 /*break*/, 4];
                case 4:
                    if (isProduction())
                        return [2 /*return*/, false];
                    return [2 /*return*/, consumeMemorySlot(scope, hashedSubject, maxRequests, windowMs)];
            }
        });
    });
}
export function resetWifeRateLimitStoreForTests() {
    memoryCounters.clear();
}
