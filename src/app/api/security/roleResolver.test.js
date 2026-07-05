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
import { beforeEach, describe, expect, it, vi } from 'vitest';
var selectMock = vi.fn();
var eqMock = vi.fn();
var maybeSingleMock = vi.fn();
vi.mock('./supabaseAdminClient.ts', function () { return ({
    getSupabaseAdminClient: function () { return ({
        from: function () { return ({
            select: selectMock.mockReturnValue({
                eq: eqMock.mockReturnValue({
                    maybeSingle: maybeSingleMock,
                }),
            }),
        }); },
    }); },
}); });
import { isForumModeratorUserId, isPlatformAdminUserId, resetRoleResolverCacheForTests, } from './roleResolver.ts';
describe('roleResolver', function () {
    beforeEach(function () {
        vi.clearAllMocks();
        resetRoleResolverCacheForTests();
        delete process.env.ADMIN_UUID;
    });
    it('returns false for platform admin when profile is lawyer', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    maybeSingleMock.mockResolvedValue({ data: { role: 'lawyer' }, error: null });
                    return [4 /*yield*/, expect(isPlatformAdminUserId('user-1')).resolves.toBe(false)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('returns true for profiles.role admin', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    maybeSingleMock.mockResolvedValue({ data: { role: 'admin' }, error: null });
                    return [4 /*yield*/, expect(isPlatformAdminUserId('user-2')).resolves.toBe(true)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('returns true for ADMIN_UUID env match', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    process.env.ADMIN_UUID = 'fixed-admin-id';
                    return [4 /*yield*/, expect(isPlatformAdminUserId('fixed-admin-id')).resolves.toBe(true)];
                case 1:
                    _a.sent();
                    expect(selectMock).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    it('treats moderator as forum admin but not platform admin', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    maybeSingleMock.mockResolvedValue({ data: { role: 'moderator' }, error: null });
                    return [4 /*yield*/, expect(isPlatformAdminUserId('mod-1')).resolves.toBe(false)];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, expect(isForumModeratorUserId('mod-1')).resolves.toBe(true)];
                case 2:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('does not treat user_metadata role as platform admin', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    process.env.ADMIN_UUID = 'other-admin';
                    maybeSingleMock.mockResolvedValue({ data: { role: 'lawyer' }, error: null });
                    return [4 /*yield*/, expect(isPlatformAdminUserId('attacker-with-fake-meta')).resolves.toBe(false)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
