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
import { extractUserTokenFromRequest, getVerifiedTokenSubject, isTokenAuthorized, assertWifeSignatureRequest, wifeUnauthorizedResponse, } from '../../security/wifeValidator.ts';
import { issueCsrfTokenForSubject, invalidateCsrfForSubject } from '../../security/csrfServerStore.ts';
import { applyWifeSecurityHeaders } from '../../security/wifeSecurityHeaders.ts';
var CSRF_COOKIE_NAME = 'hami_csrf_token';
function buildCsrfSetCookie(token, secure) {
    var flags = ["".concat(CSRF_COOKIE_NAME, "=").concat(encodeURIComponent(token)), 'Path=/', 'SameSite=Strict', 'Max-Age=86400'];
    if (secure)
        flags.push('Secure');
    flags.push('HttpOnly');
    return flags.join('; ');
}
function buildCsrfClearCookie(secure) {
    var flags = ["".concat(CSRF_COOKIE_NAME, "="), 'Path=/', 'SameSite=Strict', 'Max-Age=0'];
    if (secure)
        flags.push('Secure');
    flags.push('HttpOnly');
    return flags.join('; ');
}
function isSecureRequest(request) {
    var _a;
    return (request.url.startsWith('https://') ||
        ((_a = request.headers.get('x-forwarded-proto')) !== null && _a !== void 0 ? _a : '').toLowerCase() === 'https');
}
/**
 * Bootstrap CSRF session — requires valid JWT + WIFE signature on GET.
 * Returns token in JSON and sets HttpOnly cookie (double-submit + server registry).
 */
export function GET(request) {
    return __awaiter(this, void 0, void 0, function () {
        var userToken, _a, wifeBlock, subject, csrfToken, secure, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 6, , 7]);
                    userToken = extractUserTokenFromRequest(request);
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
                    return [4 /*yield*/, assertWifeSignatureRequest(request, userToken)];
                case 3:
                    wifeBlock = _c.sent();
                    if (wifeBlock)
                        return [2 /*return*/, wifeBlock];
                    return [4 /*yield*/, getVerifiedTokenSubject(userToken)];
                case 4:
                    subject = _c.sent();
                    if (!subject)
                        return [2 /*return*/, wifeUnauthorizedResponse({ request: request, reason: 'unauthorized_token' })];
                    return [4 /*yield*/, issueCsrfTokenForSubject(subject)];
                case 5:
                    csrfToken = _c.sent();
                    if (!csrfToken) {
                        return [2 /*return*/, applyWifeSecurityHeaders(new Response(JSON.stringify({ ok: false, error: 'CSRF store unavailable' }), {
                                status: 503,
                                headers: { 'Content-Type': 'application/json; charset=utf-8' },
                            }))];
                    }
                    secure = isSecureRequest(request);
                    return [2 /*return*/, applyWifeSecurityHeaders(new Response(JSON.stringify({ ok: true, csrfToken: csrfToken }), {
                            status: 200,
                            headers: {
                                'Content-Type': 'application/json; charset=utf-8',
                                'Set-Cookie': buildCsrfSetCookie(csrfToken, secure),
                            },
                        }))];
                case 6:
                    _b = _c.sent();
                    return [2 /*return*/, applyWifeSecurityHeaders(new Response(JSON.stringify({ ok: false, error: 'Internal server error' }), {
                            status: 500,
                            headers: { 'Content-Type': 'application/json; charset=utf-8' },
                        }))];
                case 7: return [2 /*return*/];
            }
        });
    });
}
/** Revoke CSRF session on logout — requires JWT + WIFE on DELETE. */
export function DELETE(request) {
    return __awaiter(this, void 0, void 0, function () {
        var userToken, _a, wifeBlock, subject, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _c.trys.push([0, 6, , 7]);
                    userToken = extractUserTokenFromRequest(request);
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
                    return [4 /*yield*/, assertWifeSignatureRequest(request, userToken)];
                case 3:
                    wifeBlock = _c.sent();
                    if (wifeBlock)
                        return [2 /*return*/, wifeBlock];
                    return [4 /*yield*/, getVerifiedTokenSubject(userToken)];
                case 4:
                    subject = _c.sent();
                    if (!subject)
                        return [2 /*return*/, wifeUnauthorizedResponse({ request: request, reason: 'unauthorized_token' })];
                    return [4 /*yield*/, invalidateCsrfForSubject(subject)];
                case 5:
                    _c.sent();
                    return [2 /*return*/, applyWifeSecurityHeaders(new Response(JSON.stringify({ ok: true }), {
                            status: 200,
                            headers: {
                                'Content-Type': 'application/json; charset=utf-8',
                                'Set-Cookie': buildCsrfClearCookie(isSecureRequest(request)),
                            },
                        }))];
                case 6:
                    _b = _c.sent();
                    return [2 /*return*/, applyWifeSecurityHeaders(new Response(JSON.stringify({ ok: false, error: 'Internal server error' }), {
                            status: 500,
                            headers: { 'Content-Type': 'application/json; charset=utf-8' },
                        }))];
                case 7: return [2 /*return*/];
            }
        });
    });
}
