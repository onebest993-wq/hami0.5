import { describe, expect, it } from 'vitest';
import { computeHqAdminPending, computeHqNeedsLogin } from '../hqAdminEntryGate';

describe('hqAdminEntryGate', () => {
    it('لا يفتح شاشة الدخول أثناء التحقق أو بعد دخول لم تُستقر جلسته بعد', () => {
        expect(
            computeHqNeedsLogin({
                serverAdmin: null,
                guestLike: true,
                verifyReason: 'no_live_session',
                postLoginHold: false,
            }),
        ).toBe(false);
        expect(
            computeHqNeedsLogin({
                serverAdmin: false,
                guestLike: true,
                verifyReason: 'no_live_session',
                postLoginHold: true,
            }),
        ).toBe(false);
        expect(
            computeHqAdminPending({
                doorUnlocked: true,
                serverAdmin: null,
                postLoginHold: false,
            }),
        ).toBe(true);
        expect(
            computeHqAdminPending({
                doorUnlocked: true,
                serverAdmin: false,
                postLoginHold: true,
            }),
        ).toBe(true);
    });

    it('يطلب الدخول فقط بعد رفض الخادم مع جلسة ضيف أو بلا كوكي', () => {
        expect(
            computeHqNeedsLogin({
                serverAdmin: false,
                guestLike: true,
                verifyReason: 'no_real_session',
                postLoginHold: false,
            }),
        ).toBe(true);
        expect(
            computeHqNeedsLogin({
                serverAdmin: false,
                guestLike: false,
                verifyReason: 'no_live_session',
                postLoginHold: false,
            }),
        ).toBe(true);
        expect(
            computeHqNeedsLogin({
                serverAdmin: true,
                guestLike: false,
                verifyReason: 'session_flag',
                postLoginHold: false,
            }),
        ).toBe(false);
    });

    it('لا ينتظر خلف الباب الأبيض', () => {
        expect(
            computeHqAdminPending({
                doorUnlocked: false,
                serverAdmin: null,
                postLoginHold: false,
            }),
        ).toBe(false);
    });
});
