/**
 * مزامنة الخروج بين تبويبات نفس المتصفح — لا يعتمد على انتظار فشل التجديد.
 */

export const AUTH_SESSION_CHANNEL = 'hami-auth-session';
export const AUTH_LOGOUT_BROADCAST = 'logout';
/** نفس التبويب — BroadcastChannel لا يُبلِّغ الناشر */
export const HAMI_AUTH_LOGOUT_EVENT = 'hami:auth-logout';

export type AuthSessionBroadcastMessage = {
    type: typeof AUTH_LOGOUT_BROADCAST;
    at: number;
};

let publishingLogout = false;

export function isPublishingAuthLogout(): boolean {
    return publishingLogout;
}

export function publishAuthLogout(): void {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event(HAMI_AUTH_LOGOUT_EVENT));
    }
    if (typeof BroadcastChannel === 'undefined') return;
    publishingLogout = true;
    try {
        const channel = new BroadcastChannel(AUTH_SESSION_CHANNEL);
        const payload: AuthSessionBroadcastMessage = { type: AUTH_LOGOUT_BROADCAST, at: Date.now() };
        channel.postMessage(payload);
        channel.close();
    } catch {
        /* Safari خاص / بيئة بلا قناة */
    } finally {
        publishingLogout = false;
    }
}

export function subscribeSameTabAuthLogout(onLogout: () => void): () => void {
    if (typeof window === 'undefined') return () => undefined;
    const handler = () => onLogout();
    window.addEventListener(HAMI_AUTH_LOGOUT_EVENT, handler);
    return () => window.removeEventListener(HAMI_AUTH_LOGOUT_EVENT, handler);
}

export function subscribeAuthLogout(onLogout: () => void): () => void {
    if (typeof BroadcastChannel === 'undefined') return () => undefined;
    let channel: BroadcastChannel;
    try {
        channel = new BroadcastChannel(AUTH_SESSION_CHANNEL);
    } catch {
        return () => undefined;
    }
    const handler = (event: MessageEvent<AuthSessionBroadcastMessage>) => {
        if (publishingLogout) return;
        if (event.data?.type !== AUTH_LOGOUT_BROADCAST) return;
        onLogout();
    };
    channel.addEventListener('message', handler);
    return () => {
        channel.removeEventListener('message', handler);
        channel.close();
    };
}
