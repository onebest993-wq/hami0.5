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
import { coalesceWifeSign } from '../../security/wifeSignInflight.ts';
import { parseAccessCookie } from '../../security/sessionCookie.ts';
import { createWifeSignedHeaders, getVerifiedTokenSubject, isTokenAuthorized, wifeRateLimitedResponse, wifeUnauthorizedResponse, } from '../../security/wifeValidator.ts';
import { applyWifeSecurityHeaders } from '../../security/wifeSecurityHeaders.ts';
import { consumeRateLimitSlot } from '../../security/wifeRateLimitStore.ts';
import { resolveAllowedWifeSignTarget } from '../../security/wifeSignPolicy.ts';
import { recordWifeRejection } from '../../security/wifeSecurityMonitor.ts';
function isProductionNodeEnv() {
    var _a;
    return ((_a = process.env.NODE_ENV) !== null && _a !== void 0 ? _a : '').toLowerCase() === 'production';
}
function assertSameOriginRequest(request) {
    var _a, _b;
    var requestOrigin = new URL(request.url).origin;
    var origin = (_a = request.headers.get('origin')) === null || _a === void 0 ? void 0 : _a.trim();
    if (origin) {
        try {
            return new URL(origin).origin === requestOrigin;
        }
        catch (_c) {
            return false;
        }
    }
    var referer = (_b = request.headers.get('referer')) === null || _b === void 0 ? void 0 : _b.trim();
    if (referer) {
        try {
            return new URL(referer).origin === requestOrigin;
        }
        catch (_d) {
            return false;
        }
    }
    return !isProductionNodeEnv();
}
var WIFE_SIGN_RATE = { scope: 'wife-sign', maxRequests: 180, windowMs: 60000 };
/**
 * POST /api/security/wife-sign
 * Bootstrap WIFE headers when JWT lives in HttpOnly cookie (BFF auth).
 * Hardened: same-origin + allowlisted /api/* only + dedicated rate limit.
 * Note: لا TTL cache للتوقيع — كل nonce يُستهلك مرة واحدة عند استدعاء API الهدف.
 */
export function POST(request) {
    return __awaiter(this, void 0, void 0, function () {
        var userToken, _a, subject, payload, _b, method, url, body, contentHash, allowedTarget, requestOrigin, signUrl, headers;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!assertSameOriginRequest(request)) {
                        recordWifeRejection({ reason: 'signature_failed', request: request, detail: 'wife_sign_forbidden_origin' });
                        return [2 /*return*/, applyWifeSecurityHeaders(new Response(JSON.stringify({ ok: false, error: 'Forbidden origin' }), {
                                status: 403,
                                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                            }))];
                    }
                    userToken = parseAccessCookie(request.headers.get('cookie'));
                    _a = !userToken;
                    if (_a) return [3 /*break*/, 2];
                    return [4 /*yield*/, isTokenAuthorized(userToken)];
                case 1:
                    _a = !(_c.sent());
                    _c.label = 2;
                case 2:
                    if (_a) {
                        return [2 /*return*/, wifeUnauthorizedResponse({ request: request, reason: 'unauthorized_token' })];
                    }
                    return [4 /*yield*/, getVerifiedTokenSubject(userToken)];
                case 3:
                    subject = _c.sent();
                    if (!subject) {
                        return [2 /*return*/, wifeUnauthorizedResponse({ request: request, reason: 'unauthorized_token' })];
                    }
                    return [4 /*yield*/, consumeRateLimitSlot(subject, WIFE_SIGN_RATE)];
                case 4:
                    if (!(_c.sent())) {
                        return [2 /*return*/, wifeRateLimitedResponse({ request: request, reason: 'rate_limited', detail: 'wife_sign' })];
                    }
                    _c.label = 5;
                case 5:
                    _c.trys.push([5, 7, , 8]);
                    return [4 /*yield*/, request.json()];
                case 6:
                    payload = (_c.sent());
                    return [3 /*break*/, 8];
                case 7:
                    _b = _c.sent();
                    return [2 /*return*/, applyWifeSecurityHeaders(new Response(JSON.stringify({ ok: false, error: 'Invalid JSON body' }), {
                            status: 400,
                            headers: { 'Content-Type': 'application/json; charset=utf-8' },
                        }))];
                case 8:
                    method = typeof payload.method === 'string' ? payload.method : 'GET';
                    url = typeof payload.url === 'string' ? payload.url : '';
                    body = typeof payload.body === 'string' ? payload.body : '';
                    contentHash = typeof payload.contentHash === 'string' ? payload.contentHash : undefined;
                    if (!url.trim()) {
                        return [2 /*return*/, applyWifeSecurityHeaders(new Response(JSON.stringify({ ok: false, error: 'url required' }), {
                                status: 400,
                                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                            }))];
                    }
                    allowedTarget = resolveAllowedWifeSignTarget(request, url);
                    if (!allowedTarget) {
                        recordWifeRejection({ reason: 'signature_failed', request: request, detail: 'wife_sign_disallowed_target' });
                        return [2 /*return*/, applyWifeSecurityHeaders(new Response(JSON.stringify({ ok: false, error: 'Signing target not allowed', code: 'WIFE_SIGN_FORBIDDEN' }), {
                                status: 403,
                                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                            }))];
                    }
                    requestOrigin = new URL(request.url).origin;
                    signUrl = "".concat(requestOrigin).concat(allowedTarget.startsWith('/') ? allowedTarget : "/".concat(allowedTarget));
                    return [4 /*yield*/, coalesceWifeSign({ subject: subject, method: method, url: signUrl, body: body, contentHash: contentHash }, function () { return createWifeSignedHeaders(method, signUrl, body, userToken, contentHash); })];
                case 9:
                    headers = _c.sent();
                    return [2 /*return*/, applyWifeSecurityHeaders(new Response(JSON.stringify({ ok: true, headers: headers }), {
                            status: 200,
                            headers: { 'Content-Type': 'application/json; charset=utf-8' },
                        }))];
            }
        });
    });
}
