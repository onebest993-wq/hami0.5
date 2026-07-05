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
import { detectStolenTokenServer, isValidWifeDeviceId, registerTokenSessionServer, } from './stolenTokenServer.ts';
describe('stolenTokenServer', function () {
    beforeEach(function () {
        process.env.NODE_ENV = 'test';
        delete process.env.WIFE_REDIS_REST_URL;
        delete process.env.WIFE_REDIS_REST_TOKEN;
        delete process.env.SUPABASE_URL;
        delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    });
    afterEach(function () {
        vi.restoreAllMocks();
    });
    it('registers first seen token in memory store (non-production)', function () { return __awaiter(void 0, void 0, void 0, function () {
        var token, first, registered;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    token = buildFakeJwt({
                        sub: 'user-a',
                        jti: 'jti-1',
                        iat: Math.floor(Date.now() / 1000),
                        exp: Math.floor(Date.now() / 1000) + 3600,
                    });
                    return [4 /*yield*/, detectStolenTokenServer(token, 'device-aaaaaaaa')];
                case 1:
                    first = _a.sent();
                    expect(first.status).toBe('valid');
                    return [4 /*yield*/, registerTokenSessionServer(token, 'device-aaaaaaaa')];
                case 2:
                    registered = _a.sent();
                    expect(registered).toBe(true);
                    return [2 /*return*/];
            }
        });
    }); });
    it('flags cloned token when same jti arrives from different device', function () { return __awaiter(void 0, void 0, void 0, function () {
        var token, verdict;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    token = buildFakeJwt({
                        sub: 'user-b',
                        jti: 'jti-clone',
                        iat: Math.floor(Date.now() / 1000),
                        exp: Math.floor(Date.now() / 1000) + 3600,
                    });
                    return [4 /*yield*/, registerTokenSessionServer(token, 'device-bbbbbbbb')];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, detectStolenTokenServer(token, 'device-cccccccc')];
                case 2:
                    verdict = _a.sent();
                    expect(verdict.status).toBe('cloned');
                    return [2 /*return*/];
            }
        });
    }); });
    it('flags stolen token when older jti is reused after refresh', function () { return __awaiter(void 0, void 0, void 0, function () {
        var older, newer, verdict;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    older = buildFakeJwt({
                        sub: 'user-c',
                        jti: 'jti-old',
                        iat: Math.floor(Date.now() / 1000) - 120,
                        exp: Math.floor(Date.now() / 1000) + 3600,
                    });
                    newer = buildFakeJwt({
                        sub: 'user-c',
                        jti: 'jti-new',
                        iat: Math.floor(Date.now() / 1000),
                        exp: Math.floor(Date.now() / 1000) + 3600,
                    });
                    return [4 /*yield*/, registerTokenSessionServer(newer, 'device-dddddddd')];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, detectStolenTokenServer(older, 'device-dddddddd')];
                case 2:
                    verdict = _a.sent();
                    expect(verdict.status).toBe('stolen');
                    return [2 /*return*/];
            }
        });
    }); });
    it('validates device id format for production binding', function () {
        expect(isValidWifeDeviceId('device-aaaaaaaa')).toBe(true);
        expect(isValidWifeDeviceId('short')).toBe(false);
        expect(isValidWifeDeviceId('')).toBe(false);
        expect(isValidWifeDeviceId('<script>')).toBe(false);
    });
});
function buildFakeJwt(payload) {
    var header = b64Json({ alg: 'none', typ: 'JWT' });
    var body = b64Json(payload);
    return "".concat(header, ".").concat(body, ".signature");
}
function b64Json(value) {
    return Buffer.from(JSON.stringify(value)).toString('base64url');
}
