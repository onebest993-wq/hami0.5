/**
 * متى تظهر شاشة الدخول مقابل الانتظار مقابل المقر.
 * بعد دخول ناجح لا نُظهر بوابة الدخول بينما التحقق ما زال معلّقاً.
 */

export const HQ_POST_LOGIN_HOLD_MS = 8_000;

export function computeHqAdminPending(input: {
    doorUnlocked: boolean;
    serverAdmin: boolean | null;
    postLoginHold: boolean;
}): boolean {
    if (!input.doorUnlocked) return false;
    if (input.postLoginHold) return true;
    return input.serverAdmin === null;
}

export function computeHqNeedsLogin(input: {
    serverAdmin: boolean | null;
    guestLike: boolean;
    verifyReason: string | null;
    postLoginHold: boolean;
}): boolean {
    if (input.postLoginHold) return false;
    if (input.serverAdmin !== false) return false;
    return input.guestLike || input.verifyReason === 'no_live_session';
}
