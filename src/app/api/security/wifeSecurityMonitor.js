/**
 * Server-side WIFE rejection telemetry — structured logs + counters (no UX impact).
 * Optional: set SENTRY_DSN for server-side capture via Sentry envelope API (best-effort).
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var MAX_RECENT = 50;
var recentRejections = [];
var counterMap = new Map();
function isProduction() {
    var _a;
    return ((_a = process.env.NODE_ENV) !== null && _a !== void 0 ? _a : '').toLowerCase() === 'production';
}
function requestPath(request) {
    if (!request)
        return '';
    try {
        return new URL(request.url).pathname;
    }
    catch (_a) {
        return '';
    }
}
function requestMethod(request) {
    var _a;
    return ((_a = request === null || request === void 0 ? void 0 : request.method) !== null && _a !== void 0 ? _a : 'GET').toUpperCase();
}
function pushRecent(meta) {
    var _a;
    recentRejections.push(meta);
    if (recentRejections.length > MAX_RECENT)
        recentRejections.shift();
    counterMap.set(meta.reason, ((_a = counterMap.get(meta.reason)) !== null && _a !== void 0 ? _a : 0) + 1);
}
function logStructured(meta) {
    var _a, _b;
    var payload = {
        type: 'wife_rejection',
        reason: meta.reason,
        path: requestPath(meta.request),
        method: requestMethod(meta.request),
        detail: (_a = meta.detail) !== null && _a !== void 0 ? _a : null,
        userId: (_b = meta.userId) !== null && _b !== void 0 ? _b : null,
        ts: new Date().toISOString(),
    };
    if (isProduction()) {
        console.warn(JSON.stringify(payload));
    }
    else if (process.env.WIFE_LOG_REJECTIONS === 'true') {
        console.info('[WIFE rejection]', payload);
    }
}
function captureSentryBestEffort(_meta) {
    return __awaiter(this, void 0, void 0, function () {
        var url, _a;
        var _b, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    url = ((_b = process.env.WIFE_SECURITY_WEBHOOK_URL) !== null && _b !== void 0 ? _b : '').trim();
                    if (!url)
                        return [2 /*return*/];
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, fetch(url, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: 'wife_rejection',
                                reason: _meta.reason,
                                path: requestPath(_meta.request),
                                method: requestMethod(_meta.request),
                                detail: (_c = _meta.detail) !== null && _c !== void 0 ? _c : null,
                                userId: (_d = _meta.userId) !== null && _d !== void 0 ? _d : null,
                                ts: new Date().toISOString(),
                            }),
                        })];
                case 2:
                    _e.sent();
                    return [3 /*break*/, 4];
                case 3:
                    _a = _e.sent();
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/** Record a WIFE/BFF auth rejection (fire-and-forget). */
export function recordWifeRejection(meta) {
    pushRecent(meta);
    logStructured(meta);
    void captureSentryBestEffort(meta);
}
export function getWifeRejectionCounters() {
    return __spreadArray([], counterMap.entries(), true).map(function (_a) {
        var reason = _a[0], count = _a[1];
        return ({ reason: reason, count: count });
    });
}
export function resetWifeSecurityMonitorForTests() {
    recentRejections.length = 0;
    counterMap.clear();
}
