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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('./wifeNonceStore', function () { return ({
    consumeNonceWithTtl: vi.fn(),
}); });
vi.mock('./stolenTokenServer', function () { return ({
    detectStolenTokenServer: vi.fn().mockResolvedValue({ status: 'valid' }),
    registerTokenSessionServer: vi.fn().mockResolvedValue(true),
    extractDeviceIdFromRequest: vi.fn().mockReturnValue(''),
}); });
import { verifyWifeSignature } from './wifeValidator.ts';
import { consumeNonceWithTtl } from './wifeNonceStore.ts';
/** يجب أن يكون ≥ 20 حرفاً (getVerifiedTokenSubject) */
var TOKEN = 'test-user-token-abcdefghijklmnopqrstuvwxyz';
var USER_ID = 'user-1';
var CSRF_TOKEN = 'AbCdEfGhIjKlMnOpQrStUvWxYz012345';
function csrfHeaders() {
    return {
        'x-csrf-token': CSRF_TOKEN,
        cookie: "hami_csrf_token=".concat(encodeURIComponent(CSRF_TOKEN)),
    };
}
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
function toBase64Url(bytes) {
    return Buffer.from(bytes)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/g, '');
}
function signWifePayload(input) {
    return __awaiter(this, void 0, void 0, function () {
        var payload, keyMaterial, tokenHash, key, signature;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    payload = [
                        input.method.toUpperCase(),
                        canonicalPathAndQuery(input.url),
                        input.timestamp,
                        input.nonce,
                        input.body,
                    ].join('\n');
                    keyMaterial = "".concat(input.token, ":wife-sign-v1");
                    return [4 /*yield*/, crypto.subtle.digest('SHA-256', new TextEncoder().encode(keyMaterial))];
                case 1:
                    tokenHash = _a.sent();
                    return [4 /*yield*/, crypto.subtle.importKey('raw', tokenHash, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])];
                case 2:
                    key = _a.sent();
                    return [4 /*yield*/, crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload))];
                case 3:
                    signature = _a.sent();
                    return [2 /*return*/, toBase64Url(new Uint8Array(signature))];
            }
        });
    });
}
function okJson(data) {
    return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
}
describe('verifyWifeSignature security checks', function () {
    beforeEach(function () {
        process.env.SUPABASE_URL = 'https://example.supabase.co';
        process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key';
        process.env.SUPABASE_ANON_KEY = 'anon-key';
        consumeNonceWithTtl.mockResolvedValue(true);
        vi.stubGlobal('fetch', vi.fn(function (input) { return __awaiter(void 0, void 0, void 0, function () {
            var url;
            return __generator(this, function (_a) {
                url = String(input);
                if (url.includes('/auth/v1/user')) {
                    return [2 /*return*/, okJson({ id: USER_ID })];
                }
                if (url.includes('/rest/v1/profiles')) {
                    return [2 /*return*/, okJson([{ id: USER_ID, status: 'active', is_banned: false, deleted_at: null }])];
                }
                if (url.includes('/rest/v1/lawyers')) {
                    return [2 /*return*/, okJson([])];
                }
                return [2 /*return*/, new Response('not found', { status: 404 })];
            });
        }); }));
    });
    afterEach(function () {
        vi.unstubAllGlobals();
        vi.clearAllMocks();
        process.env.NODE_ENV = 'test';
    });
    it('accepts a valid signed JSON request', function () { return __awaiter(void 0, void 0, void 0, function () {
        var url, method, timestamp, nonce, body, signature, csrf, req, valid;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    url = 'https://example.test/api/requests/create?z=2&a=1';
                    method = 'POST';
                    timestamp = String(Date.now());
                    nonce = 'nonce_valid_12345';
                    body = '{"hello":"world"}';
                    return [4 /*yield*/, signWifePayload({ method: method, url: url, timestamp: timestamp, nonce: nonce, body: body, token: TOKEN })];
                case 1:
                    signature = _a.sent();
                    csrf = csrfHeaders();
                    req = new Request(url, {
                        method: method,
                        headers: {
                            'content-type': 'application/json',
                            'x-wife-signature': signature,
                            'x-wife-timestamp': timestamp,
                            'x-wife-nonce': nonce,
                            'x-csrf-token': csrf['x-csrf-token'],
                            cookie: csrf.cookie,
                        },
                        body: body,
                    });
                    return [4 /*yield*/, verifyWifeSignature(req, TOKEN)];
                case 2:
                    valid = _a.sent();
                    expect(valid).toBe(true);
                    return [2 /*return*/];
            }
        });
    }); });
    it('rejects tampered JSON body (signature mismatch)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var url, method, timestamp, nonce, originalBody, tamperedBody, signature, csrf, req, valid;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    url = 'https://example.test/api/requests/update';
                    method = 'POST';
                    timestamp = String(Date.now());
                    nonce = 'nonce_tamper_12345';
                    originalBody = '{"safe":true}';
                    tamperedBody = '{"safe":false}';
                    return [4 /*yield*/, signWifePayload({ method: method, url: url, timestamp: timestamp, nonce: nonce, body: originalBody, token: TOKEN })];
                case 1:
                    signature = _a.sent();
                    csrf = csrfHeaders();
                    req = new Request(url, {
                        method: method,
                        headers: {
                            'content-type': 'application/json',
                            'x-wife-signature': signature,
                            'x-wife-timestamp': timestamp,
                            'x-wife-nonce': nonce,
                            'x-csrf-token': csrf['x-csrf-token'],
                            cookie: csrf.cookie,
                        },
                        body: tamperedBody,
                    });
                    return [4 /*yield*/, verifyWifeSignature(req, TOKEN)];
                case 2:
                    valid = _a.sent();
                    expect(valid).toBe(false);
                    return [2 /*return*/];
            }
        });
    }); });
    it('rejects replay when nonce store reports reused nonce', function () { return __awaiter(void 0, void 0, void 0, function () {
        var url, method, timestamp, nonce, body, signature, csrf, req, valid;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    consumeNonceWithTtl.mockResolvedValue(false);
                    url = 'https://example.test/api/requests/list';
                    method = 'POST';
                    timestamp = String(Date.now());
                    nonce = 'nonce_replay_12345';
                    body = '{"lawyer_id":"user-1"}';
                    return [4 /*yield*/, signWifePayload({ method: method, url: url, timestamp: timestamp, nonce: nonce, body: body, token: TOKEN })];
                case 1:
                    signature = _a.sent();
                    csrf = csrfHeaders();
                    req = new Request(url, {
                        method: method,
                        headers: {
                            'content-type': 'application/json',
                            'x-wife-signature': signature,
                            'x-wife-timestamp': timestamp,
                            'x-wife-nonce': nonce,
                            'x-csrf-token': csrf['x-csrf-token'],
                            cookie: csrf.cookie,
                        },
                        body: body,
                    });
                    return [4 /*yield*/, verifyWifeSignature(req, TOKEN)];
                case 2:
                    valid = _a.sent();
                    expect(valid).toBe(false);
                    return [2 /*return*/];
            }
        });
    }); });
    it('rejects POST when CSRF header and cookie mismatch', function () { return __awaiter(void 0, void 0, void 0, function () {
        var url, method, timestamp, nonce, body, signature, req, valid;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    url = 'https://example.test/api/requests/create';
                    method = 'POST';
                    timestamp = String(Date.now());
                    nonce = 'nonce_csrf_mismatch_1';
                    body = '{"x":1}';
                    return [4 /*yield*/, signWifePayload({ method: method, url: url, timestamp: timestamp, nonce: nonce, body: body, token: TOKEN })];
                case 1:
                    signature = _a.sent();
                    req = new Request(url, {
                        method: method,
                        headers: {
                            'content-type': 'application/json',
                            'x-wife-signature': signature,
                            'x-wife-timestamp': timestamp,
                            'x-wife-nonce': nonce,
                            'x-csrf-token': CSRF_TOKEN,
                            cookie: 'hami_csrf_token=DifferentTokenValue1234567890',
                        },
                        body: body,
                    });
                    return [4 /*yield*/, verifyWifeSignature(req, TOKEN)];
                case 2:
                    valid = _a.sent();
                    expect(valid).toBe(false);
                    return [2 /*return*/];
            }
        });
    }); });
    it('rejects POST when CSRF cookie is missing in production mode', function () { return __awaiter(void 0, void 0, void 0, function () {
        var url, method, timestamp, nonce, body, signature, req, valid;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    process.env.NODE_ENV = 'production';
                    url = 'https://example.test/api/requests/create';
                    method = 'POST';
                    timestamp = String(Date.now());
                    nonce = 'nonce_csrf_prod_1';
                    body = '{"x":1}';
                    return [4 /*yield*/, signWifePayload({ method: method, url: url, timestamp: timestamp, nonce: nonce, body: body, token: TOKEN })];
                case 1:
                    signature = _a.sent();
                    req = new Request(url, {
                        method: method,
                        headers: {
                            'content-type': 'application/json',
                            'x-wife-signature': signature,
                            'x-wife-timestamp': timestamp,
                            'x-wife-nonce': nonce,
                            'x-csrf-token': CSRF_TOKEN,
                        },
                        body: body,
                    });
                    return [4 /*yield*/, verifyWifeSignature(req, TOKEN)];
                case 2:
                    valid = _a.sent();
                    expect(valid).toBe(false);
                    return [2 /*return*/];
            }
        });
    }); });
    it('rejects malformed header format before verification work', function () { return __awaiter(void 0, void 0, void 0, function () {
        var url, req, valid;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    url = 'https://example.test/api/requests/create';
                    req = new Request(url, {
                        method: 'POST',
                        headers: {
                            'content-type': 'application/json',
                            'x-wife-signature': '***not_base64url***',
                            'x-wife-timestamp': String(Date.now()),
                            'x-wife-nonce': 'nonce_hdrfmt_12345',
                        },
                        body: '{"x":1}',
                    });
                    return [4 /*yield*/, verifyWifeSignature(req, TOKEN)];
                case 1:
                    valid = _a.sent();
                    expect(valid).toBe(false);
                    return [2 /*return*/];
            }
        });
    }); });
    it('accepts multipart request when x-wife-content-hash signature matches', function () { return __awaiter(void 0, void 0, void 0, function () {
        var url, method, timestamp, nonce, contentHash, signature, csrf, req, valid;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    url = 'https://example.test/api/upload?step=1';
                    method = 'POST';
                    timestamp = String(Date.now());
                    nonce = 'nonce_multi_ok_12345';
                    contentHash = 'a'.repeat(64);
                    return [4 /*yield*/, signWifePayload({
                            method: method,
                            url: url,
                            timestamp: timestamp,
                            nonce: nonce,
                            body: contentHash,
                            token: TOKEN,
                        })];
                case 1:
                    signature = _a.sent();
                    csrf = csrfHeaders();
                    req = new Request(url, {
                        method: method,
                        headers: {
                            'content-type': 'multipart/form-data; boundary=test-boundary',
                            'x-wife-signature': signature,
                            'x-wife-timestamp': timestamp,
                            'x-wife-nonce': nonce,
                            'x-wife-content-hash': contentHash,
                            'x-csrf-token': csrf['x-csrf-token'],
                            cookie: csrf.cookie,
                        },
                        body: '--test-boundary\r\ncontent\r\n--test-boundary--',
                    });
                    return [4 /*yield*/, verifyWifeSignature(req, TOKEN)];
                case 2:
                    valid = _a.sent();
                    expect(valid).toBe(true);
                    return [2 /*return*/];
            }
        });
    }); });
    it('rejects multipart request when x-wife-content-hash is missing', function () { return __awaiter(void 0, void 0, void 0, function () {
        var url, method, timestamp, nonce, contentHash, signature, req, valid;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    url = 'https://example.test/api/upload';
                    method = 'POST';
                    timestamp = String(Date.now());
                    nonce = 'nonce_multi_missing_12345';
                    contentHash = 'b'.repeat(64);
                    return [4 /*yield*/, signWifePayload({
                            method: method,
                            url: url,
                            timestamp: timestamp,
                            nonce: nonce,
                            body: contentHash,
                            token: TOKEN,
                        })];
                case 1:
                    signature = _a.sent();
                    req = new Request(url, {
                        method: method,
                        headers: {
                            'content-type': 'multipart/form-data; boundary=test-boundary',
                            'x-wife-signature': signature,
                            'x-wife-timestamp': timestamp,
                            'x-wife-nonce': nonce,
                        },
                        body: '--test-boundary\r\ncontent\r\n--test-boundary--',
                    });
                    return [4 /*yield*/, verifyWifeSignature(req, TOKEN)];
                case 2:
                    valid = _a.sent();
                    expect(valid).toBe(false);
                    return [2 /*return*/];
            }
        });
    }); });
    it('rejects production POST when x-wife-device-id is missing (fail-closed binding)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var extractDeviceIdFromRequest, url, body, timestamp, nonce, signature, csrf, req, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    process.env.NODE_ENV = 'production';
                    return [4 /*yield*/, import('./stolenTokenServer.ts')];
                case 1:
                    extractDeviceIdFromRequest = (_b.sent()).extractDeviceIdFromRequest;
                    vi.mocked(extractDeviceIdFromRequest).mockReturnValue('');
                    url = 'https://example.test/api/forum/delete';
                    body = '{"postId":"p1"}';
                    timestamp = String(Date.now());
                    nonce = 'nonce_prod_nodevice_1';
                    return [4 /*yield*/, signWifePayload({
                            method: 'POST',
                            url: url,
                            timestamp: timestamp,
                            nonce: nonce,
                            body: body,
                            token: TOKEN,
                        })];
                case 2:
                    signature = _b.sent();
                    csrf = csrfHeaders();
                    req = new Request(url, {
                        method: 'POST',
                        headers: {
                            'content-type': 'application/json',
                            'x-wife-signature': signature,
                            'x-wife-timestamp': timestamp,
                            'x-wife-nonce': nonce,
                            'x-csrf-token': csrf['x-csrf-token'],
                            cookie: csrf.cookie,
                        },
                        body: body,
                    });
                    _a = expect;
                    return [4 /*yield*/, verifyWifeSignature(req, TOKEN)];
                case 3:
                    _a.apply(void 0, [_b.sent()]).toBe(false);
                    return [2 /*return*/];
            }
        });
    }); });
});
